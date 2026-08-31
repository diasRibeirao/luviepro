import {useEffect,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,View} from 'react-native';
import {router} from 'expo-router';
import {api} from '../../../api';
import {AppShell} from '../../../components/AppShell';
import {AsyncState} from '../../../components/AsyncState';
import {Text} from '../../../i18n';
import {theme} from '../../../theme';
import type {AccountResponse} from '../../../contracts';
import {UsersPanel} from '../../settings/panels/UsersPanel';

export default function UsersManagementScreen(){
 const[data,setData]=useState<AccountResponse>(),[error,setError]=useState('');
 const load=()=>{setError('');api<AccountResponse>('/account').then(setData).catch(e=>setError(e instanceof Error?e.message:'Não foi possível carregar os usuários'))};
 useEffect(load,[]);
 return <AppShell title="Usuários" subtitle="Convites, perfis e acessos da sua empresa"><Pressable onPress={()=>router.push('/settings')} style={s.back}><Ionicons name="arrow-back" size={16} color={theme.green2}/><Text style={s.backText}>Voltar para Configurações</Text></Pressable><View>{!data?<AsyncState loading={!error} error={error} onRetry={load}/>:<UsersPanel limit={data.limit?.maxUsers??1} plan={data.tenant.plan}/>}</View></AppShell>;
}
const s=StyleSheet.create({back:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,marginBottom:14,paddingVertical:4},backText:{fontSize:12,fontWeight:'800',color:theme.green2}});
