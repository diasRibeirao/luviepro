import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const file=path.join(root,"src/components/AppShell.tsx");
const s=fs.readFileSync(file,"utf8");
const checks=[
 ["desktop heading uses tenant name", /systemTitle}>\{tenantName\}<\/Text>/.test(s)],
 ["product name remains as subtitle", /systemSubtitle}>LuviePro · \{tr\('Gestão para decoradores'\)\}/.test(s)],
 ["desktop sidebar remains tenant branded", /style=\{\[s\.sidebar,\{backgroundColor:brandPrimary\}/.test(s)],
 ["desktop logo navigates home", /accessibilityLabel=\{tr\('Ir para o início'\)\} onPress=\{\(\)=>navigate\('\/home'\)\}/.test(s)],
 ["mobile brand remains tenant name", /style=\{\[s\.mobileLogo,\{color:brandForeground\}\]\}>\{tenantName\}<\/Text>/.test(s)],
];
let ok=0; for(const [name,pass] of checks){console.log(`${pass?"OK":"FAIL"} - ${name}`); if(pass) ok++;}
console.log(`${ok}/${checks.length} checks OK`); if(ok!==checks.length) process.exit(1);
