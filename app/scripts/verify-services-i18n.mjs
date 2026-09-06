import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const i18n=fs.readFileSync(path.join(root,'src','i18n.tsx'),'utf8');
const screen=fs.readFileSync(path.join(root,'src','modules','services','screens','ServicesScreen.tsx'),'utf8');

const checks=[
 ['Services screen uses localized Text',screen.includes("from '../../../i18n'")],
 ['catalog subtitle translated',i18n.includes("'Catálogo, composição de custos e parâmetros de cobrança':['Catalog, cost composition and billing parameters'")],
 ['reorder success translated',i18n.includes("'Ordem dos serviços atualizada':['Service order updated'")],
 ['reorder error translated',i18n.includes("'Não foi possível reorganizar':['Unable to reorder'")],
 ['service validation translated',i18n.includes("'Informe o nome do serviço.':['Enter the service name.'")],
 ['people validation translated',i18n.includes("'Informe ao menos 1 pessoa.':['Enter at least 1 person.'")],
 ['service result messages translated',i18n.includes("'Serviço atualizado':['Service updated'")&&i18n.includes("'Serviço criado':['Service created'")],
 ['table headers translated',i18n.includes("'SERVIÇO':['SERVICE','SERVICIO']")&&i18n.includes("'ATIVO':['ACTIVE','ACTIVO']")],
 ['service move/edit aria translated',i18n.includes("'Mover serviço para cima':['Move service up'")&&i18n.includes("'Editar serviço':['Edit service'")],
 ['billing units translated',i18n.includes("'por hora':['per hour'")&&i18n.includes("'por unidade':['per unit'")&&i18n.includes("'por diária':['per day'")],
 ['service configuration translated',i18n.includes("'Dias do projeto (pelas etapas)'")&&i18n.includes("'Diária mínima / base do serviço (R$)'")],
 ['cost types translated',i18n.includes("'Variável':['Variable','Variable']")&&i18n.includes("'Fixo':['Fixed','Fijo']")],
 ['stage move and delete translated',i18n.includes("'Mover etapa para cima':['Move stage up'")&&i18n.includes("'Excluir item':['Delete item'")],
 ['v195 project status translations preserved',i18n.includes("'Status dos projetos':['Project statuses','Estados de los proyectos']")],
];

let failed=0;
for(const [name,pass] of checks){
 console.log(`${pass?'OK  ':'FAIL'} ${name}`);
 if(!pass)failed++;
}
if(failed){
 console.error(`\n${failed} Services i18n check(s) failed.`);
 process.exit(1);
}
console.log('\nServices EN/ES i18n verification passed.');
