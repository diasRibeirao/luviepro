import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';

describe('PricingService',()=>{
  const s=new PricingService();

  it('calcula custos por dia e margem sobre meta diaria + variaveis',()=>{
    expect(s.calculate({dailyRateCents:50000,days:5,people:2,variableCostCents:5000,fixedCostCents:10000,safetyMarginBps:2000} as any)).toEqual({
      laborCents:250000,
      variableCents:25000,
      fixedCents:10000,
      marginCents:15000,
      totalCents:300000,
    });
  });

  it('reproduz o caso oficial da Calculadora P.O. do documento de validacao',()=>{
    expect(s.calculate({dailyRateCents:160000,days:7,people:1,variableCostCents:6500,fixedCostCents:129000,safetyMarginBps:5000} as any)).toEqual({
      laborCents:1120000,
      variableCents:45500,
      fixedCents:129000,
      marginCents:102750,
      totalCents:1397250,
    });
  });

  it('cobra custo fixo uma unica vez independentemente dos dias',()=>{
    const result=s.calculate({dailyRateCents:0,days:7,people:1,variableCostCents:0,fixedCostCents:129000,safetyMarginBps:0} as any);
    expect(result.fixedCents).toBe(129000);
    expect(result.totalCents).toBe(129000);
  });

  it('rejects negative numeric input',()=>
    expect(()=>s.calculate({dailyRateCents:-1,days:1,people:1,variableCostCents:0,fixedCostCents:0,safetyMarginBps:0} as any)).toThrow(BadRequestException));
});
