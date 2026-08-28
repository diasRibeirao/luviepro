import { useState } from 'react';
import { Pressable,View } from 'react-native';
import { Text } from '../../../i18n';
import { api } from '../../../api';
import { feedbackAlert as Alert } from '../../../components/Feedback';
import { Section,Field } from '../components/SettingsPrimitives';
import { errorMessage } from '../settings.utils';
import { s } from '../settings.styles';

export function SecurityPanel(){const[currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);async function save(){if(newPassword.length<8)return Alert.alert('Senha inválida','Use pelo menos 8 caracteres.');if(newPassword!==confirm)return Alert.alert('Confirmação diferente','A confirmação deve ser igual à nova senha.');try{setBusy(true);await api('/account/password',{method:'PATCH',body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirm('');Alert.alert('Senha alterada','Por segurança, sua sessão de renovação anterior foi revogada.')}catch(e:unknown){Alert.alert('Não foi possível alterar a senha',errorMessage(e))}finally{setBusy(false)}}return <Section title="Segurança" subtitle="Altere a senha do seu acesso. A nova senha deve ter pelo menos 8 caracteres."><View style={s.grid}><Field label="Senha atual" value={currentPassword} change={setCurrentPassword}/><Field label="Nova senha" value={newPassword} change={setNewPassword}/><Field label="Confirmar nova senha" value={confirm} change={setConfirm}/></View><Pressable disabled={busy||!currentPassword||newPassword.length<8||newPassword!==confirm} onPress={save} style={[s.planButton,(busy||!currentPassword||newPassword.length<8||newPassword!==confirm)&&{opacity:.45}]}><Text style={s.planButtonText}>{busy?'Alterando...':'Alterar senha'}</Text></Pressable></Section>}
