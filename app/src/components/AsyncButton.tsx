import { ActivityIndicator,Pressable,StyleSheet,ViewStyle } from 'react-native';
import { Text } from '../i18n';
import { theme } from '../theme';

type Tone='primary'|'secondary'|'danger'|'header';
export function AsyncButton({label,busy=false,busyLabel='Salvando...',disabled=false,onPress,tone='primary',style,accessibilityHint}:{label:string;busy?:boolean;busyLabel?:string;disabled?:boolean;onPress:()=>void|Promise<void>;tone?:Tone;style?:ViewStyle|ViewStyle[];accessibilityHint?:string}){
  const blocked=busy||disabled;
  const fg=tone==='danger'||tone==='header'?theme.white:tone==='secondary'?theme.green2:theme.g900;
  return <Pressable accessibilityRole="button" accessibilityLabel={busy?busyLabel:label} accessibilityHint={accessibilityHint} accessibilityState={{disabled:blocked,busy}} disabled={blocked} onPress={onPress} style={({pressed,focused}:any)=>[s.base,tone==='primary'&&s.primary,tone==='secondary'&&s.secondary,tone==='danger'&&s.danger,tone==='header'&&s.header,focused&&s.focused,blocked&&s.disabled,pressed&&!blocked&&s.pressed,style]}>
    {busy?<ActivityIndicator size="small" color={fg}/>:null}
    <Text style={[s.label,{color:fg}]}>{busy?busyLabel:label}</Text>
  </Pressable>
}
const s=StyleSheet.create({base:{height:40,minWidth:112,borderRadius:9,paddingHorizontal:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,borderWidth:1,borderColor:'transparent'},primary:{backgroundColor:theme.gold},secondary:{backgroundColor:theme.white,borderColor:theme.border},danger:{backgroundColor:theme.danger},header:{backgroundColor:theme.green,borderColor:theme.green,height:40},focused:{borderColor:theme.green2},disabled:{opacity:.5},pressed:{opacity:.82,transform:[{scale:.99}]},label:{fontSize:13,fontWeight:'800'}});
