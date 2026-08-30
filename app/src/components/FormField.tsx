import {StyleSheet,View,type TextInputProps,type ViewStyle} from 'react-native';
import {Text,TextInput} from '../i18n';
import {theme} from '../theme';

export type FormFieldProps=Omit<TextInputProps,'value'|'onChangeText'|'style'|'multiline'> & {
  label:string;
  value:string;
  onChangeText:(value:string)=>void;
  error?:string;
  helper?:string;
  required?:boolean;
  multiline?:boolean;
  containerStyle?:ViewStyle|ViewStyle[];
};

export function FormField({label,value,onChangeText,error,helper,required,multiline,containerStyle,...props}:FormFieldProps){
  const describedBy=error?`${label}-error`:helper?`${label}-helper`:undefined;
  return <View style={[s.field,containerStyle]}>
    <Text style={[s.label,error&&s.labelError]}>{label}{required?<Text style={s.required}> *</Text>:null}</Text>
    <TextInput
      accessibilityLabel={label}
      accessibilityState={{invalid:!!error} as any}
      accessibilityHint={error||helper}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholderTextColor={theme.muted}
      {...props}
      style={[s.input,multiline&&s.textarea,error&&s.inputError]}
    />
    {error?<View nativeID={describedBy} style={s.messageRow}><Text style={s.error}>{error}</Text></View>:helper?<View nativeID={describedBy} style={s.messageRow}><Text style={s.helper}>{helper}</Text></View>:null}
  </View>
}

const s=StyleSheet.create({
  field:{minWidth:0},
  label:{fontSize:11,fontWeight:'800',color:theme.muted,marginBottom:6},
  labelError:{color:theme.danger},
  required:{color:theme.danger},
  input:{minHeight:42,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,color:theme.ink,backgroundColor:theme.cream},
  inputError:{borderColor:theme.danger,backgroundColor:'#FFF8F7'},
  textarea:{minHeight:82,textAlignVertical:'top'},
  messageRow:{minHeight:18,paddingTop:4},
  error:{fontSize:11,lineHeight:14,color:theme.danger,fontWeight:'600'},
  helper:{fontSize:11,lineHeight:14,color:theme.muted}
});
