-- LuviePro v187 - commercial plan matrix
-- Keeps existing subscriptions/tenants untouched; only updates the active catalog.

INSERT INTO "PlanLimit" (
  "plan","name","description","active","sortOrder",
  "maxClients","maxQuotesPerMonth","maxUsers",
  "customPdf","logoPdf","premiumTemplates","projectManagement",
  "advancedReports","exportData","standardRoles","customRoles",
  "granularPermissions","auditAccess",
  "monthlyPriceCents","quarterlyPriceCents","semiannualPriceCents","annualPriceCents",
  "createdAt","updatedAt"
) VALUES
(
  'basic','Basic','Para começar com organização e controle essencial',true,10,
  10,10,1,
  false,true,false,'basic',
  false,false,false,false,
  false,false,
  6990,18873,35649,67104,
  CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
)
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

UPDATE "PlanLimit" SET
  "name"='Starter',
  "description"='Para profissionais com operação em crescimento',
  "active"=true,
  "sortOrder"=20,
  "maxClients"=30,
  "maxQuotesPerMonth"=30,
  "maxUsers"=1,
  "customPdf"=false,
  "logoPdf"=true,
  "premiumTemplates"=false,
  "projectManagement"='basic',
  "advancedReports"=false,
  "exportData"=false,
  "standardRoles"=false,
  "customRoles"=false,
  "granularPermissions"=false,
  "auditAccess"=false,
  "monthlyPriceCents"=9990,
  "quarterlyPriceCents"=26973,
  "semiannualPriceCents"=50949,
  "annualPriceCents"=95904,
  "updatedAt"=CURRENT_TIMESTAMP
WHERE "plan"='starter';

UPDATE "PlanLimit" SET
  "name"='Pro',
  "description"='Para equipes que precisam de gestão completa e escala',
  "active"=true,
  "sortOrder"=30,
  "maxClients"=100,
  "maxQuotesPerMonth"=100,
  "maxUsers"=3,
  "customPdf"=true,
  "logoPdf"=true,
  "premiumTemplates"=false,
  "projectManagement"='complete',
  "advancedReports"=true,
  "exportData"=false,
  "standardRoles"=true,
  "customRoles"=false,
  "granularPermissions"=false,
  "auditAccess"=false,
  "monthlyPriceCents"=11990,
  "quarterlyPriceCents"=32373,
  "semiannualPriceCents"=61149,
  "annualPriceCents"=115104,
  "updatedAt"=CURRENT_TIMESTAMP
WHERE "plan"='pro';

UPDATE "PlanLimit" SET
  "name"='Business',
  "description"='Para operações avançadas com alto volume e controle total',
  "active"=true,
  "sortOrder"=40,
  "maxClients"=-1,
  "maxQuotesPerMonth"=-1,
  "maxUsers"=10,
  "customPdf"=true,
  "logoPdf"=true,
  "premiumTemplates"=true,
  "projectManagement"='kanban',
  "advancedReports"=true,
  "exportData"=true,
  "standardRoles"=true,
  "customRoles"=true,
  "granularPermissions"=true,
  "auditAccess"=true,
  "monthlyPriceCents"=14990,
  "quarterlyPriceCents"=40473,
  "semiannualPriceCents"=76449,
  "annualPriceCents"=143904,
  "updatedAt"=CURRENT_TIMESTAMP
WHERE "plan"='business';
