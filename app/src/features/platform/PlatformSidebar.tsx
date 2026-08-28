import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../i18n';
import { theme } from '../../theme';
import type { PlatformTab } from './contracts';

export const PLATFORM_TABS=[
 {key:'overview',icon:'speedometer-outline',label:'Visão geral',subtitle:'Indicadores e saúde geral da operação'},
 {key:'companies',icon:'business-outline',label:'Empresas',subtitle:'Contas, planos e situação das empresas'},
 {key:'users',icon:'people-outline',label:'Usuários',subtitle:'Acessos e perfis de todos os clientes'},
 {key:'plans',icon:'layers-outline',label:'Planos',subtitle:'Preços e limites comerciais'},
 {key:'subs',icon:'repeat-outline',label:'Assinaturas',subtitle:'Ciclos contratados e vencimentos'},
 {key:'payments',icon:'card-outline',label:'Pagamentos',subtitle:'Conciliação financeira do Mercado Pago'},
] as const satisfies ReadonlyArray<{key:PlatformTab;icon:string;label:string;subtitle:string}>;

export function PlatformSidebar({compact,active,onSelect,onLogout}:{compact:boolean;active:PlatformTab;onSelect:(tab:PlatformTab)=>void;onLogout:()=>void|Promise<void>}) {
 return <View style={[styles.side,compact&&styles.sideSmall]}><View style={styles.logo}><View style={styles.logoMark}><Text style={styles.logoLetter}>L</Text></View>{!compact&&<View><Text style={styles.brand}>LuviePro</Text><Text style={styles.brandSub}>ADMINISTRAÇÃO SAAS</Text></View>}</View>{!compact&&<Text style={styles.menuLabel}>PLATAFORMA</Text>}{PLATFORM_TABS.map(item=><Pressable accessibilityRole="button" accessibilityState={{selected:active===item.key}} key={item.key} onPress={()=>onSelect(item.key)} style={[styles.nav,active===item.key&&styles.navOn]}><Ionicons name={item.icon as never} size={20} color={active===item.key?theme.gold:'#b9c8c0'}/>{!compact&&<Text style={[styles.navText,active===item.key&&styles.navTextOn]}>{item.label}</Text>}</Pressable>)}<View style={styles.fill}/><View style={styles.onlineRow}><View style={styles.online}/>{!compact&&<Text style={styles.onlineText}>Sistemas operacionais</Text>}</View><Pressable accessibilityRole="button" onPress={onLogout} style={styles.nav}><Ionicons name="log-out-outline" size={20} color="#b9c8c0"/>{!compact&&<Text style={styles.navText}>Sair</Text>}</Pressable></View>;
}

const styles=StyleSheet.create({side:{width:250,backgroundColor:'#112F24',padding:18},sideSmall:{width:72,paddingHorizontal:10},logo:{height:70,flexDirection:'row',alignItems:'center',gap:11},logoMark:{width:40,height:40,borderRadius:11,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},logoLetter:{fontFamily:'serif',fontSize:25,fontWeight:'900',color:'#112F24'},brand:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:'#fff'},brandSub:{fontSize:8,fontWeight:'900',letterSpacing:1.1,color:'#86A397'},menuLabel:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#708B7F',marginVertical:14},nav:{height:46,borderRadius:10,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:13,marginBottom:4},navOn:{backgroundColor:'rgba(255,255,255,.11)'},navText:{fontSize:12,fontWeight:'700',color:'#B9C8C0'},navTextOn:{color:'#fff'},fill:{flex:1},onlineRow:{flexDirection:'row',alignItems:'center',gap:8,padding:13,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.1)'},online:{width:7,height:7,borderRadius:7,backgroundColor:'#63D38C'},onlineText:{fontSize:10,color:'#B9C8C0'}});
