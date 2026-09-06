import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
  ["Financeiro", ["Finance", "Finanzas"]],
  ["Visão financeira", ["Financial overview", "Resumen financiero"]],
  ["Receitas", ["Income", "Ingresos"]],
  ["Despesas", ["Expenses", "Gastos"]],
  ["Saldo", ["Balance", "Saldo"]],
  ["Saldo atual", ["Current balance", "Saldo actual"]],
  ["Saldo previsto", ["Projected balance", "Saldo previsto"]],
  ["Entradas", ["Inflows", "Entradas"]],
  ["Saídas", ["Outflows", "Salidas"]],
  ["Contas a receber", ["Accounts receivable", "Cuentas por cobrar"]],
  ["Contas a pagar", ["Accounts payable", "Cuentas por pagar"]],
  ["Novo lançamento", ["New transaction", "Nuevo movimiento"]],
  ["Editar lançamento", ["Edit transaction", "Editar movimiento"]],
  ["Excluir lançamento", ["Delete transaction", "Eliminar movimiento"]],
  ["Salvar lançamento", ["Save transaction", "Guardar movimiento"]],
  ["Lançamento criado", ["Transaction created", "Movimiento creado"]],
  ["Lançamento atualizado", ["Transaction updated", "Movimiento actualizado"]],
  ["Lançamento excluído", ["Transaction deleted", "Movimiento eliminado"]],
  ["Não foi possível salvar o lançamento", ["Unable to save the transaction", "No fue posible guardar el movimiento"]],
  ["Não foi possível excluir o lançamento", ["Unable to delete the transaction", "No fue posible eliminar el movimiento"]],
  ["Tipo", ["Type", "Tipo"]],
  ["Categoria", ["Category", "Categoría"]],
  ["Descrição", ["Description", "Descripción"]],
  ["Valor", ["Amount", "Valor"]],
  ["Data", ["Date", "Fecha"]],
  ["Vencimento", ["Due date", "Vencimiento"]],
  ["Competência", ["Accrual date", "Fecha de devengo"]],
  ["Pagamento", ["Payment", "Pago"]],
  ["Recebimento", ["Receipt", "Cobro"]],
  ["Pago", ["Paid", "Pagado"]],
  ["Recebido", ["Received", "Cobrado"]],
  ["Pendente", ["Pending", "Pendiente"]],
  ["Vencido", ["Overdue", "Vencido"]],
  ["Cancelado", ["Cancelled", "Cancelado"]],
  ["Forma de pagamento", ["Payment method", "Método de pago"]],
  ["Formas de pagamento", ["Payment methods", "Métodos de pago"]],
  ["Nova forma de pagamento", ["New payment method", "Nuevo método de pago"]],
  ["Editar forma de pagamento", ["Edit payment method", "Editar método de pago"]],
  ["Forma de pagamento criada", ["Payment method created", "Método de pago creado"]],
  ["Forma de pagamento atualizada", ["Payment method updated", "Método de pago actualizado"]],
  ["Forma de pagamento excluída", ["Payment method deleted", "Método de pago eliminado"]],
  ["Não foi possível excluir a forma de pagamento", ["Unable to delete the payment method", "No fue posible eliminar el método de pago"]],
  ["Não é possível excluir a última forma de pagamento ativa.", ["The last active payment method cannot be deleted.", "No se puede eliminar el último método de pago activo."]],
  ["Categorias financeiras", ["Financial categories", "Categorías financieras"]],
  ["Nova categoria", ["New category", "Nueva categoría"]],
  ["Editar categoria", ["Edit category", "Editar categoría"]],
  ["Categoria criada", ["Category created", "Categoría creada"]],
  ["Categoria atualizada", ["Category updated", "Categoría actualizada"]],
  ["Categoria excluída", ["Category deleted", "Categoría eliminada"]],
  ["Não foi possível excluir a categoria", ["Unable to delete the category", "No fue posible eliminar la categoría"]],
  ["Ordem das categorias atualizada", ["Category order updated", "Orden de categorías actualizado"]],
  ["Não foi possível reorganizar", ["Unable to reorder", "No fue posible reordenar"]],
  ["Centro de custo", ["Cost center", "Centro de costo"]],
  ["Observações", ["Notes", "Observaciones"]],
  ["Buscar lançamentos...", ["Search transactions...", "Buscar movimientos..."]],
  ["Buscar por descrição, categoria ou forma de pagamento...", ["Search by description, category or payment method...", "Buscar por descripción, categoría o método de pago..."]],
  ["Todos", ["All", "Todos"]],
  ["Este mês", ["This month", "Este mes"]],
  ["Mês anterior", ["Previous month", "Mes anterior"]],
  ["Próximo mês", ["Next month", "Próximo mes"]],
  ["Hoje", ["Today", "Hoy"]],
  ["Últimos 7 dias", ["Last 7 days", "Últimos 7 días"]],
  ["Últimos 30 dias", ["Last 30 days", "Últimos 30 días"]],
  ["Nenhum lançamento encontrado", ["No transactions found", "No se encontraron movimientos"]],
  ["Revise os filtros ou adicione um novo lançamento.", ["Review the filters or add a new transaction.", "Revisa los filtros o agrega un nuevo movimiento."]],
  ["Total", ["Total", "Total"]],
  ["Subtotal", ["Subtotal", "Subtotal"]],
  ["Filtro", ["Filter", "Filtro"]],
  ["Filtrar", ["Filter", "Filtrar"]],
  ["Limpar filtros", ["Clear filters", "Limpiar filtros"]],
  ["Exportar", ["Export", "Exportar"]],
  ["Exportar CSV", ["Export CSV", "Exportar CSV"]],
  ["Relatório financeiro", ["Financial report", "Informe financiero"]],
  ["Fluxo de caixa", ["Cash flow", "Flujo de caja"]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
  ["Salvar", ["Save", "Guardar"]],
  ["Cancelar", ["Cancel", "Cancelar"]],
  ["Salvando...", ["Saving...", "Guardando..."]],
  ["Excluir", ["Delete", "Eliminar"]],
  ["Editar", ["Edit", "Editar"]],
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

console.log(`OK   finance i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   finance i18n keys added: ${missing.length}`);
console.log(`INFO total finance i18n keys: ${entries.size}`);
console.log('\nv201 finance i18n consolidation complete.');
