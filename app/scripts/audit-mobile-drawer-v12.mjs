import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8');
const checks=[
 ['hamburger is available in reduced header',src.includes("name=\"menu-outline\"")&&src.includes('setMobileMenuOpen(true)')],
 ['menu is a right side drawer',src.includes("alignItems:'flex-end'")&&src.includes("width:'86%'")&&src.includes('maxWidth:390')],
 ['drawer fills screen height',src.includes("height:'100%'")],
 ['drawer has left-side rounding',src.includes('borderTopLeftRadius:22')&&src.includes('borderBottomLeftRadius:22')],
 ['all allowed navigation items remain in drawer',src.includes('menuItems.map(item=>')],
 ['drawer closes after navigation',src.includes("const navigate=(href:string)=>{setMobileMenuOpen(false)")],
];
let ok=0;for(const [n,v] of checks){console.log(`${v?'OK':'FAIL'} - ${n}`);if(v)ok++;}
console.log(`${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
