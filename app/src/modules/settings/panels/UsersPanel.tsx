import { type ComponentProps,useCallback,useEffect,useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform,Pressable,View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../../../i18n';
import { api } from '../../../api';
import { AsyncState } from '../../../components/AsyncState';
import { feedbackAlert as Alert,useFeedback } from '../../../components/Feedback';
import { theme } from '../../../theme';
import { isValidEmail } from '../../../formValidation';
import type { AccessProfile,InviteRecord,InviteResult,UserRecord } from '../settings.types';
import { roleHelp,roleLabels } from '../settings.constants';
import { errorMessage } from '../settings.utils';
import { Section,Field } from '../components/SettingsPrimitives';
import { s } from '../settings.styles';

type IoniconName=ComponentProps<typeof Ionicons>['name'];

export function UsersPanel({limit,plan}:{limit:number;plan:string}){
  const[users,setUsers]=useState<UserRecord[]>([]),[invites,setInvites]=useState<InviteRecord[]>([]),[profiles,setProfiles]=useState<AccessProfile[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState('commercial'),[customProfileId,setCustomProfileId]=useState<string|undefined>(),[busy,setBusy]=useState(false),[lastInvite,setLastInvite]=useState<InviteResult>();
  const{confirm}=useFeedback();
  const load=useCallback(()=>{setLoading(true);setError('');const profilesCall=plan==='business'?api<AccessProfile[]>('/access-profiles').catch(()=>[]):Promise.resolve<AccessProfile[]>([]);Promise.all([api<UserRecord[]>('/users'),api<InviteRecord[]>('/user-invitations'),profilesCall]).then(([u,i,p])=>{setUsers(u);setInvites(i);setProfiles(p)}).catch((e:unknown)=>setError(errorMessage(e))).finally(()=>setLoading(false))},[plan]);
  useEffect(load,[]);
  const active=users.filter(u=>u.active).length;
  const pending=invites.filter(i=>i.status==='pending'&&new Date(i.expiresAt).getTime()>Date.now()).length;
  const used=active+pending;
  const full=limit>=0&&used>=limit;
  const starter=plan==='starter';
  async function copyInvite(url?:string){
    if(!url)return;
    try{
      const nav=typeof navigator!=='undefined'?navigator:undefined;if(Platform.OS==='web'&&nav?.clipboard){await nav.clipboard.writeText(url);Alert.alert('Link copiado','Envie o link ao usuário por um canal seguro.');}
      else Alert.alert('Link do convite',url);
    }catch{Alert.alert('Link do convite',url)}
  }
  async function add(){
    if(starter||full)return;
    try{
      setBusy(true);
      const created=await api<InviteResult>('/users',{method:'POST',body:JSON.stringify({name,email,role,customProfileId})});
      setName('');setEmail('');setCustomProfileId(undefined);setLastInvite(created);
      if(created.delivery?.sent)Alert.alert('Convite enviado',`Enviamos um convite para ${created.email}. A pessoa deverá definir a própria senha.`);
      else Alert.alert('Convite criado','O servidor de e-mail ainda não está configurado. O link de convite está disponível para compartilhamento manual.');
      load();
    }catch(e:unknown){Alert.alert('Não foi possível enviar o convite',errorMessage(e))}finally{setBusy(false)}
  }
  async function toggle(user:UserRecord){
    if(user.active&&!(await confirm({title:'Desativar acesso?',message:`${user.name} perderá o acesso imediatamente. Usuários inativos não consomem uma vaga do plano.`,confirmLabel:'Desativar',danger:true})))return;
    try{await api(`/users/${user.id}`,{method:'PATCH',body:JSON.stringify({active:!user.active})});load()}catch(e:unknown){Alert.alert('Não foi possível alterar o acesso',errorMessage(e))}
  }
  async function resend(invite:InviteRecord){
    try{setBusy(true);const result=await api<InviteResult>(`/user-invitations/${invite.id}/resend`,{method:'POST'});setLastInvite({...invite,...result});if(result.delivery?.sent)Alert.alert('Convite reenviado',`Um novo convite foi enviado para ${invite.email}.`);else Alert.alert('Convite renovado','O novo link foi gerado, mas o SMTP não está configurado.')}catch(e:unknown){Alert.alert('Não foi possível reenviar',errorMessage(e))}finally{setBusy(false);load()}
  }
  async function cancelInvite(invite:InviteRecord){
    if(!(await confirm({title:'Cancelar convite?',message:`${invite.email} não poderá mais usar este convite e a vaga reservada será liberada.`,confirmLabel:'Cancelar convite',danger:true})))return;
    try{await api(`/user-invitations/${invite.id}/cancel`,{method:'PATCH'});if(lastInvite?.id===invite.id)setLastInvite(undefined);load()}catch(e:unknown){Alert.alert('Não foi possível cancelar',errorMessage(e))}
  }
  return <Section title="Usuários e acessos" subtitle="Convide pessoas para o sistema sem compartilhar senhas. Equipe operacional e usuários licenciados continuam sendo conceitos separados.">
    <View style={s.accessSummary}>
      <View><Text style={s.accessNumber}>{used} / {limit<0?'∞':limit}</Text><Text style={s.accessLabel}>VAGAS UTILIZADAS</Text></View>
      <View style={s.accessDivider}/>
      <View style={{flex:1}}><Text style={s.accessPlan}>Plano {plan[0].toUpperCase()+plan.slice(1)}</Text><Text style={s.accessHint}>{starter?'O Starter é individual e permite somente o proprietário.':full?'Limite atingido. Convites pendentes também reservam vagas.':`${active} ativo(s) · ${pending} convite(s) pendente(s)`}</Text></View>
      {(starter||full)&&<Pressable onPress={()=>router.push('/plans')} style={s.upgradeButton}><Text style={s.upgradeButtonText}>Ver planos</Text></Pressable>}
    </View>
    {!starter&&<>
      <Text style={s.blockTitle}>Convidar usuário</Text>
      <Text style={s.blockHelp}>Informe nome, e-mail e perfil. O usuário receberá um link temporário e definirá a própria senha.</Text>
      <View style={s.grid}><Field label="Nome" value={name} change={setName}/><Field label="E-mail" value={email} change={setEmail} autoCapitalize="none" keyboardType="email-address"/></View>
      <Text style={[s.label,{marginTop:14}]}>PERFIL DE ACESSO</Text>
      <View style={s.profileGrid}>{['admin','commercial','operational','finance'].map(value=><Pressable key={value} onPress={()=>{setRole(value);setCustomProfileId(undefined)}} style={[s.profileCard,role===value&&s.profileCardOn]}><View style={s.profileHead}><Ionicons name={(value==='admin'?'shield-checkmark-outline':value==='commercial'?'briefcase-outline':value==='operational'?'construct-outline':'cash-outline') as IoniconName} size={18} color={role===value?theme.green2:theme.muted}/><Text style={[s.profileName,role===value&&s.profileNameOn]}>{roleLabels[value]}</Text></View><Text style={s.profileHelp}>{roleHelp[value]}</Text></Pressable>)}</View>
      {plan==='business'&&profiles.filter(p=>p.active).length>0&&<><Text style={[s.label,{marginTop:14}]}>PERFIS PERSONALIZADOS</Text><View style={s.profileGrid}>{profiles.filter(p=>p.active).map(profile=><Pressable key={profile.id} onPress={()=>{setCustomProfileId(profile.id);setRole('admin')}} style={[s.profileCard,customProfileId===profile.id&&s.profileCardOn]}><View style={s.profileHead}><Ionicons name="key-outline" size={18} color={customProfileId===profile.id?theme.green2:theme.muted}/><Text style={[s.profileName,customProfileId===profile.id&&s.profileNameOn]}>{profile.name}</Text></View><Text style={s.profileHelp}>{profile.description||`${Array.isArray(profile.permissions)?profile.permissions.length:0} permissões configuradas`}</Text></Pressable>)}</View></>}
      <Pressable disabled={busy||full||!name.trim()||!isValidEmail(email)} onPress={add} style={[s.planButton,(busy||full||!name.trim()||!isValidEmail(email))&&{opacity:.45}]}><Ionicons name="mail-unread-outline" size={16} color={theme.g900}/><Text style={s.planButtonText}>{busy?'Enviando...':'Enviar convite'}</Text></Pressable>
      {lastInvite?.inviteUrl&&<View style={s.inviteLinkCard}><Ionicons name="link-outline" size={18} color={theme.green2}/><View style={{flex:1}}><Text style={s.inviteLinkTitle}>{lastInvite.delivery?.sent?'Convite enviado por e-mail':'Link para compartilhamento manual'}</Text><Text numberOfLines={1} style={s.inviteLinkText}>{lastInvite.inviteUrl}</Text></View><Pressable onPress={()=>copyInvite(lastInvite.inviteUrl)} style={s.smallButton}><Text style={s.smallButtonText}>Copiar link</Text></Pressable></View>}
    </>}
    {invites.length>0&&<><Text style={[s.blockTitle,{marginTop:22}]}>Convites</Text><View>{invites.map(invite=><View key={invite.id} style={s.userRow}><View style={s.userAvatar}><Ionicons name="mail-outline" size={16} color={theme.green2}/></View><View style={{flex:1}}><Text style={s.userName}>{invite.name}</Text><Text style={s.userMeta}>{invite.email} · {invite.customProfile?.name??roleLabels[invite.role]??invite.role} · expira {new Date(invite.expiresAt).toLocaleString('pt-BR')}</Text></View><View style={[s.statusBadge,invite.status==='pending'?s.pendingBadge:s.inactiveBadge]}><Text style={s.statusText}>{invite.status==='pending'?'Pendente':'Expirado'}</Text></View><Pressable disabled={busy} onPress={()=>resend(invite)} style={s.smallButton}><Text style={s.smallButtonText}>Reenviar</Text></Pressable><Pressable disabled={busy} onPress={()=>cancelInvite(invite)} style={s.smallButton}><Text style={[s.smallButtonText,{color:theme.danger}]}>Cancelar</Text></Pressable></View>)}</View></>}
    <Text style={[s.blockTitle,{marginTop:22}]}>Pessoas com acesso</Text>
    <View>{loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:users.map(user=><View key={user.id} style={s.userRow}><View style={s.userAvatar}><Text style={s.userAvatarText}>{user.name?.slice(0,2).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.userName}>{user.name}</Text><Text style={s.userMeta}>{user.email} · {user.customProfile?.name??roleLabels[user.role]??user.role}</Text></View><View style={[s.statusBadge,user.active?s.activeBadge:s.inactiveBadge]}><Text style={s.statusText}>{user.active?'Ativo':'Inativo'}</Text></View>{user.role!=='owner'&&<Pressable onPress={()=>toggle(user)} style={s.smallButton}><Text style={s.smallButtonText}>{user.active?'Desativar':'Ativar'}</Text></Pressable>}</View>)}</View>
    {plan==='business'&&<View style={s.businessNote}><Ionicons name="diamond-outline" size={17} color={theme.gold}/><View style={{flex:1}}><Text style={s.businessTitle}>Business · controle avançado</Text><Text style={s.businessText}>Auditoria, perfis personalizados e permissões granulares estão habilitados neste plano.</Text></View></View>}
  </Section>
}
