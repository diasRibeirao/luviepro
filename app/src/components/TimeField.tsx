import {useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Text,TextInput} from '../i18n';
import {theme} from '../theme';

type Props={label:string;value:string;onChange:(value:string)=>void;minTime?:string};
const pad=(value:number)=>String(value).padStart(2,'0');

export function TimeField({label,value,onChange,minTime}:Props){
 const parsed=useMemo(()=>{const match=/^(\d{2}):(\d{2})$/.exec(value);return match?{hour:Number(match[1]),minute:Number(match[2])}:{hour:9,minute:0}},[value]);
 const[open,setOpen]=useState(false),[hour,setHour]=useState(parsed.hour),[minute,setMinute]=useState(parsed.minute);
 const mask=(text:string)=>{const digits=text.replace(/\D/g,'').slice(0,4);return digits.length>2?`${digits.slice(0,2)}:${digits.slice(2)}`:digits};
 const openPicker=()=>{setHour(parsed.hour);setMinute(parsed.minute);setOpen(true)};
 const selected=`${pad(hour)}:${pad(minute)}`;
 const invalid=!!minTime&&selected<=minTime;
 return <View style={s.wrap}><Text style={s.label}>{label}</Text><View style={s.fieldRow}>
  <TextInput value={value} onChangeText={text=>onChange(mask(text))} placeholder="HH:MM" keyboardType="number-pad" maxLength={5} style={s.input}/>
  <Pressable accessibilityLabel={`Selecionar ${label.toLowerCase()}`} onPress={openPicker} style={s.clockButton}><Ionicons name="time-outline" size={20} color={theme.green2}/></Pressable>
 </View><Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><Pressable style={s.overlay} onPress={()=>setOpen(false)}><Pressable style={s.dialog} onPress={()=>{}}>
  <View style={s.head}><View><Text style={s.title}>{label}</Text><Text style={s.subtitle}>Selecione a hora e os minutos</Text></View><Pressable onPress={()=>setOpen(false)} style={s.close}><Ionicons name="close" size={19} color={theme.muted}/></Pressable></View>
  <View style={s.columns}><PickerColumn title="Hora" count={24} selected={hour} onSelect={setHour}/><Text style={s.separator}>:</Text><PickerColumn title="Minuto" count={60} selected={minute} onSelect={setMinute}/></View>
  {invalid?<Text style={s.error}>Escolha um horário posterior a {minTime}.</Text>:null}
  <View style={s.footer}><Pressable onPress={()=>setOpen(false)} style={s.cancel}><Text style={s.cancelText}>Cancelar</Text></Pressable><Pressable disabled={invalid} onPress={()=>{onChange(selected);setOpen(false)}} style={[s.confirm,invalid&&s.disabled]}><Text style={s.confirmText}>Confirmar</Text></Pressable></View>
 </Pressable></Pressable></Modal></View>;
}

function PickerColumn({title,count,selected,onSelect}:{title:string;count:number;selected:number;onSelect:(value:number)=>void}){return <View style={s.column}><Text style={s.columnTitle}>{title}</Text><ScrollView style={s.scroll} contentContainerStyle={s.grid}>{Array.from({length:count},(_,item)=><Pressable key={item} onPress={()=>onSelect(item)} style={[s.option,selected===item&&s.optionOn]}><Text style={[s.optionText,selected===item&&s.optionTextOn]}>{pad(item)}</Text></Pressable>)}</ScrollView></View>}

const s=StyleSheet.create({wrap:{flex:1,gap:6,minWidth:0},label:{fontSize:11,fontWeight:'900',color:theme.muted},fieldRow:{height:44,flexDirection:'row',alignItems:'center',gap:8,minWidth:0},input:{flex:1,minWidth:0,height:44,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,color:theme.ink,backgroundColor:theme.white},clockButton:{width:44,height:44,flexShrink:0,borderWidth:1,borderColor:theme.border,borderRadius:10,backgroundColor:theme.white,alignItems:'center',justifyContent:'center'},overlay:{flex:1,backgroundColor:'rgba(10,24,17,.58)',alignItems:'center',justifyContent:'center',padding:20},dialog:{width:'100%',maxWidth:430,maxHeight:'82%',backgroundColor:theme.white,borderRadius:18,overflow:'hidden'},head:{padding:18,borderBottomWidth:1,borderBottomColor:theme.border,flexDirection:'row',alignItems:'center'},title:{fontFamily:'serif',fontSize:20,fontWeight:'800',color:theme.ink},subtitle:{fontSize:11,color:theme.muted,marginTop:3},close:{marginLeft:'auto',width:34,height:34,borderRadius:17,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},columns:{padding:18,flexDirection:'row',alignItems:'center',gap:12},column:{flex:1},columnTitle:{fontSize:12,fontWeight:'800',color:theme.muted,textAlign:'center',marginBottom:8},scroll:{maxHeight:245},grid:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},separator:{fontSize:25,fontWeight:'900',color:theme.ink},option:{width:42,height:36,borderWidth:1,borderColor:theme.border,borderRadius:9,alignItems:'center',justifyContent:'center'},optionOn:{backgroundColor:theme.green2,borderColor:theme.green2},optionText:{fontSize:12,fontWeight:'800',color:theme.ink},optionTextOn:{color:theme.white},error:{fontSize:11,color:theme.danger,textAlign:'center',marginHorizontal:18,marginBottom:4},footer:{padding:14,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',justifyContent:'flex-end',gap:8},cancel:{height:42,paddingHorizontal:16,borderWidth:1,borderColor:theme.border,borderRadius:10,alignItems:'center',justifyContent:'center'},cancelText:{fontSize:12,fontWeight:'800',color:theme.muted},confirm:{height:42,paddingHorizontal:18,borderRadius:10,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},confirmText:{fontSize:12,fontWeight:'900',color:theme.g900},disabled:{opacity:.45}});
