import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const plans=[
    {plan:'starter',maxClients:30,maxQuotesPerMonth:10,maxUsers:1,customPdf:false,logoPdf:true,premiumTemplates:false,projectManagement:'basic',advancedReports:false,exportData:false,standardRoles:false,customRoles:false,granularPermissions:false,auditAccess:false,monthlyPriceCents:4990,quarterlyPriceCents:13473,semiannualPriceCents:25449,annualPriceCents:47904},
    {plan:'pro',maxClients:150,maxQuotesPerMonth:50,maxUsers:3,customPdf:true,logoPdf:true,premiumTemplates:false,projectManagement:'complete',advancedReports:true,exportData:false,standardRoles:true,customRoles:false,granularPermissions:false,auditAccess:false,monthlyPriceCents:9990,quarterlyPriceCents:26973,semiannualPriceCents:50949,annualPriceCents:95904},
    {plan:'business',maxClients:-1,maxQuotesPerMonth:-1,maxUsers:10,customPdf:true,logoPdf:true,premiumTemplates:true,projectManagement:'kanban',advancedReports:true,exportData:true,standardRoles:true,customRoles:true,granularPermissions:true,auditAccess:true,monthlyPriceCents:17990,quarterlyPriceCents:48573,semiannualPriceCents:91749,annualPriceCents:172704},
  ];
  for(const plan of plans) await db.planLimit.upsert({where:{plan:plan.plan},update:plan,create:plan});
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
}
main().finally(()=>db.$disconnect());
