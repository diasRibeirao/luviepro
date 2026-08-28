import { useCallback,useEffect,useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform,Pressable,ScrollView,View } from 'react-native';
import { Text,TextInput } from '../../../i18n';
import { api } from '../../../api';
import { AsyncState } from '../../../components/AsyncState';
import { feedbackAlert as Alert } from '../../../components/Feedback';
import { theme } from '../../../theme';
import type { AuditLog,AuditResponse } from '../settings.types';
import { actionLabels } from '../settings.constants';
import { errorMessage } from '../settings.utils';
import { Section } from '../components/SettingsPrimitives';
import { s } from '../settings.styles';

export function AuditPanel(){
  const[list,setList]=useState<AuditLog[]>([]),[actors,setActors]=useState<Array<{id:string;name?:string|null;email?:string|null}>>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[entity,setEntity]=useState(''),[actor,setActor]=useState('');
  const load=useCallback(()=>{setLoading(true);setError('');const q=new URLSearchParams();if(search.trim())q.set('search',search.trim());if(entity)q.set('entity',entity);if(actor)q.set('actorUserId',actor);q.set('take','300');api<AuditResponse|AuditLog[]>(`/audit-logs?${q.toString()}`).then((value:AuditResponse|AuditLog[])=>{setList(Array.isArray(value)?value:value.items??[]);setActors(Array.isArray(value)?[]:value.actors??[])}).catch((e:unknown)=>setError(errorMessage(e))).finally(()=>setLoading(false))},[search,entity,actor]);
  useEffect(()=>{const timer=setTimeout(load,220);return()=>clearTimeout(timer)},[load]);
  const entities=[['','Todos'],['user','Acessos'],['user_invitation','Convites'],['access_profile','Perfis'],['client','Clientes'],['service','Serviços'],['quote','Orçamentos'],['project','Projetos'],['tenant','Empresa']];
  function exportCsv(){if(Platform.OS!=='web'||typeof document==='undefined')return Alert.alert('Exportação disponível na versão Web');const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;const rows=[['Data','Usuário','E-mail','Ação','Entidade','ID','Detalhes'],...list.map(log=>[new Date(log.createdAt).toLocaleString('pt-BR'),log.actor?.name??'',log.actor?.email??'',actionLabels[log.action]??log.action,log.entity,log.entityId??'',JSON.stringify(log.metadata??{})])];const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(esc).join(';')).join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`luviepro-auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
  return <Section title="Histórico de atividades" subtitle="Consulte acessos e alterações relevantes da conta. Recurso exclusivo do Business.">
    <View style={s.auditToolbar}><View style={s.auditSearchWrap}><Ionicons name="search-outline" size={16} color={theme.muted}/><TextInput value={search} onChangeText={setSearch} placeholder="Buscar ação, usuário ou detalhe..." style={s.auditSearch}/></View><Pressable onPress={exportCsv} style={s.auditExport}><Ionicons name="download-outline" size={15} color={theme.green2}/><Text style={s.smallButtonText}>Exportar CSV</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.auditFilters}>{entities.map(([value,label])=><Pressable key={value} onPress={()=>setEntity(value)} style={[s.auditFilter,entity===value&&s.auditFilterOn]}><Text style={[s.auditFilterText,entity===value&&s.auditFilterTextOn]}>{label}</Text></Pressable>)}</ScrollView>
    {actors.length>1?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.auditFilters}><Pressable onPress={()=>setActor('')} style={[s.auditFilter,!actor&&s.auditFilterOn]}><Text style={[s.auditFilterText,!actor&&s.auditFilterTextOn]}>Todos os usuários</Text></Pressable>{actors.map(a=><Pressable key={a.id} onPress={()=>setActor(a.id)} style={[s.auditFilter,actor===a.id&&s.auditFilterOn]}><Text style={[s.auditFilterText,actor===a.id&&s.auditFilterTextOn]}>{a.name}</Text></Pressable>)}</ScrollView>:null}
    <View style={s.auditCount}><Text style={s.auditCountText}>{list.length} evento(s) encontrado(s)</Text></View>
    {loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:list.length===0?<AsyncState empty emptyTitle="Nenhuma atividade encontrada" emptyMessage="Altere os filtros ou a busca para consultar outros eventos."/>:list.map(log=><View key={log.id} style={s.auditRow}><View style={[s.auditDot,log.action==='login_failed'&&{backgroundColor:theme.danger}]}/><View style={{flex:1}}><Text style={s.auditTitle}>{actionLabels[log.action]??log.action} · {log.entity}</Text><Text style={s.auditMeta}>{new Date(log.createdAt).toLocaleString('pt-BR')}{log.actor?.name?` · ${log.actor.name}`:''}{log.actor?.email?` · ${log.actor.email}`:''}</Text>{log.metadata&&Object.keys(log.metadata).length?<Text numberOfLines={2} style={s.auditDetail}>{JSON.stringify(log.metadata)}</Text>:null}</View></View>)}
  </Section>
}
