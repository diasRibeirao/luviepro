import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src','modules','casa-nova','screens','CasaNovaScreen.tsx');
const src=fs.readFileSync(file,'utf8');

const checks=[
 ['bulk quantity mode helper exists',src.includes('const bulkQuantityMode=async(isScalable:boolean)=>')],
 ['fixed mode freezes displayed quantity',src.includes('quantityOverride:isScalable?null:quantity(item,guests)')],
 ['automatic mode clears manual override',src.includes('quantityOverride:isScalable?null:quantity(item,guests)')],
 ['bulk fixed button uses quantity mode helper',src.includes('onPress={()=>void bulkQuantityMode(false)}')],
 ['bulk automatic button uses quantity mode helper',src.includes('onPress={()=>void bulkQuantityMode(true)}')],
 ['old bulk isScalable button path removed',!src.includes('onPress={()=>void bulkUpdate({isScalable:false})}')&&!src.includes('onPress={()=>void bulkUpdate({isScalable:true})}')],
];

let failed=0;
for(const [name,pass] of checks){
 console.log(`${pass?'OK  ':'FAIL'} ${name}`);
 if(!pass)failed++;
}
if(failed){
 console.error(`\n${failed} Casa Nova quantity mode check(s) failed.`);
 process.exit(1);
}
console.log('\nCasa Nova bulk quantity mode verification passed.');
