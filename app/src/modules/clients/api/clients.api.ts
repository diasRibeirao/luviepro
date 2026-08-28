import {api} from '../../../api';
import type {ClientForm,ClientRecord} from '../types/client.types';

export type SaveClientPayload=ClientForm;

export const clientsApi={
  list:()=>api<ClientRecord[]>('/clients'),
  create:(payload:SaveClientPayload)=>api<ClientRecord>('/clients',{method:'POST',body:JSON.stringify(payload)}),
  update:(id:string,payload:SaveClientPayload)=>api<ClientRecord>(`/clients/${id}`,{method:'PATCH',body:JSON.stringify(payload)}),
  save:(id:string|undefined,payload:SaveClientPayload)=>id?clientsApi.update(id,payload):clientsApi.create(payload),
};
