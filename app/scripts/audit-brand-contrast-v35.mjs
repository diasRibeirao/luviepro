import fs from 'node:fs';
const file=new URL('../src/components/AppShell.tsx',import.meta.url);
const src=fs.readFileSync(file,'utf8');
const checks=[
  ['helper de contraste relativo existe',src.includes('function readableOn(hex:string)')&&src.includes('luminance>.46')],
  ['foreground deriva da cor primária do tenant',src.includes('const brandForeground=readableOn(brandPrimary)')],
  ['menu desktop usa foreground/muted dinâmico',src.includes('color={active(item.href)?brandAccent:brandMuted}')&&src.includes('{color:brandForeground}')],
  ['nome/tagline respeitam contraste',src.includes('s.brand,{color:brandForeground}')&&src.includes('s.tagline,{color:brandSubtle}')],
  ['cabeçalho mobile usa foreground dinâmico',src.includes('s.mobileLogo,{color:brandForeground}')&&src.includes('name="menu-outline" size={22} color={brandForeground}')],
  ['ícones de notificação/conta mobile respeitam contraste',src.includes("notifications-outline'} size={19} color={brandForeground}")&&src.includes('name="person-outline" size={19} color={brandForeground}')],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++}
console.log(`\n${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
