import { MODULE_METADATA } from '@nestjs/common/constants';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from './auth.module';

describe('AuthModule',()=>{
  it('imports the module that provides SubscriptionService',()=>{
    const imports=Reflect.getMetadata(MODULE_METADATA.IMPORTS,AuthModule) as unknown[];
    expect(imports).toContain(BillingModule);
  });
});
