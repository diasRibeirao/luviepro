import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable,StyleSheet,View } from 'react-native';
import { TextInput } from '../i18n';
import { theme } from '../theme';

export function SearchField({value,onChangeText,placeholder}:{value:string;onChangeText:(value:string)=>void;placeholder:string}){
  const[focused,setFocused]=useState(false);
  return <View style={[s.search,focused&&s.focused]}><Ionicons name="search-outline" size={17} color={focused?theme.green2:theme.muted}/><TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={s.input}/>{value?<Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={()=>onChangeText('')} style={({pressed})=>[s.clear,pressed&&s.pressed]}><Ionicons name="close-circle" size={18} color={theme.muted}/></Pressable>:null}</View>
}
const s=StyleSheet.create({search:{flex:1,height:40,borderWidth:1,borderColor:theme.border,borderRadius:10,flexDirection:'row',alignItems:'center',gap:8,paddingLeft:11,paddingRight:5,backgroundColor:theme.cream},focused:{borderColor:theme.green2,backgroundColor:theme.white},input:{flex:1,fontSize:13,color:theme.ink,paddingVertical:8},clear:{width:32,height:32,alignItems:'center',justifyContent:'center'},pressed:{opacity:.65}});
