import { useCallback,useEffect,useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable,View } from 'react-native';
import { Text } from '../../../i18n';
import { api } from '../../../api';
import { AsyncState } from '../../../components/AsyncState';
import { feedbackAlert as Alert,useFeedback } from '../../../components/Feedback';
import { theme } from '../../../theme';
import type { AccessProfile } from '../settings.types';
import { permissionGroups } from '../settings.constants';
import { errorMessage } from '../settings.utils';
import { Section,Field } from '../components/SettingsPrimitives';
import { s } from '../settings.styles';

export function AccessProfilesPanel(){
  const[list,setList]=useState<AccessProfile[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[editing,setEditing]=useState<AccessProfile>(),[name,setName]=useState(''),[description,setDescription]=useState(''),[permissions,setPermissions]=useState<string[]>([]),[busy,setBusy]=useState(false);
  const{confirm}=useFeedback();
  const load=useCallback(()=>{setLoading(true);setError('');api<AccessProfile[]>('/access-profiles').then(setList).catch((e:unknown)=>setError(errorMessage(e))).finally(()=>setLoading(false))},[]);useEffect(load,[]);
  const reset=()=>{setEditing(undefined);setName('');setDescription('');setPermissions([])};
  const edit=(profile:AccessProfile)=>{setEditing(profile);setName(profile.name);setDescription(profile.description??'');setPermissions(Array.isArray(profile.permissions)?profile.permissions:[])};
  const togglePermission=(code:string)=>setPermissions(current=>current.includes(code)?current.filter(x=>x!==code):[...current,code]);
  async function save(){if(name.trim().length<2||permissions.length===0)return Alert.alert('Revise o perfil','Informe um nome e selecione pelo menos uma permissão.');try{setBusy(true);const body=JSON.stringify({name,description,permissions});if(editing)await api(`/access-profiles/${editing.id}`,{method:'PATCH',body});else await api('/access-profiles',{method:'POST',body});reset();load();Alert.alert(editing?'Perfil atualizado':'Perfil criado')}catch(e:unknown){Alert.alert('Não foi possível salvar o perfil',errorMessage(e))}finally{setBusy(false)}}
  async function toggleActive(profile:AccessProfile){if(profile.active&&!(await confirm({title:'Inativar perfil?',message:'O perfil só pode ser inativado se não houver usuários ativos vinculados a ele.',confirmLabel:'Inativar',danger:true})))return;try{await api(`/access-profiles/${profile.id}`,{method:'PATCH',body:JSON.stringify({active:!profile.active})});load()}catch(e:unknown){Alert.alert('Não foi possível alterar o perfil',errorMessage(e))}}
  return <Section title="Perfis e permissões" subtitle="Crie perfis personalizados para o plano Business e escolha exatamente quais áreas cada pessoa pode acessar.">
    <View style={s.businessNote}><Ionicons name="shield-checkmark-outline" size={18} color={theme.gold}/><View style={{flex:1}}><Text style={s.businessTitle}>Permissões aplicadas no backend</Text><Text style={s.businessText}>O menu é ajustado ao perfil e as operações protegidas são validadas novamente pela API.</Text></View></View>
    <View style={[s.grid,{marginTop:16}]}><Field label="Nome do perfil" value={name} change={setName}/><Field label="Descrição" value={description} change={setDescription}/></View>
    <View style={s.permissionGroups}>{permissionGroups.map(([group,items])=><View key={group} style={s.permissionGroup}><Text style={s.permissionGroupTitle}>{group}</Text>{items.map(([code,label])=><Pressable key={code} onPress={()=>togglePermission(code)} style={s.permissionRow}><View style={[s.permissionCheck,permissions.includes(code)&&s.permissionCheckOn]}>{permissions.includes(code)&&<Ionicons name="checkmark" size={13} color={theme.white}/>}</View><Text style={s.permissionLabel}>{label}</Text><Text style={s.permissionCode}>{code}</Text></Pressable>)}</View>)}</View>
    <View style={s.profileActions}><Pressable onPress={reset} style={s.smallButton}><Text style={s.smallButtonText}>Limpar</Text></Pressable><Pressable disabled={busy||name.trim().length<2||permissions.length===0} onPress={save} style={[s.planButton,{marginTop:0},(busy||name.trim().length<2||permissions.length===0)&&{opacity:.45}]}><Text style={s.planButtonText}>{busy?'Salvando...':editing?'Salvar perfil':'Criar perfil'}</Text></Pressable></View>
    <Text style={[s.blockTitle,{marginTop:22}]}>Perfis cadastrados</Text>
    {loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:list.length===0?<AsyncState empty emptyTitle="Nenhum perfil personalizado" emptyMessage="Crie o primeiro perfil para controlar acessos por área."/>:list.map(profile=><View key={profile.id} style={s.userRow}><View style={s.userAvatar}><Ionicons name="key-outline" size={16} color={theme.green2}/></View><View style={{flex:1}}><Text style={s.userName}>{profile.name}</Text><Text style={s.userMeta}>{profile.description||'Sem descrição'} · {Array.isArray(profile.permissions)?profile.permissions.length:0} permissões</Text></View><View style={[s.statusBadge,profile.active?s.activeBadge:s.inactiveBadge]}><Text style={s.statusText}>{profile.active?'Ativo':'Inativo'}</Text></View><Pressable onPress={()=>edit(profile)} style={s.smallButton}><Text style={s.smallButtonText}>Editar</Text></Pressable><Pressable onPress={()=>toggleActive(profile)} style={s.smallButton}><Text style={s.smallButtonText}>{profile.active?'Inativar':'Ativar'}</Text></Pressable></View>)}
  </Section>
}
