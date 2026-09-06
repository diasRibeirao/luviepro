import {spawnSync} from 'node:child_process';
for(let v=204;v<=259;v++){
 const r=spawnSync(process.execPath,[`scripts/apply-i18n-v${v}.mjs`],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
console.log('\nOK v204-v259 applied. Run npm run typecheck && npm run verify, then node scripts/audit-i18n-v260.mjs');