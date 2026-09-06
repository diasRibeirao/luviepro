import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
  ["Assinatura", ["Subscription", "Suscripción"]],
  ["Plano atual", ["Current plan", "Plan actual"]],
  ["Planos", ["Plans", "Planes"]],
  ["Escolher plano", ["Choose plan", "Elegir plan"]],
  ["Alterar plano", ["Change plan", "Cambiar plan"]],
  ["Gerenciar assinatura", ["Manage subscription", "Gestionar suscripción"]],
  ["Detalhes da assinatura", ["Subscription details", "Detalles de la suscripción"]],
  ["Seu plano", ["Your plan", "Tu plan"]],
  ["Plano", ["Plan", "Plan"]],
  ["Periodicidade", ["Billing cycle", "Periodicidad"]],
  ["Mensal", ["Monthly", "Mensual"]],
  ["Trimestral", ["Quarterly", "Trimestral"]],
  ["Semestral", ["Semiannual", "Semestral"]],
  ["Anual", ["Annual", "Anual"]],
  ["Por mês", ["Per month", "Por mes"]],
  ["por mês", ["per month", "por mes"]],
  ["Economize", ["Save", "Ahorra"]],
  ["Clientes incluídos", ["Included clients", "Clientes incluidos"]],
  ["Orçamentos incluídos", ["Included quotes", "Presupuestos incluidos"]],
  ["Usuários incluídos", ["Included users", "Usuarios incluidos"]],
  ["Ilimitado", ["Unlimited", "Ilimitado"]],
  ["Assinar", ["Subscribe", "Suscribirse"]],
  ["Selecionar plano", ["Select plan", "Seleccionar plan"]],
  ["Plano selecionado", ["Plan selected", "Plan seleccionado"]],
  ["Plano atualizado", ["Plan updated", "Plan actualizado"]],
  ["Não foi possível alterar o plano", ["Unable to change the plan", "No fue posible cambiar el plan"]],
  ["Pagamento", ["Payment", "Pago"]],
  ["Pagamentos", ["Payments", "Pagos"]],
  ["Forma de pagamento", ["Payment method", "Método de pago"]],
  ["Status do pagamento", ["Payment status", "Estado del pago"]],
  ["Pendente", ["Pending", "Pendiente"]],
  ["Aprovado", ["Approved", "Aprobado"]],
  ["Recusado", ["Declined", "Rechazado"]],
  ["Cancelado", ["Cancelled", "Cancelado"]],
  ["Reembolsado", ["Refunded", "Reembolsado"]],
  ["Vencido", ["Overdue", "Vencido"]],
  ["Próximo vencimento", ["Next billing date", "Próximo vencimiento"]],
  ["Último pagamento", ["Last payment", "Último pago"]],
  ["Valor", ["Amount", "Valor"]],
  ["Total", ["Total", "Total"]],
  ["Renovação automática", ["Automatic renewal", "Renovación automática"]],
  ["Cancelar assinatura", ["Cancel subscription", "Cancelar suscripción"]],
  ["Reativar assinatura", ["Reactivate subscription", "Reactivar suscripción"]],
  ["Assinatura cancelada", ["Subscription cancelled", "Suscripción cancelada"]],
  ["Assinatura reativada", ["Subscription reactivated", "Suscripción reactivada"]],
  ["Não foi possível cancelar a assinatura", ["Unable to cancel the subscription", "No fue posible cancelar la suscripción"]],
  ["Não foi possível reativar a assinatura", ["Unable to reactivate the subscription", "No fue posible reactivar la suscripción"]],
  ["Histórico de pagamentos", ["Payment history", "Historial de pagos"]],
  ["Nenhum pagamento encontrado", ["No payments found", "No se encontraron pagos"]],
  ["Checkout", ["Checkout", "Pago"]],
  ["Continuar para pagamento", ["Continue to payment", "Continuar al pago"]],
  ["Processando pagamento...", ["Processing payment...", "Procesando pago..."]],
  ["Pagamento aprovado", ["Payment approved", "Pago aprobado"]],
  ["Pagamento pendente", ["Payment pending", "Pago pendiente"]],
  ["Pagamento recusado", ["Payment declined", "Pago rechazado"]],
  ["Não foi possível processar seu pagamento", ["Unable to process your payment", "No fue posible procesar tu pago"]],
  ["Tentar novamente", ["Try again", "Intentar de nuevo"]],
  ["Voltar aos planos", ["Back to plans", "Volver a los planes"]],
  ["Mercado Pago", ["Mercado Pago", "Mercado Pago"]],
  ["Teste", ["Test", "Prueba"]],
  ["Ambiente de teste", ["Test environment", "Entorno de prueba"]],
  ["Grátis", ["Free", "Gratis"]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
  ["Expira em", ["Expires on", "Vence el"]],
  ["Começa em", ["Starts on", "Comienza el"]],
  ["Assinatura ativa", ["Active subscription", "Suscripción activa"]],
  ["Assinatura inativa", ["Inactive subscription", "Suscripción inactiva"]],
  ["Limite atingido", ["Limit reached", "Límite alcanzado"]],
  ["Você atingiu o limite do seu plano.", ["You have reached your plan limit.", "Has alcanzado el límite de tu plan."]],
  ["Faça upgrade para continuar.", ["Upgrade to continue.", "Actualiza tu plan para continuar."]],
  ["Fazer upgrade", ["Upgrade", "Mejorar plan"]],
  ["Uso do plano", ["Plan usage", "Uso del plan"]],
  ["Clientes", ["Clients", "Clientes"]],
  ["Orçamentos", ["Quotes", "Presupuestos"]],
  ["Usuários", ["Users", "Usuarios"]],
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

console.log(`OK   billing i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   billing i18n keys added: ${missing.length}`);
console.log(`INFO total billing i18n keys: ${entries.size}`);
console.log('\nv203 billing i18n consolidation complete.');
