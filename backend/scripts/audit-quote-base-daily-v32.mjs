import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/modules/quotes/quotes.service.ts', import.meta.url),'utf8');
const checks=[
  ['fallback de R$ 300 somente quando diária não é informada', /input\.dailyRateCents!==undefined[\s\S]*30000/],
  ['valor explícito continua sendo respeitado', /\? input\.dailyRateCents/],
  ['cálculo usa a diária efetiva', /this\.calculate\(\{dailyRateCents,days,people/],
  ['snapshot do item salva a mesma diária efetiva', /configurationJson:\{serviceId:service\.id,dailyRateCents,/],
];
let ok=0;
for(const [name,re] of checks){
  const pass=re.test(source);
  console.log(`${pass?'OK':'FAIL'} - ${name}`);
  if(pass)ok++;
}
console.log(`${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
