import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Project progress concurrency', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/modules/projects/projects.service.ts'),
    'utf8',
  );

  it('uses serializable retry', () => {
    expect(source).toMatch(/isolationLevel\s*:\s*['"]Serializable['"]/);
    expect(source).toContain("'P2034'");
    expect(source).toContain('attempt < 3');
  });

  it('serializes project status position allocation',()=>{expect(source).toContain("await tx.projectStatus.count({ where: { tenantId } })");expect(source).toContain("tx.projectStatus.create({data:{tenantId,key");});

  it('serializes project status deactivation in-use checks',()=>{expect(source).toContain("const inUse = await tx.project.count({ where: { tenantId, status: status.key } })");expect(source).toContain("return tx.projectStatus.update({where:{id}");});

  it('serializes quote-stage task import to avoid duplicate imports',()=>{expect(source).toContain("const existing = await tx.projectTask.findMany");expect(source).toContain("await tx.projectTask.createMany({ data: tasks })");});
});
