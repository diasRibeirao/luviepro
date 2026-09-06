import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/modules/plans/screens/PlansScreen.tsx',import.meta.url),'utf8');
const checks=[
 ['dynamic client feature','plan.maxClients'],
 ['dynamic quote feature','plan.maxQuotesPerMonth'],
 ['dynamic users feature','plan.maxUsers'],
 ['catalog plan name','{plan.name}'],
 ['catalog description',"plan.description||'Plano configurado para sua operação'"],
 ['catalog sort order','plan.sortOrder'],
 ['no old Starter limits','Até 10 orçamentos/mês'],
 ['no old Pro limits','Até 150 clientes'],
];
for(const [name,needle] of checks){
 const forbidden=name.startsWith('no old');
 const ok=forbidden?!source.includes(needle):source.includes(needle);
 if(!ok){console.error(`FAIL ${name}`);process.exit(1)}
 console.log(`OK   ${name}`);
}
console.log('Commercial plan catalog UI verification passed.');
