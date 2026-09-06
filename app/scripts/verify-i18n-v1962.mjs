import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src','i18n.tsx');
const src=fs.readFileSync(file,'utf8');

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
 'Ordem dos serviços atualizada',
 'Não foi possível reorganizar',
 'Informe o nome do serviço.',
 'Informe ao menos 1 pessoa.',
 'Serviço atualizado',
 'Serviço criado',
 'Catálogo, composição de custos e parâmetros de cobrança',
 'Ordem manual',
 'SERVIÇO','ATIVO','INATIVO',
 'Mover serviço para cima','Mover serviço para baixo','Editar serviço',
 'por hora','por mês','por unidade','por diária',
 'Dias do projeto (pelas etapas)',
 'Diária mínima / base do serviço (R$)',
 'Variável','Fixo',
 'Mover etapa para cima','Mover etapa para baixo','Excluir item',
];

const keys=[...src.matchAll(/^\s*'([^']+)':\s*\[/gm)].map(m=>m[1]);
const counts=new Map();
for(const key of keys)counts.set(key,(counts.get(key)||0)+1);

let failed=0;
for(const key of required){
 const count=counts.get(key)||0;
 const pass=count===1;
 console.log(`${pass?'OK  ':'FAIL'} ${key} -> ${count}`);
 if(!pass)failed++;
}

const duplicates=[...counts.entries()].filter(([,count])=>count>1);
if(duplicates.length){
 console.error('\nDuplicate i18n keys found:');
 for(const [key,count] of duplicates)console.error(` - ${key}: ${count}`);
 failed+=duplicates.length;
}else console.log('\nOK   no duplicate i18n keys');

if(failed)process.exit(1);
console.log('\ni18n v196.2 consolidated verification passed.');
