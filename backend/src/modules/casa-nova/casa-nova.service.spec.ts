import {NotFoundException} from '@nestjs/common';
import {CasaNovaService} from './casa-nova.service';

describe('CasaNovaService',()=>{
  const makeDb=()=>{
    const db:any={
      casaNovaList:{
        findUnique:jest.fn(),
        findFirst:jest.fn(),
        create:jest.fn(),
        update:jest.fn(),
      },
      casaNovaItem:{
        findMany:jest.fn().mockResolvedValue([]),
        createMany:jest.fn().mockResolvedValue({count:40}),
        create:jest.fn(),
      },
      $transaction:jest.fn(),
    };
    return db;
  };

  const wireTransaction=(db:any)=>{
    db.$transaction.mockImplementation(async(callback:any)=>callback(db));
  };

  it('creates and persists a new item for the tenant list',async()=>{
    const db=makeDb();
    wireTransaction(db);
    const list={id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:true};
    db.casaNovaList.findUnique.mockResolvedValue(list);
    db.casaNovaItem.create.mockResolvedValue({
      id:'item-1',tenantId:'tenant-1',listId:'list-1',itemName:'Escorredor',
      category:'Cozinha e mesa',baseQuantity:1,quantityOverride:null,unit:'un.',
      isScalable:false,checked:false,notes:null,
    });
    const service=new CasaNovaService(db);

    const result=await service.addItem('tenant-1',{
      itemName:' Escorredor ',category:'Cozinha e mesa',baseQuantity:1,
      unit:'un.',isScalable:false,
    });

    expect(db.casaNovaItem.create).toHaveBeenCalledWith({data:{
      tenantId:'tenant-1',listId:'list-1',itemName:'Escorredor',
      category:'Cozinha e mesa',baseQuantity:1,quantityOverride:null,
      unit:'un.',isScalable:false,notes:null,
    }});
    expect(result.id).toBe('item-1');
  });

  it('recovers when another request creates the tenant Casa Nova list first',async()=>{
    const db=makeDb();
    wireTransaction(db);
    const existing={id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:true};
    db.casaNovaList.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    db.casaNovaList.create.mockRejectedValue({code:'P2002'});
    db.casaNovaItem.create.mockResolvedValue({
      id:'item-1',tenantId:'tenant-1',listId:'list-1',itemName:'Escorredor',
    });
    const service=new CasaNovaService(db);

    await expect(service.addItem('tenant-1',{
      itemName:'Escorredor',category:'Cozinha e mesa',baseQuantity:1,unit:'un.',
    })).resolves.toEqual(expect.objectContaining({id:'item-1'}));

    expect(db.casaNovaList.findUnique).toHaveBeenCalledTimes(2);
    expect(db.casaNovaItem.create).toHaveBeenCalledWith({data:expect.objectContaining({
      tenantId:'tenant-1',listId:'list-1',itemName:'Escorredor',
    })});
  });

  it('does not swallow an unrelated list creation error',async()=>{
    const db=makeDb();
    db.casaNovaList.findUnique.mockResolvedValue(null);
    db.casaNovaList.create.mockRejectedValue({code:'P2003'});
    const service=new CasaNovaService(db);

    await expect(service.addItem('tenant-1',{
      itemName:'Escorredor',category:'Cozinha e mesa',baseQuantity:1,unit:'un.',
    })).rejects.toEqual({code:'P2003'});
  });

  it('initializes standard items atomically while locking the tenant list row',async()=>{
    const db=makeDb();
    wireTransaction(db);
    db.casaNovaList.findUnique.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:false,
    });
    db.casaNovaList.findFirst.mockResolvedValue({id:'list-1'});
    db.casaNovaList.update.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:true,
    });
    db.casaNovaItem.findMany.mockResolvedValue([]);

    const service=new CasaNovaService(db);
    const result=await service.get('tenant-1');

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.casaNovaList.findFirst).toHaveBeenCalledWith({
      where:{id:'list-1',tenantId:'tenant-1'},select:{id:true},
    });
    expect(db.casaNovaList.update).toHaveBeenCalledWith({
      where:{id:'list-1'},data:{defaultsInitialized:true},
    });
    expect(db.casaNovaItem.createMany).toHaveBeenCalledTimes(1);
    expect(result.defaultsInitialized).toBe(true);
  });

  it('does not duplicate standards when a serialized second initialization sees existing items',async()=>{
    const db=makeDb();
    wireTransaction(db);
    db.casaNovaList.findUnique.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:true,
    });
    db.casaNovaList.findFirst.mockResolvedValue({id:'list-1'});
    db.casaNovaList.update.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:true,
    });
    db.casaNovaItem.findMany.mockResolvedValue([
      {itemName:'Jogo de pratos'},
      {itemName:'Talheres'},
      {itemName:'Copos'},
      {itemName:'Taças'},
      {itemName:'Xícaras'},
      {itemName:'Panelas essenciais'},
      {itemName:'Frigideira'},
      {itemName:'Assadeiras'},
      {itemName:'Potes com tampa'},
      {itemName:'Talheres de servir'},
      {itemName:'Liquidificador'},
      {itemName:'Air fryer'},
      {itemName:'Micro-ondas'},
      {itemName:'Cafeteira'},
      {itemName:'Batedeira'},
      {itemName:'Ferro de passar'},
      {itemName:'Arroz'},
      {itemName:'Feijão'},
      {itemName:'Macarrão'},
      {itemName:'Óleo'},
      {itemName:'Azeite'},
      {itemName:'Café'},
      {itemName:'Açúcar'},
      {itemName:'Sal'},
      {itemName:'Papel toalha'},
      {itemName:'Papel higiênico'},
      {itemName:'Detergente'},
      {itemName:'Banana'},
      {itemName:'Tomate'},
      {itemName:'Cebola'},
      {itemName:'Alho'},
      {itemName:'Batata'},
      {itemName:'Folhas para salada'},
      {itemName:'Limão'},
      {itemName:'Toalha de banho'},
      {itemName:'Toalha de rosto'},
      {itemName:'Roupão'},
      {itemName:'Lençol avulso'},
      {itemName:'Fronha avulsa'},
      {itemName:'Conjunto de cama'},
    ]);

    const service=new CasaNovaService(db);
    const result=await service.addEssentials('tenant-1');

    expect(result).toEqual({added:0,total:40});
    expect(db.casaNovaItem.createMany).not.toHaveBeenCalled();
  });

  it('keeps defaultsInitialized atomic with standard creation failures',async()=>{
    const db=makeDb();
    db.casaNovaList.findUnique.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:false,
    });
    db.$transaction.mockRejectedValue(new Error('insert failed'));
    const service=new CasaNovaService(db);

    await expect(service.get('tenant-1')).rejects.toThrow('insert failed');
    expect(db.casaNovaList.update).not.toHaveBeenCalled();
  });

  it('rejects initialization for a list outside the tenant',async()=>{
    const db=makeDb();
    wireTransaction(db);
    db.casaNovaList.findUnique.mockResolvedValue({
      id:'list-1',tenantId:'tenant-1',guests:2,defaultsInitialized:false,
    });
    db.casaNovaList.findFirst.mockResolvedValue(null);
    const service=new CasaNovaService(db);

    await expect(service.get('tenant-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.casaNovaItem.createMany).not.toHaveBeenCalled();
  });
});
