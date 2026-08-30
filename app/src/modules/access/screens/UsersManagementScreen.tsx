import {useEffect,useState} from 'react';
import {View} from 'react-native';
import {api} from '../../../api';
import {AppShell} from '../../../components/AppShell';
import {AsyncState} from '../../../components/AsyncState';
import type {AccountResponse} from '../../../contracts';
import {UsersPanel} from '../../settings/panels/UsersPanel';

export default function UsersManagementScreen(){
 const[data,setData]=useState<AccountResponse>(),[error,setError]=useState('');
 const load=()=>{setError('');api<AccountResponse>('/account').then(setData).catch(e=>setError(e instanceof Error?e.message:'Não foi possível carregar os usuários'))};
 useEffect(load,[]);
 return <AppShell title="Usuários" subtitle="Convites, perfis e acessos da sua empresa"><View>{!data?<AsyncState loading={!error} error={error} onRetry={load}/>:<UsersPanel limit={data.limit?.maxUsers??1} plan={data.tenant.plan}/>}</View></AppShell>;
}
