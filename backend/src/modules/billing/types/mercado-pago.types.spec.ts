import {jsonObject} from './mercado-pago.types';
describe('mercado pago contracts',()=>{it('rejects non-object JSON shapes',async()=>{const r={json:async()=>['x']} as Response;await expect(jsonObject(r)).resolves.toEqual({});});});
