import {auditWhere} from './audit-query';
describe('audit query',()=>{it('builds tenant/date scoped where',()=>{const where=auditWhere('t1',{action:'login',from:'2026-01-01'});expect(where).toMatchObject({tenantId:'t1',action:'login',createdAt:{gte:expect.any(Date)}});});});
