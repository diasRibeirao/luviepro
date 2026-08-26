import { ReactNode } from 'react';
import { StyleSheet,View } from 'react-native';
import { Text } from '../i18n';
import { theme } from '../theme';

export function PageContext({eyebrow,title,description,meta,actions}:{eyebrow?:string;title:string;description?:string;meta?:ReactNode;actions?:ReactNode}){
  return <View style={s.box}><View style={s.copy}>{eyebrow&&<Text style={s.eyebrow}>{eyebrow}</Text>}<Text style={s.title}>{title}</Text>{description&&<Text style={s.description}>{description}</Text>}{meta&&<View style={s.meta}>{meta}</View>}</View>{actions&&<View style={s.actions}>{actions}</View>}</View>
}
const s=StyleSheet.create({box:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:18,flexDirection:'row',alignItems:'center',gap:18,marginBottom:16},copy:{flex:1,minWidth:0},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1,color:theme.gold,marginBottom:5},title:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink},description:{fontSize:12,lineHeight:15,color:theme.muted,marginTop:4,maxWidth:760},meta:{marginTop:10,flexDirection:'row',gap:8,flexWrap:'wrap'},actions:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}});
