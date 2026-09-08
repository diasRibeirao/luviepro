import fs from 'node:fs';

const quote = fs.readFileSync(new URL('../src/modules/quotes/components/QuoteWizard.tsx', import.meta.url), 'utf8');
const services = fs.readFileSync(new URL('../src/modules/services/screens/ServicesScreen.tsx', import.meta.url), 'utf8');

const checks = [
  ['helper centraliza diária efetiva', quote.includes('const effectiveDailyCents=(item:ServiceItem)=>')],
  ['cálculo usa diária efetiva', quote.includes('dailyRateCents:effectiveDailyCents(item),')],
  ['persistência usa a mesma diária efetiva', quote.includes('dailyRateCents:effectiveDailyCents(item),') && (quote.match(/dailyRateCents:effectiveDailyCents\(item\),/g)?.length ?? 0) >= 2],
  ['resumo ao vivo usa diária efetiva', quote.includes('const daily=effectiveDailyCents(item);')],
  ['cadastro valida diária base', services.includes("next.baseDaily='Informe uma diária base válida.'")],
  ['erro da diária base aparece no campo', services.includes('error={fieldErrors.baseDaily}')],
];

let ok = 0;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'OK' : 'FAIL'} - ${name}`);
  if (passed) ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if (ok !== checks.length) process.exit(1);
