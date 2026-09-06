import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');
const expected=new Map([
  ["Orçamentos", ["Quotes", "Presupuestos"]],
  ["Novo orçamento", ["New quote", "Nuevo presupuesto"]],
  ["+ Novo orçamento", ["+ New quote", "+ Nuevo presupuesto"]],
  ["Não foi possível carregar orçamentos", ["Unable to load quotes", "No fue posible cargar los presupuestos"]],
  ["Nenhum orçamento encontrado.", ["No quotes found.", "No se encontraron presupuestos."]],
  ["ORÇAMENTO / CLIENTE", ["QUOTE / CLIENT", "PRESUPUESTO / CLIENTE"]],
  ["DATA", ["DATE", "FECHA"]],
  ["STATUS", ["STATUS", "ESTADO"]],
  ["VALOR", ["AMOUNT", "VALOR"]],
  ["AÇÕES", ["ACTIONS", "ACCIONES"]],
  ["Abrir orçamento", ["Open quote", "Abrir presupuesto"]],
  ["Visualizar proposta", ["View proposal", "Ver propuesta"]],
  ["Buscar orçamentos...", ["Search quotes...", "Buscar presupuestos..."]],
  ["Buscar por cliente, número ou status...", ["Search by client, number or status...", "Buscar por cliente, número o estado..."]],
  ["Mais recentes", ["Most recent", "Más recientes"]],
  ["Mais antigos", ["Oldest", "Más antiguos"]],
  ["Maior valor", ["Highest amount", "Mayor valor"]],
  ["Menor valor", ["Lowest amount", "Menor valor"]],
  ["Rascunho", ["Draft", "Borrador"]],
  ["Enviado", ["Sent", "Enviado"]],
  ["Aprovado", ["Approved", "Aprobado"]],
  ["Rejeitado", ["Rejected", "Rechazado"]],
  ["Expirado", ["Expired", "Vencido"]],
  ["Todos", ["All", "Todos"]],
  ["Cliente", ["Client", "Cliente"]],
  ["Data", ["Date", "Fecha"]],
  ["Validade", ["Validity", "Validez"]],
  ["Validade da proposta", ["Proposal validity", "Validez de la propuesta"]],
  ["Valor total", ["Total amount", "Valor total"]],
  ["Valor final", ["Final amount", "Valor final"]],
  ["Proposta", ["Proposal", "Propuesta"]],
  ["Enviar proposta", ["Send proposal", "Enviar propuesta"]],
  ["Duplicar orçamento", ["Duplicate quote", "Duplicar presupuesto"]],
  ["Editar orçamento", ["Edit quote", "Editar presupuesto"]],
  ["Salvar orçamento", ["Save quote", "Guardar presupuesto"]],
  ["Orçamento atualizado", ["Quote updated", "Presupuesto actualizado"]],
  ["Orçamento criado", ["Quote created", "Presupuesto creado"]],
  ["Não foi possível salvar orçamento", ["Unable to save quote", "No fue posible guardar el presupuesto"]],
  ["Não foi possível alterar orçamento", ["Unable to update quote", "No fue posible modificar el presupuesto"]],
  ["O orçamento foi alterado por outra operação. Atualize a proposta e tente novamente", ["The quote was changed by another operation. Refresh the proposal and try again", "El presupuesto fue modificado por otra operación. Actualiza la propuesta e inténtalo de nuevo"]],
  ["proposta vence hoje", ["proposal expires today", "la propuesta vence hoy"]],
  ["proposta vencida", ["proposal expired", "propuesta vencida"]],
]);

const start=src.indexOf('const exact:Record');
const end=src.indexOf('\n};',start);
if(start<0||end<0)throw new Error('Objeto exact de i18n não encontrado.');
const block=src.slice(start,end);

const keys=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]);
const counts=new Map();
for(const key of keys)counts.set(key,(counts.get(key)||0)+1);

let failed=0;
for(const key of expected.keys()){
  const count=counts.get(key)||0;
  if(count!==1){
    console.error(`FAIL ${key} -> ${count}`);
    failed++;
  }
}

const dupes=[...counts.entries()].filter(([,n])=>n>1);
if(dupes.length){
  console.error('FAIL duplicate i18n keys detected:');
  for(const [key,n] of dupes)console.error(` - ${key}: ${n}`);
  failed+=dupes.length;
}

if(failed)process.exit(1);
console.log(`OK   ${expected.size} quote i18n keys present exactly once`);
console.log('OK   no duplicate i18n keys');
console.log('\nv199 quote i18n verification passed.');
