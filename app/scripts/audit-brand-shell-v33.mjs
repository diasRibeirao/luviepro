import fs from 'node:fs';
const file=new URL('../src/components/AppShell.tsx',import.meta.url);
const src=fs.readFileSync(file,'utf8');
const checks=[
  ['secondary color decorates desktop active navigation', src.includes("color={active(item.href)?brandAccent:'rgba(255,255,255,.65)'}") && src.includes('backgroundColor:brandAccent')],
  ['secondary color decorates desktop plan', src.includes("style={[s.planTitle,{color:brandAccent}]}") && src.includes('width:`${planPercent}%`,backgroundColor:brandAccent')],
  ['secondary color decorates mobile bottom navigation', src.includes('active(item.href)&&{color:brandAccent}') && src.includes('mobileMenuOpen&&{color:brandAccent}')],
  ['mobile drawer receives tenant brand colors', src.includes('brandPrimary={brandPrimary} brandAccent={brandAccent}') && src.includes('brandPrimary:string;brandAccent:string')],
  ['mobile drawer uses primary on active elements', src.includes('backgroundColor:brandPrimary') && src.includes('active(item.href)&&{color:brandPrimary}')],
  ['mobile drawer uses secondary on plan progress', src.includes('menuStyles.mobilePlanBar,{width:`${planPercent}%`,backgroundColor:brandAccent}')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`); if(pass)ok++;}
console.log(`${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
