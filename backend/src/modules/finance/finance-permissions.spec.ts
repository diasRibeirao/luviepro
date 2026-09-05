import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Finance permissions architecture',()=>{
  const source=readFileSync(resolve(process.cwd(),'src/modules/finance/finance.controller.ts'),'utf8');

  it('protects finance queries with finance.read',()=>{
    expect(source).toContain("@Permissions('finance.read') @Get('summary')");
    expect(source).toContain("@Permissions('finance.read') @Get('entries')");
    expect(source).toContain("@Permissions('finance.read') @Get('obligations')");
    expect(source).toContain("@Permissions('finance.read') @Get('report')");
  });

  it('protects financial mutations with finance.write',()=>{
    expect(source).toContain("@Permissions('finance.write') @Post('categories')");
    expect(source).toContain("@Permissions('finance.write') @Patch('categories/:id')");
    expect(source).toContain("@Permissions('finance.write') @Post('payment-methods')");
    expect(source).toContain("@Permissions('finance.write') @Patch('payment-methods/:id')");
    expect(source).toContain("@Permissions('finance.write') @Post('entries')");
    expect(source).toContain("@Permissions('finance.write') @Patch('entries/:id/pay')");
    expect(source).toContain("@Permissions('finance.write') @Patch('entries/:id/cancel')");
  });
});
