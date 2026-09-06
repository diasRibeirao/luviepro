import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const i18n=fs.readFileSync(path.join(root,'src','i18n.tsx'),'utf8');
const casa=fs.readFileSync(path.join(root,'src','modules','casa-nova','screens','CasaNovaScreen.tsx'),'utf8');

const checks=[
 ['Casa Nova screen uses localized Text wrapper',casa.includes("import {Text,TextInput} from '../../../i18n'")],
 ['New Home title translation',i18n.includes("'Casa Nova':['New Home','Casa Nueva']")],
 ['hero translation',i18n.includes("'Sua casa pronta para todo encontro especial.'")],
 ['guest prompt translation',i18n.includes("'Quantas pessoas estarão à mesa?'")],
 ['category kitchen translation',i18n.includes("'Cozinha e mesa':['Kitchen & table','Cocina y mesa']")],
 ['category bed bath translation',i18n.includes("'Cama e banho':['Bed & bath','Cama y baño']")],
 ['bulk action translation',i18n.includes("'Selecionar tudo':['Select all','Seleccionar todo']")],
 ['form translation',i18n.includes("'Qtd. base para 2 pessoas'")],
 ['unit option translation',i18n.includes("'Unidade (un.)':['Unit (ea.)','Unidad (un.)']")],
 ['dynamic selected count',i18n.includes("selecionado\\(s\\)")],
 ['dynamic item added message',i18n.includes("Item “(.+)” adicionado à lista")],
 ['dynamic automatic guest caption',i18n.includes("automático · (\\d+) pessoas")],
 ['Excel headers translated',i18n.includes("'Tipo de quantidade':['Quantity type','Tipo de cantidad']")],
];

let failed=0;
for(const [name,pass] of checks){
 console.log(`${pass?'OK  ':'FAIL'} ${name}`);
 if(!pass)failed++;
}
if(failed){
 console.error(`\n${failed} Casa Nova i18n check(s) failed.`);
 process.exit(1);
}
console.log('\nCasa Nova EN/ES i18n verification passed.');
