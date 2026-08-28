import {useCallback,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router} from 'expo-router';
import {api,logout} from '../src/api';
import {Text} from '../src/i18n';
import {feedbackAlert as Alert} from '../src/components/Feedback';
import {theme} from '../src/theme';
import {PlatformFilterBar,PlatformFilterGroup,PlatformSearch} from '../src/features/platform/PlatformFilters';
import {PlatformPagination} from '../src/features/platform/PlatformPagination';
import {PlatformCompanies as Companies,PlatformPayments as Payments,PlatformPlans as Plans,PlatformSubscriptions as Subscriptions,PlatformUsers as Users} from '../src/features/platform/PlatformLists';
import {NewPlatformTenantModal as NewTenantModal,PlatformEditModal as EditModal} from '../src/features/platform/PlatformModals';
import {usePlatformData} from '../src/features/platform/usePlatformData';
import {PlatformOverview as Overview} from '../src/features/platform/PlatformOverview';
import {PLATFORM_TABS,PlatformSidebar} from '../src/features/platform/PlatformSidebar';
import type {PlatformCompany,PlatformPayment,PlatformPlan,PlatformSubscription,PlatformUser} from '../src/features/platform/contracts';

export default function Platform(){
 const compact=useWindowDimensions().width<860;
 const unauthorized=useCallback(()=>router.replace('/'),[]);
 const{data,tab,selectTab,companies,companyOptions,users,payments,query,setQuery,statusFilter,setStatusFilter,planFilter,setPlanFilter,companyFilter,setCompanyFilter,page,setPage,pageMeta,loading,listLoading,filtered,reload}=usePlatformData({compact,onUnauthorized:unauthorized});
 const[editing,setEditing]=useState<any>();const[creatingTenant,setCreatingTenant]=useState(false);
 async function patch(path:string,body:Record<string,unknown>,message:string){try{await api(path,{method:'PATCH',body:JSON.stringify(body)});setEditing(undefined);await reload();Alert.alert(message)}catch(e:any){Alert.alert('Não foi possível salvar',e.message)}}
 if(loading&&!data)return <View style={s.loading}><ActivityIndicator color={theme.gold}/><Text style={s.muted}>Carregando console administrativo...</Text></View>;
 const activeTab=PLATFORM_TABS.find(item=>item.key===tab)!;
 return <View style={s.page}><PlatformSidebar compact={compact} active={tab} onSelect={selectTab} onLogout={async()=>{await logout();router.replace('/')}}/>
 <ScrollView style={s.main} contentContainerStyle={s.content}><View style={s.header}><View><Text style={s.eyebrow}>LUVIEPRO · PLATFORM</Text><Text style={s.title}>{activeTab.label}</Text><Text style={s.muted}>{activeTab.subtitle}</Text></View><View style={s.headerActions}>{tab==='companies'?<Pressable onPress={()=>setCreatingTenant(true)} style={s.primaryAction}><Ionicons name="add-circle-outline" size={18} color="#fff"/><Text style={s.primaryActionText}>Nova empresa</Text></Pressable>:null}<View style={s.admin}><View style={s.adminAvatar}><Text style={s.adminInitial}>LM</Text></View>{!compact&&<View><Text style={s.strong}>LuviePro Master</Text><Text style={s.small}>Administrador da plataforma</Text></View>}</View></View></View>
 {tab==='overview'?<Overview data={data} companies={companies} users={users} payments={payments} onTab={selectTab}/>:<>
  <PlatformSearch value={query} total={tab==='plans'?filtered.length:pageMeta.total} onChange={value=>{setQuery(value);setPage(1)}}/>
  {tab!=='plans'?<PlatformFilterBar>
   <PlatformFilterGroup label="Status" value={statusFilter} onChange={value=>{setStatusFilter(value);setPage(1)}} values={tab==='users'?[['all','Todos'],['active','Ativos'],['inactive','Inativos']]:tab==='companies'?[['all','Todos'],['active','Ativas'],['suspended','Suspensas'],['cancelled','Canceladas']]:[['all','Todos'],['active','Ativas'],['trial','Teste'],['approved','Aprovados'],['pending','Pendentes'],['cancelled','Cancelados']]}/>
   <PlatformFilterGroup label="Plano" value={planFilter} onChange={value=>{setPlanFilter(value);setPage(1)}} values={[['all','Todos'],['starter','Starter'],['pro','Pro'],['business','Business']]}/>
   {tab!=='companies'?<PlatformFilterGroup label="Empresa" value={companyFilter} onChange={value=>{setCompanyFilter(value);setPage(1)}} values={[['all','Todas'],...companyOptions.map(company=>[company.id,company.name] as const)]}/>:null}
  </PlatformFilterBar>:null}
  {listLoading&&tab!=='plans'
   ?<View style={s.listLoading}><ActivityIndicator color={theme.gold}/><Text style={s.small}>Atualizando registros...</Text></View>
   :tab==='companies'?<Companies rows={filtered as PlatformCompany[]} onEdit={setEditing}/>:tab==='users'?<Users rows={filtered as PlatformUser[]} onEdit={setEditing}/>:tab==='plans'?<Plans rows={filtered as PlatformPlan[]} onEdit={setEditing}/>:tab==='subs'?<Subscriptions rows={filtered as PlatformSubscription[]}/>:<Payments rows={filtered as PlatformPayment[]}/>}
  {tab!=='plans'&&!listLoading?<PlatformPagination page={page} totalPages={pageMeta.totalPages} onChange={setPage}/>:null}
 </>}
 </ScrollView><EditModal item={editing} onClose={()=>setEditing(undefined)} onTenant={(id,b)=>patch(`/platform/tenants/${id}`,b,'Empresa atualizada')} onUser={(id,b)=>patch(`/platform/users/${id}`,b,'Usuário atualizado')} onPlan={(id,b)=>patch(`/platform/plans/${id}`,b,'Plano atualizado')}/><NewTenantModal visible={creatingTenant} onClose={()=>setCreatingTenant(false)} onCreated={async(result:any)=>{setCreatingTenant(false);await reload();Alert.alert(result?.invitation?.delivery?.sent?'Empresa criada e convite enviado':'Empresa criada',result?.invitation?.delivery?.sent?'O proprietário receberá o link para definir a senha.':`SMTP indisponível. Link de convite: ${result?.invitation?.inviteUrl??'consulte a API'}`)}}/></View>
}

const s=StyleSheet.create({
 page:{flex:1,flexDirection:'row',backgroundColor:'#F3F6F4'},
 main:{flex:1},content:{padding:30,width:'100%',alignSelf:'center'},
 loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},
 listLoading:{minHeight:160,padding:24,alignItems:'center',justifyContent:'center',gap:10},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
 headerActions:{flexDirection:'row',alignItems:'center',gap:10},
 primaryAction:{height:42,borderRadius:10,backgroundColor:theme.green2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7},
 primaryActionText:{fontSize:11,fontWeight:'900',color:'#fff'},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:theme.gold},
 title:{fontFamily:'serif',fontSize:30,fontWeight:'800',color:theme.ink,marginTop:5},
 muted:{fontSize:12,color:theme.muted,marginTop:4},small:{fontSize:9.5,color:theme.muted,marginTop:3},
 strong:{fontSize:11,fontWeight:'800',color:theme.ink},
 admin:{flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:12,padding:8},
 adminAvatar:{width:35,height:35,borderRadius:18,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},
 adminInitial:{fontSize:11,fontWeight:'900',color:theme.gold}
});
