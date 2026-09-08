import fs from 'node:fs';
const file=new URL('../src/modules/settings/screens/CompanyScreen.tsx',import.meta.url);
const src=fs.readFileSync(file,'utf8');
const checks=[
  ['usa Image para mostrar a logo na prévia',src.includes("import { Image,Pressable")],
  ['prévia usa cor primária configurada',src.includes("backgroundColor:normalizeHexColor(form.primaryColor)||theme.g800")],
  ['prévia usa cor secundária configurada',src.includes("backgroundColor:normalizeHexColor(form.secondaryColor)||theme.gold")],
  ['prévia mostra nome da empresa',src.includes("form.name?.trim()||'Minha empresa'")],
  ['prévia mostra identificação LuviePro',src.includes('LuviePro · Gestão para decoradores')],
  ['prévia é identificada para o usuário',src.includes('Prévia da navegação')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
