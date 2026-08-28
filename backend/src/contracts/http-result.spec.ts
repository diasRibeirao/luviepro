import {errorResult,okResult} from './http-result';
describe('http result',()=>{it('builds stable success/error contracts',()=>{expect(okResult({id:'1'})).toEqual({ok:true,data:{id:'1'}});expect(errorResult('invalid','Invalid')).toEqual({ok:false,code:'invalid',message:'Invalid'});});});
