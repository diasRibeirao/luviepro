import {pagination} from './pagination';describe('pagination',()=>{it('bounds values',()=>expect(pagination(-2,1000,50)).toEqual({page:1,pageSize:50,skip:0,take:50}));});
