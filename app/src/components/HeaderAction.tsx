import { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable,StyleSheet } from 'react-native';
import { Text,useI18n } from '../i18n';
import { theme } from '../theme';

type IoniconName=ComponentProps<typeof Ionicons>['name'];

export function HeaderAction({label,icon='add-outline',onPress,disabled=false}:{label:string;icon?:IoniconName;onPress:()=>void;disabled?:boolean}){
  const {tr}=useI18n();
  return <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,pressed&&!disabled&&s.pressed,disabled&&s.disabled]}>
    <Ionicons name={icon} size={17} color={theme.white}/>
    <Text style={s.label}>{label}</Text>
  </Pressable>
}

const s=StyleSheet.create({
  button:{height:40,borderRadius:10,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:theme.green,borderWidth:1,borderColor:theme.green,minWidth:112},
  label:{fontSize:13,fontWeight:'800',color:theme.white},
  focused:{borderColor:theme.gold,shadowColor:theme.gold,shadowOpacity:.16,shadowRadius:5},
  pressed:{backgroundColor:theme.g800,transform:[{translateY:1}]},
  disabled:{opacity:.5}
});
