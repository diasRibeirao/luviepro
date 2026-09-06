import {BadRequestException,ConflictException} from '@nestjs/common';
import {ProductsService} from './products.service';

describe('ProductsService remove concurrency',()=>{
  const makeDb=()=>{
    const db:any={
      product:{findFirst:jest.fn(),delete:jest.fn()},
      quoteProductItem:{count:jest.fn().mockResolvedValue(0)},
      orderItem:{count:jest.fn().mockResolvedValue(0)},
      purchaseOrderItem:{count:jest.fn().mockResolvedValue(0)},
      stockReservation:{count:jest.fn().mockResolvedValue(0)},
      stockMovement:{count:jest.fn().mockResolvedValue(0)},
      auditLog:{create:jest.fn().mockResolvedValue({})},
    };
    db.product.findFirst.mockResolvedValue({
      id:'p1',tenantId:'t1',sku:'SKU-1',name:'Produto',
      stockQuantity:0,reservedQuantity:0,
    });
    return db;
  };

  it('deletes an unreferenced product and writes the audit',async()=>{
    const db=makeDb();
    db.product.delete.mockResolvedValue({id:'p1'});
    const service=new ProductsService(db);

    await expect(service.remove('t1','p1','u1')).resolves.toEqual({ok:true,id:'p1'});

    expect(db.product.delete).toHaveBeenCalledWith({where:{id:'p1'}});
    expect(db.auditLog.create).toHaveBeenCalledWith({data:{
      tenantId:'t1',actorUserId:'u1',action:'delete',entity:'product',
      entityId:'p1',metadata:{sku:'SKU-1',name:'Produto'},
    }});
  });

  it('maps a foreign-key race during delete to the business history message',async()=>{
    const db=makeDb();
    db.product.delete.mockRejectedValue({code:'P2003'});
    const service=new ProductsService(db);

    await expect(service.remove('t1','p1','u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove('t1','p1','u1')).rejects.toThrow(
      'Este produto foi vinculado a outro registro durante a exclusão'
    );
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent delete to ConflictException',async()=>{
    const db=makeDb();
    db.product.delete.mockRejectedValue({code:'P2025'});
    const service=new ProductsService(db);

    await expect(service.remove('t1','p1')).rejects.toBeInstanceOf(ConflictException);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not swallow unrelated Prisma errors',async()=>{
    const db=makeDb();
    const error={code:'P9999'};
    db.product.delete.mockRejectedValue(error);
    const service=new ProductsService(db);

    await expect(service.remove('t1','p1')).rejects.toBe(error);
  });
});
