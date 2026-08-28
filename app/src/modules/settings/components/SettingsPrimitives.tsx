import type { ReactNode } from 'react';
import { View,type TextInputProps } from 'react-native';
import { Text,TextInput } from '../../../i18n';
import { theme } from '../../../theme';
import { s } from '../settings.styles';

export function Section({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text>{children}</View>}
export function Field({label,value,change,disabled,error,helper,required,...inputProps}:{label:string;value?:string;change:(value:string)=>void;disabled?:boolean;error?:string;helper?:string;required?:boolean}&Omit<TextInputProps,'value'|'onChangeText'|'editable'>){return <View style={s.field}><Text style={[s.label,error&&s.labelError]}>{label.toUpperCase()}{required?<Text style={s.required}> *</Text>:null}</Text><TextInput editable={!disabled} value={value??''} onChangeText={change} secureTextEntry={label.toLowerCase().includes('senha')} placeholderTextColor={theme.muted} {...inputProps} style={[s.input,disabled&&s.inputDisabled,error&&s.inputError]}/>{error?<Text style={s.fieldError}>{error}</Text>:helper?<Text style={s.fieldHelper}>{helper}</Text>:null}</View>}
export function Usage({label,value,max}:{label:string;value:number;max:number}){const unlimited=max<0;const pct=unlimited?20:Math.min(100,max===0?100:value/max*100);return <View style={s.usage}><View style={s.usageHead}><Text style={s.usageLabel}>{label}</Text><Text style={s.usageValue}>{value} / {unlimited?'Ilimitado':max}</Text></View><View style={s.track}><View style={[s.bar,{width:`${pct}%`}]} /></View></View>}
