import fs from 'node:fs';

const company=fs.readFileSync(new URL('../app/src/modules/settings/screens/CompanyScreen.tsx',import.meta.url),'utf8');
const utils=fs.readFileSync(new URL('../app/src/modules/settings/colorUtils.ts',import.meta.url),'utf8');
const logo=fs.readFileSync(new URL('../app/src/modules/settings/components/LogoUpload.tsx',import.meta.url),'utf8');
const dto=fs.readFileSync(new URL('../backend/src/modules/account/dto/account.dto.ts',import.meta.url),'utf8');

const checks=[
  ['normaliza #RGB para #RRGGBB',/\^#\[0-9a-fA-F\]\{3\}\$/.test(utils)&&/toUpperCase\(\)/.test(utils)],
  ['valida cores na tela antes de salvar',company.includes('hexColorMessage(form.primaryColor)')&&company.includes('hexColorMessage(form.secondaryColor)')],
  ['mensagem aparece abaixo do campo correspondente',company.includes('error={formErrors.primaryColor}')&&company.includes('error={formErrors.secondaryColor}')],
  ['backend bloqueia formato de cor inválido',dto.includes("@Matches(/^#[0-9A-Fa-f]{6}$/")&&dto.includes('primaryColor deve usar o formato #RRGGBB')],
  ['alerta só informa detecção quando houve cor detectada',logo.includes("canUseCustomColors&&detectedPrimary?'A logo foi atualizada")],
  ['há prévia visual das duas cores',company.includes('Prévia das cores aplicadas à identidade visual.')],
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${label}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks OK`);
if(failed)process.exit(1);
