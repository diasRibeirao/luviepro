import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../i18n';
import { theme } from '../../theme';

type Option = readonly [string, string];

export function PlatformSearch({value,total,onChange,compact=false}:{value:string;total:number;onChange:(value:string)=>void;compact?:boolean}) {
  return <View style={[styles.toolbar,compact&&styles.toolbarCompact]}>
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={theme.muted}/>
      <TextInput value={value} onChangeText={onChange} placeholder="Buscar registros..." placeholderTextColor={theme.muted} style={styles.searchInput}/>
      {value?<Pressable onPress={()=>onChange('')}><Ionicons name="close-circle" size={18} color={theme.muted}/></Pressable>:null}
    </View>
    <Text style={[styles.count,compact&&styles.countCompact]}>{total} registro(s)</Text>
  </View>;
}

export function PlatformFilterGroup({label,value,onChange,values,compact=false}:{label:string;value:string;onChange:(value:string)=>void;values:readonly Option[];compact?:boolean}) {
  return <View style={[styles.filterGroup,compact&&styles.filterGroupCompact]}>
    <Text style={styles.filterLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
      {values.map(([key,text])=><Pressable key={key} onPress={()=>onChange(key)} style={[styles.filterChip,compact&&styles.filterChipCompact,value===key&&styles.filterChipOn]}><Text style={[styles.filterChipText,value===key&&styles.filterChipTextOn]}>{text}</Text></Pressable>)}
    </ScrollView>
  </View>;
}

export function PlatformFilterBar({children,compact=false}:{children:ReactNode;compact?:boolean}) {
  return <View style={[styles.filterBar,compact&&styles.filterBarCompact]}>{children}</View>;
}

const styles=StyleSheet.create({
  toolbar:{minHeight:60,backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:13,padding:10,flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},
  search:{height:40,flex:1,backgroundColor:'#F5F7F5',borderWidth:1,borderColor:theme.border,borderRadius:9,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12},
  searchInput:{flex:1,fontSize:12,color:theme.ink,outlineStyle:'none' as never},
  toolbarCompact:{minHeight:0,height:'auto',padding:8,gap:8},
  countCompact:{fontSize:9,minWidth:62,textAlign:'right'},
  count:{fontSize:10,fontWeight:'700',color:theme.muted},
  filterBar:{backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:13,padding:10,marginBottom:14,flexDirection:'row',flexWrap:'wrap',gap:12},
  filterBarCompact:{padding:8,gap:8,flexDirection:'column'},
  filterGroup:{minWidth:210,flex:1,gap:6},
  filterGroupCompact:{minWidth:0,width:'100%',flexGrow:0},
  filterLabel:{fontSize:8,fontWeight:'900',letterSpacing:.7,textTransform:'uppercase',color:theme.muted},
  filterOptions:{gap:6,paddingRight:8},
  filterChip:{borderWidth:1,borderColor:theme.border,borderRadius:16,paddingHorizontal:10,paddingVertical:6,backgroundColor:'#fff'},
  filterChipCompact:{paddingHorizontal:11,paddingVertical:7,minHeight:32,justifyContent:'center'},
  filterChipOn:{backgroundColor:theme.green2,borderColor:theme.green2},
  filterChipText:{fontSize:9,fontWeight:'700',color:theme.muted},
  filterChipTextOn:{color:'#fff'},
});
