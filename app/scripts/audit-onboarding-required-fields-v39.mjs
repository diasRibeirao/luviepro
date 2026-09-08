import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const company=fs.readFileSync(path.join(root,'src/modules/settings/screens/CompanyScreen.tsx'),'utf8');
const account=fs.readFileSync(path.join(root,'../backend/src/modules/account/account.service.ts'),'utf8');
const spec=fs.readFileSync(path.join(root,'../backend/src/modules/account/account.service.spec.ts'),'utf8');
const checks=[
  ['frontend requires company name during onboarding', company.includes("if(onboarding&&!form.name?.trim())next.name=")],
  ['frontend requires responsible name during onboarding', company.includes("if(onboarding&&!form.responsibleName?.trim())next.responsibleName=")],
  ['frontend requires contact email during onboarding', company.includes("if(onboarding&&!form.contactEmail?.trim())next.contactEmail=")],
  ['frontend returns to company-data tab on onboarding errors', company.includes("if(onboarding&&(next.name||next.responsibleName||next.contactEmail))setTab(0)")],
  ['backend blocks incomplete onboarding', account.includes("throw new BadRequestException(`Conclua os dados básicos do primeiro acesso:")],
  ['backend validates merged existing and submitted tenant data', account.includes("data.name??tenant.name")&&account.includes("data.responsibleName??tenant.responsibleName")&&account.includes("data.contactEmail??tenant.contactEmail")],
  ['backend regression tests cover reject and success', spec.includes("does not complete onboarding when basic company data is missing")&&spec.includes("completes onboarding after validating the merged company data")],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
