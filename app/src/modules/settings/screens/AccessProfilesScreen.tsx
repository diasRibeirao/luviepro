import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {AppShell} from '../../../components/AppShell';
import {Text} from '../../../i18n';
import {theme} from '../../../theme';
import {AccessProfilesPanel} from '../panels/AccessProfilesPanel';
export default function AccessProfilesScreen(){return <AppShell title="Perfis e permissões" subtitle="Perfis personalizados e permissões de acesso."><Pressable onPress={()=>router.push('/settings')} style={s.back}><Ionicons name="arrow-back" size={16} color={theme.green2}/><Text style={s.backText}>Voltar para Configurações</Text></Pressable><AccessProfilesPanel/></AppShell>}
const s=StyleSheet.create({back:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,marginBottom:14,paddingVertical:4},backText:{fontSize:12,fontWeight:'800',color:theme.green2}});
