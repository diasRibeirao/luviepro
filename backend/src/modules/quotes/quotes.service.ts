import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { capacityReached } from '../../entitlements';
import { CreateQuoteDto, QuoteItemDto, UpdateQuoteDto } from './dto/quotes.dto';
import { auditMetadata } from '../../observability/audit-metadata';
import { toJsonValue } from '../../domain/json-value';
import type { Prisma } from '../../../../generated-prisma';
import type { BuiltQuoteItem, QuoteTimelineEvent } from './types/quote.types';
import { isQuoteStatus, QUOTE_TRANSITIONS } from './types/quote.types';

type Calc={dailyRateCents:number;days:number;people:number;variableCostCents:number;fixedCostCents:number;safetyMarginBps:number;variableCostMode?:string};

@Injectable()
export class QuotesService {
  constructor(private readonly db:PrismaService){}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entity:string,entityId?:string,metadata?:Record<string,string|number|boolean|Date|null|undefined>){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity,entityId,metadata:auditMetadata(metadata)}}).catch(()=>undefined);
  }

  private calculate(x:Calc){
    for(const v of Object.values(x))if(typeof v==='number'&&(!Number.isInteger(v)||v<0))throw new BadRequestException('Use inteiros não negativos; dinheiro em centavos.');
    const laborCents=x.dailyRateCents*x.days;
    const mode=x.variableCostMode??'per_day';
    const variableCents=mode==='fixed'?x.variableCostCents:mode==='per_person'?x.variableCostCents*x.people:mode==='per_person_day'?x.variableCostCents*x.people*x.days:x.variableCostCents*x.days;
    const subtotal=laborCents+variableCents+x.fixedCostCents;
    const marginBaseCents=laborCents+variableCents;
    const marginCents=Math.round(marginBaseCents*x.safetyMarginBps/10000);
    return {laborCents,variableCents,fixedCents:x.fixedCostCents,marginCents,totalCents:subtotal+marginCents};
  }

  private async ensureProjectFromQuote(tx:Prisma.TransactionClient,quote:{id:string;tenantId:string;clientId:string;number:string;client:{name:string}}){
    const project=await tx.project.upsert({where:{quoteId:quote.id},update:{},create:{tenantId:quote.tenantId,clientId:quote.clientId,quoteId:quote.id,name:`${quote.number} — ${quote.client.name}`}});
    const items=await tx.quoteItem.findMany({where:{tenantId:quote.tenantId,quoteId:quote.id},include:{stages:{where:{tenantId:quote.tenantId},orderBy:{sequence:'asc'}}},orderBy:{id:'asc'}});
    const existing=await tx.projectTask.findMany({where:{tenantId:quote.tenantId,projectId:project.id},select:{title:true}});
    const titles=new Set(existing.map(task=>task.title));
    const tasks=items.flatMap(item=>item.stages.map(stage=>({
      tenantId:quote.tenantId,
      projectId:project.id,
      title:`${item.serviceName} — ${stage.description}`,
      description:`Etapa importada automaticamente do serviço ${item.serviceName}${stage.duration?` · Duração prevista: ${stage.duration}`:''}`,
      priority:'medium',
    }))).filter(task=>!titles.has(task.title));
    if(tasks.length)await tx.projectTask.createMany({data:tasks});
    return project;
  }

  private async assertQuoteLimit(tenantId:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});
    if(!tenant)throw new NotFoundException('Tenant não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});
    if(!limit)return;
    const month=new Date();month.setDate(1);month.setHours(0,0,0,0);
    const used=await this.db.quote.count({where:{tenantId,createdAt:{gte:month}}});
    if(capacityReached(limit.maxQuotesPerMonth<0?null:limit.maxQuotesPerMonth,used))throw new BadRequestException('Limite mensal de orçamentos atingido');
  }

  quotes(tenantId:string){return this.db.quote.findMany({where:{tenantId},include:{client:true,items:true},orderBy:{createdAt:'desc'}});}

  async quote(tenantId:string,id:string){
    const quote=await this.db.quote.findFirst({where:{tenantId,id},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}},project:true}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    return quote;
  }

  async shareQuote(tenantId:string,id:string,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(['approved','rejected'].includes(quote.status))throw new BadRequestException('Esta proposta já foi finalizada');
    const now=new Date();
    const validUntil=quote.validUntil??new Date(now.getTime()+quote.validityDays*86400000);
    const publicToken=quote.publicToken??randomBytes(24).toString('hex');
    const updated=await this.db.quote.update({where:{id},data:{publicToken,publicSharedAt:quote.publicSharedAt??now,status:'sent',sentAt:quote.sentAt??now,validUntil}});
    await this.audit(tenantId,actorUserId,'share','quote',id,{number:updated.number,reused:!!quote.publicToken});
    return {token:publicToken,path:`/p/${publicToken}`,validUntil:updated.validUntil};
  }

  async revokeQuoteShare(tenantId:string,id:string,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(!quote.publicToken)return {ok:true};
    await this.db.quote.update({where:{id},data:{publicToken:null,publicSharedAt:null}});
    await this.audit(tenantId,actorUserId,'revoke_share','quote',id,{number:quote.number});
    return {ok:true};
  }

  async publicProposal(token:string){
    const q=await this.db.quote.findUnique({where:{publicToken:token},include:{tenant:true,client:true,items:{include:{stages:{orderBy:{sequence:'asc'}}}}}});
    if(!q)throw new NotFoundException('Proposta não encontrada');
    const now=Date.now(),expired=!!q.validUntil&&q.validUntil.getTime()<now;
    const remainingDays=q.validUntil?Math.max(0,Math.ceil((q.validUntil.getTime()-now)/86400000)):null;
    return {number:q.number,status:q.status,totalCents:q.totalCents,discountBps:q.discountBps,finalTotalCents:q.finalTotalCents,validityDays:q.validityDays,notes:q.notes,sentAt:q.sentAt,validUntil:q.validUntil,expired,remainingDays,clientDecision:q.clientDecision,clientDecisionAt:q.clientDecisionAt,clientDecisionName:q.clientDecisionName,client:{name:q.client.name,type:q.client.type,legalName:q.client.legalName,document:q.client.document,city:q.client.city,state:q.client.state,addressLine:q.client.addressLine,addressNumber:q.client.addressNumber,neighborhood:q.client.neighborhood},tenant:{name:q.tenant.name,legalName:q.tenant.legalName,document:q.tenant.document,stateRegistration:q.tenant.stateRegistration,municipalRegistration:q.tenant.municipalRegistration,addressLine:q.tenant.addressLine,addressNumber:q.tenant.addressNumber,addressComplement:q.tenant.addressComplement,neighborhood:q.tenant.neighborhood,city:q.tenant.city,state:q.tenant.state,responsibleName:q.tenant.responsibleName,phone:q.tenant.phone,contactEmail:q.tenant.contactEmail,siteUrl:q.tenant.siteUrl,instagram:q.tenant.instagram,proposalText:q.tenant.proposalText,proposalPaymentTerms:q.tenant.proposalPaymentTerms,proposalFooter:q.tenant.proposalFooter,pixKey:q.tenant.pixKey,primaryColor:q.tenant.primaryColor,secondaryColor:q.tenant.secondaryColor,logoUrl:q.tenant.logoUrl},items:q.items.map(i=>({serviceName:i.serviceName,days:i.days,people:i.people,totalCents:i.totalCents,stages:i.stages.map(st=>({sequence:st.sequence,description:st.description,duration:st.duration}))}))};
  }

  async decidePublicProposal(token:string,decision:'approved'|'rejected',name:string){
    const quote=await this.db.quote.findUnique({where:{publicToken:token},include:{client:true}});
    if(!quote)throw new NotFoundException('Proposta não encontrada');
    if(quote.clientDecision||['approved','rejected'].includes(quote.status))throw new ConflictException('Esta proposta já recebeu uma resposta');
    if(quote.status!=='sent')throw new BadRequestException('Esta proposta ainda não está disponível para resposta');
    if(quote.validUntil&&quote.validUntil.getTime()<Date.now())throw new BadRequestException('Esta proposta está vencida');
    const now=new Date();
    if(decision==='approved'){
      await this.db.$transaction(async tx=>{
        await tx.quote.update({where:{id:quote.id},data:{status:'approved',approvedAt:now,clientDecision:'approved',clientDecisionAt:now,clientDecisionName:name.trim()}});
        await this.ensureProjectFromQuote(tx,quote);
      });
    }else{
      await this.db.quote.update({where:{id:quote.id},data:{status:'rejected',clientDecision:'rejected',clientDecisionAt:now,clientDecisionName:name.trim()}});
    }
    await this.audit(quote.tenantId,undefined,`client_${decision}`,'quote',quote.id,{name:name.trim(),number:quote.number});
    return {ok:true,status:decision};
  }

  async quoteTimeline(tenantId:string,id:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId},select:{id:true,createdAt:true,updatedAt:true,sentAt:true,approvedAt:true,clientDecision:true,clientDecisionAt:true,clientDecisionName:true,status:true,version:true}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    const logs=await this.db.auditLog.findMany({where:{tenantId,entity:'quote',entityId:id},orderBy:{createdAt:'asc'}});
    const events:QuoteTimelineEvent[]=[{type:'created',title:'Orçamento criado',at:quote.createdAt}];
    for(const log of logs){
      const m=(log.metadata&&typeof log.metadata==='object'&&!Array.isArray(log.metadata)?log.metadata:{}) as Record<string,unknown>;
      const detail=(value:unknown)=>value===undefined||value===null?undefined:String(value);
      if(log.action==='update')events.push({type:'version',title:`Versão ${detail(m.version)??''} salva`.trim(),at:log.createdAt,detail:m.itemsChanged?'Serviços e valores atualizados':'Condições atualizadas'});
      else if(log.action==='change_status')events.push({type:'status',title:m.to==='sent'?'Proposta enviada':m.to==='rejected'?'Orçamento recusado':'Status alterado',at:log.createdAt,detail:detail(m.to)});
      else if(log.action==='share')events.push({type:'share',title:'Link público compartilhado',at:log.createdAt});
      else if(log.action==='revoke_share')events.push({type:'share',title:'Link público revogado',at:log.createdAt});
      else if(log.action==='approve')events.push({type:'approved',title:'Orçamento aprovado internamente',at:log.createdAt});
      else if(log.action==='client_approved')events.push({type:'approved',title:'Cliente aprovou a proposta',at:log.createdAt,detail:detail(m.name)});
      else if(log.action==='client_rejected')events.push({type:'rejected',title:'Cliente recusou a proposta',at:log.createdAt,detail:detail(m.name)});
      else if(log.action==='duplicate')events.push({type:'duplicate',title:'Orçamento duplicado',at:log.createdAt});
    }
    return events.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  }

  async quoteVersions(tenantId:string,id:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId},select:{id:true}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    return this.db.quoteVersion.findMany({where:{tenantId,quoteId:id},orderBy:{version:'desc'}});
  }

  private quoteSnapshot(q:{clientId:string;number:string;status:string;totalCents:number;discountBps:number;finalTotalCents:number;validityDays:number;notes:string|null;sentAt:Date|null;approvedAt:Date|null;validUntil:Date|null;items:Array<{serviceName:string;days:number;people:number;laborCents:number;variableCents:number;fixedCents:number;marginCents:number;totalCents:number;configurationJson:unknown;stages:unknown[]}>}):Prisma.InputJsonObject{
    const snapshot={clientId:q.clientId,number:q.number,status:q.status,totalCents:q.totalCents,discountBps:q.discountBps,finalTotalCents:q.finalTotalCents,validityDays:q.validityDays,notes:q.notes,sentAt:q.sentAt,approvedAt:q.approvedAt,validUntil:q.validUntil,items:(q.items??[]).map(i=>({serviceName:i.serviceName,days:i.days,people:i.people,laborCents:i.laborCents,variableCents:i.variableCents,fixedCents:i.fixedCents,marginCents:i.marginCents,totalCents:i.totalCents,configurationJson:i.configurationJson??null,stages:i.stages??[]}))};
    return toJsonValue(snapshot as never) as Prisma.InputJsonObject;
  }

  private async buildQuoteItems(tenantId:string,inputs:QuoteItemDto[]){
    const items:BuiltQuoteItem[]=[];
    for(const input of inputs){
      const service=await this.db.service.findFirst({where:{id:input.serviceId,tenantId,active:true},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}});
      if(!service)throw new NotFoundException('Serviço não encontrado ou inativo');
      const days=input.days??service.defaultDays,people=input.people??service.people;
      const calc=this.calculate({dailyRateCents:input.dailyRateCents??service.dailyRateCents,days,people,variableCostCents:input.variableCostCents??service.variableCostCents,fixedCostCents:input.fixedCostCents??service.fixedCostCents,safetyMarginBps:input.safetyMarginBps??service.safetyMarginBps});
      items.push({tenantId,serviceName:service.name,days,people,...calc,configurationJson:{serviceId:service.id,dailyRateCents:input.dailyRateCents??service.dailyRateCents,variableCostCents:input.variableCostCents??service.variableCostCents,fixedCostCents:input.fixedCostCents??service.fixedCostCents,safetyMarginBps:input.safetyMarginBps??service.safetyMarginBps},stages:{create:service.stages.map(st=>({tenantId,sequence:st.sequence,description:st.description,duration:st.duration}))}});
    }
    return items;
  }

  async updateQuote(tenantId:string,id:string,data:UpdateQuoteDto,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId},include:{items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}}}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(quote.status!=='draft')throw new BadRequestException('Somente orçamentos em rascunho podem ser editados');
    const nextDiscount=data.discountBps??quote.discountBps,nextValidity=data.validityDays??quote.validityDays,nextNotes=data.notes===undefined?quote.notes:data.notes;
    const newItems=data.items?await this.buildQuoteItems(tenantId,data.items):null;
    const totalCents=newItems?newItems.reduce((sum,item)=>sum+item.totalCents,0):quote.totalCents;
    const finalTotalCents=Math.round(totalCents*(10000-nextDiscount)/10000);
    const updated=await this.db.$transaction(async tx=>{await tx.quoteVersion.create({data:{tenantId,quoteId:id,version:quote.version,snapshot:this.quoteSnapshot(quote),createdById:actorUserId}});if(newItems)await tx.quoteItem.deleteMany({where:{tenantId,quoteId:id}});return tx.quote.update({where:{id},data:{discountBps:nextDiscount,validityDays:nextValidity,notes:nextNotes,totalCents,finalTotalCents,version:{increment:1},publicToken:null,publicSharedAt:null,clientDecision:null,clientDecisionAt:null,clientDecisionName:null,...(newItems?{items:{create:newItems}}:{})},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}},project:true}});});
    await this.audit(tenantId,actorUserId,'update','quote',id,{version:updated.version,itemsChanged:!!newItems});
    return updated;
  }

  async duplicateQuote(tenantId:string,id:string,actorUserId?:string){
    await this.assertQuoteLimit(tenantId);
    const source=await this.db.quote.findFirst({where:{id,tenantId},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}}}});
    if(!source)throw new NotFoundException('Orçamento não encontrado');
    const year=new Date().getFullYear();
    const seq=await this.db.quoteSequence.upsert({where:{tenantId_year:{tenantId,year}},create:{tenantId,year,lastNumber:1},update:{lastNumber:{increment:1}}});
    const duplicated=await this.db.quote.create({data:{tenantId,clientId:source.clientId,number:`ORC-${year}-${String(seq.lastNumber).padStart(3,'0')}`,status:'draft',totalCents:source.totalCents,discountBps:source.discountBps,finalTotalCents:source.finalTotalCents,validityDays:source.validityDays,notes:source.notes,items:{create:source.items.map(i=>({tenantId,serviceName:i.serviceName,days:i.days,people:i.people,laborCents:i.laborCents,variableCents:i.variableCents,fixedCents:i.fixedCents,marginCents:i.marginCents,totalCents:i.totalCents,configurationJson:i.configurationJson??undefined,stages:{create:i.stages.map(st=>({tenantId,sequence:st.sequence,description:st.description,duration:st.duration,completed:false}))}}))}},include:{client:true,items:true}});
    await this.audit(tenantId,actorUserId,'duplicate','quote',duplicated.id,{sourceQuoteId:id,sourceNumber:source.number,number:duplicated.number});
    return duplicated;
  }

  async createQuote(tenantId:string,data:CreateQuoteDto,actorUserId?:string){
    await this.assertQuoteLimit(tenantId);
    const client=await this.db.client.findFirst({where:{id:data.clientId,tenantId}});
    if(!client)throw new NotFoundException('Cliente não encontrado');
    const items=await this.buildQuoteItems(tenantId,data.items);
    const totalCents=items.reduce((sum,item)=>sum+item.totalCents,0);
    const discountBps=Math.max(0,Math.min(10000,Number(data.discountBps??0)));
    const finalTotalCents=Math.round(totalCents*(10000-discountBps)/10000);
    const year=new Date().getFullYear();
    const seq=await this.db.quoteSequence.upsert({where:{tenantId_year:{tenantId,year}},create:{tenantId,year,lastNumber:1},update:{lastNumber:{increment:1}}});
    const quote=await this.db.quote.create({data:{tenantId,clientId:client.id,number:`ORC-${year}-${String(seq.lastNumber).padStart(3,'0')}`,totalCents,discountBps,finalTotalCents,validityDays:Number(data.validityDays??30),notes:data.notes,items:{create:items}},include:{client:true,items:{include:{stages:true}}}});
    await this.audit(tenantId,actorUserId,'create','quote',quote.id,{number:quote.number,finalTotalCents});
    return quote;
  }

  async updateQuoteStatus(tenantId:string,id:string,status:string,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(quote.clientDecision)throw new BadRequestException('A decisão registrada pelo cliente não pode ser reaberta');
    if(!isQuoteStatus(quote.status)||!isQuoteStatus(status)||quote.status==='approved'||!QUOTE_TRANSITIONS[quote.status].includes(status))throw new BadRequestException(`Não é possível alterar orçamento ${quote.status} para ${status}`);
    const now=new Date(),validUntil=status==='sent'?new Date(now.getTime()+quote.validityDays*86400000):quote.validUntil;
    const updated=await this.db.quote.update({where:{id},data:{status,sentAt:status==='sent'?now:quote.sentAt,validUntil:status==='sent'?validUntil:quote.validUntil}});
    await this.audit(tenantId,actorUserId,'change_status','quote',id,{from:quote.status,to:status});
    return updated;
  }

  async approve(tenantId:string,id:string,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId},include:{client:true}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(!['draft','sent','approved'].includes(quote.status))throw new BadRequestException('Transição de status inválida');
    const q=await this.db.$transaction(async tx=>{const updated=await tx.quote.update({where:{id},data:{status:'approved',approvedAt:quote.approvedAt??new Date()}});await this.ensureProjectFromQuote(tx,quote);return updated;});
    await this.audit(tenantId,actorUserId,'approve','quote',id,{number:quote.number});
    return q;
  }
}
