import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Reunião", ["Meeting", "Reunión"]],
  ["Não foi possível carregar a agenda", ["Unable to load calendar", "No fue posible cargar la agenda"]],
  ["Informe o título do evento.", ["Enter the event title.", "Ingresa el título del evento."]],
  ["Informe um horário válido no formato HH:MM.", ["Enter a valid time in HH:MM format.", "Ingresa una hora válida en formato HH:MM."]],
  ["O horário final deve ser posterior ao início.", ["The end time must be after the start time.", "La hora final debe ser posterior a la inicial."]],
  ["Não foi possível salvar o evento", ["Unable to save event", "No fue posible guardar el evento"]],
  ["O evento ainda não foi salvo. Deseja fechar e descartar as informações preenchidas?", ["The event has not been saved yet. Close and discard the entered information?", "El evento aún no fue guardado. ¿Cerrar y descartar la información ingresada?"]],
]);

const start=src.indexOf('const exact:Record');
if(start<0) throw new Error('Objeto exact de i18n não encontrado.');
const end=src.indexOf('\n};',start);
if(end<0) throw new Error('Fim do objeto exact de i18n não encontrado.');
let block=src.slice(start,end);
const keys=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]);
const existing=new Set(keys);
const missing=[];
for(const [key,pair] of entries){
  if(!existing.has(key)) missing.push(` ${JSON.stringify(key)}:[${JSON.stringify(pair[0])},${JSON.stringify(pair[1])}],`);
}
if(missing.length){
  block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
  src=src.slice(0,start)+block+src.slice(end);
  fs.writeFileSync(file,src,'utf8');
}
console.log(`v212 - Agenda`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
