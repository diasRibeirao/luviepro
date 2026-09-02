import {createElement,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps,ReactNode } from 'react';
import {Modal,Platform,Pressable,ScrollView,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router,useFocusEffect,type Href} from 'expo-router';
import {ApiError,money} from '../../../api';
import {theme} from '../../../theme';
import {AppShell} from '../../../components/AppShell';
import {AsyncState} from '../../../components/AsyncState';
import {SearchField} from '../../../components/SearchField';
import {SelectField} from '../../../components/SelectField';
import {BusinessToolbar,FilterChip} from '../../../components/BusinessList';
import {Pagination,SortMenu,paginate} from '../../../components/ListControls';
import {formatDateBR} from '../../../components/DateField';
import {useFeedback} from '../../../components/Feedback';
import {Text} from '../../../i18n';
import {projectsApi} from '../api/projects.api';
import type {ProjectAssignee,ProjectRecord,ProjectStatus,ProjectTask} from '../types/project.types';

type IoniconName=ComponentProps<typeof Ionicons>['name'];
const errorMessage=(error:unknown)=>{if(error instanceof ApiError)return error.message;if(error instanceof Error)return error.message;return 'Não foi possível carregar projetos'};

const fallback:ProjectStatus[]=[{key:'scheduled',name:'Agendados',color:theme.gold,active:true},{key:'in_progress',name:'Em andamento',color:theme.green2,active:true},{key:'completed',name:'Concluídos',color:'#6F8C78',active:true}];
const filters=['Todos','Com atraso','Alta prioridade'];

export function ProjectsScreen(){
  const[list,setList]=useState<ProjectRecord[]>([]),[statuses,setStatuses]=useState<ProjectStatus[]>(fallback),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('Todos'),[sort,setSort]=useState('priority'),[page,setPage]=useState(1),[boardWidth,setBoardWidth]=useState(0),[draggedId,setDraggedId]=useState<string>(),[dropStatus,setDropStatus]=useState<string>(),[assignees,setAssignees]=useState<ProjectAssignee[]>([]),[assigneeFilter,setAssigneeFilter]=useState('all');
  const{notify}=useFeedback();
  const{width}=useWindowDimensions();const compact=width<820;
  const load=useCallback(()=>{setLoading(true);setLoadError('');Promise.all([projectsApi.list(),projectsApi.listStatuses(),projectsApi.listAssignees()]).then(([projects,configured,available])=>{setList(projects);setStatuses(configured?.length?configured:fallback);setAssignees(available)}).catch((e:unknown)=>setLoadError(errorMessage(e))).finally(()=>setLoading(false))},[]);useFocusEffect(load);
  const filtered=useMemo(()=>{const items=list.filter(project=>{const term=query.trim().toLowerCase();const matches=!term||`${project.name} ${project.client?.name??''} ${project.quote?.number??''} ${project.assignee?.name??''}`.toLowerCase().includes(term);const responsible=assigneeFilter==='all'||(assigneeFilter==='none'?!project.assigneeUserId:project.assigneeUserId===assigneeFilter);const overdue=project.tasks?.some(isOverdue);const high=project.tasks?.some(t=>t.status!=='completed'&&t.priority==='high');return matches&&responsible&&(filter==='Todos'||filter==='Com atraso'&&overdue||filter==='Alta prioridade'&&high)});return [...items].sort((a,b)=>{const critical=(p:ProjectRecord)=>(p.tasks?.filter(isOverdue).length??0)*100+(p.tasks?.filter(t=>t.status!=='completed'&&t.priority==='high').length??0);if(sort==='name')return String(a.name).localeCompare(String(b.name),'pt-BR');if(sort==='progress-desc')return b.progress-a.progress;if(sort==='progress-asc')return a.progress-b.progress;return critical(b)-critical(a)})},[list,query,filter,sort,assigneeFilter]);
  const pageSize=12;const visible=useMemo(()=>paginate(filtered,page,pageSize),[filtered,page]);useEffect(()=>setPage(1),[query,filter,sort,assigneeFilter]);
  const columns=statuses.filter(status=>status.active||list.some(project=>project.status===status.key));const needsScroll=!compact&&columns.length>4;const visibleCount=Math.min(Math.max(columns.length,1),4);const columnWidth=compact?(boardWidth||Math.max(270,width-44)):boardWidth?Math.max(280,(boardWidth-(visibleCount-1)*12)/visibleCount):330;const totalOverdue=list.reduce((sum,p)=>sum+(p.tasks?.filter(isOverdue).length??0),0);

  const moveProject=useCallback(async(projectId:string,targetStatus:string)=>{
    const current=list.find(project=>project.id===projectId);
    if(!current||current.status===targetStatus)return;
    const previousStatus=current.status;
    setList(items=>items.map(project=>project.id===projectId?{...project,status:targetStatus,progress:targetStatus==='completed'?100:project.progress}:project));
    try{
      const updated=await projectsApi.update(projectId,{status:targetStatus});
      setList(items=>items.map(project=>project.id===projectId?updated:project));
    }catch(error){
      setList(items=>items.map(project=>project.id===projectId?{...project,status:previousStatus,progress:current.progress}:project));
      notify({tone:'error',title:'Não foi possível mover o projeto',message:errorMessage(error)});
    }
  },[list,notify]);

  const finishDrop=useCallback((status:string)=>{
    if(draggedId)void moveProject(draggedId,status);
    setDraggedId(undefined);setDropStatus(undefined);
  },[draggedId,moveProject]);

  return <AppShell title="Projetos" subtitle="Acompanhe entregas, prazos e andamento da operação">
    <View style={s.page}><View style={s.summaryRow}><Summary icon="briefcase-outline" label="Projetos" value={String(list.length)}/><Summary icon="play-circle-outline" label="Em andamento" value={String(list.filter(p=>p.status==='in_progress').length)}/><Summary icon="alert-circle-outline" label="Tarefas atrasadas" value={String(totalOverdue)} danger={totalOverdue>0}/></View>
    <BusinessToolbar search={<SearchField value={query} onChangeText={setQuery} placeholder="Buscar projeto, cliente ou orçamento..."/>} filters={<View style={s.filters}>{filters.map(v=><FilterChip key={v} label={v} active={filter===v} onPress={()=>setFilter(v)}/>)}</View>} actions={<View style={s.toolbarActions}><View style={s.assigneeFilter}><SelectField label="Responsável" value={assigneeFilter} onChange={setAssigneeFilter} options={[{label:'Todos',value:'all'},{label:'Sem responsável',value:'none'},...assignees.map(user=>({label:user.name,value:user.id,hint:user.email||undefined}))]}/></View><SortMenu value={sort} onChange={setSort} options={[{value:'priority',label:'Mais críticos'},{value:'name',label:'Nome A–Z'},{value:'progress-desc',label:'Maior progresso'},{value:'progress-asc',label:'Menor progresso'}]}/></View>} count={`${filtered.length} projeto(s)`}/>
    {Platform.OS==='web'&&filtered.length>0?<View style={s.dragHint}><Ionicons name="move-outline" size={15} color={theme.green2}/><Text style={s.dragHintText}>Arraste um card para outra coluna para alterar o status.</Text></View>:null}
    {loading||loadError?<AsyncState loading={loading} error={loadError} onRetry={load}/>:filtered.length===0?<AsyncState empty emptyTitle="Nenhum projeto encontrado" emptyMessage="Revise a busca ou os filtros aplicados."/>:<View style={{width:'100%'}} onLayout={event=>setBoardWidth(event.nativeEvent.layout.width)}><ScrollView horizontal={needsScroll} showsHorizontalScrollIndicator={needsScroll} contentContainerStyle={[s.board,{flexGrow:1,flexDirection:compact?'column':'row',alignItems:compact?'flex-start':'stretch'}]}>{columns.map(column=><Column key={column.key} column={column} width={columnWidth} projects={visible.filter(project=>project.status===column.key)} statuses={columns} dragging={!!draggedId} target={dropStatus===column.key} onDragEnter={()=>setDropStatus(column.key)} onDrop={()=>finishDrop(column.key)} onDragStart={id=>setDraggedId(id)} onDragEnd={()=>{setDraggedId(undefined);setDropStatus(undefined)}} onMove={moveProject}/>)}</ScrollView><Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage}/></View>}</View>
  </AppShell>;
}

function Column({column,projects,width,statuses,dragging,target,onDragEnter,onDrop,onDragStart,onDragEnd,onMove}:{column:ProjectStatus;projects:ProjectRecord[];width?:number;statuses:ProjectStatus[];dragging:boolean;target:boolean;onDragEnter:()=>void;onDrop:()=>void;onDragStart:(id:string)=>void;onDragEnd:()=>void;onMove:(id:string,status:string)=>Promise<void>}){
  const content=<View style={[s.column,{minHeight:0},width?{width}:undefined,dragging&&s.columnDragging,target&&s.columnTarget]}><View style={s.columnHead}><View style={[s.dot,{backgroundColor:column.color}]}/><Text style={s.columnTitle}>{column.name}</Text><View style={s.count}><Text style={s.countText}>{projects.length}</Text></View></View><View style={[s.cards,{flex:1}]}>{projects.map(project=><ProjectCard key={project.id} project={project} color={column.color} statuses={statuses} onDragStart={()=>onDragStart(project.id)} onDragEnd={onDragEnd} onMove={status=>onMove(project.id,status)}/>)}{!projects.length&&<View style={[s.emptyColumn,{height:undefined,minHeight:76,flex:1},target&&s.emptyColumnTarget]}><Ionicons name={target?'arrow-down-circle-outline':'layers-outline'} size={23} color={target?theme.green2:theme.border}/><Text style={[s.emptyText,target&&{color:theme.green2,fontWeight:'800'}]}>{target?'Solte o projeto aqui':'Nenhum projeto'}</Text></View>}</View></View>;
  if(Platform.OS!=='web')return content;
  return <WebDropZone width={width} status={column.key} onDragEnter={onDragEnter} onDrop={onDrop}>{content}</WebDropZone>
}

function ProjectCard({project,color,statuses,onDragStart,onDragEnd,onMove}:{project:ProjectRecord;color:string;statuses:ProjectStatus[];onDragStart:()=>void;onDragEnd:()=>void;onMove:(status:string)=>Promise<void>}){
  const overdue=project.tasks?.filter(isOverdue).length??0;const high=project.tasks?.filter(t=>t.status!=='completed'&&t.priority==='high').length??0;const[moveOpen,setMoveOpen]=useState(false);const didDrag=useRef(false);
  const card=<Pressable onPress={()=>{if(didDrag.current)return;router.push(`/projects/${project.id}` as Href)}} onLongPress={()=>Platform.OS!=='web'&&setMoveOpen(true)} style={[s.card,{borderLeftColor:color},overdue>0&&s.overdueCard,Platform.OS==='web'&&({cursor:'grab'} as any)]}>
      <View style={s.cardTop}><View style={s.dragHandle}><Ionicons name="reorder-three-outline" size={18} color={theme.muted}/></View><Text numberOfLines={2} style={s.name}>{project.name}</Text><Pressable accessibilityLabel="Mover projeto" hitSlop={8} onPress={event=>{event.stopPropagation();setMoveOpen(true)}} style={s.moveButton}><Ionicons name="swap-horizontal-outline" size={16} color={theme.green2}/></Pressable><Ionicons name="chevron-forward" size={17} color={theme.muted}/></View>
      <Text style={s.client}>{project.client?.name}</Text><Text style={s.assignee}>Responsável: {project.assignee?.name||'Não definido'}</Text>{(overdue>0||high>0)&&<View style={s.alerts}>{overdue>0&&<Text style={s.dangerTag}>{overdue} atrasada(s)</Text>}{high>0&&<Text style={s.highTag}>{high} alta prioridade</Text>}</View>}<View style={s.metaRow}><Text style={s.meta}>{project.startDate?formatDateBR(project.startDate):'Data a definir'}</Text>{project.quote&&<Text style={s.quote}>{project.quote.number}</Text>}</View><View style={s.progressHead}><Text style={s.progressLabel}>Progresso</Text><Text style={s.progressValue}>{project.progress}%</Text></View><View style={s.track}><View style={[s.bar,{width:`${project.progress}%`,backgroundColor:color}]}/></View>{project.quote&&<View style={s.footer}><Text style={s.footerLabel}>Valor do projeto</Text><Text style={s.value}>{money(project.quote.finalTotalCents||project.quote.totalCents)}</Text></View>}
    </Pressable>;
  return <>
    {Platform.OS==='web'?<WebDraggable projectId={project.id} onStart={()=>{didDrag.current=true;onDragStart()}} onEnd={()=>{onDragEnd();setTimeout(()=>{didDrag.current=false},80)}}>{card}</WebDraggable>:card}
    <MoveStatusModal visible={moveOpen} current={project.status} statuses={statuses} onClose={()=>setMoveOpen(false)} onSelect={status=>{setMoveOpen(false);void onMove(status)}}/>
  </>
}

function WebDropZone({children,width,status,onDragEnter,onDrop}:{children:ReactNode;width?:number;status:string;onDragEnter:()=>void;onDrop:()=>void}){
  return createElement('div',{
    'data-project-status':status,
    onDragOver:(event:any)=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';onDragEnter()},
    onDragEnter:(event:any)=>{event.preventDefault();onDragEnter()},
    onDrop:(event:any)=>{event.preventDefault();onDrop()},
    style:{width:width??330,flexShrink:0}
  },children);
}

function WebDraggable({children,projectId,onStart,onEnd}:{children:ReactNode;projectId:string;onStart:()=>void;onEnd:()=>void}){
  return createElement('div',{
    draggable:true,
    onDragStart:(event:any)=>{if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',projectId)}onStart()},
    onDragEnd:onEnd,
    style:{width:'100%',cursor:'grab'}
  },children);
}

function MoveStatusModal({visible,current,statuses,onClose,onSelect}:{visible:boolean;current:string;statuses:ProjectStatus[];onClose:()=>void;onSelect:(status:string)=>void}){return <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}><Pressable style={s.backdrop} onPress={onClose}><Pressable style={s.moveSheet} onPress={()=>{}}><Text style={s.moveTitle}>Mover projeto para</Text><Text style={s.moveSubtitle}>Escolha a nova etapa do fluxo.</Text>{statuses.map(status=><Pressable key={status.key} disabled={status.key===current} onPress={()=>onSelect(status.key)} style={({pressed})=>[s.statusOption,status.key===current&&s.statusOptionCurrent,pressed&&s.pressed]}><View style={[s.statusDot,{backgroundColor:status.color}]}/><Text style={[s.statusText,status.key===current&&s.statusTextCurrent]}>{status.name}</Text>{status.key===current?<Ionicons name="checkmark-circle" size={18} color={theme.green2}/>:<Ionicons name="chevron-forward" size={16} color={theme.muted}/>}</Pressable>)}<Pressable onPress={onClose} style={s.cancelMove}><Text style={s.cancelMoveText}>Cancelar</Text></Pressable></Pressable></Pressable></Modal>}
function Summary({icon,label,value,danger}:{icon:IoniconName;label:string;value:string;danger?:boolean}){return <View style={[s.summary,danger&&s.summaryDanger]}><View style={s.summaryIcon}><Ionicons name={icon} size={17} color={danger?theme.danger:theme.green2}/></View><View><Text style={s.summaryLabel}>{label}</Text><Text style={[s.summaryValue,danger&&{color:theme.danger}]}>{value}</Text></View></View>}
function isOverdue(task:ProjectTask){return task.status!=='completed'&&task.dueDate&&new Date(task.dueDate).getTime()<new Date().setHours(0,0,0,0)}
const s=StyleSheet.create({page:{width:'100%',maxWidth:1440,alignSelf:'center'},summaryRow:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:14},summary:{minWidth:190,flex:1,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:12,padding:13,flexDirection:'row',alignItems:'center',gap:10},summaryDanger:{borderColor:'#E7C7C1'},summaryIcon:{width:34,height:34,borderRadius:9,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},summaryLabel:{fontSize:11,color:theme.muted},summaryValue:{fontFamily:'serif',fontSize:18,fontWeight:'800',color:theme.ink},filters:{flexDirection:'row',gap:6,flexWrap:'wrap'},toolbarActions:{flexDirection:'row',alignItems:'flex-end',gap:8,flexWrap:'wrap'},assigneeFilter:{minWidth:190},dragHint:{minHeight:34,marginTop:8,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:theme.green50,borderRadius:9,alignSelf:'flex-start'},dragHintText:{fontSize:11,color:theme.green2,fontWeight:'700'},board:{flexGrow:1,alignItems:'flex-start',gap:12,paddingTop:14,paddingBottom:8},boardCompact:{flexDirection:'column'},column:{width:330,minHeight:330,backgroundColor:'#EFF3F0',borderRadius:14,padding:11,borderWidth:1,borderColor:'transparent'},columnDragging:{borderStyle:'dashed',borderColor:'#C7D7CD'},columnTarget:{backgroundColor:'#E8F1EB',borderColor:theme.green2},columnHead:{height:38,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:3},dot:{width:7,height:7,borderRadius:4},columnTitle:{flex:1,fontSize:12,fontWeight:'900',color:theme.ink,textTransform:'uppercase'},count:{minWidth:23,height:23,borderRadius:12,backgroundColor:theme.white,alignItems:'center',justifyContent:'center'},countText:{fontSize:11,fontWeight:'800',color:theme.muted},cards:{gap:9},card:{backgroundColor:theme.white,borderWidth:1,borderLeftWidth:3,borderColor:theme.border,borderRadius:11,padding:13},overdueCard:{borderColor:'#E6B8AF'},cardTop:{flexDirection:'row',alignItems:'flex-start',gap:6},dragHandle:{width:20,height:20,alignItems:'center',justifyContent:'center'},moveButton:{width:28,height:28,borderRadius:8,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center',marginTop:-4},name:{flex:1,fontSize:13,fontWeight:'800',lineHeight:17,color:theme.ink},client:{fontSize:11,color:theme.muted,marginTop:4,marginLeft:26},assignee:{fontSize:10,color:theme.green2,fontWeight:'800',marginTop:4,marginLeft:26},alerts:{flexDirection:'row',gap:6,marginTop:8},dangerTag:{fontSize:10,fontWeight:'900',color:theme.danger,backgroundColor:'#FBE9E6',paddingHorizontal:7,paddingVertical:4,borderRadius:7},highTag:{fontSize:10,fontWeight:'900',color:'#8A6D22',backgroundColor:theme.goldPale,paddingHorizontal:7,paddingVertical:4,borderRadius:7},metaRow:{flexDirection:'row',justifyContent:'space-between',marginTop:11},meta:{fontSize:11,color:theme.muted},quote:{fontSize:11,fontWeight:'800',color:theme.gold},progressHead:{flexDirection:'row',justifyContent:'space-between',marginTop:11},progressLabel:{fontSize:11,color:theme.muted},progressValue:{fontSize:11,fontWeight:'800',color:theme.green2},track:{height:5,backgroundColor:theme.border,borderRadius:3,marginTop:5},bar:{height:5,borderRadius:3},footer:{borderTopWidth:1,borderTopColor:theme.border,marginTop:11,paddingTop:9,flexDirection:'row',justifyContent:'space-between'},footerLabel:{fontSize:11,color:theme.muted},value:{fontSize:11,fontWeight:'800',color:theme.ink},emptyColumn:{height:130,alignItems:'center',justifyContent:'center',gap:7},emptyColumnTarget:{backgroundColor:'#F7FBF8',borderWidth:1,borderStyle:'dashed',borderColor:theme.green2,borderRadius:10},emptyText:{fontSize:11,color:theme.muted},backdrop:{flex:1,backgroundColor:'rgba(11,29,21,.36)',alignItems:'center',justifyContent:'center',padding:18},moveSheet:{width:'100%',maxWidth:360,borderRadius:17,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,padding:14,shadowColor:'#000',shadowOpacity:.18,shadowRadius:24,elevation:16},moveTitle:{fontFamily:'serif',fontSize:18,fontWeight:'800',color:theme.ink},moveSubtitle:{fontSize:11,color:theme.muted,marginTop:3,marginBottom:10},statusOption:{minHeight:48,borderRadius:10,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:9},statusOptionCurrent:{backgroundColor:theme.green50},statusDot:{width:9,height:9,borderRadius:5},statusText:{flex:1,fontSize:12,fontWeight:'800',color:theme.ink},statusTextCurrent:{color:theme.green2},cancelMove:{height:43,borderTopWidth:1,borderTopColor:theme.border,marginTop:6,alignItems:'center',justifyContent:'center'},cancelMoveText:{fontSize:11,fontWeight:'800',color:theme.muted},pressed:{opacity:.72}});
