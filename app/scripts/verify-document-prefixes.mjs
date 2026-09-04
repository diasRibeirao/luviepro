import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const roots=['src','e2e'];
const extensions=new Set(['.ts','.tsx','.js','.mjs','.jsx']);
// ORC/PED eram os identificadores antigos. "Proposta comercial" continua sendo
// um texto configurável da empresa e, por isso, não é tratado como erro global.
const legacy=[/\bORC-\d/i,/\bPED-\d/i];
const problems=[];

function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','dist','.expo','coverage'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(extensions.has(path.extname(entry.name))){
      const lines=fs.readFileSync(full,'utf8').split(/\r?\n/);
      lines.forEach((line,index)=>{
        for(const pattern of legacy){
          if(pattern.test(line))problems.push(`${path.relative(root,full)}:${index+1}: ${line.trim()}`);
          pattern.lastIndex=0;
        }
      });
    }
  }
}

roots.forEach(dir=>walk(path.join(root,dir)));
if(problems.length){
  console.error('Foram encontradas referências aos identificadores legados ORC/PED:');
  problems.forEach(x=>console.error(` - ${x}`));
  process.exit(1);
}
console.log('OK: app e E2E sem identificadores legados ORC/PED.');
