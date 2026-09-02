import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../src/modules/quotes/paymentPlan.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('module','exports',compiled)(module,module.exports);
const {standardPaymentPlan}=module.exports;

test('plano padrão cobra 30% via PIX e parcela os 70% restantes no cartão',()=>{
  assert.deepEqual(standardPaymentPlan(10001),{depositCents:3000,installments:10,installmentCents:700,lastInstallmentCents:701,cashCents:10001});
});
