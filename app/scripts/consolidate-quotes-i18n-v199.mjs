import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
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
if(start<0)throw new Error('Objeto exact de i18n não encontrado.');
const end=src.indexOf('\n};',start);
if(end<0)throw new Error('Fim do objeto exact de i18n não encontrado.');

let block=src.slice(start,end);
const keys=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]);
const existing=new Set(keys);
const missing=[];

for(const [key,pair] of entries){
  if(!existing.has(key)){
    missing.push(` ${JSON.stringify(key)}:[${JSON.stringify(pair[0])},${JSON.stringify(pair[1])}],`);
  }
}

if(missing.length){
  block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
  src=src.slice(0,start)+block+src.slice(end);
  fs.writeFileSync(file,src,'utf8');
}

console.log(`OK   quote i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   quote i18n keys added: ${missing.length}`);
console.log(`INFO total quote i18n keys: ${entries.size}`);
console.log('\nv199 quote i18n consolidation complete.');
