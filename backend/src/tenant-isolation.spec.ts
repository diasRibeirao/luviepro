import { ApiService } from './api.service';

describe('tenant isolation regression',()=>{
  function service(){
    const db:any={
      client:{findMany:jest.fn().mockResolvedValue([])},
      service:{findMany:jest.fn().mockResolvedValue([])},
      quote:{findMany:jest.fn().mockResolvedValue([])},
      project:{findMany:jest.fn().mockResolvedValue([])},
    };
    return {db,api:new ApiService(db,{} as any,{} as any)};
  }

  it('scopes client listing to tenant',async()=>{
    const {api,db}=service(); await api.clients('tenant-a');
    expect(db.client.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant-a'}}));
  });

  it('scopes service listing and nested collections to tenant',async()=>{
    const {api,db}=service(); await api.services('tenant-a');
    expect(db.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId:'tenant-a'},
      include:expect.objectContaining({
        team:expect.objectContaining({where:{tenantId:'tenant-a'}}),
        costs:expect.objectContaining({where:{tenantId:'tenant-a'}}),
        stages:expect.objectContaining({where:{tenantId:'tenant-a'}}),
      }),
    }));
  });

  it('scopes quote listing to tenant',async()=>{
    const {api,db}=service(); await api.quotes('tenant-a');
    expect(db.quote.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant-a'}}));
  });

  it('scopes project listing and tasks to tenant',async()=>{
    const {api,db}=service(); await api.projects('tenant-a');
    expect(db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId:'tenant-a'},
      include:expect.objectContaining({tasks:expect.objectContaining({where:{tenantId:'tenant-a'}})}),
    }));
  });
});
