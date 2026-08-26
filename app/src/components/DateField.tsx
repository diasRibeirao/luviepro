import { useEffect,useMemo,useState } from 'react';
import { Modal,Pressable,StyleSheet,View } from 'react-native';
import { Text, TextInput } from '../i18n';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type Props={
  value?:string;
  onChange:(isoDate:string)=>void;
  label?:string;
  placeholder?:string;
  minDate?:string;
  maxDate?:string;
  disabled?:boolean;
};

const week=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function DateField({value='',onChange,label,placeholder='DD/MM/AAAA',minDate,maxDate,disabled=false}:Props){
  const[display,setDisplay]=useState(formatDateBR(value));
  const[open,setOpen]=useState(false);
  const[viewDate,setViewDate]=useState(()=>dateFromIso(value)||new Date());
  useEffect(()=>setDisplay(formatDateBR(value)),[value]);
  useEffect(()=>{if(open)setViewDate(dateFromIso(value)||new Date())},[open,value]);

  const cells=useMemo(()=>calendarCells(viewDate.getFullYear(),viewDate.getMonth()),[viewDate]);
  function changeText(text:string){
    const masked=maskDate(text);setDisplay(masked);
    if(!masked){onChange('');return}
    if(masked.length===10){const iso=displayToIso(masked);if(iso&&withinRange(iso,minDate,maxDate))onChange(iso)}
  }
  function blur(){
    if(!display){onChange('');return}
    const iso=displayToIso(display);
    if(!iso||!withinRange(iso,minDate,maxDate))setDisplay(formatDateBR(value));
  }
  function choose(day:number){
    const iso=toIso(viewDate.getFullYear(),viewDate.getMonth()+1,day);
    if(!withinRange(iso,minDate,maxDate))return;
    onChange(iso);setDisplay(formatDateBR(iso));setOpen(false);
  }
  const selected=value?String(value).slice(0,10):'';
  return <View style={s.wrap}>
    {label?<Text style={s.label}>{label}</Text>:null}
    <View style={[s.field,disabled&&s.disabled]}>
      <TextInput value={display} onChangeText={changeText} onBlur={blur} editable={!disabled} placeholder={placeholder} placeholderTextColor={theme.muted} keyboardType="number-pad" maxLength={10} style={s.input}/>
      {display&&!disabled?<Pressable accessibilityLabel="Limpar data" onPress={()=>{setDisplay('');onChange('')}} style={s.iconBtn}><Ionicons name="close-circle" size={17} color={theme.muted}/></Pressable>:null}
      <Pressable accessibilityLabel="Abrir calendário" disabled={disabled} onPress={()=>setOpen(true)} style={s.iconBtn}><Ionicons name="calendar-outline" size={18} color={disabled?theme.muted:theme.green2}/></Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
      <Pressable style={s.backdrop} onPress={()=>setOpen(false)}>
        <Pressable style={s.calendar} onPress={()=>{}}>
          <View style={s.calHead}>
            <Pressable onPress={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} style={s.nav}><Ionicons name="chevron-back" size={19} color={theme.green2}/></Pressable>
            <View style={s.monthWrap}><Text style={s.month}>{months[viewDate.getMonth()]}</Text><Text style={s.year}>{viewDate.getFullYear()}</Text></View>
            <Pressable onPress={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} style={s.nav}><Ionicons name="chevron-forward" size={19} color={theme.green2}/></Pressable>
          </View>
          <View style={s.week}>{week.map(x=><Text key={x} style={s.weekText}>{x}</Text>)}</View>
          <View style={s.days}>{cells.map((day,index)=>{
            if(!day)return <View key={`e-${index}`} style={s.day}/>;
            const iso=toIso(viewDate.getFullYear(),viewDate.getMonth()+1,day);
            const isSelected=iso===selected;const today=iso===todayIso();const blocked=!withinRange(iso,minDate,maxDate);
            return <Pressable key={iso} disabled={blocked} onPress={()=>choose(day)} style={[s.day,isSelected&&s.daySelected,today&&!isSelected&&s.dayToday]}><Text style={[s.dayText,isSelected&&s.dayTextSelected,blocked&&s.dayTextDisabled]}>{day}</Text></Pressable>})}</View>
          <View style={s.calFooter}>
            <Pressable onPress={()=>{const iso=todayIso();if(withinRange(iso,minDate,maxDate)){onChange(iso);setDisplay(formatDateBR(iso));setOpen(false)}}} style={s.today}><Text style={s.todayText}>Hoje</Text></Pressable>
            <Pressable onPress={()=>setOpen(false)} style={s.cancel}><Text style={s.cancelText}>Cancelar</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  </View>
}

export function formatDateBR(value?:string|null){
  if(!value)return '';
  const raw=String(value);const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return `${match[3]}/${match[2]}/${match[1]}`;
  const date=new Date(raw);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR');
}
function maskDate(value:string){const d=value.replace(/\D/g,'').slice(0,8);if(d.length<=2)return d;if(d.length<=4)return `${d.slice(0,2)}/${d.slice(2)}`;return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`}
function displayToIso(value:string){const m=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return '';const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]);const date=new Date(year,month-1,day);if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)return '';return toIso(year,month,day)}
function dateFromIso(value?:string){if(!value)return undefined;const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return undefined;return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]))}
function toIso(year:number,month:number,day:number){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
function todayIso(){const d=new Date();return toIso(d.getFullYear(),d.getMonth()+1,d.getDate())}
function withinRange(iso:string,min?:string,max?:string){return (!min||iso>=String(min).slice(0,10))&&(!max||iso<=String(max).slice(0,10))}
function calendarCells(year:number,month:number){const first=new Date(year,month,1).getDay();const offset=(first+6)%7;const count=new Date(year,month+1,0).getDate();return [...Array(offset).fill(0),...Array.from({length:count},(_,i)=>i+1)]}

const s=StyleSheet.create({wrap:{gap:6},label:{fontSize:11,fontWeight:'800',color:theme.muted,letterSpacing:.15},field:{height:44,borderWidth:1,borderColor:theme.border,borderRadius:10,backgroundColor:theme.white,flexDirection:'row',alignItems:'center',paddingLeft:11},disabled:{opacity:.55},input:{flex:1,height:42,color:theme.ink,fontSize:12,paddingVertical:0},iconBtn:{width:36,height:42,alignItems:'center',justifyContent:'center'},backdrop:{flex:1,backgroundColor:'rgba(15,28,22,.34)',alignItems:'center',justifyContent:'center',padding:18},calendar:{width:'100%',maxWidth:360,backgroundColor:theme.white,borderRadius:18,padding:16,borderWidth:1,borderColor:theme.border,shadowColor:'#000',shadowOpacity:.15,shadowRadius:26,shadowOffset:{width:0,height:12},elevation:12},calHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},nav:{width:38,height:38,borderRadius:10,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center'},monthWrap:{alignItems:'center'},month:{fontSize:14,fontWeight:'900',color:theme.ink},year:{fontSize:11,color:theme.muted,marginTop:2},week:{flexDirection:'row',marginBottom:6},weekText:{width:'14.2857%',textAlign:'center',fontSize:11,fontWeight:'900',color:theme.muted},days:{flexDirection:'row',flexWrap:'wrap'},day:{width:'14.2857%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:10},daySelected:{backgroundColor:theme.green2},dayToday:{borderWidth:1,borderColor:theme.gold},dayText:{fontSize:12,fontWeight:'700',color:theme.ink},dayTextSelected:{color:theme.white,fontWeight:'900'},dayTextDisabled:{color:'#C9CECB'},calFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderTopWidth:1,borderTopColor:theme.border,marginTop:10,paddingTop:12},today:{paddingVertical:8,paddingHorizontal:10},todayText:{fontSize:11,fontWeight:'900',color:theme.green2},cancel:{paddingVertical:8,paddingHorizontal:12,borderRadius:9,backgroundColor:theme.green50},cancelText:{fontSize:11,fontWeight:'800',color:theme.muted}});
