import fs from 'node:fs';
const src=fs.readFileSync('src/modules/access/access-management.service.ts','utf8');
const ok=/first-access\?token=\$\{encodeURIComponent\(token\)\}/.test(src);
console.log('v269 backend first-access link audit');
console.log(`${ok?'OK':'FAIL'} invitation URL uses /first-access?token=...`);
if(!ok)process.exit(1);
