import { BadRequestException } from '@nestjs/common';

export type PricingCalculationInput={
  dailyRateCents:number;
  days:number;
  people:number;
  variableCostCents:number;
  fixedCostCents:number;
  safetyMarginBps:number;
  variableCostMode?:string;
};

export type PricingCalculationResult={
  laborCents:number;
  variableCents:number;
  fixedCents:number;
  marginCents:number;
  totalCents:number;
};

/**
 * Regra oficial da Calculadora P.O.
 * - mão de obra total = meta/diária da equipe x dias;
 * - variável = conforme o modo configurado (por padrão, por dia);
 * - fixo = cobrado uma única vez;
 * - margem de segurança = percentual sobre (meta diária da equipe + total variável),
 *   sem multiplicar novamente a mão de obra pela quantidade de dias.
 */
export function calculatePricing(x:PricingCalculationInput):PricingCalculationResult{
  for(const v of Object.values(x)){
    if(typeof v==='number'&&(!Number.isInteger(v)||v<0)){
      throw new BadRequestException('Use inteiros não negativos; dinheiro em centavos.');
    }
  }

  const laborCents=x.dailyRateCents*x.days;
  const mode=x.variableCostMode??'per_day';
  const variableCents=
    mode==='fixed'?x.variableCostCents:
    mode==='per_person'?x.variableCostCents*x.people:
    mode==='per_person_day'?x.variableCostCents*x.people*x.days:
    x.variableCostCents*x.days;

  const fixedCents=x.fixedCostCents;
  const marginBaseCents=x.dailyRateCents+variableCents;
  const marginCents=Math.round(marginBaseCents*x.safetyMarginBps/10000);
  const totalCents=laborCents+variableCents+fixedCents+marginCents;

  return {laborCents,variableCents,fixedCents,marginCents,totalCents};
}
