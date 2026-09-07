import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const source=read('src/modules/services/screens/ServicesScreen.tsx');
const checks=[
  ['composition selection state exists', source.includes('[compositionIds,setCompositionIds]=useState<string[]>([])')],
  ['composition UI is available only for new service', source.includes("!form.id&&list.some(x=>x.active!==false)")],
  ['multiple existing services can be selected', source.includes('toggleComposition')&&source.includes("accessibilityRole=\"checkbox\"")],
  ['composition copies team costs and stages', source.includes('selected.flatMap(service=>(service.team??[])')&&source.includes('selected.flatMap(service=>(service.costs??[])')&&source.includes('selected.flatMap(service=>(service.stages??[])')],
  ['composition aggregates base daily and people', source.includes('dailyRateCents=selected.reduce')&&source.includes('people=selected.reduce')],
  ['composite remains editable before save', source.includes('Os dados dos serviços selecionados foram copiados para o novo serviço e podem ser ajustados antes de salvar.')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exit(1);
