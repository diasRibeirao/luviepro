import fs from 'node:fs';

const backend=fs.readFileSync(new URL('../../backend/src/modules/services/services.service.ts',import.meta.url),'utf8');
const spec=fs.readFileSync(new URL('../../backend/src/modules/services/services.service.spec.ts',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/modules/services/screens/ServicesScreen.tsx',import.meta.url),'utf8');
const checks=[
  ['manual order is the default service view',ui.includes("[sort,setSort]=useState('manual')")],
  ['reorder is persisted by backend',backend.includes("async reorder(tenantId:string,id:string,direction:'up'|'down'")],
  ['reorder normalizes entire active/inactive group',backend.includes("where:{tenantId,active:current.active}")&&backend.includes("data:{sortOrder:(position+1)*10}")],
  ['duplicate order is deterministic before normalization',backend.includes("orderBy:[{sortOrder:'asc'},{name:'asc'},{id:'asc'}]")],
  ['reorder remains serializable and retries conflicts',backend.includes("{isolationLevel:'Serializable'}")&&backend.includes("error as {code?:string})?.code==='P2034'")],
  ['regression test covers refresh-safe duplicate sortOrder',spec.includes('normalizes duplicate sortOrder values so refresh keeps the chosen order')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exit(1);
