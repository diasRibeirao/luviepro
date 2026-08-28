import { PayloadTooLargeException } from '@nestjs/common';
import { requestSizeLimitBytes, requestSizeMiddleware } from './request-size.middleware';
describe('request size middleware',()=>{
 it('uses a safe default and bounded override',()=>{expect(requestSizeLimitBytes({})).toBe(1048576);expect(requestSizeLimitBytes({HTTP_MAX_REQUEST_BYTES:'2048'})).toBe(2048);expect(requestSizeLimitBytes({HTTP_MAX_REQUEST_BYTES:'999999999'})).toBe(1048576)});
 it('rejects oversized declared bodies',()=>{const next=jest.fn();const req={header:()=> '2049'} as any;expect(()=>requestSizeMiddleware(2048)(req,{} as any,next)).toThrow(PayloadTooLargeException);expect(next).not.toHaveBeenCalled()});
 it('allows requests within the limit',()=>{const next=jest.fn();requestSizeMiddleware(2048)({header:()=> '2048'} as any,{} as any,next);expect(next).toHaveBeenCalledTimes(1)});
});
