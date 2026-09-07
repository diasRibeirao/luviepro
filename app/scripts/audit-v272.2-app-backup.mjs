import fs from 'node:fs';
const read=(file)=>fs.readFileSync(file,'utf8');
const contracts=read('src/modules/platform/contracts.ts');
const sidebar=read('src/modules/platform/PlatformSidebar.tsx');
const screen=read('src/modules/platform/screens/PlatformScreen.tsx');
const data=read('src/modules/platform/usePlatformData.ts');
const backup=read('src/modules/platform/PlatformBackupRecovery.tsx');
const checks=[
 ['Platform tab contract includes backup',/\| 'backup'/.test(contracts)],
 ['Platform sidebar exposes Backup e recuperação',/Backup e recuperação/.test(sidebar)],
 ['Platform screen renders backup recovery',/PlatformBackupRecovery/.test(screen)&&/tab==='backup'/.test(screen)],
 ['Platform data skips list endpoint for backup tab',/tab==='backup'/.test(data)],
 ['Backup screen calls protected list endpoint',/\/platform\/backups/.test(backup)],
 ['Create backup action exists',/method: 'POST'/.test(backup)&&/Criar backup/.test(backup)],
 ['Download action exists',/apiDownload/.test(backup)&&/Baixar \.dump/.test(backup)],
 ['Verify action exists',/\/verify/.test(backup)&&/Verificar/.test(backup)],
 ['Restore simulation exists',/simulate-restore/.test(backup)&&/Simular restauração/.test(backup)],
 ['UI explains simulation is non destructive',/não altera o banco/.test(backup)],
 ['Responsive layout exists',/useWindowDimensions/.test(backup)&&/backupCardPhone/.test(backup)],
];
let failed=0;
console.log('v272.2 App backup audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`FAIL ${failed} contract(s)`);process.exit(1)}
console.log('OK v272.2 app backup contracts complete');
