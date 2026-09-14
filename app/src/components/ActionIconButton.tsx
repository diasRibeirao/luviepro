import {type ComponentProps} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,type ViewStyle} from 'react-native';
import {theme} from '../theme';
import {useTenantBrand} from '../tenantBrand';

type IconName=ComponentProps<typeof Ionicons>['name'];

export type ActionTone='default'|'danger'|'primary';

export function ActionIconButton({
  label,
  icon,
  onPress,
  disabled=false,
  tone='default',
  size=36,
  style,
}:{
  label:string;
  icon:IconName;
  onPress:()=>void;
  disabled?:boolean;
  tone?:ActionTone;
  size?:number;
  style?:ViewStyle;
}){
  const brand=useTenantBrand();

  const color=
    tone==='danger'
      ?theme.danger
      :tone==='primary'
        ?brand.primaryForeground
        :brand.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({pressed})=>[
        s.button,
        {width:size,height:size},
        tone==='primary'&&{
          backgroundColor:brand.primary,
          borderColor:brand.primary,
        },
        tone==='danger'&&s.danger,
        pressed&&!disabled&&[
          s.pressed,
          tone!=='danger'&&{
            backgroundColor:tone==='primary'
              ?brand.primary
              :brand.primarySoft,
            borderColor:tone==='primary'
              ?brand.primary
              :brand.primary,
          },
        ],
        disabled&&s.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={17} color={color}/>
    </Pressable>
  );
}

const s=StyleSheet.create({
  button:{
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:9,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#FCFDFC',
  },
  danger:{
    backgroundColor:'#FFF8F7',
    borderColor:'#F0D4D1',
  },
  pressed:{
    transform:[{translateY:1}],
  },
  disabled:{opacity:.38},
});