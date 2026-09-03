import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { feedbackAlert as Alert } from '../../components/Feedback';
import type { PlatformCompany, PlatformFilterRecord, PlatformOverview, PlatformPayment, PlatformPlan, PlatformSubscription, PlatformTab, PlatformUser } from './contracts';

type PlatformRecord=PlatformCompany|PlatformUser|PlatformPlan|PlatformSubscription|PlatformPayment;
type PageMeta={total:number;totalPages:number};

export function usePlatformData({compact,onUnauthorized}:{compact:boolean;onUnauthorized:()=>void}) {
 const[data,setData]=useState<PlatformOverview>();
 const[tab,setTab]=useState<PlatformTab>('overview');
 const[companies,setCompanies]=useState<PlatformCompany[]>([]);
 const[companyOptions,setCompanyOptions]=useState<PlatformCompany[]>([]);
 const[users,setUsers]=useState<PlatformUser[]>([]);
 const[plans,setPlans]=useState<PlatformPlan[]>([]);
 const[subscriptions,setSubscriptions]=useState<PlatformSubscription[]>([]);
 const[payments,setPayments]=useState<PlatformPayment[]>([]);
 const[query,setQueryState]=useState('');
 const[statusFilter,setStatusFilterState]=useState('all');
 const[planFilter,setPlanFilterState]=useState('all');
 const[companyFilter,setCompanyFilterState]=useState('all');
 const[page,setPage]=useState(1);
 const[pageMeta,setPageMeta]=useState<PageMeta>({total:0,totalPages:1});
 const[loading,setLoading]=useState(true);
 const[listLoading,setListLoading]=useState(false);

 const load=useCallback(async()=>{
  setLoading(true);
  try{
    const[overview,tenantResult,userResult,planResult,paymentResult]=await Promise.all([
      api<PlatformOverview>('/platform/overview'),
      api<{items:PlatformCompany[]}>('/platform/tenants?page=1&pageSize=100'),
      api<{items:PlatformUser[]}>('/platform/users?page=1&pageSize=5'),
      api<PlatformPlan[]>('/platform/plans'),
      api<{items:PlatformPayment[]}>('/platform/payments?page=1&pageSize=5')
    ]);
    const tenantItems=tenantResult?.items??[];
    setData(overview);
    setCompanies(tenantItems.slice(0,5));
    setCompanyOptions(tenantItems);
    setUsers(userResult?.items??[]);
    setPlans(planResult??[]);
    setPayments(paymentResult?.items??[]);
  }catch{onUnauthorized()}finally{setLoading(false)}
 },[onUnauthorized]);

 const loadTab=useCallback(async()=>{
  if(tab==='overview'||tab==='plans'||tab==='email'||tab==='maintenance')return;
  const endpoint=tab==='companies'?'tenants':tab==='users'?'users':tab==='subs'?'subscriptions':'payments';
  const params=[`page=${page}`,`pageSize=${compact?12:20}`,query.trim()&&`q=${encodeURIComponent(query.trim())}`,statusFilter!=='all'&&`status=${encodeURIComponent(statusFilter)}`,planFilter!=='all'&&`plan=${encodeURIComponent(planFilter)}`,companyFilter!=='all'&&`tenantId=${encodeURIComponent(companyFilter)}`].filter(Boolean).join('&');
  try{
    setListLoading(true);
    if(tab==='companies'){
      const result=await api<{items:PlatformCompany[];total?:number;totalPages?:number}>(`/platform/${endpoint}?${params}`);
      const items=result?.items??[];setPageMeta({total:result?.total??items.length,totalPages:result?.totalPages??1});setCompanies(items);
    }else if(tab==='users'){
      const result=await api<{items:PlatformUser[];total?:number;totalPages?:number}>(`/platform/${endpoint}?${params}`);
      const items=result?.items??[];setPageMeta({total:result?.total??items.length,totalPages:result?.totalPages??1});setUsers(items);
    }else if(tab==='subs'){
      const result=await api<{items:PlatformSubscription[];total?:number;totalPages?:number}>(`/platform/${endpoint}?${params}`);
      const items=result?.items??[];setPageMeta({total:result?.total??items.length,totalPages:result?.totalPages??1});setSubscriptions(items);
    }else{
      const result=await api<{items:PlatformPayment[];total?:number;totalPages?:number}>(`/platform/${endpoint}?${params}`);
      const items=result?.items??[];setPageMeta({total:result?.total??items.length,totalPages:result?.totalPages??1});setPayments(items);
    }
  }catch(error:unknown){Alert.alert('Não foi possível carregar os registros',error instanceof Error?error.message:'Erro inesperado')}finally{setListLoading(false)}
 },[compact,companyFilter,page,planFilter,query,statusFilter,tab]);

 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const timer=setTimeout(()=>{void loadTab()},query?300:0);return()=>clearTimeout(timer)},[loadTab,query]);

 const source:PlatformRecord[]=tab==='companies'?companies:tab==='users'?users:tab==='plans'?plans:tab==='subs'?subscriptions:payments;
 const filtered=useMemo(()=>{const normalized=query.trim().toLowerCase();return source.filter(record=>{const item=record as PlatformFilterRecord;const matchesText=!normalized||JSON.stringify(record).toLowerCase().includes(normalized);const matchesStatus=statusFilter==='all'||(item.status??(item.active?'active':'inactive'))===statusFilter;const matchesPlan=planFilter==='all'||item.plan===planFilter||item.tenant?.plan===planFilter;const matchesCompany=companyFilter==='all'||item.tenant?.id===companyFilter||item.id===companyFilter;return matchesText&&matchesStatus&&matchesPlan&&matchesCompany})},[companyFilter,planFilter,query,source,statusFilter]);

 const selectTab=(next:PlatformTab)=>{setTab(next);setPage(1);setQueryState('');setStatusFilterState('all');setPlanFilterState('all');setCompanyFilterState('all')};
 const setQuery=(value:string)=>{setQueryState(value);setPage(1)};
 const setStatusFilter=(value:string)=>{setStatusFilterState(value);setPage(1)};
 const setPlanFilter=(value:string)=>{setPlanFilterState(value);setPage(1)};
 const setCompanyFilter=(value:string)=>{setCompanyFilterState(value);setPage(1)};

 return {data,tab,selectTab,companies,companyOptions,users,plans,subscriptions,payments,query,setQuery,statusFilter,setStatusFilter,planFilter,setPlanFilter,companyFilter,setCompanyFilter,page,setPage,pageMeta,loading,listLoading,filtered,reload:load};
}
