import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal,Platform,Pressable,StyleSheet,View} from 'react-native';
import {useState} from 'react';
import {Text} from '../../i18n';
import {theme} from '../../theme';
import type {PlatformTab} from './contracts';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export const PLATFORM_TABS=[
 {key:'overview',icon:'speedometer-outline',label:'Visão geral',subtitle:'Indicadores e saúde geral da operação'},
 {key:'companies',icon:'business-outline',label:'Empresas',subtitle:'Contas, planos e situação das empresas'},
 {key:'users',icon:'people-outline',label:'Usuários',subtitle:'Acessos e perfis de todos os clientes'},
 {key:'maintenance',icon:'construct-outline',label:'Manutenção',subtitle:'Usuários Master e manutenção administrativa'},
 {key:'plans',icon:'layers-outline',label:'Planos',subtitle:'Preços e limites comerciais'},
 {key:'subs',icon:'repeat-outline',label:'Assinaturas',subtitle:'Ciclos contratados e vencimentos'},
 {key:'payments',icon:'card-outline',label:'Pagamentos',subtitle:'Conciliação financeira do Mercado Pago'},
 {key:'email',icon:'mail-outline',label:'E-mail e SMTP',subtitle:'Infraestrutura global de envio de e-mails'},
] as const satisfies ReadonlyArray<{key:PlatformTab;icon:string;label:string;subtitle:string}>;

const MOBILE_PRIMARY:PlatformTab[]=['overview','companies','users','maintenance'];

export function PlatformSidebar({compact,active,onSelect,onLogout}:{compact:boolean;active:PlatformTab;onSelect:(tab:PlatformTab)=>void;onLogout:()=>void|Promise<void>}) {
 const insets=useSafeAreaInsets();
 const[moreOpen,setMoreOpen]=useState(false);

 function select(tab:PlatformTab){
  setMoreOpen(false);
  onSelect(tab);
 }

 async function signOut(){
  setMoreOpen(false);
  await onLogout();
 }

 if(compact){
  const primary=PLATFORM_TABS.filter(item=>MOBILE_PRIMARY.includes(item.key));
  const secondary=PLATFORM_TABS.filter(item=>!MOBILE_PRIMARY.includes(item.key));
  const secondaryActive=secondary.some(item=>item.key===active);

  return <>
   <View
    style={[
     styles.bottomBar,
     Platform.OS==='web'&&webBottomBar,
     {paddingBottom:Platform.OS==='web'?Math.max(6,insets.bottom):Math.max(6,insets.bottom)}
    ]}
   >
    <View style={styles.bottomContent}>
     {primary.map(item=><Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{selected:active===item.key}}
      key={item.key}
      onPress={()=>select(item.key)}
      style={[styles.bottomItem,active===item.key&&styles.bottomItemOn]}
     >
      <Ionicons name={item.icon as never} size={20} color={active===item.key?theme.green2:theme.muted}/>
      <Text numberOfLines={1} style={[styles.bottomText,active===item.key&&styles.bottomTextOn]}>{item.label}</Text>
     </Pressable>)}
     <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mais opções"
      accessibilityState={{expanded:moreOpen,selected:secondaryActive}}
      onPress={()=>setMoreOpen(true)}
      style={[styles.bottomItem,(moreOpen||secondaryActive)&&styles.bottomItemOn]}
     >
      <Ionicons name="grid-outline" size={20} color={(moreOpen||secondaryActive)?theme.green2:theme.muted}/>
      <Text numberOfLines={1} style={[styles.bottomText,(moreOpen||secondaryActive)&&styles.bottomTextOn]}>Mais</Text>
     </Pressable>
    </View>
   </View>

   <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={()=>setMoreOpen(false)}>
    <Pressable style={styles.overlay} onPress={()=>setMoreOpen(false)}>
     <Pressable onPress={()=>undefined} style={[styles.sheet,{paddingBottom:Math.max(18,insets.bottom+10)}]}>
      <View style={styles.handle}/>
      <View style={styles.sheetHeader}>
       <View>
        <Text style={styles.sheetTitle}>Menu</Text>
        <Text style={styles.sheetSubtitle}>Administração da plataforma</Text>
       </View>
       <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={()=>setMoreOpen(false)} style={styles.closeButton}>
        <Ionicons name="close" size={21} color={theme.muted}/>
       </Pressable>
      </View>

      <View style={styles.masterCard}>
       <View style={styles.masterAvatar}><Text style={styles.masterInitial}>LM</Text></View>
       <View style={styles.masterInfo}>
        <Text numberOfLines={1} style={styles.masterName}>LuviePro Master</Text>
        <Text numberOfLines={1} style={styles.masterRole}>Administrador da plataforma</Text>
       </View>
      </View>

      <View style={styles.menuGrid}>
       {secondary.map(item=><Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{selected:active===item.key}}
        key={item.key}
        onPress={()=>select(item.key)}
        style={({pressed})=>[styles.menuItem,active===item.key&&styles.menuItemOn,pressed&&styles.pressed]}
       >
        <View style={[styles.menuIcon,active===item.key&&styles.menuIconOn]}>
         <Ionicons name={item.icon as never} size={20} color={active===item.key?theme.green2:theme.muted}/>
        </View>
        <Text numberOfLines={2} style={[styles.menuItemText,active===item.key&&styles.menuItemTextOn]}>{item.label}</Text>
       </Pressable>)}
      </View>

      <View style={styles.divider}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={()=>void signOut()} style={({pressed})=>[styles.logout,pressed&&styles.logoutPressed]}>
       <Ionicons name="log-out-outline" size={20} color={theme.danger}/>
       <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
      <Text style={styles.version}>LuviePro · Administração SaaS</Text>
     </Pressable>
    </Pressable>
   </Modal>
  </>;
 }

 return <View style={styles.side}>
  <View style={styles.logo}><View style={styles.logoMark}><Text style={styles.logoLetter}>L</Text></View><View><Text style={styles.brand}>LuviePro</Text><Text style={styles.brandSub}>ADMINISTRAÇÃO SAAS</Text></View></View>
  <Text style={styles.menuLabel}>PLATAFORMA</Text>
  {PLATFORM_TABS.map(item=><Pressable accessibilityRole="button" accessibilityState={{selected:active===item.key}} key={item.key} onPress={()=>onSelect(item.key)} style={[styles.nav,active===item.key&&styles.navOn]}><Ionicons name={item.icon as never} size={20} color={active===item.key?theme.gold:'#b9c8c0'}/><Text style={[styles.navText,active===item.key&&styles.navTextOn]}>{item.label}</Text></Pressable>)}
  <View style={styles.fill}/>
  <View style={styles.onlineRow}><View style={styles.online}/><Text style={styles.onlineText}>Sistemas operacionais</Text></View>
  <Pressable accessibilityRole="button" accessibilityLabel="Sair da plataforma" onPress={onLogout} style={styles.nav}><Ionicons name="log-out-outline" size={20} color="#b9c8c0"/><Text style={styles.navText}>Sair</Text></Pressable>
 </View>;
}

const webBottomBar={position:'fixed',left:0,right:0,bottom:0,width:'100%'} as const as any;

const styles=StyleSheet.create({
 bottomBar:{position:'absolute',left:0,right:0,bottom:0,zIndex:100,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:theme.border,shadowColor:'#000',shadowOpacity:.08,shadowRadius:14,shadowOffset:{width:0,height:-4},elevation:30},
 bottomContent:{width:'100%',minHeight:62,paddingHorizontal:6,paddingTop:6,flexDirection:'row',alignItems:'flex-start'},
 bottomItem:{flex:1,minWidth:0,minHeight:52,paddingHorizontal:4,borderRadius:10,alignItems:'center',justifyContent:'center',gap:3},
 bottomItemOn:{backgroundColor:theme.green50},
 bottomText:{maxWidth:'100%',fontSize:9,fontWeight:'700',color:theme.muted,textAlign:'center'},
 bottomTextOn:{color:theme.green2,fontWeight:'900'},
 overlay:{flex:1,backgroundColor:'rgba(8,20,14,.28)',justifyContent:'flex-end'},
 sheet:{width:'100%',maxHeight:'82%',backgroundColor:'#fff',borderTopLeftRadius:22,borderTopRightRadius:22,paddingHorizontal:16,paddingTop:9,shadowColor:'#000',shadowOpacity:.14,shadowRadius:20,shadowOffset:{width:0,height:-6},elevation:40},
 handle:{width:38,height:4,borderRadius:2,backgroundColor:'#D7DEDA',alignSelf:'center',marginBottom:11},
 sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},
 sheetTitle:{fontFamily:'serif',fontSize:23,fontWeight:'800',color:theme.ink},
 sheetSubtitle:{fontSize:11,color:theme.muted,marginTop:2},
 closeButton:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#F4F7F5'},
 masterCard:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:theme.border,borderRadius:14,backgroundColor:'#FAFCFB',marginBottom:12},
 masterAvatar:{width:38,height:38,borderRadius:19,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},
 masterInitial:{fontSize:12,fontWeight:'900',color:theme.gold},
 masterInfo:{flex:1,minWidth:0},
 masterName:{fontSize:12,fontWeight:'900',color:theme.ink},
 masterRole:{fontSize:10,color:theme.muted,marginTop:2},
 menuGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 menuItem:{width:'48.5%',minHeight:76,borderRadius:13,borderWidth:1,borderColor:theme.border,backgroundColor:'#fff',padding:10,justifyContent:'center',gap:7},
 menuItemOn:{borderColor:'#BCD5C9',backgroundColor:theme.green50},
 menuIcon:{width:31,height:31,borderRadius:9,backgroundColor:'#F3F6F4',alignItems:'center',justifyContent:'center'},
 menuIconOn:{backgroundColor:'#E4F1EA'},
 menuItemText:{fontSize:11,fontWeight:'800',color:theme.ink},
 menuItemTextOn:{color:theme.green2},
 divider:{height:1,backgroundColor:theme.border,marginVertical:13},
 logout:{minHeight:46,borderRadius:11,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:9},
 logoutPressed:{backgroundColor:'#FBECEC'},
 logoutText:{fontSize:12,fontWeight:'900',color:theme.danger},
 version:{fontSize:9,fontWeight:'700',color:'#9AA8A1',textAlign:'center',marginTop:8},
 pressed:{opacity:.7},
 side:{width:250,backgroundColor:'#112F24',padding:18},
 sideSmall:{width:72,paddingHorizontal:10},
 logo:{height:70,flexDirection:'row',alignItems:'center',gap:11},
 logoMark:{width:40,height:40,borderRadius:11,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},
 logoLetter:{fontFamily:'serif',fontSize:25,fontWeight:'900',color:'#112F24'},
 brand:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:'#fff'},
 brandSub:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:'#86A397'},
 menuLabel:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#708B7F',marginVertical:14},
 nav:{height:46,borderRadius:10,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:13,marginBottom:4},
 navOn:{backgroundColor:'rgba(255,255,255,.11)'},
 navText:{fontSize:12,fontWeight:'700',color:'#B9C8C0'},
 navTextOn:{color:'#fff'},
 fill:{flex:1},
 onlineRow:{flexDirection:'row',alignItems:'center',gap:8,padding:13,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.1)'},
 online:{width:7,height:7,borderRadius:7,backgroundColor:'#63D38C'},
 onlineText:{fontSize:10,color:'#B9C8C0'}
});
