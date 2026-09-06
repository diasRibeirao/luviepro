import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const required=new Map([
 ['Status dos projetos',"['Project statuses','Estados de los proyectos']"],
 ['Configure as colunas exibidas no Kanban.',"['Configure the columns displayed on the Kanban board.','Configura las columnas que se muestran en el Kanban.']"],
 ['Novo status',"['New status','Nuevo estado']"],
 ['Mover para cima',"['Move up','Mover hacia arriba']"],
 ['Mover para baixo',"['Move down','Mover hacia abajo']"],
 ['Ativo',"['Active','Activo']"],
 ['Desativado',"['Disabled','Desactivado']"],
 ['Editar status',"['Edit status','Editar estado']"],
 ['Desativar status',"['Disable status','Desactivar estado']"],
 ['Ativar status',"['Enable status','Activar estado']"],
 ['Excluir status',"['Delete status','Eliminar estado']"],
 ['Defina o nome e a cor da coluna.',"['Set the column name and color.','Define el nombre y el color de la columna.']"],
 ['Salvar status',"['Save status','Guardar estado']"],
 ['COR',"['COLOR','COLOR']"],

 ['Ordem dos serviços atualizada',"['Service order updated','Orden de servicios actualizada']"],
 ['Não foi possível reorganizar',"['Unable to reorder','No fue posible reordenar']"],
 ['Informe o nome do serviço.',"['Enter the service name.','Ingresa el nombre del servicio.']"],
 ['Informe ao menos 1 pessoa.',"['Enter at least 1 person.','Ingresa al menos 1 persona.']"],
 ['Serviço atualizado',"['Service updated','Servicio actualizado']"],
 ['Serviço criado',"['Service created','Servicio creado']"],
 ['Catálogo, composição de custos e parâmetros de cobrança',"['Catalog, cost composition and billing parameters','Catálogo, composición de costos y parámetros de cobro']"],
 ['Ordem manual',"['Manual order','Orden manual']"],
 ['SERVIÇO',"['SERVICE','SERVICIO']"],
 ['ATIVO',"['ACTIVE','ACTIVO']"],
 ['INATIVO',"['INACTIVE','INACTIVO']"],
 ['Mover serviço para cima',"['Move service up','Mover servicio hacia arriba']"],
 ['Mover serviço para baixo',"['Move service down','Mover servicio hacia abajo']"],
 ['Editar serviço',"['Edit service','Editar servicio']"],
 ['por hora',"['per hour','por hora']"],
 ['por mês',"['per month','por mes']"],
 ['por unidade',"['per unit','por unidad']"],
 ['por diária',"['per day','por día']"],
 ['Dias do projeto (pelas etapas)',"['Project days (from stages)','Días del proyecto (según etapas)']"],
 ['Diária mínima / base do serviço (R$)',"['Minimum daily rate / service base (R$)','Tarifa diaria mínima / base del servicio (R$)']"],
 ['Variável',"['Variable','Variable']"],
 ['Fixo',"['Fixed','Fijo']"],
 ['Mover etapa para cima',"['Move stage up','Mover etapa hacia arriba']"],
 ['Mover etapa para baixo',"['Move stage down','Mover etapa hacia abajo']"],
 ['Excluir item',"['Delete item','Eliminar elemento']"],
]);

const start=src.indexOf('const exact:Record');
if(start<0)throw new Error('Objeto exact de i18n não encontrado.');
const close=src.indexOf('\n};',start);
if(close<0)throw new Error('Fim do objeto exact de i18n não encontrado.');

const before=src.slice(0,start);
let objectPart=src.slice(start,close);
const after=src.slice(close);

function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

let removed=0;
for(const key of required.keys()){
 const re=new RegExp(`^\\s*'${esc(key)}':\\s*\\[[^\\n]*\\],?\\r?$`,'gm');
 const matches=[...objectPart.matchAll(re)];
 if(matches.length>1){
   let seen=false;
   objectPart=objectPart.replace(re,(line)=>{
     if(!seen){seen=true;return line}
     removed++;
     return '';
   });
 }
}

const existing=new Set([...objectPart.matchAll(/^\s*'([^']+)':\s*\[/gm)].map(m=>m[1]));
const missing=[];
for(const [key,value] of required){
 if(!existing.has(key)){
   missing.push(` '${key}':${value},`);
 }
}

if(missing.length){
 objectPart=objectPart.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
}

src=before+objectPart+after;
fs.writeFileSync(file,src,'utf8');

console.log(`OK   duplicate required keys removed: ${removed}`);
console.log(`OK   missing required keys added: ${missing.length}`);
for(const line of missing)console.log(`ADD  ${line.match(/'([^']+)'/)?.[1]??line}`);
console.log('\ni18n v196.2 consolidation complete.');
