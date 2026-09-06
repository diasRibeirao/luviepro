import * as fs from 'node:fs';
import * as path from 'node:path';

describe('AuthService dynamic registration plan catalog',()=>{
  const source=fs.readFileSync(path.join(__dirname,'auth.service.ts'),'utf8');

  it('does not hardcode starter as the registration fallback',()=>{
    expect(source).not.toContain("isPlanCode(planCandidate) ? planCandidate : 'starter'");
  });

  it('requires an explicitly requested plan to be active',()=>{
    expect(source).toContain("findFirst({where:{plan:planCandidate,active:true}})");
    expect(source).toContain("throw new BadRequestException('Plano indisponível')");
  });

  it('uses the first active catalog plan when no plan is supplied',()=>{
    expect(source).toContain("findFirst({where:{active:true},orderBy:[{sortOrder:'asc'},{monthlyPriceCents:'asc'}]})");
    expect(source).toContain("throw new BadRequestException('Nenhum plano está disponível para cadastro')");
  });

  it('takes the final plan code from the catalog record',()=>{
    expect(source).toContain("const plan: PlanCode = limit.plan;");
  });
});
