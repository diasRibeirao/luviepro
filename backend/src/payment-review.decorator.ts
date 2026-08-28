import { SetMetadata } from '@nestjs/common';

export const ALLOW_PAYMENT_REVIEW_KEY='allowPaymentReview';
export const AllowPaymentReview=()=>SetMetadata(ALLOW_PAYMENT_REVIEW_KEY,true);
