import {api} from '../../../api';
import type {AccountData,CreateQuotePayload,DuplicateQuoteResponse,PricingRequest,PricingResult,ProposalData,QuoteClientOption,QuoteDetailData,QuoteRecord,QuoteServiceOption,QuoteStatusChange,QuoteVersion,ShareResponse,TimelineEvent,UpdateQuotePayload,QuoteWizardAccount} from '../types/quote.types';

export const quotesApi={
  list:()=>api<QuoteRecord[]>('/quotes'),
  get:(id:string)=>api<QuoteDetailData>(`/quotes/${id}`),
  create:(payload:CreateQuotePayload)=>api<QuoteDetailData>('/quotes',{method:'POST',body:JSON.stringify(payload)}),
  update:(id:string,payload:UpdateQuotePayload)=>api<QuoteDetailData>(`/quotes/${id}`,{method:'PATCH',body:JSON.stringify(payload)}),
  approve:(id:string)=>api(`/quotes/${id}/approve`,{method:'PATCH'}),
  changeStatus:(id:string,status:QuoteStatusChange)=>api(`/quotes/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  duplicate:(id:string)=>api<DuplicateQuoteResponse>(`/quotes/${id}/duplicate`,{method:'POST'}),
  versions:(id:string)=>api<QuoteVersion[]>(`/quotes/${id}/versions`),
  timeline:(id:string)=>api<TimelineEvent[]>(`/quotes/${id}/timeline`),
  share:(id:string)=>api<ShareResponse>(`/quotes/${id}/share`,{method:'POST'}),
  revokeShare:(id:string)=>api(`/quotes/${id}/share/revoke`,{method:'POST'}),
  clients:()=>api<QuoteClientOption[]>('/clients'),
  services:()=>api<QuoteServiceOption[]>('/services'),
  wizardAccount:()=>api<QuoteWizardAccount>('/account'),
  proposalAccount:()=>api<AccountData>('/account'),
  proposal:(id:string)=>api<ProposalData>(`/quotes/${id}`),
  calculate:(payload:PricingRequest)=>api<PricingResult>('/pricing/calculate',{method:'POST',body:JSON.stringify(payload)}),
};
