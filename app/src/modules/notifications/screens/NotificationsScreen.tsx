import {useEffect,useState} from 'react';
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
type NotificationRecord={
 id:string;
 type:NotificationType;
 title:string;
 message?:string|null;
 createdAt:string;
 readAt?:string|null;
 route?:string|null;
};
type NotificationPreferences={
 agendaReminders:boolean;
 projectDeadlines:boolean;
 taskDeadlines:boolean;
 quoteExpirations:boolean;
 [key:string]:boolean;
};
type ToggleProps={label:string;value:boolean;onValueChange:(value:boolean)=>void};
export default function Notifications(){const{locale}=useI18n();const compact=useWindowDimensions().width<760;const[rows,setRows]=useState<NotificationRecord[]>([]),[prefs,setPrefs]=useState<NotificationPreferences>(),[loading,setLoading]=useState(true),[error,setError]=useState('');const load=()=>{setLoading(true);Promise.all([api<NotificationRecord[]>('/notifications'),api<NotificationPreferences>('/notifications/preferences')]).then(([n,p])=>{setRows(n);setPrefs(p)}).catch((e:unknown)=>setError(e instanceof Error?e.message:'Não foi possível carregar as notificações')).finally(()=>setLoading(false))};useEffect(load,[]);const read=async(n:NotificationRecord)=>{if(!n.readAt)await api(`/notifications/${n.id}/read`,{method:'PATCH'});const href=notificationHref(n.route);if(href)router.push(href);else load()};const toggle=async(key:string,value:boolean)=>{const next:NotificationPreferences={agendaReminders:prefs?.agendaReminders??false,projectDeadlines:prefs?.projectDeadlines??false,taskDeadlines:prefs?.taskDeadlines??false,quoteExpirations:prefs?.quoteExpirations??false,...prefs,[key]:value};setPrefs(next);await api('/notifications/preferences',{method:'PATCH',body:JSON.stringify({[key]:value})})};return <AppShell title="Notificações" subtitle="Alertas e lembretes importantes da sua operação" action={rows.some(x=>!x.readAt)?<Pressable onPress={async()=>{await api('/notifications/read-all',{method:'PATCH'});load()}}><Text style={s.mark}>Marcar todas como lidas</Text></Pressable>:undefined}>{loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:<View style={[s.grid,compact&&s.gridCompact]}><View style={[s.list,compact&&s.listCompact]}>{rows.length===0?<View style={s.empty}><Ionicons name="notifications-outline" size={30} color={theme.gold}/><Text style={s.emptyTitle}>Tudo em dia</Text><Text style={s.muted}>Novos lembretes aparecerão aqui.</Text></View>:rows.map(n=><Pressable key={n.id} onPress={()=>read(n)} style={[s.item,!n.readAt&&s.unread]}><View style={[s.icon,n.type==='quote'&&s.iconGold]}><Ionicons name={n.type==='calendar'?'calendar-outline':n.type==='task'||n.type==='task_due'?'checkbox-outline':n.type==='project_due'?'briefcase-outline':'document-text-outline'} size={19} color={theme.green}/></View><View style={{flex:1}}><View style={s.titleRow}><Text style={s.title}>{n.title}</Text>{!n.readAt&&<View style={s.dot}/>}</View>{n.message&&<Text style={s.message}>{n.message}</Text>}<Text style={s.date}>{new Date(n.createdAt).toLocaleString(locale)}</Text></View><Ionicons name="chevron-forward" size={16} color={theme.muted}/></Pressable>)}</View>{prefs&&<View style={[s.prefs,compact&&s.prefsCompact]}><Text style={s.prefsTitle}>Preferências</Text><Text style={s.muted}>Escolha os alertas que deseja receber.</Text><Toggle label="Lembretes da agenda" value={prefs.agendaReminders} onValueChange={(v:boolean)=>toggle('agendaReminders',v)}/><Toggle label="Prazos de projetos" value={prefs.projectDeadlines} onValueChange={(v:boolean)=>toggle('projectDeadlines',v)}/><Toggle label="Prazos de tarefas" value={prefs.taskDeadlines} onValueChange={(v:boolean)=>toggle('taskDeadlines',v)}/><Toggle label="Validade de propostas" value={prefs.quoteExpirations} onValueChange={(v:boolean)=>toggle('quoteExpirations',v)}/></View>}</View>}</AppShell>}
function Toggle({label,value,onValueChange}:ToggleProps){return <View style={s.toggle}><Text style={s.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{true:theme.green3,false:theme.border}}/></View>}
const s=StyleSheet.create({grid:{flexDirection:'row',gap:18,alignItems:'flex-start',flexWrap:'wrap'},gridCompact:{flexDirection:'column',gap:12},list:{flex:2,minWidth:300,backgroundColor:theme.white,borderRadius:16,borderWidth:1,borderColor:theme.border,overflow:'hidden'},listCompact:{width:'100%',minWidth:0},item:{minHeight:82,padding:15,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:theme.border},unread:{backgroundColor:theme.goldPale},icon:{width:40,height:40,borderRadius:12,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},iconGold:{backgroundColor:theme.goldPale},titleRow:{flexDirection:'row',alignItems:'center',gap:7},title:{fontSize:13,fontWeight:'900',color:theme.ink},dot:{width:7,height:7,borderRadius:4,backgroundColor:theme.gold},message:{fontSize:12,color:theme.muted,marginTop:4},date:{fontSize:10,color:theme.muted,marginTop:6},prefs:{flex:1,minWidth:260,backgroundColor:theme.white,borderRadius:16,borderWidth:1,borderColor:theme.border,padding:18},prefsCompact:{width:'100%',minWidth:0},prefsTitle:{fontFamily:'serif',fontSize:18,fontWeight:'800',color:theme.ink},muted:{fontSize:12,color:theme.muted,marginTop:4},toggle:{minHeight:52,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},toggleLabel:{fontSize:12,fontWeight:'800',color:theme.ink},mark:{fontSize:12,fontWeight:'900',color:theme.green2},empty:{alignItems:'center',padding:42},emptyTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink,marginTop:8}});
