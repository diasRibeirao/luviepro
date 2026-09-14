import {ActivityIndicator,Pressable,StyleSheet,ViewStyle} from 'react-native';
import {Text} from '../i18n';
import {theme} from '../theme';
import {useTenantBrand} from '../tenantBrand';

type Tone='primary'|'secondary'|'danger'|'header';

export function AsyncButton({
  label,
  busy=false,
  busyLabel='Salvando...',
  disabled=false,
  onPress,
  tone='primary',
  style,
  accessibilityHint,
}:{
  label:string;
  busy?:boolean;
  busyLabel?:string;
  disabled?:boolean;
  onPress:()=>void|Promise<void>;
  tone?:Tone;
  style?:ViewStyle|ViewStyle[];
  accessibilityHint?:string;
}){
  const brand=useTenantBrand();
  const blocked=busy||disabled;

  const foreground=
    tone==='danger'
      ?theme.white
      :tone==='primary'||tone==='header'
        ?brand.primaryForeground
        :brand.primary;

  const dynamicStyle=
    tone==='primary'||tone==='header'
      ?{
          backgroundColor:brand.primary,
          borderColor:brand.primary,
        }
      :tone==='secondary'
        ?{
            backgroundColor:theme.white,
            borderColor:brand.primary,
          }
        :undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy?busyLabel:label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled:blocked,busy}}
      disabled={blocked}
      onPress={onPress}
      style={({pressed})=>[
        s.base,
        dynamicStyle,
        tone==='danger'&&s.danger,
        blocked&&s.disabled,
        pressed&&!blocked&&s.pressed,
        style,
      ]}
    >
      {busy?<ActivityIndicator size="small" color={foreground}/>:null}
      <Text style={[s.label,{color:foreground}]}>
        {busy?busyLabel:label}
      </Text>
    </Pressable>
  );
}

const s=StyleSheet.create({
  base:{
    height:40,
    minWidth:112,
    borderRadius:9,
    paddingHorizontal:16,
    alignItems:'center',
    justifyContent:'center',
    flexDirection:'row',
    gap:8,
    borderWidth:1,
    borderColor:'transparent',
  },
  danger:{
    backgroundColor:theme.danger,
    borderColor:theme.danger,
  },
  disabled:{opacity:.5},
  pressed:{
    opacity:.82,
    transform:[{scale:.99}],
  },
  label:{
    fontSize:13,
    fontWeight:'800',
  },
});