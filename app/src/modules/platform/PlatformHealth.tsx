import Ionicons from '@expo/vector-icons/Ionicons';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,Share,StyleSheet,useWindowDimensions,View} from 'react-native';
import {api,apiDiagnosticsSnapshot,type ApiDiagnosticSnapshot} from '../../api';
import {Text} from '../../i18n';
import {theme} from '../../theme';
import {feedbackAlert as Alert} from '../../components/Feedback';

type CheckState='ok'|'warning'|'down';
type Dependency={state:CheckState;latencyMs?:number;detail?:string;appliedMigrations?:number;pendingOrFailed?:number};
type PlatformHealthPayload={
 status:CheckState;
 service:string;
 version:string;
 commit:string;
 environment:string;
 requestId?:string|null;
 timestamp:string;
 uptimeSeconds:number;
 dependencies:{database:Dependency;redis:Dependency;schema:Dependency};
 integrations:{
  mercadoPago:{state:CheckState;configured:boolean;sandbox:boolean;detail:string};
  email:{state:CheckState;configured:boolean;provider:string;detail:string};
 };
 api:{requests:Record<string,number>;errors:Record<string,number>;uptimeSeconds:number};
};

type WindowKey='5m'|'15m'|'60m'|'session';
const WINDOWS:{key:WindowKey;label:string;ms?:number}[]=[
 {key:'5m',label:'5 min',ms:5*60_000},
 {key:'15m',label:'15 min',ms:15*60_000},
 {key:'60m',label:'60 min',ms:60*60_000},
 {key:'session',label:'Sessão'},
];

const stateLabel:Record<CheckState,string>={ok:'Saudável',warning:'Atenção',down:'Indisponível'};
const stateColor:Record<CheckState,string>={ok:theme.success,warning:'#A66A13',down:theme.danger};

function valueOrDash(value:number|undefined,suffix=''){return typeof value==='number'?`${value}${suffix}`:'—'}
function formatUptime(seconds:number){const d=Math.floor(seconds/86400),h=Math.floor((seconds%86400)/3600),m=Math.floor((seconds%3600)/60);return d?`${d}d ${h}h`:h?`${h}h ${m}min`:`${m} min`}

function StatusDot({state}:{state:CheckState}){return <View style={[s.dot,{backgroundColor:stateColor[state]}]}/>}
function MetricCard({value,label,wide=false}:{value:string|number;label:string;wide?:boolean}){return <View style={[s.metricCard,wide&&s.metricCardWide]}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>}
function DependencyCard({title,item}:{title:string;item:Dependency}){return <View style={s.dependencyCard}><View style={s.dependencyTop}><StatusDot state={item.state}/><Text style={s.dependencyTitle}>{title}</Text></View><Text style={[s.dependencyState,{color:stateColor[item.state]}]}>{stateLabel[item.state]}</Text>{typeof item.latencyMs==='number'?<Text style={s.dependencyDetail}>{item.latencyMs} ms</Text>:null}<Text style={s.dependencyDetail}>{item.detail||'—'}</Text></View>}

export function PlatformHealth(){
 const {width}=useWindowDimensions();
 const compact=width<760;
 const phone=width<520;
 const[data,setData]=useState<PlatformHealthPayload>();
 const[loading,setLoading]=useState(true);
 const[refreshing,setRefreshing]=useState(false);
 const[roundTrip,setRoundTrip]=useState<number>();
 const[windowKey,setWindowKey]=useState<WindowKey>('15m');
 const[frontend,setFrontend]=useState<ApiDiagnosticSnapshot>(()=>apiDiagnosticsSnapshot(15*60_000));

 const selected=WINDOWS.find(item=>item.key===windowKey)!;
 const refreshFrontend=useCallback(()=>setFrontend(apiDiagnosticsSnapshot(selected.ms)),[selected.ms]);

 const load=useCallback(async(first=false)=>{
  first?setLoading(true):setRefreshing(true);
  const started=Date.now();
  try{
   const payload=await api<PlatformHealthPayload>('/platform/health');
   setRoundTrip(Date.now()-started);
   setData(payload);
   setTimeout(refreshFrontend,0);
  }catch(error:unknown){Alert.alert('Não foi possível atualizar o diagnóstico',error instanceof Error?error.message:'Erro inesperado')}
  finally{setLoading(false);setRefreshing(false)}
 },[refreshFrontend]);

 useEffect(()=>{void load(true)},[load]);
 useEffect(()=>{refreshFrontend()},[refreshFrontend]);
 useEffect(()=>{const timer=setInterval(refreshFrontend,5000);return()=>clearInterval(timer)},[refreshFrontend]);

 const frontendState:CheckState=frontend.errors5xx||frontend.networkFailures?'down':frontend.operationalFailures||frontend.slowRequests?'warning':'ok';
 const apiRequestTotal=useMemo(()=>Object.values(data?.api.requests??{}).reduce((sum,value)=>sum+Number(value||0),0),[data]);
 const safeDiagnostic=useMemo(()=>data?[
  `LuviePro · Saúde do aplicativo`,
  `Ambiente: ${data.environment}`,
  `Versão: ${data.version}`,
  `Status: ${stateLabel[data.status]}`,
  `API round-trip: ${valueOrDash(roundTrip,' ms')}`,
  `PostgreSQL: ${stateLabel[data.dependencies.database.state]}`,
  `Redis: ${stateLabel[data.dependencies.redis.state]}`,
  `Schema: ${stateLabel[data.dependencies.schema.state]}`,
  `Mercado Pago: ${stateLabel[data.integrations.mercadoPago.state]}`,
  `E-mail: ${stateLabel[data.integrations.email.state]}`,
  `Request ID: ${data.requestId||'—'}`,
  `Atualizado em: ${new Date(data.timestamp).toLocaleString('pt-BR')}`,
 ].join('\n'):'',[data,roundTrip]);

 async function shareDiagnostic(){if(!safeDiagnostic)return;try{await Share.share({message:safeDiagnostic,title:'Diagnóstico LuviePro'})}catch{Alert.alert('Não foi possível compartilhar o diagnóstico')}}

 if(loading&&!data)return <View style={s.loading}><ActivityIndicator color={theme.gold}/><Text style={s.muted}>Executando diagnóstico seguro...</Text></View>;
 if(!data)return <View style={s.empty}><Ionicons name="alert-circle-outline" size={28} color={theme.danger}/><Text style={s.strong}>Diagnóstico indisponível</Text><Pressable onPress={()=>void load(true)} style={s.primaryButton}><Text style={s.primaryButtonText}>Tentar novamente</Text></Pressable></View>;

 return <View style={s.root}>
  <View style={[s.actions,phone&&s.actionsPhone]}>
   <View style={s.statusSummary}><StatusDot state={data.status}/><View><Text style={s.strong}>{stateLabel[data.status]}</Text><Text style={s.mutedSmall}>Atualizado em {new Date(data.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</Text></View></View>
   <View style={[s.actionButtons,phone&&s.actionButtonsPhone]}>
    <Pressable onPress={()=>void shareDiagnostic()} style={[s.secondaryButton,phone&&s.fullButton]}><Ionicons name="share-social-outline" size={17} color={theme.green2}/><Text style={s.secondaryButtonText}>Compartilhar diagnóstico</Text></Pressable>
    <Pressable disabled={refreshing} onPress={()=>void load(false)} style={[s.primaryButton,phone&&s.fullButton,refreshing&&s.disabled]}>{refreshing?<ActivityIndicator size="small" color="#fff"/>:<Ionicons name="refresh-outline" size={17} color="#fff"/>}<Text style={s.primaryButtonText}>{refreshing?'Atualizando...':'Atualizar diagnóstico'}</Text></Pressable>
   </View>
  </View>

  <View style={s.panel}>
   <Text style={s.panelTitle}>API e dependências</Text>
   <View style={s.healthLine}><StatusDot state={data.status}/><Text style={s.strong}>{stateLabel[data.status]}</Text></View>
   <Text style={s.mutedSmall}>/api · {data.service}</Text>
   <View style={[s.metricsGrid,compact&&s.metricsGridCompact]}>
    <MetricCard value={valueOrDash(roundTrip,' ms')} label="Round-trip"/>
    <MetricCard value={data.dependencies.database.state==='ok'?'ok':stateLabel[data.dependencies.database.state]} label="Database"/>
    <MetricCard value={data.dependencies.schema.state==='ok'?'ok':stateLabel[data.dependencies.schema.state]} label="Schema"/>
    <MetricCard value={data.dependencies.redis.state==='ok'?'ok':stateLabel[data.dependencies.redis.state]} label="Redis"/>
    <MetricCard value={formatUptime(data.uptimeSeconds)} label="Uptime API"/>
   </View>
   <View style={[s.dependencyGrid,compact&&s.dependencyGridCompact]}>
    <DependencyCard title="PostgreSQL" item={data.dependencies.database}/>
    <DependencyCard title="Redis" item={data.dependencies.redis}/>
    <DependencyCard title="Prisma / migrations" item={data.dependencies.schema}/>
   </View>
   <Text selectable style={s.requestId}>Request ID: {data.requestId||'—'}</Text>
  </View>

  <View style={s.panel}>
   <Text style={s.panelTitle}>Integrações</Text>
   <View style={[s.integrationGrid,compact&&s.integrationGridCompact]}>
    <View style={s.integrationCard}><View style={s.dependencyTop}><StatusDot state={data.integrations.mercadoPago.state}/><Text style={s.dependencyTitle}>Mercado Pago</Text></View><Text style={[s.integrationState,{color:stateColor[data.integrations.mercadoPago.state]}]}>{stateLabel[data.integrations.mercadoPago.state]}</Text><Text style={s.dependencyDetail}>{data.integrations.mercadoPago.detail}</Text><Text style={s.tag}>{data.integrations.mercadoPago.sandbox?'Sandbox':'Produção'}</Text></View>
    <View style={s.integrationCard}><View style={s.dependencyTop}><StatusDot state={data.integrations.email.state}/><Text style={s.dependencyTitle}>E-mail</Text></View><Text style={[s.integrationState,{color:stateColor[data.integrations.email.state]}]}>{stateLabel[data.integrations.email.state]}</Text><Text style={s.dependencyDetail}>{data.integrations.email.detail}</Text><Text style={s.tag}>{data.integrations.email.provider}</Text></View>
    <View style={s.integrationCard}><View style={s.dependencyTop}><StatusDot state={data.dependencies.schema.state}/><Text style={s.dependencyTitle}>Banco / migrations</Text></View><Text style={s.integrationState}>{data.dependencies.schema.appliedMigrations??'—'} aplicadas</Text><Text style={s.dependencyDetail}>{data.dependencies.schema.pendingOrFailed??'—'} pendentes ou incompletas</Text><Text style={s.tag}>{data.environment}</Text></View>
   </View>
  </View>

  <View style={s.panel}>
   <View style={[s.frontHeader,phone&&s.frontHeaderPhone]}><View><Text style={s.panelTitle}>Frontend</Text><View style={s.healthLine}><StatusDot state={frontendState}/><Text style={s.strong}>{stateLabel[frontendState]}</Text></View></View><Text style={s.mutedSmall}>{apiRequestTotal} requisições observadas pela API desde o último boot</Text></View>
   <View style={s.windowRow}>{WINDOWS.map(item=><Pressable key={item.key} onPress={()=>setWindowKey(item.key)} style={[s.windowButton,windowKey===item.key&&s.windowButtonOn]}><Text style={[s.windowText,windowKey===item.key&&s.windowTextOn]}>{item.label}</Text></Pressable>)}</View>
   <View style={[s.metricsGrid,s.frontMetrics,compact&&s.metricsGridCompact]}>
    <MetricCard value={stateLabel[frontendState]} label="Estado atual"/>
    <MetricCard value={frontend.requests} label="Requisições"/>
    <MetricCard value={frontend.operationalFailures} label="Falhas operacionais"/>
    <MetricCard value={`${frontend.failureRate}%`} label="Taxa operacional"/>
    <MetricCard value={frontend.responses4xx} label="Respostas 4xx"/>
    <MetricCard value={frontend.networkFailures} label="Falhas de rede"/>
    <MetricCard value={frontend.errors5xx} label="Erros 5xx"/>
    <MetricCard value={`${frontend.averageLatencyMs} ms`} label="Latência média"/>
    <MetricCard value={`${frontend.maxLatencyMs} ms`} label="Maior latência"/>
    <MetricCard value={frontend.slowRequests} label="Lentas ≥ 1.5s"/>
    <MetricCard value={frontend.networkState==='online'?'online':frontend.networkState==='offline'?'offline':'não determinado'} label="Rede" wide/>
   </View>
   <Text style={s.note}>Erros 4xx ficam separados de falhas de rede, erros 5xx e 429. As métricas do frontend ficam apenas na memória desta sessão e não incluem senhas, tokens ou conteúdo das requisições.</Text>
  </View>

  <View style={s.footerInfo}><Ionicons name="shield-checkmark-outline" size={17} color={theme.green2}/><Text style={s.footerText}>Diagnóstico seguro: esta tela não expõe credenciais, cookies, JWTs, tokens de pagamento, conteúdo de e-mails nem URL do banco.</Text></View>
 </View>;
}

const s=StyleSheet.create({
 root:{gap:14},loading:{minHeight:320,alignItems:'center',justifyContent:'center',gap:10},empty:{minHeight:280,alignItems:'center',justifyContent:'center',gap:12},
 actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},actionsPhone:{alignItems:'stretch',flexDirection:'column'},statusSummary:{flexDirection:'row',alignItems:'center',gap:9},actionButtons:{flexDirection:'row',alignItems:'center',gap:8},actionButtonsPhone:{width:'100%',flexDirection:'column'},fullButton:{width:'100%'},
 panel:{borderWidth:1,borderColor:theme.border,borderRadius:14,backgroundColor:'#fff',padding:16,gap:11,shadowColor:theme.shadow,shadowOpacity:.035,shadowRadius:10,shadowOffset:{width:0,height:3}},panelTitle:{fontSize:15,fontWeight:'900',color:theme.ink},healthLine:{flexDirection:'row',alignItems:'center',gap:7},dot:{width:10,height:10,borderRadius:10},strong:{fontSize:13,fontWeight:'900',color:theme.ink},muted:{fontSize:12,color:theme.muted},mutedSmall:{fontSize:10,color:theme.muted},
 metricsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},metricsGridCompact:{gap:7},metricCard:{flexGrow:1,flexBasis:150,minWidth:130,minHeight:68,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:11,paddingVertical:10,justifyContent:'center',gap:3},metricCardWide:{flexBasis:220},metricValue:{fontSize:16,fontWeight:'900',color:theme.ink},metricLabel:{fontSize:9,color:theme.muted},
 dependencyGrid:{flexDirection:'row',gap:9},dependencyGridCompact:{flexDirection:'column'},dependencyCard:{flex:1,minWidth:0,borderRadius:11,backgroundColor:'#FAFCFB',borderWidth:1,borderColor:theme.border,padding:12,gap:4},dependencyTop:{flexDirection:'row',alignItems:'center',gap:7},dependencyTitle:{fontSize:11,fontWeight:'900',color:theme.ink},dependencyState:{fontSize:12,fontWeight:'900'},dependencyDetail:{fontSize:9,color:theme.muted,lineHeight:14},requestId:{fontSize:9,color:theme.green2},
 integrationGrid:{flexDirection:'row',gap:9},integrationGridCompact:{flexDirection:'column'},integrationCard:{flex:1,minWidth:0,borderRadius:11,borderWidth:1,borderColor:theme.border,padding:13,gap:6},integrationState:{fontSize:14,fontWeight:'900',color:theme.ink},tag:{alignSelf:'flex-start',fontSize:9,fontWeight:'800',color:theme.green2,backgroundColor:theme.green50,borderRadius:999,paddingHorizontal:8,paddingVertical:4,textTransform:'uppercase'},
 frontHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},frontHeaderPhone:{flexDirection:'column'},windowRow:{flexDirection:'row',flexWrap:'wrap',gap:7},windowButton:{minHeight:34,paddingHorizontal:13,borderRadius:18,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},windowButtonOn:{borderColor:theme.green2,backgroundColor:theme.green50},windowText:{fontSize:10,fontWeight:'700',color:theme.muted},windowTextOn:{color:theme.green2,fontWeight:'900'},frontMetrics:{marginTop:2},note:{fontSize:9,lineHeight:14,color:theme.muted},
 primaryButton:{minHeight:40,borderRadius:9,paddingHorizontal:14,backgroundColor:theme.green2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},primaryButtonText:{fontSize:11,fontWeight:'900',color:'#fff'},secondaryButton:{minHeight:40,borderRadius:9,paddingHorizontal:14,borderWidth:1,borderColor:theme.borderStrong,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},secondaryButtonText:{fontSize:11,fontWeight:'900',color:theme.green2},disabled:{opacity:.6},
 footerInfo:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingHorizontal:4},footerText:{flex:1,fontSize:9,lineHeight:14,color:theme.muted},
});
