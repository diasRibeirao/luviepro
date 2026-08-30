export type TeamForm = { role: string; value: string };
export type CostForm = { type: 'variable' | 'fixed'; description: string; value: string };
export type StageForm = { description: string; duration: string };

export type ServiceTeam = { role: string; dailyRateCents: number };
export type ServiceCost = { type: 'variable' | 'fixed'; description: string; amountCents: number };
export type ServiceStage = { description: string; duration?: string | null };

export type BillingUnit = 'daily' | 'hour' | 'project' | 'month' | 'unit';

export type ServiceRecord = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  category?: string | null;
  billingUnit: BillingUnit;
  defaultDays?: number | null;
  people?: number | null;
  safetyMarginBps?: number | null;
  dailyRateCents: number;
  active: boolean;
  sortOrder?: number;
  team?: ServiceTeam[];
  costs?: ServiceCost[];
  stages?: ServiceStage[];
};

export type ServiceForm = {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  billingUnit: BillingUnit;
  defaultDays: string;
  people: string;
  margin: string;
  baseDaily: string;
  active: boolean;
  sortOrder?: number;
  team: TeamForm[];
  costs: CostForm[];
  stages: StageForm[];
};

export type SaveServicePayload = {
  name: string;
  code?: string;
  description?: string;
  category?: string;
  billingUnit: BillingUnit;
  dailyRateCents: number;
  defaultDays: number;
  people: number;
  variableCostCents: number;
  fixedCostCents: number;
  safetyMarginBps: number;
  active: boolean;
  sortOrder?: number;
  team: Array<{ role: string; dailyRateCents: number; included: boolean }>;
  costs: Array<{ type: 'variable' | 'fixed'; description: string; amountCents: number }>;
  stages: Array<{ sequence: number; description: string; duration?: string }>;
};
