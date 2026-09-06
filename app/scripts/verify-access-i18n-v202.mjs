import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');
const expected=new Map([
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
console.log(`OK   ${expected.size} access i18n keys present exactly once`);
console.log('OK   no duplicate i18n keys');
console.log('\nv202 access i18n verification passed.');
