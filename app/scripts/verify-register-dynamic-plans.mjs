import fs from 'node:fs';
const file=new URL('../src/modules/auth/screens/RegisterScreen.tsx',import.meta.url);
const source=fs.readFileSync(file,'utf8');
const must=[
 ["public plan catalog","api<PlanLimit[]>('/plans')"],
 ["dynamic plan mapper",'catalog.map((item,index)=>registerPlan(item,index,catalog.length))'],
 ["dynamic client limit",'plan.maxClients'],
 ["dynamic quote limit",'plan.maxQuotesPerMonth'],
 ["dynamic user limit",'plan.maxUsers'],
 ["dynamic monthly price",'plan.monthlyPriceCents'],
 ["dynamic annual price",'plan.annualPriceCents'],
 ["no hardcoded Starter price","R$ 49,90"],
 ["no hardcoded Pro price","R$ 99,90"],
 ["no hardcoded Business price","R$ 179,90"],
];
for(const [name,needle] of must){
  const forbidden=name.startsWith('no hardcoded');
  const ok=forbidden?!source.includes(needle):source.includes(needle);
  if(!ok){console.error(`FAIL ${name}`);process.exit(1)}
  console.log(`OK   ${name}`);
}
console.log('Dynamic registration plan catalog verification passed.');
