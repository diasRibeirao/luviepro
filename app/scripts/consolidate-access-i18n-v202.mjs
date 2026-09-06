import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
  ["Usuários", ["Users", "Usuarios"]],
  ["Gestão de usuários", ["User management", "Gestión de usuarios"]],
  ["Novo usuário", ["New user", "Nuevo usuario"]],
  ["Editar usuário", ["Edit user", "Editar usuario"]],
  ["Convidar usuário", ["Invite user", "Invitar usuario"]],
  ["Reenviar convite", ["Resend invitation", "Reenviar invitación"]],
  ["Convite reenviado", ["Invitation resent", "Invitación reenviada"]],
  ["Convite enviado", ["Invitation sent", "Invitación enviada"]],
  ["Usuário criado", ["User created", "Usuario creado"]],
  ["Usuário atualizado", ["User updated", "Usuario actualizado"]],
  ["Usuário removido", ["User removed", "Usuario eliminado"]],
  ["Não foi possível carregar usuários", ["Unable to load users", "No fue posible cargar los usuarios"]],
  ["Não foi possível salvar o usuário", ["Unable to save the user", "No fue posible guardar el usuario"]],
  ["Não foi possível reenviar o convite", ["Unable to resend the invitation", "No fue posible reenviar la invitación"]],
  ["Não foi possível remover o usuário", ["Unable to remove the user", "No fue posible eliminar el usuario"]],
  ["Nome", ["Name", "Nombre"]],
  ["E-mail", ["Email", "Correo electrónico"]],
  ["Perfil", ["Profile", "Perfil"]],
  ["Permissões", ["Permissions", "Permisos"]],
  ["Status", ["Status", "Estado"]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
  ["Pendente", ["Pending", "Pendiente"]],
  ["Convite pendente", ["Pending invitation", "Invitación pendiente"]],
  ["Convite expirado", ["Expired invitation", "Invitación vencida"]],
  ["Administrador", ["Administrator", "Administrador"]],
  ["Usuário", ["User", "Usuario"]],
  ["Proprietário", ["Owner", "Propietario"]],
  ["Owner", ["Owner", "Propietario"]],
  ["Admin", ["Admin", "Administrador"]],
  ["Personalizado", ["Custom", "Personalizado"]],
  ["Perfil personalizado", ["Custom profile", "Perfil personalizado"]],
  ["Novo perfil", ["New profile", "Nuevo perfil"]],
  ["Editar perfil", ["Edit profile", "Editar perfil"]],
  ["Nome do perfil", ["Profile name", "Nombre del perfil"]],
  ["Descrição do perfil", ["Profile description", "Descripción del perfil"]],
  ["Perfil criado", ["Profile created", "Perfil creado"]],
  ["Perfil atualizado", ["Profile updated", "Perfil actualizado"]],
  ["Perfil excluído", ["Profile deleted", "Perfil eliminado"]],
  ["Não foi possível excluir o perfil", ["Unable to delete the profile", "No fue posible eliminar el perfil"]],
  ["Selecione as permissões deste perfil.", ["Select the permissions for this profile.", "Selecciona los permisos de este perfil."]],
  ["Acessos", ["Access", "Accesos"]],
  ["Controle de acesso", ["Access control", "Control de acceso"]],
  ["Gerencie usuários, perfis e permissões da conta", ["Manage account users, profiles and permissions", "Gestiona usuarios, perfiles y permisos de la cuenta"]],
  ["Buscar usuários...", ["Search users...", "Buscar usuarios..."]],
  ["Nenhum usuário encontrado", ["No users found", "No se encontraron usuarios"]],
  ["Revise a busca ou convide um novo usuário.", ["Review the search or invite a new user.", "Revisa la búsqueda o invita a un nuevo usuario."]],
  ["Último acesso", ["Last access", "Último acceso"]],
  ["Nunca acessou", ["Never signed in", "Nunca accedió"]],
  ["Salvar usuário", ["Save user", "Guardar usuario"]],
  ["Salvar perfil", ["Save profile", "Guardar perfil"]],
  ["Excluir usuário", ["Delete user", "Eliminar usuario"]],
  ["Excluir perfil", ["Delete profile", "Eliminar perfil"]],
  ["Excluir usuário?", ["Delete user?", "¿Eliminar usuario?"]],
  ["Excluir perfil?", ["Delete profile?", "¿Eliminar perfil?"]],
  ["Cancelar", ["Cancel", "Cancelar"]],
  ["Salvar", ["Save", "Guardar"]],
  ["Salvando...", ["Saving...", "Guardando..."]],
  ["Excluir", ["Delete", "Eliminar"]],
  ["Editar", ["Edit", "Editar"]],
  ["Todos", ["All", "Todos"]],
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

console.log(`OK   access i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   access i18n keys added: ${missing.length}`);
console.log(`INFO total access i18n keys: ${entries.size}`);
console.log('\nv202 access i18n consolidation complete.');
