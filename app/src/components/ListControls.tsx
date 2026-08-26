import { ReactNode,useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal,Pressable,StyleSheet,View } from 'react-native';
import { Text } from '../i18n';
import { theme } from '../theme';

export type SortOption={value:string;label:string};

export function SortMenu({value,options,onChange}:{value:string;options:SortOption[];onChange:(value:string)=>void}){
  const[open,setOpen]=useState(false);
  const current=options.find(option=>option.value===value)?.label??'Ordenar';
  return <>
    <Pressable accessibilityLabel="Ordenar resultados" onPress={()=>setOpen(true)} style={({pressed})=>[s.sortButton,pressed&&s.pressed]}>
      <Ionicons name="swap-vertical-outline" size={15} color={theme.green2}/><Text numberOfLines={1} style={s.sortText}>{current}</Text><Ionicons name="chevron-down" size={13} color={theme.muted}/>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setOpen(false)}>
      <Pressable style={s.backdrop} onPress={()=>setOpen(false)}>
        <Pressable style={s.menu} onPress={()=>{}}>
          <Text style={s.menuTitle}>Ordenar por</Text>
          {options.map(option=><Pressable key={option.value} onPress={()=>{onChange(option.value);setOpen(false)}} style={({pressed})=>[s.option,option.value===value&&s.optionOn,pressed&&s.pressed]}>
            <Text style={[s.optionText,option.value===value&&s.optionTextOn]}>{option.label}</Text>{option.value===value?<Ionicons name="checkmark" size={16} color={theme.green2}/>:null}
          </Pressable>)}
        </Pressable>
      </Pressable>
    </Modal>
  </>
}

export function Pagination({page,total,pageSize=10,onChange}:{page:number;total:number;pageSize?:number;onChange:(page:number)=>void}){
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(total<=pageSize)return null;
  const safePage=Math.min(Math.max(page,1),pages);
  const start=(safePage-1)*pageSize+1;const end=Math.min(total,safePage*pageSize);
  const numbers=pageNumbers(safePage,pages);
  return <View style={s.pagination}>
    <Text style={s.range}>{start}–{end} de {total}</Text>
    <View style={s.pageActions}>
      <Pressable disabled={safePage===1} onPress={()=>onChange(safePage-1)} style={({pressed})=>[s.pageButton,safePage===1&&s.disabled,pressed&&s.pressed]}><Ionicons name="chevron-back" size={14} color={theme.green2}/></Pressable>
      {numbers.map((value,index)=>value==='…'?<Text key={`dots-${index}`} style={s.dots}>…</Text>:<Pressable key={value} onPress={()=>onChange(Number(value))} style={({pressed})=>[s.pageButton,Number(value)===safePage&&s.pageOn,pressed&&s.pressed]}><Text style={[s.pageText,Number(value)===safePage&&s.pageTextOn]}>{value}</Text></Pressable>)}
      <Pressable disabled={safePage===pages} onPress={()=>onChange(safePage+1)} style={({pressed})=>[s.pageButton,safePage===pages&&s.disabled,pressed&&s.pressed]}><Ionicons name="chevron-forward" size={14} color={theme.green2}/></Pressable>
    </View>
  </View>
}

export type ActionItem={label:string;icon?:string;danger?:boolean;disabled?:boolean;onPress:()=>void};
export function ActionMenu({items}:{items:ActionItem[]}){
  const[open,setOpen]=useState(false);
  return <>
    <Pressable accessibilityLabel="Abrir ações" onPress={()=>setOpen(true)} style={({pressed})=>[s.more,pressed&&s.pressed]}><Ionicons name="ellipsis-horizontal" size={18} color={theme.green2}/></Pressable>
    <Modal visible={open} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setOpen(false)}>
      <Pressable style={s.backdrop} onPress={()=>setOpen(false)}>
        <Pressable style={s.actionSheet} onPress={()=>{}}>
          <Text style={s.menuTitle}>Ações</Text>
          {items.map((item,index)=><Pressable key={`${item.label}-${index}`} disabled={item.disabled} onPress={()=>{setOpen(false);item.onPress()}} style={({pressed})=>[s.actionItem,item.disabled&&s.disabled,pressed&&s.pressed]}>
            <Ionicons name={(item.icon??'chevron-forward-outline') as any} size={17} color={item.danger?theme.danger:theme.green2}/><Text style={[s.actionLabel,item.danger&&s.actionDanger]}>{item.label}</Text>
          </Pressable>)}
          <Pressable onPress={()=>setOpen(false)} style={s.close}><Text style={s.closeText}>Cancelar</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>
}

export function MobileCard({children}:{children:ReactNode}){return <View style={s.mobileCard}>{children}</View>}

export function paginate<T>(items:T[],page:number,pageSize=10){const safe=Math.max(1,page);return items.slice((safe-1)*pageSize,safe*pageSize)}

function pageNumbers(page:number,pages:number):(number|'…')[]{if(pages<=5)return Array.from({length:pages},(_,i)=>i+1);if(page<=3)return [1,2,3,4,'…',pages];if(page>=pages-2)return [1,'…',pages-3,pages-2,pages-1,pages];return [1,'…',page-1,page,page+1,'…',pages]}
const s=StyleSheet.create({sortButton:{height:36,maxWidth:185,paddingHorizontal:10,borderWidth:1,borderColor:theme.border,borderRadius:9,backgroundColor:theme.white,flexDirection:'row',alignItems:'center',gap:6},sortText:{flexShrink:1,fontSize:11,fontWeight:'800',color:theme.ink},backdrop:{flex:1,backgroundColor:'rgba(11,29,21,.34)',alignItems:'center',justifyContent:'center',padding:18},menu:{width:'100%',maxWidth:340,borderRadius:17,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,padding:12,shadowColor:'#000',shadowOpacity:.16,shadowRadius:26,shadowOffset:{width:0,height:12},elevation:15},menuTitle:{fontFamily:'serif',fontSize:15,fontWeight:'700',color:theme.ink,paddingHorizontal:7,paddingVertical:9},option:{minHeight:42,borderRadius:10,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},optionOn:{backgroundColor:theme.green50},optionText:{fontSize:12,fontWeight:'700',color:theme.muted},optionTextOn:{color:theme.green2},pagination:{minHeight:56,paddingHorizontal:14,paddingVertical:10,borderTopWidth:1,borderTopColor:theme.border,backgroundColor:'#FCFDFC',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},range:{fontSize:11,fontWeight:'700',color:theme.muted},pageActions:{flexDirection:'row',gap:5,alignItems:'center'},pageButton:{minWidth:30,height:30,paddingHorizontal:8,borderWidth:1,borderColor:theme.border,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:theme.white},pageOn:{backgroundColor:theme.green2,borderColor:theme.green2},pageText:{fontSize:11,fontWeight:'800',color:theme.green2},pageTextOn:{color:theme.white},dots:{paddingHorizontal:3,fontSize:12,color:theme.muted},disabled:{opacity:.38},pressed:{opacity:.72},more:{width:34,height:34,borderRadius:9,borderWidth:1,borderColor:theme.border,backgroundColor:theme.white,alignItems:'center',justifyContent:'center'},actionSheet:{width:'100%',maxWidth:360,borderRadius:18,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,padding:12,shadowColor:'#000',shadowOpacity:.18,shadowRadius:28,shadowOffset:{width:0,height:13},elevation:16},actionItem:{minHeight:45,borderRadius:10,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:10},actionLabel:{fontSize:12,fontWeight:'800',color:theme.ink},actionDanger:{color:theme.danger},close:{height:42,borderTopWidth:1,borderTopColor:theme.border,marginTop:5,alignItems:'center',justifyContent:'center'},closeText:{fontSize:11,fontWeight:'800',color:theme.muted},mobileCard:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:13,padding:13}});
