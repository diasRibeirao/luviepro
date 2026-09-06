import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');
const expected=new Map([
  ["Projetos", ["Projects", "Proyectos"]],
  ["Novo projeto", ["New project", "Nuevo proyecto"]],
  ["Editar projeto", ["Edit project", "Editar proyecto"]],
  ["Gerencie cronogramas, etapas e execução dos projetos", ["Manage schedules, stages and project execution", "Gestiona cronogramas, etapas y ejecución de los proyectos"]],
  ["Buscar projetos...", ["Search projects...", "Buscar proyectos..."]],
  ["Buscar por cliente, projeto ou status...", ["Search by client, project or status...", "Buscar por cliente, proyecto o estado..."]],
  ["Nenhum projeto encontrado", ["No projects found", "No se encontraron proyectos"]],
  ["Revise os filtros ou crie um novo projeto.", ["Review the filters or create a new project.", "Revisa los filtros o crea un nuevo proyecto."]],
  ["Projeto criado", ["Project created", "Proyecto creado"]],
  ["Projeto atualizado", ["Project updated", "Proyecto actualizado"]],
  ["Não foi possível salvar o projeto", ["Unable to save the project", "No fue posible guardar el proyecto"]],
  ["Não foi possível carregar projetos", ["Unable to load projects", "No fue posible cargar los proyectos"]],
  ["Cliente", ["Client", "Cliente"]],
  ["Projeto", ["Project", "Proyecto"]],
  ["Responsável", ["Owner", "Responsable"]],
  ["Início", ["Start", "Inicio"]],
  ["Fim", ["End", "Fin"]],
  ["Previsão de início", ["Planned start", "Inicio previsto"]],
  ["Previsão de término", ["Planned end", "Fin previsto"]],
  ["Data de início", ["Start date", "Fecha de inicio"]],
  ["Data de término", ["End date", "Fecha de finalización"]],
  ["Prazo", ["Deadline", "Plazo"]],
  ["Status", ["Status", "Estado"]],
  ["Etapas", ["Stages", "Etapas"]],
  ["Nova etapa", ["New stage", "Nueva etapa"]],
  ["Editar etapa", ["Edit stage", "Editar etapa"]],
  ["Excluir etapa", ["Delete stage", "Eliminar etapa"]],
  ["Etapa criada", ["Stage created", "Etapa creada"]],
  ["Etapa atualizada", ["Stage updated", "Etapa actualizada"]],
  ["Etapa excluída", ["Stage deleted", "Etapa eliminada"]],
  ["Não foi possível salvar a etapa", ["Unable to save the stage", "No fue posible guardar la etapa"]],
  ["Não foi possível excluir a etapa", ["Unable to delete the stage", "No fue posible eliminar la etapa"]],
  ["Nome da etapa", ["Stage name", "Nombre de la etapa"]],
  ["Descrição", ["Description", "Descripción"]],
  ["Ordem", ["Order", "Orden"]],
  ["Progresso", ["Progress", "Progreso"]],
  ["Concluído", ["Completed", "Completado"]],
  ["Em andamento", ["In progress", "En progreso"]],
  ["Não iniciado", ["Not started", "No iniciado"]],
  ["Atrasado", ["Delayed", "Atrasado"]],
  ["Pausado", ["Paused", "Pausado"]],
  ["Finalizado", ["Finished", "Finalizado"]],
  ["Cancelar", ["Cancel", "Cancelar"]],
  ["Salvar", ["Save", "Guardar"]],
  ["Salvando...", ["Saving...", "Guardando..."]],
  ["Excluir", ["Delete", "Eliminar"]],
  ["Editar", ["Edit", "Editar"]],
  ["Detalhes do projeto", ["Project details", "Detalles del proyecto"]],
  ["Cronograma", ["Schedule", "Cronograma"]],
  ["Execução", ["Execution", "Ejecución"]],
  ["Observações", ["Notes", "Observaciones"]],
  ["Equipe", ["Team", "Equipo"]],
  ["Adicionar responsável", ["Add owner", "Agregar responsable"]],
  ["Remover responsável", ["Remove owner", "Quitar responsable"]],
  ["Adicionar etapa", ["Add stage", "Agregar etapa"]],
  ["Mover etapa para cima", ["Move stage up", "Mover etapa hacia arriba"]],
  ["Mover etapa para baixo", ["Move stage down", "Mover etapa hacia abajo"]],
  ["Atualizar status", ["Update status", "Actualizar estado"]],
  ["Status atualizado", ["Status updated", "Estado actualizado"]],
  ["Não foi possível atualizar o status", ["Unable to update status", "No fue posible actualizar el estado"]],
  ["Data inválida", ["Invalid date", "Fecha inválida"]],
  ["A data final deve ser igual ou posterior à data inicial.", ["The end date must be on or after the start date.", "La fecha final debe ser igual o posterior a la fecha inicial."]],
  ["Projeto sem etapas", ["Project has no stages", "Proyecto sin etapas"]],
  ["Adicione etapas para acompanhar a execução.", ["Add stages to track execution.", "Agrega etapas para seguir la ejecución."]],
  ["Todos", ["All", "Todos"]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
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
console.log(`OK   ${expected.size} project i18n keys present exactly once`);
console.log('OK   no duplicate i18n keys');
console.log('\nv200 project i18n verification passed.');
