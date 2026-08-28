import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { billingAction, isBillingPeriod, isPlanCode, periodEnd, periodPrice, type BillingPeriod, type PlanCode } from '../../plan-policy';
import { auditMetadata } from '../../observability/audit-metadata';
import { toJsonValue } from '../../domain/json-value';
import type { MercadoPagoWebhookDto } from './dto/billing.dto';
import type { CheckoutPreferenceBody, MercadoPagoPayment, MercadoPagoPreferenceResponse, MercadoPagoSearchResponse } from './types/mercado-pago.types';
import { jsonObject } from './types/mercado-pago.types';
import type { Prisma } from '../../../../generated-prisma';
import { normalizePaymentStatus } from '../../domain/payment-status';
import { buildExternalReference } from '../../domain/external-reference';
import { errorMessage } from '../../security/error-message';

type LocalPayment=Prisma.PaymentGetPayload<{}>;
import { SubscriptionService } from './subscription.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly db: PrismaService,
    private readonly subscriptions: SubscriptionService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entity:string,entityId?:string,metadata?:Record<string,string|number|boolean|Date|null|undefined>){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity,entityId,metadata:auditMetadata(metadata)}}).catch(()=>undefined);
  }
  private token(){const token=process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();if(!token)throw new BadRequestException('Mercado Pago ainda não foi configurado. Informe MERCADO_PAGO_ACCESS_TOKEN no backend.');return token;}
  private sandbox(){return process.env.MERCADO_PAGO_USE_SANDBOX==='true';}
  private async request(path:string,init:RequestInit={},timeoutMs=15_000){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(`https://api.mercadopago.com${path}`,{...init,signal:controller.signal,headers:{Authorization:`Bearer ${this.token()}`,...(init.headers??{})}});}
    catch{if(controller.signal.aborted)throw new BadRequestException('O Mercado Pago demorou para responder. Tente novamente em alguns instantes.');throw new BadRequestException('Não foi possível conectar ao Mercado Pago');}
    finally{clearTimeout(timer);}
  }

  async payments(tenantId:string){
    await this.subscriptions.activateScheduledIfDue(tenantId);
    const checkoutLimit=new Date(Date.now()-30*60*1000);
    await this.db.payment.updateMany({where:{tenantId,status:'pending',providerPaymentId:null,createdAt:{lt:checkoutLimit}},data:{status:'cancelled',cancelledAt:new Date(),providerStatusDetail:'checkout_expired'}});
    return this.db.payment.findMany({where:{tenantId},select:{id:true,provider:true,providerPaymentId:true,providerPreferenceId:true,plan:true,period:true,amountCents:true,status:true,billingAction:true,checkoutUrl:true,paymentMethod:true,providerStatus:true,providerStatusDetail:true,currency:true,payerEmail:true,paidAt:true,cancelledAt:true,refundedAt:true,chargebackAt:true,createdAt:true,updatedAt:true,subscription:{select:{id:true,status:true,startsAt:true,expiresAt:true}}},orderBy:{createdAt:'desc'},take:100});
  }

  async createCheckout(tenantId:string,actorUserId:string,plan:string,period:string){
    if(!isPlanCode(plan))throw new BadRequestException('Plano inválido');
    if(!isBillingPeriod(period))throw new BadRequestException('Período inválido');
    if(!this.redis)return this.createCheckoutUnlocked(tenantId,actorUserId,plan,period);
    const lock=await this.redis.withLock(`checkout:${tenantId}:${plan}:${period}`,20_000,()=>this.createCheckoutUnlocked(tenantId,actorUserId,plan,period));
    if(lock.acquired)return lock.value!;
    const checkoutLimit=new Date(Date.now()-30*60*1000);
    for(let attempt=0;attempt<12;attempt++){
      await new Promise(resolve=>setTimeout(resolve,250));
      const current=await this.db.payment.findFirst({where:{tenantId,plan,period,status:'pending',providerPaymentId:null,checkoutUrl:{not:null},createdAt:{gte:checkoutLimit}},orderBy:{createdAt:'desc'}});
      if(current?.checkoutUrl){await this.audit(tenantId,actorUserId,'resume_concurrent_checkout','payment',current.id,{plan,period});return {paymentId:current.id,preferenceId:current.providerPreferenceId,checkoutUrl:current.checkoutUrl,webhookConfigured:!!process.env.MERCADO_PAGO_WEBHOOK_URL,sandbox:this.sandbox(),billingAction:current.billingAction,reused:true};}
    }
    throw new ConflictException('Um checkout já está sendo preparado. Aguarde alguns segundos e tente novamente.');
  }

  private async createCheckoutUnlocked(tenantId:string,actorUserId:string,plan:PlanCode,period:BillingPeriod){
    this.token();
    const [tenant,limit,user]=await Promise.all([this.subscriptions.activateScheduledIfDue(tenantId),this.db.planLimit.findUnique({where:{plan}}),this.db.user.findFirst({where:{id:actorUserId,tenantId}})]);
    if(!tenant||!limit||!user)throw new NotFoundException('Conta, usuário ou plano não encontrado');
    const amountCents=periodPrice(limit,period);if(amountCents<=0)throw new BadRequestException('Este plano não possui preço configurado para o período selecionado');
    const action=billingAction(tenant.plan,plan,tenant.subscriptionExpiresAt);const effectiveAt=action==='downgrade'&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt>new Date()?tenant.subscriptionExpiresAt:new Date();
    const checkoutLimit=new Date(Date.now()-30*60*1000);
    const reusable=await this.db.payment.findFirst({where:{tenantId,plan,period,status:'pending',providerPaymentId:null,checkoutUrl:{not:null},createdAt:{gte:checkoutLimit}},orderBy:{createdAt:'desc'}});
    if(reusable?.checkoutUrl){await this.audit(tenantId,actorUserId,'resume_checkout','payment',reusable.id,{plan,period});return {paymentId:reusable.id,preferenceId:reusable.providerPreferenceId,checkoutUrl:reusable.checkoutUrl,webhookConfigured:!!process.env.MERCADO_PAGO_WEBHOOK_URL,sandbox:this.sandbox(),billingAction:reusable.billingAction,effectiveAt,reused:true};}
    await this.db.payment.updateMany({where:{tenantId,plan,period,status:'pending',providerPaymentId:null,createdAt:{lt:checkoutLimit}},data:{status:'cancelled',cancelledAt:new Date(),providerStatusDetail:'checkout_expired'}});
    const externalReference=buildExternalReference('luviepro',tenantId,randomBytes(4).toString('hex'));
    const payment=await this.db.payment.create({data:{tenantId,externalReference,plan,period,amountCents,status:'pending',billingAction:action,currency:'BRL',payerEmail:user.email}});
    const appUrl=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');const webhookUrl=process.env.MERCADO_PAGO_WEBHOOK_URL?.trim();const hasUsableReturn=!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(appUrl);
    const periodLabel=({monthly:'mensal',quarterly:'trimestral',semiannual:'semestral',annual:'anual'} as Record<string,string>)[period]??period;
    const body:CheckoutPreferenceBody={items:[{id:`${plan}-${period}`,title:`LuviePro ${plan[0].toUpperCase()+plan.slice(1)} — ${periodLabel}`,description:`Assinatura LuviePro (${periodLabel})`,currency_id:'BRL',quantity:1,unit_price:amountCents/100}],payer:{email:user.email},external_reference:externalReference,metadata:{payment_id:payment.id,tenant_id:tenantId,plan,period,billing_action:action},statement_descriptor:'LUVIEPRO'};
    if(hasUsableReturn){body.back_urls={success:`${appUrl}/plans?payment=success`,pending:`${appUrl}/plans?payment=pending`,failure:`${appUrl}/plans?payment=failure`};body.auto_return='approved';}if(webhookUrl?.startsWith('https://'))body.notification_url=webhookUrl;
    let response:Response;try{response=await this.request('/checkout/preferences',{method:'POST',headers:{'Content-Type':'application/json','X-Idempotency-Key':payment.id},body:JSON.stringify(body)});}catch(error){await this.db.payment.update({where:{id:payment.id},data:{status:'error'}});if(error instanceof BadRequestException)throw error;throw new BadRequestException('Não foi possível conectar ao Mercado Pago');}
    const result=await jsonObject<MercadoPagoPreferenceResponse>(response);if(!response.ok){await this.db.payment.update({where:{id:payment.id},data:{status:'error',raw:toJsonValue(result) as Prisma.InputJsonValue}});throw new BadRequestException(result.message||'Mercado Pago recusou a criação do checkout');}
    const checkoutUrl=(this.sandbox()?result.sandbox_init_point:result.init_point)||result.init_point;if(!checkoutUrl){await this.db.payment.update({where:{id:payment.id},data:{status:'error',raw:toJsonValue(result) as Prisma.InputJsonValue}});throw new BadRequestException('Mercado Pago não retornou uma URL de checkout');}
    await this.db.payment.update({where:{id:payment.id},data:{providerPreferenceId:String(result.id),checkoutUrl,raw:toJsonValue(result) as Prisma.InputJsonValue}});await this.audit(tenantId,actorUserId,'create_checkout','payment',payment.id,{plan,period,amountCents,provider:'mercado_pago',billingAction:action,sandbox:this.sandbox(),effectiveAt});
    return {paymentId:payment.id,preferenceId:result.id,checkoutUrl,webhookConfigured:!!body.notification_url,sandbox:this.sandbox(),billingAction:action,effectiveAt};
  }

  private validSignature(dataId:string,signature?:string,requestId?:string){const secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();if(!secret)return process.env.NODE_ENV!=='production'&&process.env.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS==='true';if(!signature||!requestId||!dataId)return false;const parts=Object.fromEntries(signature.split(',').map(part=>part.trim().split('=',2))) as Record<string,string>;if(!parts.ts||!parts.v1)return false;const manifest=`id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;const expected=createHmac('sha256',secret).update(manifest).digest('hex');const received=parts.v1;return expected.length===received.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(received));}
  private async fetchPayment(providerPaymentId:string):Promise<MercadoPagoPayment>{const response=await this.request(`/v1/payments/${encodeURIComponent(providerPaymentId)}`);if(!response.ok)throw new BadRequestException('Pagamento não encontrado no Mercado Pago');const payload=await jsonObject<MercadoPagoPayment>(response);if(payload.id===undefined)throw new BadRequestException('Resposta inválida do Mercado Pago');return payload as MercadoPagoPayment;}
  private mapStatus(status?:string|null){return normalizePaymentStatus(status);}

  private async processPayment(remote:MercadoPagoPayment,local:LocalPayment){
    if(!this.redis)return this.processPaymentUnlocked(remote,local);
    for(let attempt=0;attempt<12;attempt++){
      const lock=await this.redis.withLock(`payment:${local.id}`,20_000,async()=>{const current=await this.db.payment.findUnique({where:{id:local.id}});if(!current)throw new NotFoundException('Cobrança não encontrada');return this.processPaymentUnlocked(remote,current);});
      if(lock.acquired)return lock.value!;await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw new ConflictException('Esta cobrança já está sendo processada. Tente novamente em alguns segundos.');
  }

  private async processPaymentUnlocked(remote:MercadoPagoPayment,local:LocalPayment){
    const paymentId=String(remote.id||'');const mapped=this.mapStatus(remote.status);const remoteAmount=Math.round(Number(remote.transaction_amount??0)*100);const remoteCurrency=String(remote.currency_id||'BRL');
    if(String(remote.external_reference||'')!==local.externalReference)throw new BadRequestException('Referência do pagamento não confere');if(remoteAmount!==local.amountCents)throw new BadRequestException('Valor confirmado pelo Mercado Pago não confere com a cobrança');if(remoteCurrency!=='BRL')throw new BadRequestException('Moeda do pagamento não confere com a cobrança');
    if(local.status==='approved'&&['pending','rejected','cancelled'].includes(mapped)){await this.audit(local.tenantId,undefined,'payment_status_regression_ignored','payment',local.id,{providerPaymentId:paymentId,currentStatus:local.status,receivedStatus:mapped});return {ok:true,status:local.status,paymentId:local.id,ignored:true};}
    const now=new Date();const common:Prisma.PaymentUncheckedUpdateInput={providerPaymentId:paymentId,status:mapped,providerStatus:String(remote.status||mapped),providerStatusDetail:remote.status_detail?String(remote.status_detail):null,paymentMethod:remote.payment_type_id||remote.payment_method_id||null,currency:remoteCurrency,payerEmail:remote.payer?.email||local.payerEmail||null,raw:toJsonValue(remote as unknown as Record<string,string|number|boolean|null|undefined>) as Prisma.InputJsonValue};
    if(mapped==='approved'&&local.status!=='approved'){
      common.paidAt=remote.date_approved?new Date(remote.date_approved):now;const tenant=await this.subscriptions.activateScheduledIfDue(local.tenantId);if(!tenant)throw new NotFoundException('Conta da cobrança não encontrada');
      const action=local.billingAction||billingAction(tenant.plan,local.plan,tenant.subscriptionExpiresAt);let start=now;if((action==='renewal'||action==='downgrade')&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt>now)start=tenant.subscriptionExpiresAt;const expiresAt=periodEnd(start,local.period);const scheduled=start.getTime()>now.getTime()+1000;
      await this.db.$transaction(async tx=>{if(!scheduled)await tx.subscription.updateMany({where:{tenantId:local.tenantId,status:{in:['active','trial']}},data:{status:'replaced'}});const subscription=await tx.subscription.create({data:{tenantId:local.tenantId,plan:local.plan,period:local.period,amountCents:local.amountCents,status:scheduled?'scheduled':'active',startsAt:start,expiresAt}});if(action==='renewal'||!scheduled)await tx.tenant.update({where:{id:local.tenantId},data:{plan:local.plan,planPeriod:local.period,subscriptionExpiresAt:expiresAt,status:'active'}});await tx.payment.update({where:{id:local.id},data:{...common,subscriptionId:subscription.id}});});
      await this.audit(local.tenantId,undefined,'payment_approved','payment',local.id,{providerPaymentId:paymentId,plan:local.plan,period:local.period,billingAction:action,effectiveAt:start,expiresAt});
    }else{if(mapped==='cancelled')common.cancelledAt=now;if(mapped==='refunded')common.refundedAt=now;if(mapped==='charged_back')common.chargebackAt=now;await this.db.payment.update({where:{id:local.id},data:common});if((mapped==='refunded'||mapped==='charged_back')&&local.subscriptionId){const subscription=await this.db.subscription.findUnique({where:{id:local.subscriptionId}});if(subscription)await this.db.subscription.update({where:{id:subscription.id},data:{status:subscription.status==='scheduled'?'cancelled':'payment_review'}});}if(['rejected','cancelled','refunded','charged_back'].includes(mapped))await this.audit(local.tenantId,undefined,`payment_${mapped}`,'payment',local.id,{providerPaymentId:paymentId,statusDetail:remote.status_detail||null});}
    return {ok:true,status:mapped,paymentId:local.id};
  }

  private webhookEventKey(body:MercadoPagoWebhookDto,paymentId:string,requestId?:string){
    const explicit=String(requestId||body?.id||body?.notification_id||'').trim();
    if(explicit)return explicit;
    return createHash('sha256').update(JSON.stringify({paymentId,type:body?.type??null,action:body?.action??null,date:body?.date_created??body?.created_at??null,body})).digest('hex');
  }

  private async claimWebhookEvent(body:MercadoPagoWebhookDto,paymentId:string,requestId?:string){
    const eventKey=this.webhookEventKey(body,paymentId,requestId);const provider='mercado_pago';
    try{
      const event=await this.db.webhookEvent.create({data:{provider,eventKey,resourceId:paymentId,requestId:requestId||null,eventType:String(body?.action||body?.type||'payment'),payload:toJsonValue(body as unknown as Record<string, string | number | null | undefined>) as Prisma.InputJsonValue,status:'processing'}});
      return {event,duplicate:false};
    }catch(error:unknown){
      if(!(error&&typeof error==='object'&&'code' in error&&(error as {code?:string}).code==='P2002'))throw error;
      const existing=await this.db.webhookEvent.findUnique({where:{provider_eventKey:{provider,eventKey}}});
      if(!existing)return {event:null,duplicate:true};
      if(['processed','ignored'].includes(existing.status))return {event:existing,duplicate:true};
      const staleBefore=new Date(Date.now()-5*60_000);
      const claimed=await this.db.webhookEvent.updateMany({where:{id:existing.id,OR:[{status:'failed'},{status:'processing',updatedAt:{lt:staleBefore}}]},data:{status:'processing',attempts:{increment:1},lastError:null}});
      if(!claimed.count)return {event:existing,duplicate:true};
      return {event:await this.db.webhookEvent.findUnique({where:{id:existing.id}}),duplicate:false};
    }
  }

  async webhook(body:MercadoPagoWebhookDto,dataId?:string,signature?:string,requestId?:string){
    const paymentId=String(dataId||body?.data?.id||'');if(!paymentId)return {ok:true,ignored:true};
    if(!this.validSignature(paymentId,signature,requestId))throw new UnauthorizedException('Assinatura do webhook inválida');
    const claimed=await this.claimWebhookEvent(body,paymentId,requestId);
    if(claimed.duplicate)return {ok:true,duplicate:true,eventStatus:claimed.event?.status??'unknown'};
    const eventId=claimed.event?.id;
    try{
      const remote=await this.fetchPayment(paymentId);const externalReference=String(remote.external_reference||'');
      const local=await this.db.payment.findFirst({where:{OR:[{externalReference},{providerPaymentId:paymentId}]}});
      if(!local){if(eventId)await this.db.webhookEvent.update({where:{id:eventId},data:{status:'ignored',processedAt:new Date()}});return {ok:true,ignored:true};}
      if(eventId)await this.db.webhookEvent.update({where:{id:eventId},data:{tenantId:local.tenantId,paymentId:local.id}});
      const result=await this.processPayment(remote,local);
      if(eventId)await this.db.webhookEvent.update({where:{id:eventId},data:{status:'processed',processedAt:new Date(),lastError:null}});
      return result;
    }catch(error:unknown){
      const message=errorMessage(error);
      if(eventId)await this.db.webhookEvent.update({where:{id:eventId},data:{status:'failed',lastError:message.slice(0,1000)}}).catch(()=>undefined);
      throw error;
    }
  }

  async reconcilePendingBatch(limit=25,olderThanMinutes=5){
    const safeLimit=Math.max(1,Math.min(100,Number(limit)||25));const threshold=new Date(Date.now()-Math.max(1,Number(olderThanMinutes)||5)*60_000);
    const rows=await this.db.payment.findMany({where:{status:'pending',createdAt:{lte:threshold}},orderBy:{createdAt:'asc'},take:safeLimit});
    const result={scanned:rows.length,approved:0,pending:0,failed:0,skipped:0};
    for(const local of rows){
      try{
        let remote:MercadoPagoPayment;
        if(local.providerPaymentId)remote=await this.fetchPayment(local.providerPaymentId);
        else{const search=await this.request(`/v1/payments/search?external_reference=${encodeURIComponent(local.externalReference)}`);if(!search.ok){result.failed++;continue;}const payload=await jsonObject<MercadoPagoSearchResponse>(search);remote=payload.results?.[0] as MercadoPagoPayment;if(!remote){result.skipped++;continue;}}
        const processed=await this.processPayment(remote,local);if(processed.status==='approved')result.approved++;else result.pending++;
      }catch{result.failed++;}
    }
    return result;
  }

  async metrics(tenantId:string){
    const since24h=new Date(Date.now()-24*60*60_000);const staleBefore=new Date(Date.now()-15*60_000);
    const [byStatus,stalePending,approved24h,failedWebhooks24h,webhooks24h]=await Promise.all([
      this.db.payment.groupBy({by:['status'],where:{tenantId},_count:{_all:true}}),
      this.db.payment.count({where:{tenantId,status:'pending',createdAt:{lte:staleBefore}}}),
      this.db.payment.aggregate({where:{tenantId,status:'approved',paidAt:{gte:since24h}},_count:{_all:true},_sum:{amountCents:true}}),
      this.db.webhookEvent.count({where:{tenantId,status:'failed',createdAt:{gte:since24h}}}),
      this.db.webhookEvent.count({where:{tenantId,createdAt:{gte:since24h}}}),
    ]);
    return {payments:Object.fromEntries(byStatus.map(x=>[x.status,x._count._all])),stalePending,approved24h:{count:approved24h._count._all,amountCents:approved24h._sum.amountCents??0},webhooks24h:{total:webhooks24h,failed:failedWebhooks24h},timestamp:new Date().toISOString()};
  }
  async reconcileReturn(tenantId:string,providerPaymentId:string,actorUserId?:string){if(!providerPaymentId)throw new BadRequestException('Identificador do pagamento não informado');const remote=await this.fetchPayment(providerPaymentId);const externalReference=String(remote.external_reference||'');if(!externalReference)throw new BadRequestException('Pagamento sem referência externa');const local=await this.db.payment.findFirst({where:{tenantId,externalReference}});if(!local)throw new NotFoundException('Cobrança correspondente não encontrada');const result=await this.processPayment(remote,local);await this.audit(tenantId,actorUserId,'reconcile_checkout_return','payment',local.id,{providerPaymentId:String(providerPaymentId),status:result.status});return result;}
  async reconcile(tenantId:string,id:string,actorUserId:string){const local=await this.db.payment.findFirst({where:{id,tenantId}});if(!local)throw new NotFoundException('Cobrança não encontrada');if(!local.providerPaymentId){if(!local.externalReference)throw new BadRequestException('Cobrança sem referência externa');const search=await this.request(`/v1/payments/search?external_reference=${encodeURIComponent(local.externalReference)}`);if(!search.ok)throw new BadRequestException('Não foi possível consultar a cobrança no Mercado Pago');const result=await jsonObject<MercadoPagoSearchResponse>(search);const remote=result.results?.[0];if(!remote)throw new BadRequestException('Pagamento ainda não localizado no Mercado Pago');const processed=await this.processPayment(remote,local);await this.audit(tenantId,actorUserId,'reconcile_payment','payment',id,{providerPaymentId:String(remote.id)});return processed;}const remote=await this.fetchPayment(local.providerPaymentId);const processed=await this.processPayment(remote,local);await this.audit(tenantId,actorUserId,'reconcile_payment','payment',id,{providerPaymentId:local.providerPaymentId});return processed;}
}
