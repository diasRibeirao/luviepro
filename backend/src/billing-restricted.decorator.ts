import { SetMetadata } from '@nestjs/common';
export const ALLOW_BILLING_RESTRICTED_KEY='allowBillingRestrictedTenant';
export const AllowBillingRestrictedTenant=()=>SetMetadata(ALLOW_BILLING_RESTRICTED_KEY,true);
