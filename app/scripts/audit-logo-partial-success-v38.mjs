import fs from 'node:fs';
const file=new URL('../src/modules/settings/components/LogoUpload.tsx',import.meta.url);
const s=fs.readFileSync(file,'utf8');
const checks=[
 ['brand refresh happens immediately after successful logo upload',/onChanged\(tenant\.logoUrl\?\?null\);[\s\S]{0,300}emitTenantBrandChanged\(\)/.test(s)],
 ['automatic color persistence is isolated in its own try/catch',/if\(canUseCustomColors&&detectedPrimary\)\{\s*try\{await api<TenantSettings>\('\/account\/settings'/.test(s)],
 ['color failure keeps suggested color in the form',/catch\(colorError:unknown\)\{onPrimaryColorDetected\?\.\(detectedPrimary\)/.test(s)],
 ['color failure explains that logo was saved',/A logo foi salva, mas não foi possível salvar automaticamente a cor sugerida/.test(s)],
 ['successful color persistence refreshes tenant brand again',/onPrimaryColorDetected\?\.\(detectedPrimary\);emitTenantBrandChanged\(\)/.test(s)],
 ['generic upload failure remains reserved for upload errors',/Não foi possível enviar o logo/.test(s)],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
