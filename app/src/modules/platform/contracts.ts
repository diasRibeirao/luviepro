export type PlatformTab = 'overview' | 'companies' | 'users' | 'plans' | 'subs' | 'payments' | 'email' | 'maintenance';

export type PlatformPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PlatformCompany = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planPeriod?: string;
  status: string;
  contactEmail?: string | null;
  _count?: { users?: number; clients?: number; subscriptions?: number };
  scheduledSubscription?: PlatformSubscription | null;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt?: string | null;
  tenant?: Pick<PlatformCompany, 'id' | 'name' | 'plan' | 'status'>;
};

export type PlatformMaster = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  current?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PlatformPlan = {
  plan: string;
  name: string;
  description?: string | null;
  active: boolean;
  sortOrder: number;
  maxClients: number;
  maxQuotesPerMonth: number;
  maxUsers: number;
  monthlyPriceCents: number;
  quarterlyPriceCents: number;
  semiannualPriceCents: number;
  annualPriceCents: number;
};

export type PlatformSubscription = {
  id: string;
  plan: string;
  period: string;
  amountCents: number;
  status: string;
  startsAt: string;
  expiresAt: string;
  tenant?: Pick<PlatformCompany, 'id' | 'name' | 'slug'>;
};

export type PlatformPayment = {
  id: string;
  provider: string;
  providerPaymentId?: string | null;
  providerPreferenceId?: string | null;
  externalReference?: string | null;
  plan: string;
  period: string;
  amountCents: number;
  status: string;
  paymentMethod?: string | null;
  providerStatus?: string | null;
  providerStatusDetail?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { webhookEvents?: number };
  lastWebhook?: {
    id: string;
    status: string;
    eventType?: string | null;
    attempts: number;
    lastError?: string | null;
    processedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  tenant?: Pick<PlatformCompany, 'id' | 'name' | 'slug'>;
};

export type PlatformOverview = {
  tenants: number;
  activeTenants: number;
  users: number;
  clients: number;
  subscriptions: number;
  monthlyRevenueCents: number;
};

export function isPlatformPage<T>(value: unknown): value is PlatformPage<T> {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as PlatformPage<T>).items));
}

export type PlatformEditableItem =
  | ({ kind: 'tenant' } & PlatformCompany)
  | ({ kind: 'user' } & PlatformUser)
  | ({ kind: 'plan' } & PlatformPlan);

export type PlatformTenantCreateResult = {
  invitation?: {
    delivery?: { sent?: boolean };
    inviteUrl?: string | null;
  } | null;
};

export type PlatformFilterRecord = {
  id?: string;
  status?: string;
  active?: boolean;
  plan?: string;
  tenant?: { id?: string; plan?: string };
};
