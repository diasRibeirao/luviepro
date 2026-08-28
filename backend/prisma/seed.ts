import { PrismaClient } from '../../generated-prisma';
import { hash } from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const plans=[
    {plan:'starter',maxClients:30,maxQuotesPerMonth:10,maxUsers:1,customPdf:false,logoPdf:true,premiumTemplates:false,projectManagement:'basic',advancedReports:false,exportData:false,standardRoles:false,customRoles:false,granularPermissions:false,auditAccess:false,monthlyPriceCents:4990,quarterlyPriceCents:13473,semiannualPriceCents:25449,annualPriceCents:47904},
    {plan:'pro',maxClients:150,maxQuotesPerMonth:50,maxUsers:3,customPdf:true,logoPdf:true,premiumTemplates:false,projectManagement:'complete',advancedReports:true,exportData:false,standardRoles:true,customRoles:false,granularPermissions:false,auditAccess:false,monthlyPriceCents:9990,quarterlyPriceCents:26973,semiannualPriceCents:50949,annualPriceCents:95904},
    {plan:'business',maxClients:-1,maxQuotesPerMonth:-1,maxUsers:10,customPdf:true,logoPdf:true,premiumTemplates:true,projectManagement:'kanban',advancedReports:true,exportData:true,standardRoles:true,customRoles:true,granularPermissions:true,auditAccess:true,monthlyPriceCents:17990,quarterlyPriceCents:48573,semiannualPriceCents:91749,annualPriceCents:172704},
  ];
  for(const plan of plans) await db.planLimit.upsert({where:{plan:plan.plan},update:plan,create:plan});
  const platformEmail=process.env.PLATFORM_ADMIN_EMAIL||'master@luviepro.local';
  const platformPassword=process.env.PLATFORM_ADMIN_PASSWORD||'LuvieMaster123!';
  await (db as any).platformAdmin.upsert({where:{email:platformEmail},update:{name:'LuviePro Master',active:true},create:{name:'LuviePro Master',email:platformEmail,passwordHash:await hash(platformPassword,12),role:'platform_admin'}});
  const brand={name:'Luvie Organiza',responsibleName:'Luana Oliveira',phone:'(18) 99163-1532',contactEmail:'luvieorganiza@gmail.com',siteUrl:'www.luvieorganiza.com.br',instagram:'@luvieorganiza',primaryColor:'#2F4538',secondaryColor:'#C9A84C',proposalText:'Organização que transforma. Gestão que cresce.',plan:'pro',planPeriod:'annual'};
  const tenant = await db.tenant.upsert({ where:{slug:'luvie-organiza'}, update:brand, create:{...brand,slug:'luvie-organiza'} });
  await db.user.upsert({ where:{email:'luana@luviepro.local'}, update:{}, create:{tenantId:tenant.id,name:'Luana Oliveira',email:'luana@luviepro.local',passwordHash:await hash('LuviePro123!',12)} });
  const client = await db.client.findFirst({where:{tenantId:tenant.id,name:'Silzia Luz'}}) ?? await db.client.create({data:{tenantId:tenant.id,name:'Silzia Luz',phone:'(18) 99999-0000',city:'Presidente Prudente'}});
  if (!await db.service.count({where:{tenantId:tenant.id}})) await db.service.createMany({data:[
    {tenantId:tenant.id,code:'SVC-01',name:'Mudança residencial',description:'Planejamento, embalagem técnica, implantação e treinamento.',dailyRateCents:148000,defaultDays:5,people:5,variableCostCents:27500,fixedCostCents:114500,safetyMarginBps:5000},
    {tenantId:tenant.id,code:'SVC-06',name:'Organização de ambientes',description:'Organização completa por cômodos e treinamento.',dailyRateCents:105000,defaultDays:1,people:2,variableCostCents:15000,fixedCostCents:49000,safetyMarginBps:5000},
    {tenantId:tenant.id,code:'SVC-10',name:'Consultoria online',description:'Consultoria remota guiada com tarefas práticas.',dailyRateCents:5000,defaultDays:10,people:1,variableCostCents:0,fixedCostCents:0,safetyMarginBps:5000}
  ]});
  const moving=await db.service.findFirstOrThrow({where:{tenantId:tenant.id,name:'Mudança residencial'}});
  await db.service.update({where:{id:moving.id},data:{code:'SVC-01',description:'Planejamento, embalagem técnica, implantação e treinamento.',safetyMarginBps:5000}});
  if(!await db.serviceStage.count({where:{serviceId:moving.id}})) await db.serviceStage.createMany({data:[
    {tenantId:tenant.id,serviceId:moving.id,sequence:1,description:'Planejamento e embalagem técnica',duration:'2 dias'},
    {tenantId:tenant.id,serviceId:moving.id,sequence:2,description:'Implantação pós-mudança',duration:'1 dia'},
    {tenantId:tenant.id,serviceId:moving.id,sequence:3,description:'Estruturação do sistema',duration:'1 dia'},
    {tenantId:tenant.id,serviceId:moving.id,sequence:4,description:'Implementação da organização',duration:'2 dias'},
    {tenantId:tenant.id,serviceId:moving.id,sequence:5,description:'Treinamento de manutenção',duration:'1 dia'},
    {tenantId:tenant.id,serviceId:moving.id,sequence:6,description:'Gestão da devolução da casa',duration:'até 3 dias'},
  ]});
  if (!await db.project.count({where:{tenantId:tenant.id}})) await db.project.create({data:{tenantId:tenant.id,clientId:client.id,name:'Organização residencial — Silzia',status:'in_progress',progress:65}});
  if(process.env.DEMO_SEED==='1'){
    const cities=['Presidente Prudente','São Paulo','Londrina','Maringá','Bauru','Ribeirão Preto'];
    for(let i=1;i<=24;i++) await db.client.upsert({where:{id:`demo-client-${i}`},update:{},create:{id:`demo-client-${i}`,tenantId:tenant.id,name:`Cliente demonstração ${String(i).padStart(2,'0')}`,phone:`(18) 99000-${String(i).padStart(4,'0')}`,email:`cliente${i}@demo.luviepro.local`,city:cities[i%cities.length],state:'SP'}} as any);
    const demoClients=await db.client.findMany({where:{tenantId:tenant.id,id:{startsWith:'demo-client-'}},take:8,orderBy:{id:'asc'}});
    const today=new Date();today.setHours(9,0,0,0);
    const eventTypes=['appointment','visit','meeting','deadline'];
    for(let i=0;i<12;i++){const start=new Date(today);start.setDate(start.getDate()+i-2);start.setHours(9+(i%4)*2,0,0,0);const end=new Date(start);end.setHours(start.getHours()+1);await db.calendarEvent.upsert({where:{id:`demo-event-${i+1}`},update:{},create:{id:`demo-event-${i+1}`,tenantId:tenant.id,createdById:(await db.user.findFirstOrThrow({where:{tenantId:tenant.id}})).id,clientId:demoClients[i%demoClients.length]?.id??null,title:`Compromisso demonstração ${i+1}`,description:'Evento criado pela massa de testes.',type:eventTypes[i%eventTypes.length],startAt:start,endAt:end,allDay:false,location:i%2?'Escritório LuviePro':'Online',recurrence:'none',status:'scheduled',reminderMinutes:30}} as any)}
    for(let i=0;i<6;i++){const target=demoClients[i%demoClients.length];await db.project.upsert({where:{id:`demo-project-${i+1}`},update:{},create:{id:`demo-project-${i+1}`,tenantId:tenant.id,clientId:target.id,name:`Projeto demonstração ${String(i+1).padStart(2,'0')}`,status:i<2?'scheduled':i<5?'in_progress':'completed',progress:i<2?0:i<5?35+i*10:100,startDate:new Date(today.getFullYear(),today.getMonth(),today.getDate()-i*3),endDate:new Date(today.getFullYear(),today.getMonth()+1,today.getDate()+i*2),notes:'Registro criado pela massa de testes.'}} as any)}
  }
}
main().finally(()=>db.$disconnect());
