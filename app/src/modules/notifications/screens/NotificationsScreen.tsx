import {useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,Switch,useWindowDimensions,View} from 'react-native';
import {router} from 'expo-router';
import {AppShell} from '../../../components/AppShell';
import {AsyncState} from '../../../components/AsyncState';
import {Text,useI18n} from '../../../i18n';
import {api} from '../../../api';
import {theme} from '../../../theme';
import {notificationHref} from '../notificationNavigation';

type NotificationType='quote'|'calendar'|'task'|'task_due'|'project_due'|string;
type NotificationRecord={id:string;type:NotificationType;title:string;message?:string|null;createdAt:string;readAt?:string|null;route?:string|null};
type NotificationPreferences={agendaReminders:boolean;projectDeadlines:boolean;taskDeadlines:boolean;quoteExpirations:boolean;emailEnabled:boolean;[key:string]:boolean};
type Filter='all'|'unread'|'read';
type ToggleProps={label:string;value:boolean;onValueChange:(value:boolean)=>void};

export default function Notifications(){
 const{locale}=useI18n();
 const width=useWindowDimensions().width;
 const compact=width<760,narrow=width<520;
 const[rows,setRows]=useState<NotificationRecord[]>([]),[prefs,setPrefs]=useState<NotificationPreferences>(),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState<Filter>('all'),[showPrefs,setShowPrefs]=useState(false);
 const load=()=>{setLoading(true);setError('');Promise.all([api<NotificationRecord[]>('/notifications'),api<NotificationPreferences>('/notifications/preferences')]).then(([n,p])=>{setRows(n);setPrefs(p)}).catch((e:unknown)=>setError(e instanceof Error?e.message:'Não foi possível carregar as notificações')).finally(()=>setLoading(false))};
 useEffect(load,[]);
 const unreadCount=rows.filter(x=>!x.readAt).length;
 const readCount=rows.length-unreadCount;
 const visible=useMemo(()=>filter==='unread'?rows.filter(x=>!x.readAt):filter==='read'?rows.filter(x=>!!x.readAt):rows,[rows,filter]);
 const read=async(n:NotificationRecord)=>{if(!n.readAt)await api(`/notifications/${n.id}/read`,{method:'PATCH'});const href=notificationHref(n.route);if(href)router.push(href);else load()};
 const markAll=async()=>{await api('/notifications/read-all',{method:'PATCH'});load()};
 const toggle=async(key:string,value:boolean)=>{const next:NotificationPreferences={agendaReminders:prefs?.agendaReminders??false,projectDeadlines:prefs?.projectDeadlines??false,taskDeadlines:prefs?.taskDeadlines??false,quoteExpirations:prefs?.quoteExpirations??false,emailEnabled:prefs?.emailEnabled??false,...prefs,[key]:value};setPrefs(next);await api('/notifications/preferences',{method:'PATCH',body:JSON.stringify({[key]:value})})};
 return <AppShell title="Notificações" subtitle="Avisos importantes do LuviePro em um único lugar">{loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:<View style={s.page}>
   <View style={[s.actions,compact&&s.actionsCompact]}>
     <Pressable onPress={()=>setShowPrefs(v=>!v)} style={[s.actionSecondary,narrow&&s.actionNarrow]}><Ionicons name="options-outline" size={17} color={theme.green2}/><Text style={s.actionSecondaryText}>{showPrefs?'Ocultar preferências':'Preferências'}</Text></Pressable>
     {unreadCount>0?<Pressable onPress={markAll} style={[s.actionPrimary,narrow&&s.actionNarrow]}><Ionicons name="checkmark-done-outline" size={18} color="white"/><Text style={s.actionPrimaryText}>Marcar todas como lidas</Text></Pressable>:null}
   </View>
   {showPrefs&&prefs?<View style={s.prefsPanel}><View style={s.prefsHead}><View><Text style={s.prefsTitle}>Preferências</Text><Text style={s.muted}>Escolha os alertas que deseja receber.</Text></View><Pressable onPress={()=>setShowPrefs(false)} style={s.closePrefs}><Ionicons name="close" size={18} color={theme.muted}/></Pressable></View><View style={[s.prefsGrid,compact&&s.prefsGridCompact]}><Toggle label="Lembretes da agenda" value={prefs.agendaReminders} onValueChange={(v:boolean)=>toggle('agendaReminders',v)}/><Toggle label="Prazos de projetos" value={prefs.projectDeadlines} onValueChange={(v:boolean)=>toggle('projectDeadlines',v)}/><Toggle label="Prazos de tarefas" value={prefs.taskDeadlines} onValueChange={(v:boolean)=>toggle('taskDeadlines',v)}/><Toggle label="Validade de propostas" value={prefs.quoteExpirations} onValueChange={(v:boolean)=>toggle('quoteExpirations',v)}/><Toggle label="Receber também por e-mail" value={prefs.emailEnabled} onValueChange={(v:boolean)=>toggle('emailEnabled',v)}/></View></View>:null}
   <View style={[s.filterRow,narrow&&s.filterRowNarrow]}><FilterPill label={`Todas (${rows.length})`} active={filter==='all'} onPress={()=>setFilter('all')}/><FilterPill label={`Não lidas (${unreadCount})`} active={filter==='unread'} onPress={()=>setFilter('unread')}/><FilterPill label={`Lidas (${readCount})`} active={filter==='read'} onPress={()=>setFilter('read')}/></View>
   <Text style={s.count}>{visible.length} notificação(ões)</Text>
   <View style={s.list}>{visible.length===0?<View style={s.empty}><Ionicons name="notifications-outline" size={30} color={theme.gold}/><Text style={s.emptyTitle}>Tudo em dia</Text><Text style={s.muted}>Não há notificações neste filtro.</Text></View>:visible.map(n=><Pressable key={n.id} onPress={()=>read(n)} style={({pressed})=>[s.item,narrow&&s.itemNarrow,!n.readAt&&s.unread,pressed&&s.pressed]}>
      <View style={[s.icon,n.type==='quote'&&s.iconGold]}><Ionicons name={n.type==='calendar'?'calendar-outline':n.type==='task'||n.type==='task_due'?'checkbox-outline':n.type==='project_due'?'briefcase-outline':'notifications-outline'} size={19} color={theme.green}/></View>
      <View style={s.itemBody}><View style={s.titleRow}><Text style={s.title}>{n.title}</Text>{!n.readAt&&<View style={s.dot}/>}</View>{n.message&&<Text style={s.message}>{n.message}</Text>}<Text style={s.date}>{new Date(n.createdAt).toLocaleString(locale)}</Text></View>
      <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
   </Pressable>)}</View>
 </View>}</AppShell>
}
function FilterPill({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.filter,active&&s.filterActive]}><Text style={[s.filterText,active&&s.filterTextActive]}>{label}</Text></Pressable>}
function Toggle({label,value,onValueChange}:ToggleProps){return <View style={s.toggle}><Text style={s.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{true:theme.green3,false:theme.border}}/></View>}
const s=StyleSheet.create({
 page:{width:'100%',gap:14},actions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:10,flexWrap:'wrap'},actionsCompact:{justifyContent:'flex-start'},actionSecondary:{minHeight:44,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:theme.white},actionPrimary:{minHeight:44,borderRadius:10,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:theme.green},actionNarrow:{width:'100%'},actionSecondaryText:{fontSize:12,fontWeight:'900',color:theme.ink},actionPrimaryText:{fontSize:12,fontWeight:'900',color:'white'},
 prefsPanel:{borderWidth:1,borderColor:theme.border,borderRadius:14,backgroundColor:theme.white,padding:16},prefsHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10},prefsTitle:{fontFamily:'serif',fontSize:18,fontWeight:'800',color:theme.ink},closePrefs:{width:34,height:34,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:theme.cream},prefsGrid:{marginTop:12,flexDirection:'row',flexWrap:'wrap',gap:10},prefsGridCompact:{flexDirection:'column'},muted:{fontSize:12,color:theme.muted,marginTop:4},toggle:{minHeight:52,minWidth:250,flex:1,borderWidth:1,borderColor:theme.border,borderRadius:11,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:theme.cream},toggleLabel:{fontSize:12,fontWeight:'800',color:theme.ink,flex:1,paddingRight:8},
 filterRow:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},filterRowNarrow:{gap:6},filter:{minHeight:42,borderWidth:1,borderColor:theme.border,borderRadius:21,paddingHorizontal:15,alignItems:'center',justifyContent:'center',backgroundColor:theme.white},filterActive:{borderColor:theme.green2,backgroundColor:theme.green50},filterText:{fontSize:12,fontWeight:'800',color:theme.muted},filterTextActive:{color:theme.green2},count:{fontSize:11,color:theme.muted},
 list:{width:'100%',gap:10},item:{minHeight:94,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:theme.border,borderRadius:13,backgroundColor:theme.white},itemNarrow:{paddingHorizontal:11,gap:9},unread:{borderColor:theme.green2,backgroundColor:theme.green50},pressed:{opacity:.78},icon:{width:42,height:42,borderRadius:12,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},iconGold:{backgroundColor:theme.goldPale},itemBody:{flex:1,minWidth:0},titleRow:{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},title:{fontSize:13,fontWeight:'900',color:theme.ink,flexShrink:1},dot:{width:7,height:7,borderRadius:4,backgroundColor:theme.gold},message:{fontSize:12,color:theme.muted,marginTop:4,lineHeight:17},date:{fontSize:10,color:theme.muted,marginTop:7},empty:{alignItems:'center',padding:42,borderWidth:1,borderColor:theme.border,borderRadius:14,backgroundColor:theme.white},emptyTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink,marginTop:8}
});
