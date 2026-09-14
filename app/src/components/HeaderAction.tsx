import {ComponentProps} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet} from 'react-native';
import {Text,useI18n} from '../i18n';
import {useTenantBrand} from '../tenantBrand';

type IoniconName=ComponentProps<typeof Ionicons>['name'];

export function HeaderAction({
  label,
  icon='add-outline',
  onPress,
  disabled=false,
}:{
  label:string;
  icon?:IoniconName;
  onPress:()=>void;
  disabled?:boolean;
}){
  const {tr}=useI18n();
  const brand=useTenantBrand();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(label)}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed})=>[
        s.button,
        {
          backgroundColor:brand.primary,
          borderColor:brand.primary,
        },
        pressed&&!disabled&&[
          s.pressed,
          {
            borderColor:brand.secondary,
          },
        ],
        disabled&&s.disabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={brand.primaryForeground}
      />
      <Text style={[s.label,{color:brand.primaryForeground}]}>
        {label}
      </Text>
    </Pressable>
  );
}

const s=StyleSheet.create({
  button:{
    minHeight:42,
    borderRadius:10,
    paddingHorizontal:15,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:7,
    borderWidth:1,
    minWidth:112,
    alignSelf:'stretch',
  },
  pressed:{
    opacity:.86,
    transform:[{translateY:1}],
  },
  disabled:{opacity:.5},
  label:{
    fontSize:13,
    fontWeight:'800',
  },
});