import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');
const expected=new Map([
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
console.log(`OK   ${expected.size} billing i18n keys present exactly once`);
console.log('OK   no duplicate i18n keys');
console.log('\nv203 billing i18n verification passed.');
