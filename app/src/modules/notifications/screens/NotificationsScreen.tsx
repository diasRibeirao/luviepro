import {useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal,Pressable,ScrollView,StyleSheet,Switch,useWindowDimensions,View} from 'react-native';
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
type ToggleProps={label:string;description:string;value:boolean;onValueChange:(value:boolean)=>void};

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

 return <AppShell title="Notificações" subtitle="Avisos importantes do LuviePro em um único lugar">
  {loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:<>
   <View style={s.page}>
    <View style={[s.actions,compact&&s.actionsCompact]}>
     <Pressable accessibilityRole="button" onPress={()=>setShowPrefs(true)} style={[s.actionSecondary,narrow&&s.actionNarrow]}>
      <Ionicons name="options-outline" size={17} color={theme.green2}/>
      <Text style={s.actionSecondaryText}>Preferências</Text>
     </Pressable>
     {unreadCount>0?<Pressable accessibilityRole="button" onPress={markAll} style={[s.actionPrimary,narrow&&s.actionNarrow]}>
      <Ionicons name="checkmark-done-outline" size={18} color="white"/>
      <Text style={s.actionPrimaryText}>Marcar todas como lidas</Text>
     </Pressable>:null}
    </View>

    <View style={[s.filterRow,narrow&&s.filterRowNarrow]}>
     <FilterPill label={`Todas (${rows.length})`} active={filter==='all'} onPress={()=>setFilter('all')}/>
     <FilterPill label={`Não lidas (${unreadCount})`} active={filter==='unread'} onPress={()=>setFilter('unread')}/>
     <FilterPill label={`Lidas (${readCount})`} active={filter==='read'} onPress={()=>setFilter('read')}/>
    </View>

    <Text style={s.count}>{visible.length} notificação(ões)</Text>

    <View style={s.list}>
     {visible.length===0?<View style={s.empty}>
      <Ionicons name="notifications-outline" size={30} color={theme.gold}/>
      <Text style={s.emptyTitle}>Tudo em dia</Text>
      <Text style={s.muted}>Não há notificações neste filtro.</Text>
     </View>:visible.map(n=><Pressable accessibilityRole="button" key={n.id} onPress={()=>read(n)} style={({pressed})=>[s.item,narrow&&s.itemNarrow,!n.readAt&&s.unread,pressed&&s.pressed]}>
      <View style={[s.icon,n.type==='quote'&&s.iconGold]}>
       <Ionicons name={n.type==='calendar'?'calendar-outline':n.type==='task'||n.type==='task_due'?'checkbox-outline':n.type==='project_due'?'briefcase-outline':'notifications-outline'} size={19} color={theme.green}/>
      </View>
      <View style={s.itemBody}>
       <View style={s.titleRow}><Text style={s.title}>{n.title}</Text>{!n.readAt&&<View style={s.dot}/>}</View>
       {n.message&&<Text style={s.message}>{n.message}</Text>}
       <Text style={s.date}>{new Date(n.createdAt).toLocaleString(locale)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
     </Pressable>)}
    </View>
   </View>

   <PreferencesModal visible={showPrefs} prefs={prefs} narrow={narrow} onClose={()=>setShowPrefs(false)} onToggle={toggle}/>
  </>}
 </AppShell>
}

function PreferencesModal({visible,prefs,narrow,onClose,onToggle}:{visible:boolean;prefs?:NotificationPreferences;narrow:boolean;onClose:()=>void;onToggle:(key:string,value:boolean)=>Promise<void>}){
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
  <View style={s.modalRoot}>
   <Pressable accessibilityRole="button" accessibilityLabel="Fechar preferências" style={s.backdrop} onPress={onClose}/>
   <View style={[s.modalCard,narrow&&s.modalCardNarrow]}>
    <View style={s.modalHead}>
     <View style={s.modalHeading}>
      <View style={s.modalIcon}><Ionicons name="options-outline" size={20} color={theme.green2}/></View>
      <View style={s.modalHeadingText}>
       <Text style={s.modalTitle}>Preferências de notificações</Text>
       <Text style={s.modalSubtitle}>Escolha quais avisos deseja receber no LuviePro.</Text>
      </View>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={s.closeButton}>
      <Ionicons name="close" size={20} color={theme.ink}/>
     </Pressable>
    </View>

    <ScrollView style={s.modalScroll} contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>
     {prefs?<View style={s.preferenceList}>
      <Toggle label="Lembretes da agenda" description="Receba avisos relacionados a compromissos e eventos da agenda." value={prefs.agendaReminders} onValueChange={(v:boolean)=>void onToggle('agendaReminders',v)}/>
      <Toggle label="Prazos de projetos" description="Avise quando projetos estiverem próximos do prazo definido." value={prefs.projectDeadlines} onValueChange={(v:boolean)=>void onToggle('projectDeadlines',v)}/>
      <Toggle label="Prazos de tarefas" description="Receba alertas sobre tarefas que precisam de atenção." value={prefs.taskDeadlines} onValueChange={(v:boolean)=>void onToggle('taskDeadlines',v)}/>
      <Toggle label="Validade de propostas" description="Acompanhe propostas próximas do vencimento." value={prefs.quoteExpirations} onValueChange={(v:boolean)=>void onToggle('quoteExpirations',v)}/>
      <View style={s.preferenceDivider}/>
      <Toggle label="Receber também por e-mail" description="Além do aplicativo, envie os avisos habilitados para o seu e-mail." value={prefs.emailEnabled} onValueChange={(v:boolean)=>void onToggle('emailEnabled',v)}/>
     </View>:<View style={s.modalLoading}><Text style={s.muted}>Carregando preferências...</Text></View>}
    </ScrollView>

    <View style={[s.modalFooter,narrow&&s.modalFooterNarrow]}>
     <Text style={s.modalHint}>As alterações são salvas automaticamente.</Text>
     <Pressable accessibilityRole="button" onPress={onClose} style={[s.doneButton,narrow&&s.doneButtonNarrow]}>
      <Text style={s.doneButtonText}>Concluir</Text>
     </Pressable>
    </View>
   </View>
  </View>
 </Modal>
}

function FilterPill({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.filter,active&&s.filterActive]}><Text style={[s.filterText,active&&s.filterTextActive]}>{label}</Text></Pressable>}

function Toggle({label,description,value,onValueChange}:ToggleProps){return <View style={s.preferenceRow}>
 <View style={s.preferenceCopy}><Text style={s.toggleLabel}>{label}</Text><Text style={s.toggleDescription}>{description}</Text></View>
 <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{true:theme.green3,false:theme.border}} thumbColor={value?theme.white:theme.white}/>
</View>}

const s=StyleSheet.create({
 page:{width:'100%',gap:14},
 actions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:10,flexWrap:'wrap'},
 actionsCompact:{justifyContent:'flex-start'},
 actionSecondary:{minHeight:44,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:theme.white},
 actionPrimary:{minHeight:44,borderRadius:10,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:theme.green},
 actionNarrow:{width:'100%'},
 actionSecondaryText:{fontSize:12,fontWeight:'900',color:theme.ink},
 actionPrimaryText:{fontSize:12,fontWeight:'900',color:'white'},
 muted:{fontSize:12,color:theme.muted,marginTop:4},
 filterRow:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 filterRowNarrow:{gap:6},
 filter:{minHeight:42,borderWidth:1,borderColor:theme.border,borderRadius:21,paddingHorizontal:15,alignItems:'center',justifyContent:'center',backgroundColor:theme.white},
 filterActive:{borderColor:theme.green2,backgroundColor:theme.green50},
 filterText:{fontSize:12,fontWeight:'800',color:theme.muted},
 filterTextActive:{color:theme.green2},
 count:{fontSize:11,color:theme.muted},
 list:{width:'100%',gap:10},
 item:{minHeight:94,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:theme.border,borderRadius:13,backgroundColor:theme.white},
 itemNarrow:{paddingHorizontal:11,gap:9},
 unread:{borderColor:theme.green2,backgroundColor:theme.green50},
 pressed:{opacity:.78},
 icon:{width:42,height:42,borderRadius:12,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},
 iconGold:{backgroundColor:theme.goldPale},
 itemBody:{flex:1,minWidth:0},
 titleRow:{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},
 title:{fontSize:13,fontWeight:'900',color:theme.ink,flexShrink:1},
 dot:{width:7,height:7,borderRadius:4,backgroundColor:theme.gold},
 message:{fontSize:12,color:theme.muted,marginTop:4,lineHeight:17},
 date:{fontSize:10,color:theme.muted,marginTop:7},
 empty:{alignItems:'center',padding:42,borderWidth:1,borderColor:theme.border,borderRadius:14,backgroundColor:theme.white},
 emptyTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink,marginTop:8},

 modalRoot:{flex:1,alignItems:'center',justifyContent:'center',padding:20},
 backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(12,29,23,0.48)'},
 modalCard:{width:'100%',maxWidth:560,maxHeight:'86%',backgroundColor:theme.white,borderRadius:20,borderWidth:1,borderColor:theme.border,overflow:'hidden'},
 modalCardNarrow:{maxHeight:'92%',borderRadius:16},
 modalHead:{padding:20,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:14,borderBottomWidth:1,borderBottomColor:theme.border},
 modalHeading:{flex:1,minWidth:0,flexDirection:'row',alignItems:'flex-start',gap:12},
 modalHeadingText:{flex:1,minWidth:0},
 modalIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:theme.green50},
 modalTitle:{fontFamily:'serif',fontSize:20,fontWeight:'800',color:theme.ink},
 modalSubtitle:{fontSize:12,lineHeight:17,color:theme.muted,marginTop:4},
 closeButton:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:theme.cream},
 modalScroll:{flexShrink:1},
 modalContent:{padding:20},
 preferenceList:{gap:10},
 preferenceRow:{minHeight:70,borderWidth:1,borderColor:theme.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,backgroundColor:theme.cream},
 preferenceCopy:{flex:1,minWidth:0},
 toggleLabel:{fontSize:12,fontWeight:'900',color:theme.ink},
 toggleDescription:{fontSize:11,lineHeight:16,color:theme.muted,marginTop:3},
 preferenceDivider:{height:1,backgroundColor:theme.border,marginVertical:3},
 modalLoading:{paddingVertical:24,alignItems:'center'},
 modalFooter:{padding:16,paddingHorizontal:20,borderTopWidth:1,borderTopColor:theme.border,backgroundColor:theme.cream,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:14},
 modalFooterNarrow:{flexDirection:'column',alignItems:'stretch'},
 modalHint:{flex:1,fontSize:10.5,lineHeight:15,color:theme.muted},
 doneButton:{minWidth:112,minHeight:42,borderRadius:10,backgroundColor:theme.green,alignItems:'center',justifyContent:'center',paddingHorizontal:18},
 doneButtonNarrow:{width:'100%'},
 doneButtonText:{fontSize:12,fontWeight:'900',color:'white'}
});
