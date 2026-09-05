export const baseTabs=['Minha empresa','Fiscal e endereço','Modelo de proposta','Identidade visual','Parametrizações','Assinatura','Segurança'];
export const roleLabels:Record<string,string>={owner:'Proprietário',admin:'Administrador',commercial:'Comercial',operational:'Operacional',finance:'Financeiro'};
export const roleHelp:Record<string,string>={admin:'Administra a operação e as configurações da empresa.',commercial:'Clientes, serviços, agenda e orçamentos.',operational:'Agenda, projetos, tarefas e acompanhamento das entregas.',finance:'Consulta indicadores, valores e informações financeiras.'};
export const actionLabels:Record<string,string>={register:'Cadastro da conta',create:'Criação',update:'Alteração',change_plan:'Mudança de plano',change_status:'Mudança de status',approve:'Aprovação',upload_logo:'Logo atualizado',remove_logo:'Logo removido',login_success:'Login realizado',login_failed:'Tentativa de login',invite:'Convite enviado',resend_invite:'Convite reenviado',cancel_invite:'Convite cancelado',accept_invite:'Convite aceito',change_password:'Senha alterada',logout:'Saída'};
export const permissionGroups=[
  ['Visão geral',[['dashboard.read','Dashboard']]],
  ['Clientes',[['clients.read','Visualizar'],['clients.write','Criar e editar']]],
  ['Serviços',[['services.read','Visualizar'],['services.write','Criar e editar']]],
  ['Orçamentos',[['quotes.read','Visualizar'],['quotes.write','Criar, editar e enviar']]],
  ['Projetos',[['projects.read','Visualizar'],['projects.write','Criar e atualizar']]],
  ['Agenda',[['calendar.read','Visualizar'],['calendar.write','Criar e cancelar compromissos']]],
  ['Financeiro',[['finance.read','Visualizar'],['finance.write','Criar e alterar']]],
  ['Administração',[['settings.manage','Alterar configurações'],['audit.read','Consultar auditoria']]],
] as const;
