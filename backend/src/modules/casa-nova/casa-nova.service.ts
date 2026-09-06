import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {PrismaService} from '../../prisma.service';
import {BulkUpdateCasaNovaItemsDto,CreateCasaNovaItemDto,UpdateCasaNovaItemDto,UpdateCasaNovaListDto} from './dto/casa-nova.dto';

const essentials=[
  ['Jogo de pratos','Cozinha e mesa',12,'peças',false,'Para servir até 12 convidados'],
  ['Talheres','Cozinha e mesa',6,'peças',true,'Garfo, faca e colher'],
  ['Copos','Cozinha e mesa',2,'un.',true,'Água e bebidas'],
  ['Taças','Cozinha e mesa',2,'un.',true,'Ocasiões especiais'],
  ['Xícaras','Cozinha e mesa',2,'un.',true,'Café e chá'],
  ['Panelas essenciais','Cozinha e mesa',5,'un.',false,'Pequena, média e grande'],
  ['Frigideira','Cozinha e mesa',2,'un.',false,'Tamanhos diferentes'],
  ['Assadeiras','Cozinha e mesa',3,'un.',false,'Pequena, média e grande'],
  ['Potes com tampa','Cozinha e mesa',6,'un.',true,'Armazenamento'],
  ['Talheres de servir','Cozinha e mesa',4,'un.',false,'Conchas, espátulas e pegadores'],
  ['Liquidificador','Eletrodomésticos',1,'un.',false,'Uso diário'],
  ['Air fryer','Eletrodomésticos',1,'un.',false,'Capacidade familiar'],
  ['Micro-ondas','Eletrodomésticos',1,'un.',false,'Uso diário'],
  ['Cafeteira','Eletrodomésticos',1,'un.',false,'Café da manhã'],
  ['Batedeira','Eletrodomésticos',1,'un.',false,'Preparo de receitas'],
  ['Ferro de passar','Eletrodomésticos',1,'un.',false,'Cuidados com roupas'],
  ['Arroz','Mercado',1,'kg',true,'Base para refeições'],
  ['Feijão','Mercado',1,'kg',true,'Base para refeições'],
  ['Macarrão','Mercado',1,'pct.',true,'Despensa'],
  ['Óleo','Mercado',1,'un.',true,'Cozinha'],
  ['Azeite','Mercado',1,'un.',true,'Cozinha e saladas'],
  ['Café','Mercado',1,'pct.',true,'Café da manhã'],
  ['Açúcar','Mercado',1,'kg',true,'Despensa'],
  ['Sal','Mercado',1,'kg',false,'Despensa'],
  ['Papel toalha','Mercado',2,'rolos',true,'Cozinha e limpeza'],
  ['Papel higiênico','Mercado',4,'rolos',true,'Banheiros'],
  ['Detergente','Mercado',2,'un.',true,'Limpeza'],
  ['Banana','Hortifruti',2,'un.',true,'Lanche e café da manhã'],
  ['Tomate','Hortifruti',2,'un.',true,'Saladas e molhos'],
  ['Cebola','Hortifruti',2,'un.',true,'Tempero'],
  ['Alho','Hortifruti',1,'cabeça',true,'Tempero'],
  ['Batata','Hortifruti',500,'g',true,'Acompanhamentos'],
  ['Folhas para salada','Hortifruti',1,'maço',true,'Saladas'],
  ['Limão','Hortifruti',2,'un.',true,'Tempero e bebidas'],
  ['Toalha de banho','Cama e banho',2,'un.',true,'Uma por pessoa, com reserva conforme necessidade'],
  ['Toalha de rosto','Cama e banho',2,'un.',true,'Banheiros e lavabos'],
  ['Roupão','Cama e banho',2,'un.',true,'Conforto para os moradores'],
  ['Lençol avulso','Cama e banho',2,'un.',true,'Reposição e composição de jogos'],
  ['Fronha avulsa','Cama e banho',4,'un.',true,'Reposição para travesseiros'],
  ['Conjunto de cama','Cama e banho',2,'jogos',true,'Jogo completo para cama'],
] as const;

type StandardItem=(typeof essentials)[number];

@Injectable() export class CasaNovaService{
  constructor(private db:PrismaService){}

  private async ensureList(tenantId:string){
    let list=await this.db.casaNovaList.findUnique({where:{tenantId}});
    if(!list){
      try{
        list=await this.db.casaNovaList.create({data:{tenantId,guests:2,defaultsInitialized:false}});
      }catch(error){
        if((error as {code?:string})?.code!=='P2002')throw error;
        list=await this.db.casaNovaList.findUnique({where:{tenantId}});
        if(!list)throw error;
      }
    }
    if(!list.defaultsInitialized){
      await this.addMissingStandards(tenantId,list.id);
      list=await this.db.casaNovaList.update({where:{tenantId},data:{defaultsInitialized:true}});
    }
    return list;
  }

  private async addMissingStandards(tenantId:string,listId:string){
    const existing=await this.db.casaNovaItem.findMany({where:{tenantId,listId},select:{itemName:true}});
    const names=new Set(existing.map(x=>x.itemName.trim().toLocaleLowerCase('pt-BR')));
    const pending=essentials.filter(x=>!names.has(x[0].toLocaleLowerCase('pt-BR')));
    if(pending.length)await this.db.casaNovaItem.createMany({data:pending.map(([itemName,category,baseQuantity,unit,isScalable,notes]:StandardItem)=>({tenantId,listId,itemName,category,baseQuantity,unit,isScalable,checked:false,notes}))});
    return {added:pending.length,total:existing.length+pending.length};
  }

  async get(tenantId:string){
    const list=await this.ensureList(tenantId);
    const items=await this.db.casaNovaItem.findMany({where:{tenantId,listId:list.id},orderBy:[{checked:'asc'},{category:'asc'},{itemName:'asc'}]});
    return {...list,items};
  }

  async updateList(tenantId:string,b:UpdateCasaNovaListDto){await this.ensureList(tenantId);return this.db.casaNovaList.update({where:{tenantId},data:{guests:b.guests}})}

  async addItem(tenantId:string,b:CreateCasaNovaItemDto){
    const list=await this.ensureList(tenantId);
    return this.db.casaNovaItem.create({data:{tenantId,listId:list.id,itemName:b.itemName.trim(),category:b.category,baseQuantity:b.baseQuantity,quantityOverride:b.quantityOverride??null,unit:b.unit.trim(),isScalable:b.isScalable!==false,notes:b.notes?.trim()||null}})
  }

  async updateItem(tenantId:string,id:string,b:UpdateCasaNovaItemDto){
    const item=await this.db.casaNovaItem.findFirst({where:{id,tenantId}});
    if(!item)throw new NotFoundException('Item não encontrado');
    if(b.quantityOverride!==undefined&&b.quantityOverride!==null&&(!Number.isInteger(b.quantityOverride)||b.quantityOverride<1))throw new BadRequestException('Quantidade manual inválida');
    return this.db.casaNovaItem.update({where:{id},data:{
      ...(b.checked!==undefined?{checked:b.checked}:{}),
      ...(b.itemName!==undefined?{itemName:b.itemName.trim()}:{}),
      ...(b.category!==undefined?{category:b.category}:{}),
      ...(b.baseQuantity!==undefined?{baseQuantity:b.baseQuantity}:{}),
      ...(b.quantityOverride!==undefined?{quantityOverride:b.quantityOverride}:{}),
      ...(b.unit!==undefined?{unit:b.unit.trim()}:{}),
      ...(b.isScalable!==undefined?{isScalable:b.isScalable}:{}),
      ...(b.notes!==undefined?{notes:b.notes.trim()||null}:{}),
    }})
  }

  async bulkUpdateItems(tenantId:string,b:BulkUpdateCasaNovaItemsDto){
    const ids=[...new Set(b.ids)];
    const data={
      ...(b.category!==undefined?{category:b.category}:{}),
      ...(b.unit!==undefined?{unit:b.unit.trim()}:{}),
      ...(b.isScalable!==undefined?{isScalable:b.isScalable}:{}),
      ...(b.checked!==undefined?{checked:b.checked}:{}),
    };
    if(!Object.keys(data).length)throw new BadRequestException('Informe ao menos um campo para edição em massa');
    const result=await this.db.casaNovaItem.updateMany({where:{tenantId,id:{in:ids}},data});
    return {updated:result.count};
  }

  async bulkRemoveItems(tenantId:string,ids:string[]){
    const unique=[...new Set(ids)];
    const result=await this.db.casaNovaItem.deleteMany({where:{tenantId,id:{in:unique}}});
    return {deleted:result.count};
  }

  async removeItem(tenantId:string,id:string){const item=await this.db.casaNovaItem.findFirst({where:{id,tenantId}});if(!item)throw new NotFoundException('Item não encontrado');await this.db.casaNovaItem.delete({where:{id}});return {ok:true,id}}

  async addEssentials(tenantId:string){
    const list=await this.ensureList(tenantId);
    const result=await this.addMissingStandards(tenantId,list.id);
    if(!list.defaultsInitialized)await this.db.casaNovaList.update({where:{tenantId},data:{defaultsInitialized:true}});
    return result;
  }
}
