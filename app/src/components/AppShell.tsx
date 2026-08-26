import { ReactNode, useEffect, useState } from 'react';
import { Feather,Ionicons } from '@expo/vector-icons';
import { Platform,Pressable,ScrollView,StyleSheet,useWindowDimensions,View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { api, getSession, logout } from '../api';
import { theme } from '../theme';
import { localeOptions, useI18n, Text } from '../i18n';

const items=[
  {href:'/home',key:'dashboard',icon:'grid-outline'},
  {href:'/clients',key:'clients',icon:'people-outline'},
  {href:'/services',key:'services',icon:'construct-outline'},
  {href:'/quotes',key:'quotes',icon:'document-text-outline'},
  {href:'/projects',key:'projects',icon:'briefcase-outline'},
  {href:'/calendar',key:'calendar',icon:'calendar-outline'},
  {href:'/notifications',key:'notifications',icon:'notifications-outline'},
  {href:'/calculator',key:'calculator',icon:'calculator-outline'},
  {href:'/settings',key:'settings',icon:'settings-outline'},
] as const;

export function AppShell({title,subtitle,action,children}:{title:string;subtitle?:string;action?:ReactNode;children:ReactNode}){
  const path=usePathname();
  const {locale,setLocale,t}=useI18n();
  const {width}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const desktop=width>=900;
  const[account,setAccount]=useState<any>();
  const[unread,setUnread]=useState(0);
  const[collapsed,setCollapsed]=useState(false);
  useEffect(()=>{if(Platform.OS==='web'&&typeof localStorage!=='undefined')setCollapsed(localStorage.getItem('luviepro.sidebar.collapsed')==='1')},[]);
  const toggleSidebar=()=>setCollapsed(v=>{const next=!v;if(Platform.OS==='web'&&typeof localStorage!=='undefined')localStorage.setItem('luviepro.sidebar.collapsed',next?'1':'0');return next});
  useEffect(()=>{api('/account').then(setAccount).catch(()=>undefined);api('/notifications/unread-count').then(v=>setUnread(v.count||0)).catch(()=>undefined)},[path]);
  const session=getSession()??{name:'Luana Ribeiro',email:'luana@luviepro.com.br',plan:'Pro'};
  const plan=account?.tenant?.plan??session.plan;
  const clients=account?.usage?.clients??0;
  const maxClients=account?.limit?.maxClients??50;
  const planPercent=maxClients<0?20:Math.min(100,clients/maxClients*100);
  const active=(href:string)=>path===href||path.startsWith(`${href}/`);
  const navigate=(href:string)=>router.replace(href as any);
  const activeItem=items.find(item=>active(item.href));
  const nested=!!activeItem&&path!==activeItem.href;
  const detailLabel=path.includes('/proposal')?t('proposal'):path.includes('/public')?t('sharing'):nested?t('detail'):undefined;
  const navItems=items.map(item=><Pressable key={item.href} accessibilityRole="button" accessibilityLabel={t(item.key as any)} accessibilityState={{selected:active(item.href)}} onPress={()=>navigate(item.href)} style={({pressed})=>[s.navItem,active(item.href)&&s.navItemActive,pressed&&s.pressed]}>
    <Ionicons name={item.icon as any} size={19} color={active(item.href)?theme.goldLight:'rgba(255,255,255,.65)'}/>
    {!collapsed&&<Text style={[s.navLabel,active(item.href)&&s.navLabelActive]}>{t(item.key as any)}</Text>}
    {active(item.href)&&<View style={s.activeDot}/>} 
  </Pressable>);
  return <SafeAreaView style={s.page} edges={['top','left','right']}><View style={s.layout}>
    {desktop&&<View style={[s.sidebar,collapsed&&s.sidebarCollapsed]}>
      <View style={[s.logoRow,collapsed&&s.logoRowCollapsed]}><View style={s.logoMark}><Text style={s.logoLetter}>L</Text></View>{!collapsed&&<View><View style={s.brandRow}><Text style={s.brand}>LuviePro</Text><Text style={s.pro}>{String(plan).toUpperCase()}</Text></View><Text style={s.tagline}>Gestão para decoradores</Text></View>}</View>
      <View style={[s.menu,collapsed&&s.menuCollapsed]}>{navItems}</View>
      <View style={s.sideBottom}>{!collapsed&&<Pressable accessibilityRole="button" accessibilityLabel={`Plano ${plan}. ${clients} de ${maxClients<0?'clientes ilimitados':maxClients+' clientes'} utilizados`} accessibilityHint="Abre a comparação de planos" onPress={()=>router.push('/plans')} style={s.planBox}><View style={s.planHead}><Text style={s.planTitle}>Plano {plan}</Text><Text style={s.planCount}>{clients} / {maxClients<0?'∞':maxClients}</Text></View><View style={s.planTrack}><View style={[s.planBar,{width:`${planPercent}%`}]} /></View><Text style={s.planHint}>clientes cadastrados · ver planos</Text></Pressable>}
        <View style={[s.userRow,collapsed&&s.userRowCollapsed]}><View style={s.avatar}><Text style={s.avatarText}>{session.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</Text></View>{!collapsed&&<View style={s.userInfo}><Text numberOfLines={1} style={s.userName}>{session.name}</Text><Text numberOfLines={1} style={s.userEmail}>{session.email}</Text></View>}<Pressable accessibilityRole="button" accessibilityLabel={t('logout')} onPress={async()=>{await logout();router.replace('/')}}><Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,.55)"/></Pressable></View>
      </View>
    </View>}
    <View style={s.main}><View style={[s.topbar,!desktop&&s.topbarMobile]}>{desktop&&<Pressable accessibilityRole="button" accessibilityLabel={collapsed?t('expand'):t('collapse')} accessibilityHint={collapsed?t('expand'):t('collapse')} onPress={toggleSidebar} style={({pressed})=>[s.topbarCollapse,pressed&&s.topbarCollapsePressed]}><Feather name={collapsed?'chevrons-right':'chevrons-left'} size={22} color={theme.green}/></Pressable>}{!desktop&&<View style={s.mobileBrand}><View style={s.mobileMark}><Text style={s.mobileLetter}>L</Text></View><Text style={s.mobileLogo}>LuviePro</Text></View>}{desktop&&<View style={s.heading}><View style={s.crumbs}><Text style={s.crumbMuted}>{activeItem?t(activeItem.key as any):title}</Text>{detailLabel&&<><Ionicons name="chevron-forward" size={11} color={theme.muted}/><Text style={s.crumbCurrent}>{detailLabel}</Text></>}</View><Text style={s.pageTitle}>{title}</Text>{subtitle&&<Text style={s.pageSubtitle}>{subtitle}</Text>}</View>}{desktop&&<View style={s.langSwitch} accessibilityRole="radiogroup">{localeOptions.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${t('language')} ${label}`} accessibilityState={{selected:locale===value}} onPress={()=>setLocale(value)} style={[s.langBtn,locale===value&&s.langBtnActive]}><Text style={[s.langText,locale===value&&s.langTextActive]}>{label}</Text></Pressable>)}</View>}<View style={s.action}>{action}</View></View>
      <ScrollView contentContainerStyle={[s.content,!desktop&&s.contentMobile,!desktop&&{paddingBottom:92+insets.bottom}]}>{!desktop&&<View style={s.mobilePageHeader}><View style={s.mobileHeading}><Text style={s.mobilePageTitle}>{title}</Text>{subtitle&&<Text style={s.mobilePageSubtitle}>{subtitle}</Text>}</View>{action&&<View style={s.mobilePageAction}>{action}</View>}</View>}{children}</ScrollView>
      {!desktop&&<View style={[s.bottomNav,{minHeight:64+insets.bottom,paddingBottom:Math.max(5,insets.bottom)}]}>{items.filter(item=>['/home','/clients','/quotes','/calendar','/projects'].includes(item.href)).map(item=><Pressable key={item.href} accessibilityRole="button" accessibilityLabel={t(item.key as any)} accessibilityState={{selected:active(item.href)}} style={s.bottomItem} onPress={()=>navigate(item.href)}><Ionicons name={item.icon as any} size={21} color={active(item.href)?theme.gold:theme.muted}/><Text numberOfLines={1} style={[s.bottomLabel,active(item.href)&&s.bottomActive]}>{item.key==='dashboard'?t('home'):t(item.key as any)}</Text></Pressable>)}</View>}
    </View>
  </View></SafeAreaView>;
}

export const shellStyles=StyleSheet.create({section:{fontSize:18,fontWeight:'700',color:theme.ink,marginVertical:14},empty:{backgroundColor:theme.white,borderRadius:16,padding:24,color:theme.muted,textAlign:'center',borderWidth:1,borderColor:theme.border},button:{backgroundColor:theme.gold,borderRadius:10,paddingHorizontal:14,paddingVertical:10,minHeight:40,justifyContent:'center'},buttonText:{fontSize:14,fontWeight:'800',color:theme.g900}});
const s=StyleSheet.create({page:{flex:1,backgroundColor:theme.cream},layout:{flex:1,flexDirection:'row'},mobileBellWrap:{position:'absolute',right:12,top:10,zIndex:4},mobileBell:{width:42,height:42,borderRadius:21,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},badge:{position:'absolute',right:0,top:0,minWidth:17,height:17,borderRadius:9,backgroundColor:theme.danger,alignItems:'center',justifyContent:'center',paddingHorizontal:3},badgeText:{fontSize:9,fontWeight:'900',color:theme.white},sidebar:{width:260,backgroundColor:theme.g800,paddingTop:28},sidebarCollapsed:{width:76},logoRow:{paddingHorizontal:22,flexDirection:'row',alignItems:'center',gap:11},logoRowCollapsed:{paddingHorizontal:19},logoMark:{width:38,height:38,borderRadius:11,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},logoLetter:{fontFamily:'serif',fontWeight:'800',fontSize:23,color:theme.g900},brandRow:{flexDirection:'row',alignItems:'center',gap:7},brand:{fontFamily:'serif',fontSize:21,fontWeight:'700',color:theme.white},pro:{fontSize:11,fontWeight:'900',letterSpacing:1,color:theme.gold,borderWidth:1,borderColor:theme.gold,borderRadius:4,paddingHorizontal:4,paddingVertical:2},tagline:{fontSize:13,color:'rgba(255,255,255,.45)',marginTop:2},menu:{marginTop:34,paddingHorizontal:12,gap:5},menuCollapsed:{paddingHorizontal:9},navItem:{height:48,borderRadius:10,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:13},navItemActive:{backgroundColor:'rgba(255,255,255,.10)'},navLabel:{fontSize:14,fontWeight:'600',color:'rgba(255,255,255,.65)'},navLabelActive:{color:theme.white},activeDot:{marginLeft:'auto',width:5,height:5,borderRadius:3,backgroundColor:theme.gold},pressed:{opacity:.72},sideBottom:{marginTop:'auto'},planBox:{marginHorizontal:16,marginBottom:18,padding:14,borderRadius:12,backgroundColor:'rgba(255,255,255,.06)',borderWidth:1,borderColor:'rgba(255,255,255,.08)'},planHead:{flexDirection:'row',justifyContent:'space-between'},planTitle:{fontSize:14,fontWeight:'700',color:theme.goldLight},planCount:{fontSize:13,color:'rgba(255,255,255,.5)'},planTrack:{height:4,backgroundColor:'rgba(255,255,255,.12)',borderRadius:2,marginTop:10},planBar:{height:4,width:'24%',borderRadius:2,backgroundColor:theme.gold},planHint:{fontSize:13,color:'rgba(255,255,255,.38)',marginTop:7},userRowCollapsed:{justifyContent:'center',paddingHorizontal:8},userRow:{borderTopWidth:1,borderTopColor:'rgba(255,255,255,.08)',padding:16,flexDirection:'row',alignItems:'center',gap:10},avatar:{width:34,height:34,borderRadius:17,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:13,fontWeight:'800',color:theme.goldLight},userInfo:{flex:1},userName:{color:theme.white,fontSize:13,fontWeight:'700'},userEmail:{color:'rgba(255,255,255,.4)',fontSize:13,marginTop:2},main:{flex:1,backgroundColor:theme.cream},topbar:{minHeight:90,paddingHorizontal:28,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:theme.border,backgroundColor:theme.white},topbarCollapse:{width:44,height:44,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:16,borderWidth:1,borderColor:theme.border,backgroundColor:theme.white},topbarCollapsePressed:{backgroundColor:theme.green50},topbarMobile:{minHeight:62,paddingHorizontal:14},heading:{flex:1,minWidth:0,paddingVertical:13},crumbs:{flexDirection:'row',alignItems:'center',gap:4,minHeight:14,marginBottom:3},crumbMuted:{fontSize:13,fontWeight:'700',color:theme.muted},crumbCurrent:{fontSize:13,fontWeight:'800',color:theme.green2},pageTitle:{fontFamily:'serif',fontSize:27,fontWeight:'700',color:theme.ink},pageSubtitle:{fontSize:13,color:theme.muted,marginTop:3},mobileTitle:{display:'none'},langSwitch:{flexDirection:'row',borderWidth:1,borderColor:theme.border,borderRadius:9,padding:2,marginRight:12},langBtn:{minWidth:34,height:30,borderRadius:7,alignItems:'center',justifyContent:'center'},langBtnActive:{backgroundColor:theme.green50},langText:{fontSize:13,fontWeight:'800',color:theme.muted},langTextActive:{color:theme.green},action:{marginLeft:0,flexShrink:1},mobileBrand:{flexDirection:'row',alignItems:'center',gap:8,flexShrink:1},mobileMark:{width:30,height:30,borderRadius:8,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},mobileLetter:{fontFamily:'serif',fontWeight:'800',fontSize:18,color:theme.g900},mobileLogo:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink},content:{paddingHorizontal:36,paddingTop:30,paddingBottom:56,maxWidth:1540,width:'100%',alignSelf:'center'},contentMobile:{paddingHorizontal:16,paddingTop:18},bottomNav:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:theme.white,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},bottomItem:{alignItems:'center',justifyContent:'center',flex:1,minWidth:0,gap:3},bottomLabel:{fontSize:13,fontWeight:'600',color:theme.muted},bottomActive:{color:theme.green,fontWeight:'800'}});

