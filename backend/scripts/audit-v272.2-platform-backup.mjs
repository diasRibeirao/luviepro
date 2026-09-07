import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const controller=read('src/modules/platform/platform.controller.ts');
const moduleFile=read('src/modules/platform/platform.module.ts');
const service=read('src/modules/platform/platform-backup.service.ts');
const dto=read('src/modules/platform/dto/platform-backup.dto.ts');

const checks=[
 ['Backup service exists',fs.existsSync('src/modules/platform/platform-backup.service.ts')],
 ['Platform controller remains role restricted',/@Roles\('platform_admin'\)/.test(controller)],
 ['Backup list endpoint exists',/@Get\('backups'\)/.test(controller)],
 ['Backup create endpoint exists',/@Post\('backups'\)/.test(controller)],
 ['Backup download endpoint exists',/@Get\('backups\/:id\/download'\)/.test(controller)],
 ['Backup verify endpoint exists',/@Post\('backups\/:id\/verify'\)/.test(controller)],
 ['Restore simulation endpoint exists',/@Post\('backups\/:id\/simulate-restore'\)/.test(controller)],
 ['Platform module registers backup provider',/PlatformBackupService/.test(moduleFile)],
 ['Description is validated',/@MaxLength\(160\)/.test(dto)],
 ['Backup uses pg_dump custom format',/pg_dump/.test(service)&&/--format=custom/.test(service)],
 ['Backup uses existing manifest checksum',/createBackupManifest/.test(service)&&/verifyBackupPayload/.test(service)],
 ['Restore simulation uses existing preflight',/restorePreflight/.test(service)],
 ['Restore simulation is read-only',/pg_restore/.test(service)&&/--list/.test(service)],
 ['Database password is not passed in command arguments',/PGPASSWORD/.test(service)&&!(/postgres:\/\//.test(service))],
 ['Download validates manifest filename',/parsed\.fileName !== `\$\{id\}\.dump`/.test(service)],
 ['Retention is bounded',/BACKUP_RETENTION_COUNT/.test(service)&&/slice\(this\.retentionCount\)/.test(service)],
];
let failed=0;
console.log('v272.2 Platform backup audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`FAIL ${failed} contract(s)`);process.exit(1)}
console.log('OK v272.2 platform backup contracts complete');
