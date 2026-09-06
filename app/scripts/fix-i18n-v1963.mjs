import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const key='Ordem dos serviços atualizada';

// Match single-quoted, double-quoted, or bare identifier-style property keys on one line.
// This specific Portuguese key cannot be a bare identifier, but double quotes explain why the
// previous single-quote verifier could report 1 while TypeScript still saw a duplicate.
const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const re=new RegExp(`^\\s*(?:'${escaped}'|"${escaped}")\\s*:\\s*\\[[^\\n]*\\],?\\r?$`,'gm');
const matches=[...src.matchAll(re)];

console.log(`INFO occurrences before fix: ${matches.length}`);

if(matches.length===0){
  throw new Error(`Translation key not found: ${key}`);
}

if(matches.length>1){
  let seen=false;
  src=src.replace(re,(line)=>{
    if(!seen){seen=true;return line}
    return '';
  });
  fs.writeFileSync(file,src,'utf8');
  console.log(`OK   removed ${matches.length-1} duplicate occurrence(s)`);
}else{
  console.log('OK   key already unique; no source change required');
}

const finalSrc=fs.readFileSync(file,'utf8');
const finalMatches=[...finalSrc.matchAll(re)];
if(finalMatches.length!==1){
  throw new Error(`Expected exactly 1 occurrence after fix, found ${finalMatches.length}`);
}
console.log('OK   Ordem dos serviços atualizada -> 1');
console.log('\nv196.3 surgical duplicate fix complete.');
