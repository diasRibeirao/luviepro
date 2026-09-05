import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Orders and Purchases permissions architecture',()=>{
  const orders=readFileSync(resolve(process.cwd(),'src/modules/orders/orders.controller.ts'),'utf8');
  const purchases=readFileSync(resolve(process.cwd(),'src/modules/purchases/purchases.controller.ts'),'utf8');
  const access=readFileSync(resolve(process.cwd(),'src/modules/access/access-management.service.ts'),'utf8');

  it('uses dedicated Orders permissions',()=>{
    expect(orders).not.toContain("@Permissions('quotes.read')");
    expect(orders).not.toContain("@Permissions('quotes.write')");
    expect(orders).toContain("@Permissions('orders.read')");
    expect(orders).toContain("@Permissions('orders.write')");
  });

  it('uses dedicated Purchases permissions',()=>{
    expect(purchases).not.toContain("@Permissions('quotes.read')");
    expect(purchases).not.toContain("@Permissions('quotes.write')");
    expect(purchases).toContain("@Permissions('purchases.read')");
    expect(purchases).toContain("@Permissions('purchases.write')");
  });

  it('keeps all dedicated permissions in the catalog',()=>{
    expect(access).toContain("'orders.read'");
    expect(access).toContain("'orders.write'");
    expect(access).toContain("'purchases.read'");
    expect(access).toContain("'purchases.write'");
    expect(access).toContain("'finance.write'");
  });
});
