import {api} from '../../../api';
export type CasaNovaCategory='Cozinha e mesa'|'Eletrodomésticos'|'Mercado'|'Hortifruti'|'Cama e banho';
export type CasaNovaItem={id:string;itemName:string;category:CasaNovaCategory;baseQuantity:number;quantityOverride?:number|null;unit:string;isScalable:boolean;checked:boolean;notes?:string|null;createdAt:string;updatedAt:string};
export type CasaNovaList={id:string;guests:number;items:CasaNovaItem[];createdAt:string;updatedAt:string};
export type CasaNovaItemPayload={itemName:string;category:CasaNovaCategory;baseQuantity:number;unit:string;isScalable:boolean;notes?:string;quantityOverride?:number|null};
export type CasaNovaBulkPayload={ids:string[];category?:CasaNovaCategory;unit?:string;isScalable?:boolean;checked?:boolean};
export const casaNovaApi={
  get:()=>api<CasaNovaList>('/casa-nova'),
  updateGuests:(guests:number)=>api('/casa-nova',{method:'PATCH',body:JSON.stringify({guests})}),
  addEssentials:()=>api<{added:number;total:number}>('/casa-nova/essentials',{method:'POST'}),
  addItem:(p:CasaNovaItemPayload)=>api<CasaNovaItem>('/casa-nova/items',{method:'POST',body:JSON.stringify(p)}),
  updateItem:(id:string,p:Partial<CasaNovaItemPayload&{checked:boolean}>)=>api<CasaNovaItem>(`/casa-nova/items/${id}`,{method:'PATCH',body:JSON.stringify(p)}),
  bulkUpdate:(p:CasaNovaBulkPayload)=>api<{updated:number}>('/casa-nova/items/bulk',{method:'PATCH',body:JSON.stringify(p)}),
  bulkRemove:(ids:string[])=>api<{deleted:number}>('/casa-nova/items/bulk',{method:'DELETE',body:JSON.stringify({ids})}),
  removeItem:(id:string)=>api<{ok:boolean;id:string}>(`/casa-nova/items/${id}`,{method:'DELETE'}),
};
