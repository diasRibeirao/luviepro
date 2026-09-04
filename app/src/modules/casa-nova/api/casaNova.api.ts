import {api} from '../../../api';
export type CasaNovaCategory='Cozinha e mesa'|'Eletrodomésticos'|'Mercado'|'Hortifruti';
export type CasaNovaItem={id:string;itemName:string;category:CasaNovaCategory;baseQuantity:number;unit:string;isScalable:boolean;checked:boolean;notes?:string|null;createdAt:string;updatedAt:string};
export type CasaNovaList={id:string;guests:number;items:CasaNovaItem[];createdAt:string;updatedAt:string};
export type CasaNovaItemPayload={itemName:string;category:CasaNovaCategory;baseQuantity:number;unit:string;isScalable:boolean;notes?:string};
export const casaNovaApi={
  get:()=>api<CasaNovaList>('/casa-nova'),
  updateGuests:(guests:number)=>api('/casa-nova',{method:'PATCH',body:JSON.stringify({guests})}),
  addEssentials:()=>api<{added:number;total:number}>('/casa-nova/essentials',{method:'POST'}),
  addItem:(p:CasaNovaItemPayload)=>api<CasaNovaItem>('/casa-nova/items',{method:'POST',body:JSON.stringify(p)}),
  updateItem:(id:string,p:Partial<CasaNovaItemPayload&{checked:boolean}>)=>api<CasaNovaItem>(`/casa-nova/items/${id}`,{method:'PATCH',body:JSON.stringify(p)}),
  removeItem:(id:string)=>api<{ok:boolean;id:string}>(`/casa-nova/items/${id}`,{method:'DELETE'}),
};
