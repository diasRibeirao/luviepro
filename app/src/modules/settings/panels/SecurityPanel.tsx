import { useState } from 'react';
import { Pressable,View } from 'react-native';
import { Text } from '../../../i18n';
import { api } from '../../../api';
import { feedbackAlert as Alert } from '../../../components/Feedback';
import { Section,Field } from '../components/SettingsPrimitives';
import { errorMessage } from '../settings.utils';
import { s } from '../settings.styles';

export function SecurityPanel(){
 const[currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[errors,setErrors]=useState<Record<string,string>>({});
 const change=(key:'currentPassword'|'newPassword'|'confirm',value:string)=>{if(key==='currentPassword')setCurrentPassword(value);else if(key==='newPassword')setNewPassword(value);else setConfirm(value);setErrors(current=>({...current,[key]:''}))};
 async function save(){const next:Record<string,string>={};if(!currentPassword)next.currentPassword='Informe a senha atual.';if(newPassword.length<8)next.newPassword='Use pelo menos 8 caracteres.';if(!confirm)next.confirm='Confirme a nova senha.';else if(newPassword!==confirm)next.confirm='A confirmação deve ser igual à nova senha.';setErrors(next);if(Object.keys(next).length)return;try{setBusy(true);await api('/account/password',{method:'PATCH',body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirm('');setErrors({});Alert.alert('Senha alterada','Por segurança, sua sessão de renovação anterior foi revogada.')}catch(e:unknown){Alert.alert('Não foi possível alterar a senha',errorMessage(e))}finally{setBusy(false)}}
 return <Section title="Segurança" subtitle="Altere a senha do seu acesso. A nova senha deve ter pelo menos 8 caracteres."><View style={s.grid}><Field label="Senha atual" required error={errors.currentPassword} value={currentPassword} change={v=>change('currentPassword',v)}/><Field label="Nova senha" required error={errors.newPassword} value={newPassword} change={v=>change('newPassword',v)}/><Field label="Confirmar nova senha" required error={errors.confirm} value={confirm} change={v=>change('confirm',v)}/></View><Pressable disabled={busy} onPress={save} style={[s.planButton,busy&&{opacity:.45}]}><Text style={s.planButtonText}>{busy?'Alterando...':'Alterar senha'}</Text></Pressable></Section>
}
