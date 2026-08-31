import { type ComponentProps,useEffect,useMemo,useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable,StyleSheet,useWindowDimensions,View } from 'react-native';
import { router,type Href } from 'expo-router';
import { api,getSession } from '../../../api';
import { AppShell } from '../../../components/AppShell';
import { AsyncState } from '../../../components/AsyncState';
import { Text } from '../../../i18n';
import { theme } from '../../../theme';
import type { AccountData } from '../settings.types';
import { errorMessage } from '../settings.utils';
import { ProductCategory,ProductUnit,productsApi } from '../../products/api/products.api';

type IoniconName=ComponentProps<typeof Ionicons>['name'];
type Card={title:string;subtitle:string;icon:IoniconName;href:string;visible?:boolean;count?:number;countLabel?:string};
type Group={title:string;subtitle:string;cards:Card[]};

export default function Settings(){
  const session=getSession();
  const[data,setData]=useState<AccountData>(),[categories,setCategories]=useState<ProductCategory[]>([]),[units,setUnits]=useState<ProductUnit[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const width=useWindowDimensions().width;
  const compact=width<760;
  const role=data?.currentUser?.role??session?.role;
  const canManage=role==='owner';
  const canAudit=role==='owner'||role==='admin';
  const load=()=>{
    setLoading(true);setLoadError('');
    Promise.all([api<AccountData>('/account'),productsApi.categories().catch(()=>[] as ProductCategory[]),productsApi.units().catch(()=>[] as ProductUnit[])])
      .then(([account,cats,productUnits])=>{setData(account);setCategories(cats);setUnits(productUnits)})
      .catch((e:unknown)=>setLoadError(errorMessage(e))).finally(()=>setLoading(false));
  };
  useEffect(load,[]);
  const groups=useMemo<Group[]>(()=>[
    {title:'Produtos',subtitle:'Cadastros auxiliares usados no catálogo e no estoque.',cards:[
      {title:'Categorias de produtos',subtitle:'Classifique os produtos e controle quais categorias podem ser usadas em novos cadastros.',icon:'pricetags-outline',href:'/settings/product-categories',count:categories.length,countLabel:'categorias'},
      {title:'Unidades de produtos',subtitle:'Mantenha as unidades disponíveis no cadastro de produtos, como un, cx, kit, pct, m ou kg.',icon:'cube-outline',href:'/settings/product-units',count:units.length,countLabel:'unidades'},
    ]},
    {title:'Acesso',subtitle:'Usuários e regras de acesso à empresa.',cards:[
      {title:'Usuários',subtitle:'Gerencie usuários, convites e acessos da empresa.',icon:'people-outline',href:'/settings/users',visible:canManage,count:data?.usage?.users??0,countLabel:'usuários'},
      {title:'Perfis e permissões',subtitle:'Defina perfis personalizados e permissões de acesso.',icon:'key-outline',href:'/settings/access-profiles',visible:canManage&&!!data?.features?.customRoles},
    ]},
    {title:'Controle',subtitle:'Rastreabilidade das alterações realizadas no sistema.',cards:[
      {title:'Auditoria',subtitle:'Consulte o histórico de ações realizadas no sistema.',icon:'time-outline',href:'/settings/audit',visible:canAudit&&!!data?.features?.auditAccess},
    ]},
  ],[categories.length,units.length,canManage,canAudit,data?.features?.customRoles,data?.features?.auditAccess,data?.usage?.users]);
  if(loading||loadError)return <AppShell title="Configurações"><AsyncState loading={loading} error={loadError} onRetry={load}/></AppShell>;
  if(!data)return <AppShell title="Configurações"><AsyncState loading={loading} onRetry={load}/></AppShell>;
  return <AppShell title="Configurações" subtitle="Cadastros, acessos e parametrizações usados na operação do LuviePro.">
    <View style={s.notice}><Ionicons name="information-circle-outline" size={19} color={theme.green2}/><Text style={s.noticeText}>Informações institucionais, fiscais e identidade visual ficam em <Text style={s.noticeStrong}>Empresa</Text>. Aqui ficam somente cadastros e configurações operacionais.</Text></View>
    {groups.map(group=>{
      const visible=group.cards.filter(c=>c.visible!==false);if(!visible.length)return null;
      return <View key={group.title} style={s.group}>
        <View style={s.groupHead}><Text style={s.groupTitle}>{group.title}</Text><Text style={s.groupSubtitle}>{group.subtitle}</Text></View>
        <View style={[s.grid,compact&&s.gridCompact]}>{visible.map(card=><Pressable key={card.href} onPress={()=>router.push(card.href as Href)} style={({pressed})=>[s.card,compact&&s.cardCompact,pressed&&s.pressed]}>
          <View style={s.icon}><Ionicons name={card.icon} size={21} color={theme.green2}/></View>
          <View style={s.cardText}><View style={s.titleRow}><Text style={s.title}>{card.title}</Text>{typeof card.count==='number'&&<View style={s.countBadge}><Text style={s.countText}>{card.count} {card.countLabel}</Text></View>}</View><Text style={s.subtitle}>{card.subtitle}</Text></View>
          <Ionicons name="chevron-forward" size={19} color={theme.muted}/>
        </Pressable>)}</View>
      </View>;
    })}
  </AppShell>;
}

const s=StyleSheet.create({notice:{backgroundColor:theme.green50,borderWidth:1,borderColor:theme.border,borderRadius:13,paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'flex-start',gap:9,marginBottom:20},noticeText:{flex:1,fontSize:12,lineHeight:18,color:theme.muted},noticeStrong:{fontWeight:'900',color:theme.ink},group:{marginBottom:24},groupHead:{marginBottom:10},groupTitle:{fontFamily:'serif',fontSize:18,fontWeight:'900',color:theme.ink},groupSubtitle:{fontSize:12,color:theme.muted,marginTop:3},grid:{flexDirection:'row',flexWrap:'wrap',gap:14,alignItems:'stretch'},gridCompact:{flexDirection:'column'},card:{width:'48%',minWidth:320,minHeight:112,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:15,padding:18,flexDirection:'row',alignItems:'center',gap:14,shadowColor:theme.shadow,shadowOpacity:.025,shadowRadius:10,shadowOffset:{width:0,height:3}},cardCompact:{width:'100%',minWidth:0},pressed:{opacity:.72},icon:{width:44,height:44,borderRadius:12,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},cardText:{flex:1,minWidth:0},titleRow:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},title:{fontFamily:'serif',fontSize:17,fontWeight:'800',color:theme.ink},countBadge:{backgroundColor:theme.cream,borderRadius:999,paddingHorizontal:8,paddingVertical:4},countText:{fontSize:9,fontWeight:'900',color:theme.muted,textTransform:'uppercase'},subtitle:{fontSize:12,color:theme.muted,lineHeight:17,marginTop:5}});
