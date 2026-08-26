import { ReactNode, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { api, getSession } from '../api';
import { theme } from '../theme';

const items=[
  {href:'/home',label:'Dashboard',icon:'grid-outline'},
  {href:'/clients',label:'Clientes',icon:'people-outline'},
  {href:'/quotes',label:'Orçamentos',icon:'document-text-outline'},
  {href:'/projects',label:'Projetos',icon:'briefcase-outline'},
  {href:'/calculator',label:'Calculadora',icon:'calculator-outline'},
  {href:'/settings',label:'Configurações',icon:'settings-outline'},
] as const;

export function AppShell({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}){
  const path=usePathname();
  const {width}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const desktop=width>=900;
  const[account,setAccount]=useState<any>();
  useEffect(()=>{api('/account').then(setAccount).catch(()=>undefined)},[path]);
  const session=getSession()??{name:'Luana Ribeiro',email:'luana@luviepro.com.br',plan:'Pro'};
  const plan=account?.tenant?.plan??session.plan;
  const clients=account?.usage?.clients??0;
  const maxClients=account?.limit?.maxClients??50;
  const planPercent=maxClients<0?20:Math.min(100,clients/maxClients*100);
  const active=(href:string)=>path===href||path.startsWith(`${href}/`);
  const navigate=(href:string)=>router.replace(href as any);
  const navItems=items.map(item=><Pressable key={item.href} onPress={()=>navigate(item.href)} style={({pressed})=>[s.navItem,active(item.href)&&s.navItemActive,pressed&&s.pressed]}>
    <Ionicons name={item.icon as any} size={19} color={active(item.href)?theme.goldLight:'rgba(255,255,255,.65)'}/>
    <Text style={[s.navLabel,active(item.href)&&s.navLabelActive]}>{item.label}</Text>
    {active(item.href)&&<View style={s.activeDot}/>} 
  </Pressable>);
  return <SafeAreaView style={s.page} edges={['top','left','right']}><View style={s.layout}>
    {desktop&&<View style={s.sidebar}>
      <View style={s.logoRow}><View style={s.logoMark}><Text style={s.logoLetter}>L</Text></View><View><View style={s.brandRow}><Text style={s.brand}>LuviePro</Text><Text style={s.pro}>{String(plan).toUpperCase()}</Text></View><Text style={s.tagline}>Gestão para decoradores</Text></View></View>
      <View style={s.menu}>{navItems}</View>
      <View style={s.sideBottom}><Pressable onPress={()=>router.push('/plans')} style={s.planBox}><View style={s.planHead}><Text style={s.planTitle}>Plano {plan}</Text><Text style={s.planCount}>{clients} / {maxClients<0?'∞':maxClients}</Text></View><View style={s.planTrack}><View style={[s.planBar,{width:`${planPercent}%`}]} /></View><Text style={s.planHint}>clientes cadastrados · ver planos</Text></Pressable>
        <View style={s.userRow}><View style={s.avatar}><Text style={s.avatarText}>{session.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</Text></View><View style={s.userInfo}><Text numberOfLines={1} style={s.userName}>{session.name}</Text><Text numberOfLines={1} style={s.userEmail}>{session.email}</Text></View><Pressable onPress={()=>router.replace('/')}><Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,.55)"/></Pressable></View>
      </View>
    </View>}
    <View style={s.main}><View style={[s.topbar,!desktop&&s.topbarMobile]}>{!desktop&&<View style={s.mobileBrand}><View style={s.mobileMark}><Text style={s.mobileLetter}>L</Text></View><Text style={s.mobileLogo}>LuviePro</Text></View>}<Text style={[s.pageTitle,!desktop&&s.mobileTitle]}>{title}</Text><View style={s.action}>{action}</View></View>
      <ScrollView contentContainerStyle={[s.content,!desktop&&s.contentMobile,!desktop&&{paddingBottom:92+insets.bottom}]}>{children}</ScrollView>
      {!desktop&&<View style={[s.bottomNav,{minHeight:64+insets.bottom,paddingBottom:Math.max(5,insets.bottom)}]}>{items.filter(item=>['/home','/clients','/quotes','/projects','/settings'].includes(item.href)).map(item=><Pressable key={item.href} style={s.bottomItem} onPress={()=>navigate(item.href)}><Ionicons name={item.icon as any} size={21} color={active(item.href)?theme.gold:theme.muted}/><Text numberOfLines={1} style={[s.bottomLabel,active(item.href)&&s.bottomActive]}>{item.label==='Dashboard'?'Início':item.label}</Text></Pressable>)}</View>}
    </View>
  </View></SafeAreaView>;
}

export const shellStyles=StyleSheet.create({section:{fontSize:18,fontWeight:'700',color:theme.ink,marginVertical:14},empty:{backgroundColor:theme.white,borderRadius:16,padding:24,color:theme.muted,textAlign:'center',borderWidth:1,borderColor:theme.border},button:{backgroundColor:theme.gold,borderRadius:10,paddingHorizontal:14,paddingVertical:10,minHeight:40,justifyContent:'center'},buttonText:{fontSize:12,fontWeight:'800',color:theme.g900}});
const s=StyleSheet.create({page:{flex:1,backgroundColor:theme.cream},layout:{flex:1,flexDirection:'row'},sidebar:{width:256,backgroundColor:theme.g800,paddingTop:28},logoRow:{paddingHorizontal:22,flexDirection:'row',alignItems:'center',gap:11},logoMark:{width:38,height:38,borderRadius:11,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},logoLetter:{fontFamily:'serif',fontWeight:'800',fontSize:23,color:theme.g900},brandRow:{flexDirection:'row',alignItems:'center',gap:7},brand:{fontFamily:'serif',fontSize:21,fontWeight:'700',color:theme.white},pro:{fontSize:8,fontWeight:'900',letterSpacing:1,color:theme.gold,borderWidth:1,borderColor:theme.gold,borderRadius:4,paddingHorizontal:4,paddingVertical:2},tagline:{fontSize:9,color:'rgba(255,255,255,.45)',marginTop:2},menu:{marginTop:38,paddingHorizontal:12,gap:5},navItem:{height:46,borderRadius:10,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:13},navItemActive:{backgroundColor:'rgba(255,255,255,.10)'},navLabel:{fontSize:14,fontWeight:'600',color:'rgba(255,255,255,.65)'},navLabelActive:{color:theme.white},activeDot:{marginLeft:'auto',width:5,height:5,borderRadius:3,backgroundColor:theme.gold},pressed:{opacity:.72},sideBottom:{marginTop:'auto'},planBox:{marginHorizontal:16,marginBottom:18,padding:14,borderRadius:12,backgroundColor:'rgba(255,255,255,.06)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},planHead:{flexDirection:'row',justifyContent:'space-between'},planTitle:{fontSize:11,fontWeight:'700',color:theme.goldLight},planCount:{fontSize:10,color:'rgba(255,255,255,.5)'},planTrack:{height:4,backgroundColor:'rgba(255,255,255,.12)',borderRadius:2,marginTop:10},planBar:{height:4,width:'24%',borderRadius:2,backgroundColor:theme.gold},planHint:{fontSize:9,color:'rgba(255,255,255,.38)',marginTop:7},userRow:{borderTopWidth:1,borderTopColor:'rgba(255,255,255,.08)',padding:16,flexDirection:'row',alignItems:'center',gap:10},avatar:{width:34,height:34,borderRadius:17,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:11,fontWeight:'800',color:theme.goldLight},userInfo:{flex:1},userName:{color:theme.white,fontSize:11,fontWeight:'700'},userEmail:{color:'rgba(255,255,255,.4)',fontSize:8,marginTop:2},main:{flex:1,backgroundColor:theme.cream},topbar:{minHeight:78,paddingHorizontal:32,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:theme.border,backgroundColor:'rgba(255,255,255,.75)'},topbarMobile:{minHeight:62,paddingHorizontal:14},pageTitle:{fontFamily:'serif',fontSize:25,fontWeight:'700',color:theme.ink},mobileTitle:{display:'none'},action:{marginLeft:'auto',flexShrink:1},mobileBrand:{flexDirection:'row',alignItems:'center',gap:8,flexShrink:1},mobileMark:{width:30,height:30,borderRadius:8,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},mobileLetter:{fontFamily:'serif',fontWeight:'800',fontSize:18,color:theme.g900},mobileLogo:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink},content:{padding:32,paddingBottom:50,maxWidth:1280,width:'100%',alignSelf:'center'},contentMobile:{padding:16},bottomNav:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:theme.white,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},bottomItem:{alignItems:'center',justifyContent:'center',flex:1,minWidth:0,gap:3},bottomLabel:{fontSize:9,fontWeight:'600',color:theme.muted},bottomActive:{color:theme.green,fontWeight:'800'}});
