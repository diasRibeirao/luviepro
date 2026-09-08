import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const seed=fs.readFileSync(new URL('../prisma/seed.ts',import.meta.url),'utf8');
const checks=[
  ['render start deploys migrations', pkg.scripts?.['render:start']?.includes('prisma:deploy')],
  ['render start does not seed on every boot', !pkg.scripts?.['render:start']?.includes('prisma:seed')],
  ['render start launches production build', pkg.scripts?.['render:start']?.includes('start:prod')],
  ['manual render seed remains available', pkg.scripts?.['render:seed']==='npm run prisma:seed'],
  ['demo tenant seed does not overwrite existing branding/account data', seed.includes("where:{slug:'luvie-organiza'}, update:{}, create:{...brand,slug:'luvie-organiza'}")]
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
