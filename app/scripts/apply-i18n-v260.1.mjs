import fs from 'node:fs';
import path from 'node:path';
const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["EXPO_PUBLIC_API_URL deve utilizar HTTPS na build de produção", ["EXPO_PUBLIC_API_URL must use HTTPS in the production build", "EXPO_PUBLIC_API_URL debe usar HTTPS en la compilación de producción"]],
  ["EXPO_PUBLIC_API_URL não configurada para a build nativa de produção", ["EXPO_PUBLIC_API_URL is not configured for the native production build", "EXPO_PUBLIC_API_URL no está configurada para la compilación nativa de producción"]],
  ["Erro de conexão", ["Connection error", "Error de conexión"]],
  ["Não foi possível conectar ao servidor", ["Unable to connect to the server", "No fue posible conectar con el servidor"]],
  ["Informe um CEP com 8 dígitos.", ["Enter an 8-digit ZIP code.", "Ingresa un código postal de 8 dígitos."]],
  ["Não foi possível consultar o CEP.", ["Unable to look up the ZIP code.", "No fue posible consultar el código postal."]],
  ["Abre a comparação de planos", ["Opens plan comparison", "Abre la comparación de planes"]],
  ["Editar usuário e dados da conta", ["Edit user and account details", "Editar usuario y datos de la cuenta"]],
  ["Mais opções", ["More options", "Más opciones"]],
  ["Navegação e preferências", ["Navigation and preferences", "Navegación y preferencias"]],
  ["Carregando conteúdo", ["Loading content", "Cargando contenido"]],
  ["CPF deve ter 11 dígitos.", ["CPF must have 11 digits.", "El CPF debe tener 11 dígitos."]],
  ["CNPJ deve ter 14 dígitos.", ["CNPJ must have 14 digits.", "El CNPJ debe tener 14 dígitos."]],
  ["Existem alterações não salvas. Deseja descartá-las?", ["There are unsaved changes. Do you want to discard them?", "Hay cambios sin guardar. ¿Deseas descartarlos?"]],
  ["Alterações não salvas", ["Unsaved changes", "Cambios sin guardar"]],
  ["Usuário desativado", ["User deactivated", "Usuario desactivado"]],
  ["Usuário ativado", ["User activated", "Usuario activado"]],
  ["Não foi possível alterar o acesso", ["Unable to change access", "No fue posible cambiar el acceso"]],
  ["Não foi possível cancelar", ["Unable to cancel", "No fue posible cancelar"]],
  ["Não foi possível reenviar", ["Unable to resend", "No fue posible reenviar"]],
  ["Usuários ativos", ["Active users", "Usuarios activos"]],
  ["Limite de usuários atingido", ["User limit reached", "Límite de usuarios alcanzado"]],
  ["Para adicionar usuários, altere para um plano com acessos adicionais.", ["To add users, switch to a plan with additional access.", "Para agregar usuarios, cambia a un plan con accesos adicionales."]],
  ["Primeiros acessos pendentes também reservam vagas do plano.", ["Pending first accesses also reserve plan seats.", "Los primeros accesos pendientes también reservan plazas del plan."]],
  ["Enviar recuperação de senha", ["Send password recovery", "Enviar recuperación de contraseña"]],
  ["Desativar usuário", ["Deactivate user", "Desactivar usuario"]],
  ["Ativar usuário", ["Activate user", "Activar usuario"]],
  ["Cadastre a pessoa e envie um link individual para ela criar a própria senha no primeiro acesso.", ["Register the person and send an individual link so they can create their own password on first access.", "Registra a la persona y envía un enlace individual para que cree su propia contraseña en el primer acceso."]],
  ["Manutenção do usuário", ["User maintenance", "Mantenimiento del usuario"]],
  ["Exportação de dados", ["Data export", "Exportación de datos"]],
  ["Plano para sua operação", ["Plan for your operation", "Plan para tu operación"]],
  ["Nenhum plano ativo está disponível para cadastro no momento.", ["No active plan is currently available for registration.", "No hay ningún plan activo disponible para registro en este momento."]],
  ["mês", ["month", "mes"]],
  ["Diária aplicada", ["Applied daily rate", "Tarifa diaria aplicada"]],
  ["Compromissos, projetos e prazos em um único lugar", ["Appointments, projects and deadlines in one place", "Compromisos, proyectos y plazos en un solo lugar"]],
  ["Ao selecionar um projeto, cliente, nome e período são preenchidos automaticamente.", ["When you select a project, client, name and period are filled automatically.", "Al seleccionar un proyecto, cliente, nombre y período se completan automáticamente."]],
  ["TÍTULO", ["TITLE", "TÍTULO"]],
  ["DESCRIÇÃO", ["DESCRIPTION", "DESCRIPCIÓN"]],
  ["INÍCIO", ["START", "INICIO"]],
  ["Ex.: Visita técnica ao cliente", ["E.g.: Technical visit to the client", "Ej.: Visita técnica al cliente"]],
  ["Ex.: Residência do cliente", ["E.g.: Client residence", "Ej.: Residencia del cliente"]],
  ["Não repetir", ["Do not repeat", "No repetir"]],
  ["Informe no mínimo 2 pessoas.", ["Enter at least 2 people.", "Ingresa al menos 2 personas."]],
  ["Item excluído da lista.", ["Item removed from the list.", "Elemento eliminado de la lista."]],
  ["Todos os itens padrão já estão nesta conta.", ["All default items are already in this account.", "Todos los elementos predeterminados ya están en esta cuenta."]],
  ["Informe uma quantidade válida, maior ou igual a 1.", ["Enter a valid quantity greater than or equal to 1.", "Ingresa una cantidad válida mayor o igual a 1."]],
  ["Este item já existe na lista. Edite o item existente em vez de duplicá-lo.", ["This item already exists in the list. Edit the existing item instead of duplicating it.", "Este elemento ya existe en la lista. Edita el elemento existente en lugar de duplicarlo."]],
  ["Não", ["No", "No"]],
  ["Automática", ["Automatic", "Automática"]],
  ["Não foi possível exportar a lista.", ["Unable to export the list.", "No fue posible exportar la lista."]],
  ["Já comprados", ["Already purchased", "Ya comprados"]],
  ["Lista concluída", ["List completed", "Lista completada"]],
  ["Preencha os dados no formulário “Adicionar item” logo abaixo da lista e confirme no botão amarelo.", ["Fill in the “Add item” form below the list and confirm with the yellow button.", "Completa el formulario “Agregar elemento” debajo de la lista y confirma con el botón amarillo."]],
  ["Preencha os dados no formulário “Adicionar item” à direita e confirme no botão amarelo.", ["Fill in the “Add item” form on the right and confirm with the yellow button.", "Completa el formulario “Agregar elemento” a la derecha y confirma con el botón amarillo."]],
  ["Restaurar padrão", ["Restore default", "Restaurar predeterminado"]],
  ["Ex.: taças de vinho", ["E.g.: wine glasses", "Ej.: copas de vino"]],
  ["Opcional. Se informado, será validado.", ["Optional. If provided, it will be validated.", "Opcional. Si se informa, será validado."]],
  ["Excluído", ["Deleted", "Eliminado"]],
  ["Referência", ["Reference", "Referencia"]],
  ["Situação", ["Status", "Situación"]],
  ["Previsto × realizado, contas abertas, fluxo de caixa e relatórios", ["Projected × actual, open accounts, cash flow and reports", "Previsto × realizado, cuentas abiertas, flujo de caja e informes"]],
  ["Saldo realizado / mês", ["Actual balance / month", "Saldo realizado / mes"]],
  ["Resultado previsto / mês", ["Projected result / month", "Resultado previsto / mes"]],
  ["Relatórios", ["Reports", "Informes"]],
  ["Buscar pessoa, referência, descrição ou categoria...", ["Search person, reference, description or category...", "Buscar persona, referencia, descripción o categoría..."]],
  ["Até", ["Until", "Hasta"]],
  ["Pedidos, compras e lançamentos manuais pendentes aparecerão aqui.", ["Pending orders, purchases and manual transactions will appear here.", "Los pedidos, compras y movimientos manuales pendientes aparecerán aquí."]],
  ["Nenhuma movimentação no período", ["No transactions in the period", "No hay movimientos en el período"]],
  ["Ajuste os filtros ou registre uma movimentação.", ["Adjust the filters or record a transaction.", "Ajusta los filtros o registra un movimiento."]],
  ["Saídas realizadas", ["Actual outflows", "Salidas realizadas"]],
  ["Novo lançamento financeiro", ["New financial transaction", "Nuevo movimiento financiero"]],
  ["Registre receitas e despesas que não nasceram de pedidos ou compras", ["Record income and expenses not generated from orders or purchases", "Registra ingresos y gastos que no provengan de pedidos o compras"]],
  ["Já realizado", ["Already completed", "Ya realizado"]],
  ["Dar baixa no lançamento", ["Settle transaction", "Liquidar movimiento"]],
  ["1 mês", ["1 month", "1 mes"]],
  ["O Mercado Pago recebeu o pagamento, mas a confirmação automática ainda não terminou. Você pode usar “Atualizar status” no histórico.", ["Mercado Pago received the payment, but automatic confirmation has not finished yet. You can use “Update status” in the history.", "Mercado Pago recibió el pago, pero la confirmación automática aún no terminó. Puedes usar “Actualizar estado” en el historial."]],
  ["O Mercado Pago não devolveu o endereço do checkout", ["Mercado Pago did not return the checkout address", "Mercado Pago no devolvió la dirección del checkout"]],
  ["Após o pagamento, o novo plano entrará em vigor no fim do período atual.", ["After payment, the new plan will take effect at the end of the current period.", "Después del pago, el nuevo plan entrará en vigor al final del período actual."]],
  ["Não foi possível iniciar o pagamento", ["Unable to start payment", "No fue posible iniciar el pago"]],
  ["Dados do cartão incorretos", ["Incorrect card details", "Datos de la tarjeta incorrectos"]],
  ["Validade do cartão incorreta", ["Incorrect card expiration date", "Fecha de vencimiento de la tarjeta incorrecta"]],
  ["Código de segurança incorreto", ["Incorrect security code", "Código de seguridad incorrecto"]],
  ["Cartão desativado", ["Card disabled", "Tarjeta desactivada"]],
  ["Pagamento não autorizado por segurança", ["Payment not authorized for security reasons", "Pago no autorizado por seguridad"]],
  ["Pagamento não autorizado", ["Payment not authorized", "Pago no autorizado"]],
  ["Renovação", ["Renewal", "Renovación"]],
  ["Validar configuração", ["Validate configuration", "Validar configuración"]],
  ["Configuração Resend válida", ["Valid Resend configuration", "Configuración Resend válida"]],
  ["Conexão SMTP validada", ["SMTP connection validated", "Conexión SMTP validada"]],
  ["Falha na configuração de e-mail", ["Email configuration failed", "Falló la configuración de correo"]],
  ["Não foi possível validar o e-mail", ["Unable to validate email", "No fue posible validar el correo"]],
  ["Não foi possível testar o e-mail", ["Unable to test email", "No fue posible probar el correo"]],
  ["E-mail configurado; envio ainda não testado", ["Email configured; sending not yet tested", "Correo configurado; envío aún no probado"]],
  ["E-mail global não configurado", ["Global email not configured", "Correo global no configurado"]],
  ["Não configurada", ["Not configured", "No configurada"]],
  ["Substituída", ["Replaced", "Reemplazada"]],
  ["USUÁRIOS", ["USERS", "USUARIOS"]],
  ["USUÁRIO", ["USER", "USUARIO"]],
  ["ÚLTIMO ACESSO", ["LAST ACCESS", "ÚLTIMO ACCESO"]],
  ["Orçamentos/mês", ["Quotes/month", "Presupuestos/mes"]],
  ["PERÍODO", ["PERIOD", "PERÍODO"]],
  ["SÁB", ["SAT", "SÁB"]],
  ["Março", ["March", "Marzo"]],
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
 if(!existing.has(key))missing.push(` ${JSON.stringify(key)}:[${JSON.stringify(pair[0])},${JSON.stringify(pair[1])}],`);
}
if(missing.length){
 block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
 src=src.slice(0,start)+block+src.slice(end);
 fs.writeFileSync(file,src,'utf8');
}
console.log(`OK v260.1 existing: ${entries.size-missing.length}`);
console.log(`OK v260.1 added: ${missing.length}`);
console.log(`INFO v260.1 total curated keys: ${entries.size}`);
