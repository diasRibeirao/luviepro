import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../i18n';
import { theme } from '../../theme';

export function PlatformPagination({page,totalPages,onChange}:{page:number;totalPages:number;onChange:(page:number)=>void}) {
  if(totalPages<=1)return null;
  return <View style={styles.row}>
    <Pressable disabled={page<=1} onPress={()=>onChange(Math.max(1,page-1))} style={[styles.action,page<=1&&styles.disabled]}><Ionicons name="chevron-back" size={15} color={theme.green2}/><Text style={styles.actionText}>Anterior</Text></Pressable>
    <Text style={styles.count}>Página {page} de {totalPages}</Text>
    <Pressable disabled={page>=totalPages} onPress={()=>onChange(Math.min(totalPages,page+1))} style={[styles.action,page>=totalPages&&styles.disabled]}><Text style={styles.actionText}>Próxima</Text><Ionicons name="chevron-forward" size={15} color={theme.green2}/></Pressable>
  </View>;
}

const styles=StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:10,marginTop:14},
  action:{height:32,borderWidth:1,borderColor:theme.border,borderRadius:8,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:5},
  actionText:{fontSize:9,fontWeight:'800',color:theme.green2},
  count:{fontSize:10,fontWeight:'700',color:theme.muted},
  disabled:{opacity:.4},
});
