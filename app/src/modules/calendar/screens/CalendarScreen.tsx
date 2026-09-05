import {useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router,type Href} from 'expo-router';
import {AppShell,shellStyles} from '../../../components/AppShell';
import {HeaderAction} from '../../../components/HeaderAction';
import {FormModal} from '../../../components/FormModal';
import {DateField} from '../../../components/DateField';
import {TimeField} from '../../../components/TimeField';
import {AsyncState} from '../../../components/AsyncState';
import {Text,useI18n} from '../../../i18n';
import {api} from '../../../api';
import {theme} from '../../../theme';
import {FormField} from '../../../components/FormField';
import {SelectField} from '../../../components/SelectField';
import {useUnsavedChanges} from '../../../hooks/useUnsavedChanges';
import {projectsApi} from '../../projects/api/projects.api';
import type {ProjectRecord} from '../../projects/types/project.types';

type CalendarEventType='appointment'|'visit'|'meeting'|'deadline'|'personal'|'project';
type CalendarEvent={
 id:string;
 title:string;
 type:CalendarEventType;
 startAt:string;
 endAt?:string|null;
 location?:string|null;
 description?:string|null;
 allDay?:boolean;
 projectId?:string|null;
 clientId?:string|null;
};
type CalendarForm={
 title:string;
 description:string;
 date:string;
 endDate:string;
 start:string;
 end:string;
 type:CalendarEventType;
 location:string;
 recurrence:'none'|'weekly'|'monthly';
 projectId:string;
 clientId:string;
 allDay:boolean;
};

const types:Record<CalendarEventType,string>={appointment:'Atendimento',visit:'Visita',meeting:'Reunião',deadline:'Prazo',personal:'Pessoal',project:'Projeto'};
const isoDate=(value?:string|null)=>value?String(value).slice(0,10):'';
const occursOn=(event:CalendarEvent,date:string)=>{const start=isoDate(event.startAt),end=isoDate(event.endAt)||start;return !!start&&date>=start&&date<=end};
const initialForm=(selected:string):CalendarForm=>({title:'',description:'',date:selected,endDate:selected,start:'09:00',end:'10:00',type:'appointment',location:'',recurrence:'none',projectId:'',clientId:'',allDay:false});

export default function Calendar(){
 const{locale}=useI18n();
 const{width}=useWindowDimensions();
 const compact=width<700;
 const phone=width<480;
 const[events,setEvents]=useState<CalendarEvent[]>([]),[projects,setProjects]=useState<ProjectRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[open,setOpen]=useState(false),[month,setMonth]=useState(new Date()),[selected,setSelected]=useState(new Date().toISOString().slice(0,10)),[saving,setSaving]=useState(false),[formErrors,setFormErrors]=useState<Record<string,string>>({});
 const[form,setForm]=useState<CalendarForm>(()=>initialForm(selected));
 const[filter,setFilter]=useState('Todos');
 const dirty=useMemo(()=>JSON.stringify(form)!==JSON.stringify(initialForm(selected)),[form,selected]);
 const{confirmDiscard}=useUnsavedChanges(open&&dirty,'O evento ainda não foi salvo. Deseja fechar e descartar as informações preenchidas?');
 const load=()=>{setLoading(true);setError('');Promise.all([api<CalendarEvent[]>('/calendar'),projectsApi.list().catch(()=>[] as ProjectRecord[])]).then(([calendar,projectList])=>{setEvents(calendar);setProjects(projectList)}).catch((e:unknown)=>setError(e instanceof Error?e.message:'Não foi possível carregar a agenda')).finally(()=>setLoading(false))};
 useEffect(load,[]);
 const y=month.getFullYear(),m=month.getMonth();
 const days=useMemo(()=>{const first=(new Date(y,m,1).getDay()+6)%7,count=new Date(y,m+1,0).getDate();return[...Array(first).fill(0),...Array.from({length:count},(_,i)=>i+1)]},[y,m]);
 const dayEvents=events.filter(e=>occursOn(e,selected)&&(filter==='Todos'||types[e.type]===filter));
 const projectById=useMemo(()=>new Map(projects.map(project=>[project.id,project])),[projects]);
 const projectOptions=useMemo(()=>[{label:'Nenhum projeto',value:''},...projects.map(project=>({label:project.name,value:project.id,hint:[project.client?.name,project.quote?.number].filter(Boolean).join(' · ')}))],[projects]);
 const change=(key:keyof CalendarForm,value:string|boolean)=>{setForm(current=>({...current,[key]:value}));setFormErrors(current=>({...current,[key]:''}))};
 const openNew=()=>{setForm(initialForm(selected));setFormErrors({});setOpen(true)};
 const close=()=>void confirmDiscard(()=>{setOpen(false);setForm(initialForm(selected));setFormErrors({})});
 const selectProject=(projectId:string)=>{
   if(!projectId){setForm(current=>({...current,projectId:'',clientId:'',type:'appointment',allDay:false}));return}
   const project=projects.find(item=>item.id===projectId);
   if(!project)return;
   const startDate=isoDate(project.startDate)||selected;
   const endDate=isoDate(project.endDate)||startDate;
   const details=[project.client?.name?`Cliente: ${project.client.name}`:'',project.quote?.number?`Orçamento: ${project.quote.number}`:''].filter(Boolean).join(' · ');
   setForm(current=>({...current,projectId,clientId:project.client?.id||project.clientId||'',title:project.name,description:details,date:startDate,endDate,type:'project',allDay:true,recurrence:'none'}));
   setFormErrors({});
 };
 const save=async()=>{
   const next:Record<string,string>={};
   if(!form.title.trim())next.title='Informe o título do evento.';
   if(!form.date)next.date='Informe a data inicial do evento.';
   if(!form.endDate)next.endDate='Informe a data final do evento.';
   if(form.endDate&&form.date&&form.endDate<form.date)next.endDate='A data final deve ser igual ou posterior à inicial.';
   const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
   if(!form.allDay&&!time.test(form.start))next.start='Informe um horário válido no formato HH:MM.';
   if(!form.allDay&&!time.test(form.end))next.end='Informe um horário válido no formato HH:MM.';
   if(!form.allDay&&!next.start&&!next.end&&form.date===form.endDate&&form.end<=form.start)next.end='O horário final deve ser posterior ao início.';
   setFormErrors(next);if(Object.keys(next).length)return;
   setSaving(true);
   try{
     const startAt=form.allDay?`${form.date}T00:00:00`:`${form.date}T${form.start}:00`;
     const endAt=form.allDay?`${form.endDate}T23:59:59`:`${form.endDate}T${form.end}:00`;
     await api('/calendar',{method:'POST',body:JSON.stringify({title:form.title.trim(),description:form.description.trim()||undefined,type:form.type,startAt,endAt,location:form.location.trim()||undefined,recurrence:form.recurrence,allDay:form.allDay,projectId:form.projectId||undefined,clientId:form.clientId||undefined})});
     setOpen(false);setForm(initialForm(selected));load();
   }catch(e:unknown){setError(e instanceof Error?e.message:'Não foi possível salvar o evento')}finally{setSaving(false)}
 };
 return <AppShell title="Agenda" subtitle="Compromissos, projetos e prazos em um único lugar" action={<HeaderAction label="Novo evento" icon="calendar-outline" onPress={openNew}/> }>
  <View style={[s.stats,compact&&s.statsCompact]}><Stat label="Compromissos" value={String(events.length)}/><Stat label="Hoje" value={String(events.filter(e=>e.startAt?.slice(0,10)===new Date().toISOString().slice(0,10)).length)}/><Stat label="Próximos" value={String(events.filter(e=>e.startAt?.slice(0,10)>new Date().toISOString().slice(0,10)).length)}/></View>
  <View style={s.filters}>{['Todos',...Object.values(types)].map(x=><Pressable key={String(x)} onPress={()=>setFilter(String(x))} style={[s.filter,filter===String(x)&&s.filterOn]}><Text style={[s.filterText,filter===String(x)&&s.filterTextOn]}>{x}</Text></Pressable>)}</View>
  <View style={[s.calendar,compact&&s.calendarCompact]}>
   <View style={[s.monthHead,compact&&s.monthHeadCompact,phone&&s.monthHeadPhone]}>
    <View style={s.monthNavigation}>
     <Pressable accessibilityLabel="Mês anterior" onPress={()=>setMonth(new Date(y,m-1,1))} style={s.monthArrow}><Ionicons name="chevron-back" size={20} color={theme.green2}/></Pressable>
     <Text numberOfLines={1} style={[s.month,phone&&s.monthPhone]}>{month.toLocaleDateString(locale,{month:'long',year:'numeric'})}</Text>
     <Pressable accessibilityLabel="Próximo mês" onPress={()=>setMonth(new Date(y,m+1,1))} style={s.monthArrow}><Ionicons name="chevron-forward" size={20} color={theme.green2}/></Pressable>
    </View>
    <Pressable onPress={()=>{const d=new Date();setMonth(d);setSelected(d.toISOString().slice(0,10))}} style={[s.today,phone&&s.todayPhone]}><Text style={s.todayText}>Hoje</Text></Pressable>
   </View><View style={s.week}>{['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map(x=><Text key={String(x)} style={s.weekText}>{x}</Text>)}</View><View style={s.grid}>{days.map((d,i)=>{const iso=d?`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';const count=events.filter(e=>occursOn(e,iso)).length;return <Pressable key={i} onPress={()=>d&&setSelected(iso)} style={[s.cell,compact&&s.cellCompact,phone&&s.cellPhone,iso===selected&&s.cellOn]}><Text style={[s.cellText,phone&&s.cellTextPhone]}>{d||''}</Text>{count>0&&<View style={[s.mark,phone&&s.markPhone]}><Text style={s.markText}>{count}</Text></View>}</Pressable>})}</View></View>
  {loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:<View style={[s.dayPanel,compact&&s.dayPanelCompact]}><Text style={s.dayTitle}>{new Date(selected+'T12:00:00').toLocaleDateString(locale,{weekday:'long',day:'2-digit',month:'long'})}</Text>{dayEvents.length?dayEvents.map(e=><Pressable style={[s.event,compact&&s.eventCompact,phone&&s.eventPhone]} key={e.id} disabled={!e.projectId} onPress={()=>e.projectId&&router.push(`/projects/${e.projectId}` as Href)}><View style={s.eventIcon}><Ionicons name={e.type==='project'?'briefcase-outline':'time-outline'} size={18} color={theme.green2}/></View><View style={s.eventContent}><Text style={s.eventTitle}>{e.title}</Text><Text style={s.eventMeta}>{e.allDay?`${isoDate(e.startAt)===isoDate(e.endAt)||!e.endAt?'Dia inteiro':`${new Date(e.startAt).toLocaleDateString(locale,{day:'2-digit',month:'2-digit'})} a ${new Date(e.endAt).toLocaleDateString(locale,{day:'2-digit',month:'2-digit'})}`}`:new Date(e.startAt).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}{e.location?` · ${e.location}`:''}{e.projectId&&projectById.get(e.projectId)?.assignee?.name?` · Responsável: ${projectById.get(e.projectId)?.assignee?.name}`:''}{e.projectId?' · Abrir projeto':''}</Text></View><Text style={[s.eventType,compact&&s.eventTypeCompact,phone&&s.eventTypePhone]}>{types[e.type]||'Evento'}</Text></Pressable>):<Text style={s.empty}>Nenhum compromisso neste dia.</Text>}</View>}
  <FormModal visible={open} title="Novo evento" subtitle="Vincule um projeto para preencher os dados automaticamente ou cadastre um compromisso manual." onClose={close} footer={<><Pressable style={s.cancel} onPress={close}><Text>Cancelar</Text></Pressable><Pressable style={shellStyles.button} disabled={saving} onPress={save}><Text style={shellStyles.buttonText}>{saving?'Salvando...':'Criar evento'}</Text></Pressable></>}>
   <SelectField label="PROJETO (OPCIONAL)" value={form.projectId} onChange={selectProject} options={projectOptions} helper="Ao selecionar um projeto, cliente, nome e período são preenchidos automaticamente."/>
   <FormField label="TÍTULO" required value={form.title} error={formErrors.title} onChangeText={title=>change('title',title)} placeholder="Ex.: Visita técnica ao cliente"/>
   <FormField label="DESCRIÇÃO" multiline value={form.description} onChangeText={description=>change('description',description)} placeholder="Detalhes do evento..."/>
   <View style={[s.row,compact&&s.rowCompact]}><View style={{flex:1}}><DateField label="DATA INICIAL" required value={form.date} error={formErrors.date} onChange={date=>change('date',date)}/></View><View style={{flex:1}}><DateField label="DATA FINAL" required value={form.endDate} error={formErrors.endDate} minDate={form.date} onChange={date=>change('endDate',date)}/></View></View>
   {!form.allDay?<View style={[s.row,compact&&s.rowCompact]}><TimeField label="INÍCIO" required value={form.start} error={formErrors.start} onChange={start=>change('start',start)}/><TimeField label="FIM" required value={form.end} error={formErrors.end} minTime={form.date===form.endDate?form.start:undefined} onChange={end=>change('end',end)}/></View>:<View style={s.linkedNotice}><Ionicons name="briefcase-outline" size={17} color={theme.green2}/><Text style={s.linkedNoticeText}>Evento de projeto em período integral · {form.date} a {form.endDate}</Text></View>}
   <FormField label="LOCAL" value={form.location} onChangeText={location=>change('location',location)} placeholder="Ex.: Residência do cliente"/>
   {!form.projectId?<><Text style={s.label}>RECORRÊNCIA</Text><View style={s.filters}>{([['none','Não repetir'],['weekly','Semanal'],['monthly','Mensal']] as const).map(([v,l])=><Pressable key={v} onPress={()=>change('recurrence',v)} style={[s.filter,form.recurrence===v&&s.filterOn]}><Text style={[s.filterText,form.recurrence===v&&s.filterTextOn]}>{l}</Text></Pressable>)}</View></>:null}
  </FormModal>
 </AppShell>
}
function Stat({label,value}:{label:string;value:string}){return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text></View>}
const s=StyleSheet.create({stats:{flexDirection:'row',gap:10,marginBottom:14},statsCompact:{flexWrap:'wrap'},stat:{flex:1,minWidth:105,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:12,padding:14},statLabel:{fontSize:11,color:theme.muted},statValue:{fontFamily:'serif',fontSize:22,fontWeight:'800',color:theme.ink},filters:{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:14},filter:{borderWidth:1,borderColor:theme.border,borderRadius:18,paddingHorizontal:13,paddingVertical:8},filterOn:{backgroundColor:theme.green2,borderColor:theme.green2},filterText:{fontSize:11,fontWeight:'800',color:theme.muted},filterTextOn:{color:theme.white},calendar:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:16},calendarCompact:{padding:8},monthHead:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:15},monthHeadCompact:{gap:8},monthHeadPhone:{alignItems:'stretch',flexDirection:'column'},monthNavigation:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},monthArrow:{width:34,height:34,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:theme.green50},month:{flex:1,fontWeight:'900',fontSize:16,color:theme.ink,textTransform:'capitalize',textAlign:'center'},monthPhone:{fontSize:14},today:{marginLeft:'auto',borderWidth:1,borderColor:theme.border,borderRadius:8,paddingHorizontal:10,paddingVertical:7},todayPhone:{marginLeft:0,alignSelf:'center',paddingHorizontal:18},todayText:{fontSize:11,fontWeight:'800',color:theme.green2},week:{flexDirection:'row'},weekText:{width:'14.28%',textAlign:'center',fontSize:10,color:theme.muted,fontWeight:'800',paddingVertical:8},grid:{flexDirection:'row',flexWrap:'wrap'},cell:{width:'14.28%',height:56,borderWidth:1,borderColor:'#edf0ee',padding:7},cellCompact:{height:48,padding:4},cellPhone:{height:44,padding:3,alignItems:'center'},cellOn:{backgroundColor:'#eef5f0',borderColor:theme.green2},cellText:{fontSize:12,color:theme.ink},cellTextPhone:{fontSize:11},mark:{marginTop:5,width:18,height:16,borderRadius:8,backgroundColor:theme.gold,alignItems:'center'},markPhone:{marginTop:3,width:16,height:14},markText:{fontSize:9,fontWeight:'900'},dayPanel:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:16,marginTop:14},dayPanelCompact:{padding:12},dayTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink,marginBottom:10},event:{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:theme.border,paddingVertical:12},eventCompact:{flexWrap:'wrap'},eventPhone:{alignItems:'flex-start',flexWrap:'nowrap'},eventIcon:{width:34,height:34,borderRadius:9,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center',flexShrink:0},eventContent:{flex:1,minWidth:0},eventTitle:{fontWeight:'900',color:theme.ink},eventMeta:{fontSize:11,color:theme.muted,marginTop:3},eventType:{fontSize:11,fontWeight:'800',color:theme.green2},eventTypeCompact:{marginLeft:44},eventTypePhone:{marginLeft:44,alignSelf:'flex-start',marginTop:-4},empty:{color:theme.muted},label:{fontSize:11,fontWeight:'900',color:theme.muted,marginTop:8},row:{flexDirection:'row',gap:10},rowCompact:{flexDirection:'column'},cancel:{paddingHorizontal:15,paddingVertical:11},linkedNotice:{minHeight:42,borderRadius:10,backgroundColor:theme.green50,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},linkedNoticeText:{fontSize:11,fontWeight:'800',color:theme.green2,flex:1}});
