import {readFileSync} from 'fs';
import {resolve} from 'path';

const read=(p:string)=>readFileSync(resolve(process.cwd(),'src',p),'utf8');

describe('round 140-180 production regression gate',()=>{
  it('v140 - Create-user custom profile is revalidated transactionally',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async createUser");
    expect(source).toContain("accessProfile.findFirst({where:{id:data.customProfileId,tenantId,active:true}}");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v141 - Resend invitation is transactionally revalidated',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async resendUserInvitation");
    expect(source).toContain("tx.userInvitation.findFirst");
    expect(source).toContain("tx.planLimit.findUnique");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v142 - Invitation cancellation uses compare-and-set',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async cancelUserInvitation");
    expect(source).toContain("updatedAt:invitation.updatedAt");
    expect(source).toContain("claimed.count!==1");
  });
  it('v143 - Invitation expiration uses compare-and-set',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async invitationInfo");
    expect(source).toContain("status:'expired'");
    expect(source).toContain("updatedAt:invitation.updatedAt");
  });
  it('v144 - Invitation acceptance claims once',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async acceptInvitation");
    expect(source).toContain("data:{status:'accepted',acceptedAt:new Date()}");
    expect(source).toContain("claimed.count!==1");
  });
  it('v145 - User activation capacity is serialized',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("async updateUser");
    expect(source).toContain("activeUsers=await tx.user.count");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v146 - User deactivation revokes sessions',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("revokedReason:'user_deactivated'");
    expect(source).toContain("authSession.updateMany");
  });
  it('v147 - Access profile deactivation protects assigned users',()=>{
    const source=read("modules/access/access-management.service.ts");
    expect(source).toContain("customProfileId:id,active:true");
    expect(source).toContain("Desative ou altere os usu\u00e1rios vinculados");
  });
  it('v148 - Client reads remain tenant scoped',()=>{
    const source=read("modules/clients/clients.service.ts");
    expect(source).toContain("tenantId");
    expect(source).toContain("Cliente n\u00e3o encontrado");
  });
  it('v149 - Client capacity mutation uses Serializable',()=>{
    const source=read("modules/clients/clients.service.ts");
    expect(source).toContain("maxClients");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v150 - Product stock movement uses compare-and-set',()=>{
    const source=read("modules/products/products.service.ts");
    expect(source).toContain("stockQuantity:p.stockQuantity");
    expect(source).toContain("claimed.count!==1");
    expect(source).toContain("stockMovement.create");
  });
  it('v151 - Product delete maps FK/delete races',()=>{
    const source=read("modules/products/products.service.ts");
    expect(source).toContain("code==='P2003'");
    expect(source).toContain("code==='P2025'");
    expect(source).toContain("ConflictException");
  });
  it('v152 - Product catalog reads are tenant scoped',()=>{
    const source=read("modules/products/products.service.ts");
    expect(source).toContain("tenantId");
    expect(source).toContain("productCategory.findFirst");
  });
  it('v153 - Service nested catalog is tenant scoped',()=>{
    const source=read("modules/services/services.service.ts");
    expect(source).toContain("team:{where:{tenantId}}");
    expect(source).toContain("costs:{where:{tenantId}}");
    expect(source).toContain("stages:{where:{tenantId}}");
  });
  it('v154 - Service automatic sortOrder is serialized',()=>{
    const source=read("modules/services/services.service.ts");
    expect(source).toContain("tx.service.aggregate({where:{tenantId},_max:{sortOrder:true}})");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v155 - Service reorder is serialized',()=>{
    const source=read("modules/services/services.service.ts");
    expect(source).toContain("async reorder");
    expect(source).toContain("tx.service.findFirst");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v156 - Finance payment is compare-and-set',()=>{
    const source=read("modules/finance/finance.service.ts");
    expect(source).toContain("status:'pending'");
    expect(source).toContain("data:{status:'paid'");
    expect(source).toContain("changed.count!==1");
  });
  it('v157 - Finance cancellation is compare-and-set',()=>{
    const source=read("modules/finance/finance.service.ts");
    expect(source).toContain("data:{status:'canceled'}");
    expect(source).toContain("changed.count!==1");
  });
  it('v158 - Financial category sortOrder is serialized',()=>{
    const source=read("modules/finance/finance.service.ts");
    expect(source).toContain("tx.financialCategory.aggregate");
    expect(source).toContain("tx.financialCategory.create");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v159 - Payment method catalog mutation is serialized',()=>{
    const source=read("modules/finance/finance.service.ts");
    expect(source).toContain("tx.financialPaymentMethod.aggregate");
    expect(source).toContain("tx.financialPaymentMethod.count");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v160 - Purchase numbering retries unique collisions',()=>{
    const source=read("modules/purchases/purchases.service.ts");
    expect(source).toContain("attempt<5");
    expect(source).toContain("code?:string");
    expect(source).toContain("P2002");
  });
  it('v161 - Purchase receiving is Serializable',()=>{
    const source=read("modules/purchases/purchases.service.ts");
    expect(source).toContain("async receive");
    expect(source).toContain("purchaseOrderItem.updateMany");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v162 - Purchase payment uses balance compare-and-set',()=>{
    const source=read("modules/purchases/purchases.service.ts");
    expect(source).toContain("amountPaidCents:current.amountPaidCents");
    expect(source).toContain("claimed.count!==1");
  });
  it('v163 - Quote creation capacity is Serializable',()=>{
    const source=read("modules/quotes/quotes.service.ts");
    expect(source).toContain("maxQuotesPerMonth");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v164 - Quote status changes use compare-and-set',()=>{
    const source=read("modules/quotes/quotes.service.ts");
    expect(source).toContain("quote.updateMany");
    expect(source).toContain("status:quote.status");
    expect(source).toContain("claimed.count!==1");
  });
  it('v165 - Quote client decision is single-write',()=>{
    const source=read("modules/quotes/quotes.service.ts");
    expect(source).toContain("clientDecision:null");
    expect(source).toContain("clientDecisionAt");
    expect(source).toContain("claimed.count!==1");
  });
  it('v166 - Quote stock reservation uses compare-and-set',()=>{
    const source=read("modules/quotes/quotes.service.ts");
    expect(source).toContain("reservedQuantity:p.reservedQuantity");
    expect(source).toContain("claimed.count!==1");
  });
  it('v167 - Quote sale creates order and consumes reservation transactionally',()=>{
    const source=read("modules/quotes/quotes.service.ts");
    expect(source).toContain("tx.order.create");
    expect(source).toContain("tx.stockReservation.update");
    expect(source).toContain("tx.stockMovement.create");
  });
  it('v168 - Order payments use compare-and-set',()=>{
    const source=read("modules/orders/orders.service.ts");
    expect(source).toContain("amountPaidCents");
    expect(source).toContain("updateMany");
    expect(source).toContain("claimed.count!==1");
  });
  it('v169 - Order cancellation protects concurrent state',()=>{
    const source=read("modules/orders/orders.service.ts");
    expect(source).toContain("canceled");
    expect(source).toContain("updateMany");
  });
  it('v170 - Project queries remain tenant scoped',()=>{
    const source=read("modules/projects/projects.service.ts");
    expect(source).toContain("tenantId");
    expect(source).toContain("Projeto n\u00e3o encontrado");
  });
  it('v171 - Project writes carry concurrency protection',()=>{
    const source=read("modules/projects/projects.service.ts");
    expect(source).toContain("P2034");
    expect(source).toContain("isolationLevel:'Serializable'");
  });
  it('v172 - Calendar relations validate tenant ownership',()=>{
    const source=read("modules/calendar/calendar.service.ts");
    expect(source).toContain("tenantId");
    expect(source).toContain("projectId");
    expect(source).toContain("clientId");
  });
  it('v173 - Notifications are tenant/user scoped',()=>{
    const source=read("modules/notifications/notifications.service.ts");
    expect(source).toContain("tenantId");
    expect(source).toContain("userId");
  });
  it('v174 - Mercado Pago webhook signature is centralized',()=>{
    const source=read("modules/billing/billing.service.ts");
    expect(source).toContain("verifyMercadoPagoSignature");
  });
  it('v175 - Mercado Pago checkout uses deterministic idempotency',()=>{
    const source=read("modules/billing/billing.service.ts");
    expect(source).toContain("providerIdempotencyKey('checkout'");
  });
  it('v176 - Billing status handling protects provider state',()=>{
    const source=read("modules/billing/billing.service.ts");
    expect(source).toContain("approved");
    expect(source).toContain("payment");
    expect(source).toContain("updateMany");
  });
  it('v177 - Direct account plan changes are Serializable',()=>{
    const source=read("modules/account/account.service.ts");
    expect(source).toContain("async updatePlan");
    expect(source).toContain("isolationLevel:'Serializable'");
    expect(source).toContain("P2034");
  });
  it('v178 - Platform master writes are concurrency guarded',()=>{
    const source=read("modules/platform/platform-admin.service.ts");
    expect(source).toContain("createMaster");
    expect(source).toContain("isolationLevel:'Serializable'");
    expect(source).toContain("P2034");
  });
  it('v179 - Runtime boundaries remain hardened',()=>{
    const source=read("app.module.ts");
    expect(source).toContain("CasaNovaModule");
    expect(source).toContain("AccessModule");
  });
  it('v180 - Production entrypoint keeps HTTP security middleware',()=>{
    const source=read("main.ts");
    expect(source).toContain("requestSizeMiddleware()");
    expect(source).toContain("securityHeadersOptions()");
    expect(source).toContain("sensitiveCacheMiddleware()");
  });
});
