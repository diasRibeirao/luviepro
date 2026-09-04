import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {AppShell} from '../../../components/AppShell';
import {Text} from '../../../i18n';
import {theme} from '../../../theme';
import {AuditPanel} from '../panels/AuditPanel';
export default function AuditScreen(){return <AppShell title="Auditoria" subtitle="Histórico de ações realizadas no sistema."><AuditPanel/></AppShell>}
const s=StyleSheet.create({back:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,marginBottom:14,paddingVertical:4},backText:{fontSize:12,fontWeight:'800',color:theme.green2}});
