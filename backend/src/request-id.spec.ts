import { requestId } from './request-id';

describe('requestId',()=>{
  it('preserva identificador válido',()=>expect(requestId('mobile-req_123')).toBe('mobile-req_123'));
  it('substitui identificador curto ou com caracteres de log',()=>{expect(requestId('x')).toMatch(/^[0-9a-f-]{36}$/);expect(requestId('valid\nforged')).toMatch(/^[0-9a-f-]{36}$/);});
});
