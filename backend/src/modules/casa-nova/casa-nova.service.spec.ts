import {CasaNovaService} from './casa-nova.service';

describe('CasaNovaService',()=>{
  const makeDb=()=>{
    const db:any={
      casaNovaList:{
        findUnique:jest.fn(),
        create:jest.fn(),
        update:jest.fn(),
      },
      casaNovaItem:{
        findMany:jest.fn().mockResolvedValue([]),
        createMany:jest.fn().mockResolvedValue({count:40}),
        create:jest.fn(),
      },
    };
    return db;
  };

  it('creates and persists a new item for the tenant list',async()=>{
    const db=makeDb();
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
});
