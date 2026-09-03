import {useCallback,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router} from 'expo-router';
import {api,logout} from '../../../api';
import {Text} from '../../../i18n';
import {feedbackAlert as Alert,useFeedback} from '../../../components/Feedback';
import {theme} from '../../../theme';
import {PlatformFilterBar,PlatformFilterGroup,PlatformSearch} from '../PlatformFilters';
import {PlatformPagination} from '../PlatformPagination';
import {PlatformCompanies as Companies,PlatformPayments as Payments,PlatformPlans as Plans,PlatformSubscriptions as Subscriptions,PlatformUsers as Users} from '../PlatformLists';
import {NewPlatformPlanModal as NewPlanModal,NewPlatformTenantModal as NewTenantModal,PlatformEditModal as EditModal,PlatformPlanEditModal as PlanEditModal} from '../PlatformModals';
import {usePlatformData} from '../usePlatformData';
import {PlatformOverview as Overview} from '../PlatformOverview';
import {PLATFORM_TABS,PlatformSidebar} from '../PlatformSidebar';
import {PlatformEmailSettings} from '../PlatformEmailSettings';
import {PlatformMaintenance} from '../PlatformMaintenance';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import type {PlatformCompany,PlatformEditableItem,PlatformPayment,PlatformPlan,PlatformSubscription,PlatformTenantCreateResult,PlatformUser} from '../contracts';

export default function Platform(){
 const {width}=useWindowDimensions();
 const compact=width<860;
 const phone=width<620;
 const insets=useSafeAreaInsets();
 const {confirm}=useFeedback();
 const unauthorized=useCallback(()=>router.replace('/'),[]);
 const{data,tab,selectTab,companies,companyOptions,users,plans,payments,query,setQuery,statusFilter,setStatusFilter,planFilter,setPlanFilter,companyFilter,setCompanyFilter,page,setPage,pageMeta,loading,listLoading,filtered,reload}=usePlatformData({compact,onUnauthorized:unauthorized});
 const[editing,setEditing]=useState<PlatformEditableItem>();const[creatingTenant,setCreatingTenant]=useState(false),[creatingPlan,setCreatingPlan]=useState(false);const[accountOpen,setAccountOpen]=useState(false);
 async function signOut(){
  setAccountOpen(false);
  const confirmed=await confirm({title:'Sair da conta?',message:'Você precisará entrar novamente para acessar o LuviePro.',confirmLabel:'Sair',danger:true});
  if(!confirmed)return;
  await logout();
  router.replace('/');
 }
 async function patch(path:string,body:Record<string,unknown>,message:string){try{await api(path,{method:'PATCH',body:JSON.stringify(body)});setEditing(undefined);await reload();Alert.alert(message)}catch(e:unknown){Alert.alert('Não foi possível salvar',e instanceof Error?e.message:'Erro inesperado')}}
 async function resetClientPassword(user:PlatformUser){const confirmed=await confirm({title:'Enviar recuperação de senha?',message:`Será enviado um link de redefinição para ${user.email}.`,confirmLabel:'Enviar link'});if(!confirmed)return;try{await api(`/platform/users/${user.id}/password-reset`,{method:'POST'});Alert.alert('Recuperação enviada',`Confira a caixa de entrada de ${user.email}.`)}catch(e:unknown){Alert.alert('Não foi possível enviar',e instanceof Error?e.message:'Erro inesperado')}}
 if(loading&&!data)return <View style={s.loading}><ActivityIndicator color={theme.gold}/><Text style={s.muted}>Carregando console administrativo...</Text></View>;
 const activeTab=PLATFORM_TABS.find(item=>item.key===tab)!;
 return <SafeAreaView style={[s.page,compact&&s.pageCompact]} edges={['top','left','right']}><PlatformSidebar compact={compact} active={tab} onSelect={selectTab} onLogout={signOut}/>
 <ScrollView style={s.main} contentContainerStyle={[s.content,compact&&s.contentCompact,{paddingBottom:compact?96+insets.bottom:30}]} keyboardShouldPersistTaps="handled"><View style={[s.header,compact&&s.headerCompact]}><View style={s.headerTitle}><Text style={s.eyebrow}>LUVIEPRO · PLATFORM</Text><Text style={s.title}>{activeTab.label}</Text><Text style={s.muted}>{activeTab.subtitle}</Text></View><View style={[s.headerActions,compact&&s.headerActionsCompact]}>{tab==='companies'?<Pressable onPress={()=>setCreatingTenant(true)} style={s.primaryAction}><Ionicons name="add-circle-outline" size={18} color="#fff"/><Text style={s.primaryActionText}>Nova empresa</Text></Pressable>:tab==='plans'?<Pressable onPress={()=>setCreatingPlan(true)} style={s.primaryAction}><Ionicons name="add-circle-outline" size={18} color="#fff"/><Text style={s.primaryActionText}>Novo plano</Text></Pressable>:null}<Pressable accessibilityRole="button" accessibilityLabel="Conta do administrador" accessibilityState={{expanded:accountOpen}} onPress={()=>setAccountOpen(true)} style={({pressed})=>[s.admin,pressed&&s.adminPressed]}><View style={s.adminAvatar}><Text style={s.adminInitial}>LM</Text></View>{!compact&&<View style={s.adminText}><Text style={s.strong}>LuviePro Master</Text><Text style={s.small}>Administrador da plataforma</Text></View>}<Ionicons name="chevron-down" size={15} color={theme.muted}/></Pressable></View></View>
 {tab==='overview'?<Overview data={data} companies={companies} users={users} payments={payments} onTab={selectTab}/>:tab==='email'?<PlatformEmailSettings/>:tab==='maintenance'?<PlatformMaintenance onOpenClientUsers={()=>selectTab('users')}/>:<>
  <PlatformSearch compact={phone} value={query} total={tab==='plans'?filtered.length:pageMeta.total} onChange={value=>{setQuery(value);setPage(1)}}/>
  {tab!=='plans'?<PlatformFilterBar compact={phone}>
   <PlatformFilterGroup compact={phone} label="Status" value={statusFilter} onChange={value=>{setStatusFilter(value);setPage(1)}} values={tab==='users'?[['all','Todos'],['active','Ativos'],['inactive','Inativos']]:tab==='companies'?[['all','Todos'],['active','Ativas'],['suspended','Suspensas'],['cancelled','Canceladas']]:[['all','Todos'],['active','Ativas'],['trial','Teste'],['approved','Aprovados'],['pending','Pendentes'],['cancelled','Cancelados']]}/>
   <PlatformFilterGroup compact={phone} label="Plano" value={planFilter} onChange={value=>{setPlanFilter(value);setPage(1)}} values={[['all','Todos'],...plans.map(plan=>[plan.plan,plan.name??plan.plan.toUpperCase()] as const)]}/>
   {tab!=='companies'?<PlatformFilterGroup compact={phone} label="Empresa" value={companyFilter} onChange={value=>{setCompanyFilter(value);setPage(1)}} values={[['all','Todas'],...companyOptions.map(company=>[company.id,company.name] as const)]}/>:null}
  </PlatformFilterBar>:null}
  {listLoading&&tab!=='plans'
   ?<View style={s.listLoading}><ActivityIndicator color={theme.gold}/><Text style={s.small}>Atualizando registros...</Text></View>
   :tab==='companies'?<Companies rows={filtered as PlatformCompany[]} onEdit={setEditing} compact={compact}/>:tab==='users'?<Users rows={filtered as PlatformUser[]} onEdit={setEditing} onReset={user=>void resetClientPassword(user)} compact={compact}/>:tab==='plans'?<Plans rows={filtered as PlatformPlan[]} onEdit={setEditing}/>:tab==='subs'?<Subscriptions rows={filtered as PlatformSubscription[]} compact={compact}/>:<Payments rows={filtered as PlatformPayment[]} compact={compact}/>}
  {tab!=='plans'&&!listLoading?<PlatformPagination page={page} totalPages={pageMeta.totalPages} onChange={setPage}/>:null}
 </>}
 </ScrollView>
 <Modal visible={accountOpen} transparent animationType="fade" onRequestClose={()=>setAccountOpen(false)}>
  <Pressable style={[s.accountOverlay,phone&&s.accountOverlayPhone]} onPress={()=>setAccountOpen(false)}>
   <Pressable onPress={()=>{}} style={[s.accountMenu,phone&&s.accountMenuPhone,{paddingBottom:phone?Math.max(12,insets.bottom+8):8}]}>
    <View style={s.accountMenuProfile}><View style={s.adminAvatar}><Text style={s.adminInitial}>LM</Text></View><View style={s.adminText}><Text style={s.strong}>LuviePro Master</Text><Text style={s.small}>Administrador da plataforma</Text></View></View>
    <View style={s.accountMenuDivider}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={signOut} style={({pressed})=>[s.accountMenuItem,pressed&&s.accountMenuItemPressed]}><Ionicons name="log-out-outline" size={18} color={theme.danger}/><Text style={s.accountMenuLogout}>Sair da conta</Text></Pressable>
   </Pressable>
  </Pressable>
 </Modal>
 <NewPlanModal visible={creatingPlan} onClose={()=>setCreatingPlan(false)} onCreated={async()=>{setCreatingPlan(false);await reload();Alert.alert('Plano criado','O novo plano já está disponível no catálogo.')}}/><PlanEditModal item={editing?.kind==='plan'?editing:undefined} onClose={()=>setEditing(undefined)} onSave={(id,b)=>patch(`/platform/plans/${id}`,b,'Plano atualizado')}/><EditModal item={editing?.kind==='plan'?undefined:editing} onClose={()=>setEditing(undefined)} onTenant={(id,b)=>patch(`/platform/tenants/${id}`,b,'Empresa atualizada')} onUser={(id,b)=>patch(`/platform/users/${id}`,b,'Usuário atualizado')} onPlan={(id,b)=>patch(`/platform/plans/${id}`,b,'Plano atualizado')}/><NewTenantModal visible={creatingTenant} onClose={()=>setCreatingTenant(false)} onCreated={async(result:PlatformTenantCreateResult)=>{setCreatingTenant(false);await reload();Alert.alert(result?.invitation?.delivery?.sent?'Empresa criada e convite enviado':'Empresa criada',result?.invitation?.delivery?.sent?'O proprietário receberá o link para definir a senha.':`SMTP indisponível. Link de convite: ${result?.invitation?.inviteUrl??'consulte a API'}`)}}/></SafeAreaView>
}

const s=StyleSheet.create({
 page:{flex:1,flexDirection:'row',backgroundColor:'#F3F6F4'},pageCompact:{flexDirection:'column'},
 main:{flex:1},content:{padding:30,width:'100%',alignSelf:'center'},contentCompact:{padding:16},
 loading:{flex:1,alignItems:'center',justifyContent:'center',gap:12},
 listLoading:{minHeight:160,padding:24,alignItems:'center',justifyContent:'center',gap:10},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24,gap:14},headerCompact:{alignItems:'stretch',flexDirection:'column',marginBottom:18},headerTitle:{flex:1,minWidth:0},
 headerActions:{flexDirection:'row',alignItems:'center',gap:10},headerActionsCompact:{justifyContent:'space-between',flexWrap:'wrap'},
 primaryAction:{height:42,borderRadius:10,backgroundColor:theme.green2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7},
 primaryActionText:{fontSize:11,fontWeight:'900',color:'#fff'},
 eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.4,color:theme.gold},
 title:{fontFamily:'serif',fontSize:30,fontWeight:'800',color:theme.ink,marginTop:5},
 muted:{fontSize:12,color:theme.muted,marginTop:4},small:{fontSize:9.5,color:theme.muted,marginTop:3},
 strong:{fontSize:11,fontWeight:'800',color:theme.ink},
 admin:{flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:12,padding:8},
 adminPressed:{backgroundColor:'#F7F9F8'},
 adminText:{minWidth:0},
 accountOverlay:{flex:1,backgroundColor:'rgba(8,20,14,.08)',alignItems:'flex-end',paddingTop:82,paddingRight:30},accountOverlayPhone:{justifyContent:'flex-end',paddingTop:0,paddingRight:0},
 accountMenu:{width:245,backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:14,padding:8,shadowColor:'#000',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:6},elevation:20},
 accountMenuPhone:{width:'100%',borderBottomLeftRadius:0,borderBottomRightRadius:0,borderTopLeftRadius:18,borderTopRightRadius:18},
 accountMenuProfile:{flexDirection:'row',alignItems:'center',gap:9,padding:9},
 accountMenuDivider:{height:1,backgroundColor:theme.border,marginVertical:4},
 accountMenuItem:{height:42,borderRadius:9,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:9},
 accountMenuItemPressed:{backgroundColor:'#FBECEC'},
 accountMenuLogout:{fontSize:12,fontWeight:'800',color:theme.danger},
 adminAvatar:{width:35,height:35,borderRadius:18,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},
 adminInitial:{fontSize:11,fontWeight:'900',color:theme.gold}
});
