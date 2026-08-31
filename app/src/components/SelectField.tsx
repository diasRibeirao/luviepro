import {useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Modal,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Text} from '../i18n';
import {theme} from '../theme';

export type SelectOption={label:string;value:string;disabled?:boolean;hint?:string};

export function SelectField({label,value,onChange,options,placeholder='Selecione...',error,helper,required,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:SelectOption[];placeholder?:string;error?:string;helper?:string;required?:boolean;disabled?:boolean}){
 const[open,setOpen]=useState(false);
 const selected=options.find(x=>x.value===value);
 return <View style={s.field}>
  <Text style={[s.label,error&&s.labelError]}>{label}{required?<Text style={s.required}> *</Text>:null}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,expanded:open}} disabled={disabled} onPress={()=>setOpen(true)} style={({pressed})=>[s.control,error&&s.controlError,disabled&&s.disabled,pressed&&!disabled&&s.pressed]}>
   <Text numberOfLines={1} style={[s.value,!selected&&s.placeholder]}>{selected?.label||placeholder}</Text>
   <Ionicons name="chevron-down" size={17} color={theme.muted}/>
  </Pressable>
  {error?<Text style={s.error}>{error}</Text>:helper?<Text style={s.helper}>{helper}</Text>:null}
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
   <Pressable style={s.backdrop} onPress={()=>setOpen(false)}>
    <Pressable style={s.modal} onPress={()=>undefined}>
     <View style={s.modalHead}><Text style={s.modalTitle}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={()=>setOpen(false)} style={s.close}><Ionicons name="close" size={20} color={theme.muted}/></Pressable></View>
     <ScrollView style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled">
      {options.length===0?<Text style={s.empty}>Nenhuma opção disponível.</Text>:options.map(option=>{const active=option.value===value;return <Pressable key={option.value||'__empty'} disabled={option.disabled} onPress={()=>{onChange(option.value);setOpen(false)}} style={[s.option,active&&s.optionOn,option.disabled&&s.disabled]}>
       <View style={{flex:1}}><Text style={[s.optionText,active&&s.optionTextOn]}>{option.label}</Text>{option.hint?<Text style={s.optionHint}>{option.hint}</Text>:null}</View>
       {active?<Ionicons name="checkmark-circle" size={19} color={theme.green2}/>:null}
      </Pressable>})}
     </ScrollView>
    </Pressable>
   </Pressable>
  </Modal>
 </View>
}

const s=StyleSheet.create({field:{minWidth:0},label:{fontSize:11,fontWeight:'800',color:theme.muted,marginBottom:6},labelError:{color:theme.danger},required:{color:theme.danger},control:{minHeight:42,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,backgroundColor:theme.cream},controlError:{borderColor:theme.danger,backgroundColor:'#FFF8F7'},pressed:{opacity:.78},disabled:{opacity:.5},value:{flex:1,fontSize:13,color:theme.ink},placeholder:{color:theme.muted},error:{fontSize:11,lineHeight:14,color:theme.danger,fontWeight:'600',paddingTop:4},helper:{fontSize:11,lineHeight:14,color:theme.muted,paddingTop:4},backdrop:{flex:1,backgroundColor:'rgba(15,30,25,.42)',alignItems:'center',justifyContent:'center',padding:20},modal:{width:'100%',maxWidth:520,maxHeight:'72%',backgroundColor:theme.white,borderRadius:16,borderWidth:1,borderColor:theme.border,overflow:'hidden'},modalHead:{minHeight:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:theme.border},modalTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink},close:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:theme.cream},list:{flexGrow:0},listContent:{padding:12,gap:7},option:{minHeight:46,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:theme.white},optionOn:{borderColor:theme.green2,backgroundColor:theme.green50},optionText:{fontSize:13,fontWeight:'700',color:theme.ink},optionTextOn:{color:theme.green2},optionHint:{fontSize:10,color:theme.muted,marginTop:2},empty:{padding:18,textAlign:'center',fontSize:12,color:theme.muted}});
