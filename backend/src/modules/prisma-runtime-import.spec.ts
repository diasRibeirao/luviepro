import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Prisma runtime import boundary',()=>{
  const files=[
    'src/modules/access/access-management.service.ts',
    'src/modules/projects/projects.service.ts',
    'src/modules/purchases/purchases.service.ts',
  ];

  it.each(files)('%s does not import Prisma as a runtime value',(file)=>{
    const source=readFileSync(resolve(process.cwd(),file),'utf8');
    expect(source).not.toContain("import { Prisma } from '../../../../generated-prisma'");
    expect(source).not.toContain("import { Prisma } from '@prisma/client'");
  });
});
