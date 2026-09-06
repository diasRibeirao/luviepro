import fs from 'node:fs';

const file=new URL('../src/modules/project-statuses/screens/ProjectStatusesScreen.tsx',import.meta.url);
const source=fs.readFileSync(file,'utf8');

const colors=['#C9A84C','#D97706','#E67E22','#A04A45','#C2415D','#8A5B6B','#7C3AED','#5B5BD6','#3D6F91','#0E7490','#0F766E','#2F6B4F','#6F8C78','#4D7C0F','#64748B','#374151'];

if(!source.includes('Escolha uma cor para identificar este status no Kanban.')){
  console.error('FAIL color help');
  process.exit(1);
}
for(const color of colors){
  if(!source.includes(color)){
    console.error(`FAIL missing ${color}`);
    process.exit(1);
  }
}
console.log(`OK   ${colors.length} project status colors available`);
