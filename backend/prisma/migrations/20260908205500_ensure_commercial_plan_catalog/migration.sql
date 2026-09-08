-- Ensure the commercial plan catalog exists even on a database created only by prisma migrate deploy.
-- This migration is idempotent and does not touch tenant subscriptions.

INSERT INTO "PlanLimit" (
  "plan","name","description","active","sortOrder",
  "maxClients","maxQuotesPerMonth","maxUsers",
  "customPdf","logoPdf","premiumTemplates","projectManagement",
  "advancedReports","exportData","standardRoles","customRoles",
  "granularPermissions","auditAccess",
  "monthlyPriceCents","quarterlyPriceCents","semiannualPriceCents","annualPriceCents",
  "createdAt","updatedAt"
) VALUES
  ('basic','Basic','Para começar com organização e controle essencial',true,10,10,10,1,false,true,false,'basic',false,false,false,false,false,false,6990,18873,35649,67104,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('starter','Starter','Para profissionais com operação em crescimento',true,20,30,30,1,false,true,false,'basic',false,false,false,false,false,false,9990,26973,50949,95904,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('pro','Pro','Para equipes que precisam de gestão completa e escala',true,30,100,100,3,true,true,false,'complete',true,false,true,false,false,false,11990,32373,61149,115104,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('business','Business','Para operações avançadas com alto volume e controle total',true,40,-1,-1,10,true,true,true,'kanban',true,true,true,true,true,true,14990,40473,76449,143904,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("plan") DO UPDATE SET
  "name"=EXCLUDED."name",
  "description"=EXCLUDED."description",
  "active"=EXCLUDED."active",
  "sortOrder"=EXCLUDED."sortOrder",
  "maxClients"=EXCLUDED."maxClients",
  "maxQuotesPerMonth"=EXCLUDED."maxQuotesPerMonth",
  "maxUsers"=EXCLUDED."maxUsers",
  "customPdf"=EXCLUDED."customPdf",
  "logoPdf"=EXCLUDED."logoPdf",
  "premiumTemplates"=EXCLUDED."premiumTemplates",
  "projectManagement"=EXCLUDED."projectManagement",
  "advancedReports"=EXCLUDED."advancedReports",
  "exportData"=EXCLUDED."exportData",
  "standardRoles"=EXCLUDED."standardRoles",
  "customRoles"=EXCLUDED."customRoles",
  "granularPermissions"=EXCLUDED."granularPermissions",
  "auditAccess"=EXCLUDED."auditAccess",
  "monthlyPriceCents"=EXCLUDED."monthlyPriceCents",
  "quarterlyPriceCents"=EXCLUDED."quarterlyPriceCents",
  "semiannualPriceCents"=EXCLUDED."semiannualPriceCents",
  "annualPriceCents"=EXCLUDED."annualPriceCents",
  "updatedAt"=CURRENT_TIMESTAMP;
