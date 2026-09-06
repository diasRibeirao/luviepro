import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
  ["Erro inesperado", ["Unexpected error", "Error inesperado"]],
  ["Não foi possível carregar clientes", ["Unable to load clients", "No fue posible cargar los clientes"]],
  ["CEP deve ter 8 dígitos.", ["ZIP code must have 8 digits.", "El código postal debe tener 8 dígitos."]],
  ["CEP não encontrado.", ["ZIP code not found.", "Código postal no encontrado."]],
  ["Informe o nome fantasia ou nome comercial.", ["Enter the trade or business name.", "Ingresa el nombre comercial."]],
  ["Informe o nome completo do cliente.", ["Enter the client's full name.", "Ingresa el nombre completo del cliente."]],
  ["Informe um telefone para contato.", ["Enter a contact phone number.", "Ingresa un teléfono de contacto."]],
  ["Informe um telefone válido com DDD.", ["Enter a valid phone number with area code.", "Ingresa un teléfono válido con código de área."]],
  ["Informe um e-mail válido.", ["Enter a valid email address.", "Ingresa un correo electrónico válido."]],
  ["Cliente atualizado", ["Client updated", "Cliente actualizado"]],
  ["Cliente cadastrado", ["Client created", "Cliente registrado"]],
  ["Os dados cadastrais foram salvos.", ["The client details were saved.", "Los datos del cliente fueron guardados."]],
  ["Não foi possível salvar", ["Unable to save", "No fue posible guardar"]],
  ["Tipo", ["Type", "Tipo"]],
  ["Nome", ["Name", "Nombre"]],
  ["Razão social", ["Legal name", "Razón social"]],
  ["CPF/CNPJ", ["CPF/CNPJ", "CPF/CNPJ"]],
  ["Contato", ["Contact", "Contacto"]],
  ["Telefone", ["Phone", "Teléfono"]],
  ["WhatsApp", ["WhatsApp", "WhatsApp"]],
  ["E-mail", ["Email", "Correo electrónico"]],
  ["CEP", ["ZIP code", "Código postal"]],
  ["Logradouro", ["Street", "Dirección"]],
  ["Número", ["Number", "Número"]],
  ["Bairro", ["Neighborhood", "Barrio"]],
  ["Cidade", ["City", "Ciudad"]],
  ["Status", ["Status", "Estado"]],
  ["Clientes exportados", ["Clients exported", "Clientes exportados"]],
  ["Não foi possível exportar clientes", ["Unable to export clients", "No fue posible exportar los clientes"]],
  ["Cliente ativado", ["Client activated", "Cliente activado"]],
  ["Cliente inativado", ["Client deactivated", "Cliente desactivado"]],
  ["Não foi possível alterar o status", ["Unable to change status", "No fue posible cambiar el estado"]],
  ["Clientes", ["Clients", "Clientes"]],
  ["Gerencie pessoas, empresas e contatos da sua carteira", ["Manage people, companies and contacts in your client base", "Gestiona personas, empresas y contactos de tu cartera"]],
  ["Novo cliente", ["New client", "Nuevo cliente"]],
  ["Total de clientes", ["Total clients", "Total de clientes"]],
  ["Pessoas físicas", ["Individuals", "Personas físicas"]],
  ["Empresas", ["Companies", "Empresas"]],
  ["Buscar por nome, CPF/CNPJ, cidade ou contato...", ["Search by name, CPF/CNPJ, city or contact...", "Buscar por nombre, CPF/CNPJ, ciudad o contacto..."]],
  ["Exportar clientes em CSV", ["Export clients to CSV", "Exportar clientes a CSV"]],
  ["Exportar CSV", ["Export CSV", "Exportar CSV"]],
  ["Nome A–Z", ["Name A–Z", "Nombre A–Z"]],
  ["Nome Z–A", ["Name Z–A", "Nombre Z–A"]],
  ["Mais recentes", ["Most recent", "Más recientes"]],
  ["Nenhum cliente encontrado", ["No clients found", "No se encontraron clientes"]],
  ["Revise a busca ou cadastre um novo cliente.", ["Review the search or add a new client.", "Revisa la búsqueda o registra un nuevo cliente."]],
  ["E-mail não informado", ["Email not provided", "Correo electrónico no informado"]],
  ["Telefone não informado", ["Phone not provided", "Teléfono no informado"]],
  ["Editar cliente", ["Edit client", "Editar cliente"]],
  ["Dados completos para proposta, faturamento e relacionamento.", ["Complete details for proposals, billing and client relationships.", "Datos completos para propuestas, facturación y relación con el cliente."]],
  ["Salvar alterações", ["Save changes", "Guardar cambios"]],
  ["Cadastrar cliente", ["Create client", "Registrar cliente"]],
  ["Pessoa física", ["Individual", "Persona física"]],
  ["Pessoa jurídica", ["Company", "Persona jurídica"]],
  ["Nome fantasia", ["Trade name", "Nombre comercial"]],
  ["Nome completo", ["Full name", "Nombre completo"]],
  ["Pessoa jurídica identificada automaticamente.", ["Company detected automatically.", "Persona jurídica identificada automáticamente."]],
  ["Pessoa física identificada automaticamente.", ["Individual detected automatically.", "Persona física identificada automáticamente."]],
  ["Informe CPF ou CNPJ; o tipo será identificado automaticamente.", ["Enter CPF or CNPJ; the type will be detected automatically.", "Ingresa CPF o CNPJ; el tipo será identificado automáticamente."]],
  ["Pessoa de contato", ["Contact person", "Persona de contacto"]],
  ["Consultando CEP...", ["Looking up ZIP code...", "Consultando código postal..."]],
  ["Opcional. Digite somente os números; o hífen é inserido automaticamente.", ["Optional. Enter numbers only; the hyphen is inserted automatically.", "Opcional. Ingresa solo números; el guion se inserta automáticamente."]],
  ["Complemento", ["Address complement", "Complemento"]],
  ["Observações", ["Notes", "Observaciones"]],
  ["Anotações internas", ["Internal notes", "Notas internas"]],
  ["Salvando...", ["Saving...", "Guardando..."]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
  ["Todos", ["All", "Todos"]],
]);

const start=src.indexOf('const exact:Record');
if(start<0)throw new Error('Objeto exact de i18n não encontrado.');
const end=src.indexOf('\n};',start);
if(end<0)throw new Error('Fim do objeto exact de i18n não encontrado.');

let block=src.slice(start,end);
const existing=new Set([...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]));
const missing=[];

function quote(s){ return JSON.stringify(s); }

for(const [key,pair] of entries){
  if(!existing.has(key)){
    missing.push(` ${quote(key)}:[${quote(pair[0])},${quote(pair[1])}],`);
  }
}

if(missing.length){
  block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
  src=src.slice(0,start)+block+src.slice(end);
  fs.writeFileSync(file,src,'utf8');
}

console.log(`OK   client i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   client i18n keys added: ${missing.length}`);
console.log(`INFO total client i18n keys: ${entries.size}`);
console.log('\nv197 client i18n consolidation complete.');
