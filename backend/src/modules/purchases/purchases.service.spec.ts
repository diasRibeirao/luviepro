
import {ConflictException,NotFoundException} from '@nestjs/common';
import {PurchasesService} from './purchases.service';

describe('PurchasesService supplier management',()=>{
 const db:any={supplier:{findFirst:jest.fn(),create:jest.fn(),update:jest.fn(),findMany:jest.fn()},auditLog:{create:jest.fn()}};
import {NotFoundException} from '@nestjs/common';
import {PurchasesService} from './purchases.service';

describe('PurchasesService supplier management',()=>{
 const db:any={supplier:{findFirst:jest.fn(),update:jest.fn(),findMany:jest.fn()},auditLog:{create:jest.fn()}};
 const service=new PurchasesService(db);
 beforeEach(()=>jest.clearAllMocks());

 it('lists active and inactive suppliers in a stable order',async()=>{
  db.supplier.findMany.mockResolvedValue([]);
  await service.suppliers('t1');
  expect(db.supplier.findMany).toHaveBeenCalledWith({where:{tenantId:'t1'},orderBy:[{active:'desc'},{name:'asc'}]});
 });

 it('updates and inactivates only a supplier from the current tenant',async()=>{
  db.supplier.findFirst.mockResolvedValue({id:'s1',tenantId:'t1',name:'Antigo',active:true});
  db.supplier.update.mockResolvedValue({id:'s1',name:'Novo',active:false});
  await expect(service.updateSupplier('t1','s1',{name:' Novo ',active:false})).resolves.toEqual({id:'s1',name:'Novo',active:false});
  expect(db.supplier.findFirst).toHaveBeenCalledWith({where:{id:'s1',tenantId:'t1'}});
  expect(db.supplier.update).toHaveBeenCalledWith({where:{id:'s1'},data:{name:'Novo',active:false}});
 });

 it('rejects supplier updates across tenants',async()=>{
  db.supplier.findFirst.mockResolvedValue(null);
  await expect(service.updateSupplier('t1','foreign',{active:false})).rejects.toBeInstanceOf(NotFoundException);
  expect(db.supplier.update).not.toHaveBeenCalled();
 });

 it('rejects a duplicated supplier document in the same tenant',async()=>{
  db.supplier.findFirst.mockResolvedValue({id:'existing'});
  await expect(service.createSupplier('t1',{name:'Novo',document:'12.345.678/0001-90'})).rejects.toBeInstanceOf(ConflictException);
  expect(db.supplier.create).not.toHaveBeenCalled();
 });
});
