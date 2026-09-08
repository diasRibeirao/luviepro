import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/modules/settings/components/LogoUpload.tsx',import.meta.url),'utf8');
const checks=[
 ['detecta cor no arquivo local antes do upload', source.includes('dominantLogoColor(asset.uri)')],
 ['não depende da URL remota para ler pixels', !source.includes('dominantLogoColor(tenant.logoUrl)')],
 ['persiste cor detectada no tenant', source.includes('primaryColor:detectedPrimary')],
 ['propaga cor detectada para formulário', source.includes('onPrimaryColorDetected?.(detectedPrimary)')],
 ['notifica AppShell para recarregar identidade', source.includes('emitTenantBrandChanged()')],
];
for(const [name,ok] of checks) console.log(`${ok?'OK':'FAIL'} ${name}`);
if(checks.some(([,ok])=>!ok)) process.exit(1);
