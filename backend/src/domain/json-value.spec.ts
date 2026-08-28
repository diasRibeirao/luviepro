import { toJsonValue } from './json-value';
describe('toJsonValue',()=>{
  it('normalizes dates and drops undefined object keys',()=>expect(toJsonValue({at:new Date('2026-01-02T03:04:05.000Z'),skip:undefined,nested:{ok:true}})).toEqual({at:'2026-01-02T03:04:05.000Z',nested:{ok:true}}));
  it('normalizes undefined array entries to null',()=>expect(toJsonValue([1,undefined,'x'])).toEqual([1,null,'x']));
});
