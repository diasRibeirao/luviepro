import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src','i18n.tsx');
const src=fs.readFileSync(file,'utf8');

const keys=[...src.matchAll(/^\s*'([^']+)':\s*\[/gm)].map(m=>m[1]);
const counts=new Map();
for(const key of keys)counts.set(key,(counts.get(key)||0)+1);
const duplicates=[...counts.entries()].filter(([,count])=>count>1);

const required=[
 'Status dos projetos',
 'Configure as colunas exibidas no Kanban.',
 'Novo status',
 'Mover para cima',
 'Mover para baixo',
 'Ativo',
 'Desativado',
 'Editar status',
 'Desativar status',
 'Ativar status',
 'Excluir status',
 'Defina o nome e a cor da coluna.',
 'Salvar status',
 'COR',
 'Catálogo, composição de custos e parâmetros de cobrança',
 'Ordem dos serviços atualizada',
 'Serviço criado',
 'Serviço atualizado',
];

for(const key of required){
 const count=counts.get(key)||0;
 console.log(`${count===1?'OK  ':'FAIL'} ${key} -> ${count}`);
 if(count!==1)process.exitCode=1;
}

if(duplicates.length){
 console.error('\nDuplicate i18n keys found:');
 for(const [key,count] of duplicates)console.error(` - ${key}: ${count}`);
 process.exitCode=1;
}else{
 console.log('\nOK   no duplicate i18n keys');
}

if(!process.exitCode){
 console.log('\ni18n duplicate-key verification passed.');
}
