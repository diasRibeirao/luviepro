import fs from "node:fs";
const service=fs.readFileSync(new URL("../src/modules/services/screens/ServicesScreen.tsx",import.meta.url),"utf8");
const quote=fs.readFileSync(new URL("../src/modules/quotes/components/QuoteWizard.tsx",import.meta.url),"utf8");
const checks=[
 ["cadastro identifica P.O. responsável",service.includes("Diária base / P.O. responsável (R$)")],
 ["cadastro explica fallback sem equipe",service.includes("Sem equipe cadastrada, este valor será usado automaticamente como a diária da P.O. responsável no orçamento.")],
 ["cálculo ao vivo identifica equipe/P.O.",quote.includes("Diária equipe / P.O. responsável")],
 ["fallback técnico P.O. permanece",quote.includes("label:'P.O. responsável'")],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?"OK":"FAIL"} ${name}`); if(!ok) fail++;}
console.log(`\n${checks.length-fail}/${checks.length} checks OK`); process.exitCode=fail?1:0;
