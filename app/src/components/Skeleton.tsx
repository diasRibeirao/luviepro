import { StyleSheet,View } from 'react-native';
import { theme } from '../theme';

export function SkeletonLine({width='100%',height=10}:{width?:number|string;height?:number}){
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.line,{width:width as any,height}]}/>;
}

export function ListSkeleton({rows=3}:{rows?:number}){
  return <View accessibilityLabel="Carregando conteúdo" accessibilityRole="progressbar" style={s.list}>
    {Array.from({length:rows}).map((_,index)=><View key={index} style={s.row}>
      <View style={s.avatar}/>
      <View style={s.body}>
        <SkeletonLine width={index%2===0?'44%':'58%'} height={11}/>
        <SkeletonLine width={index%2===0?'72%':'64%'} height={8}/>
      </View>
      <View style={s.pill}/>
    </View>)}
  </View>;
}

const s=StyleSheet.create({
  list:{width:'100%',gap:9},
  row:{minHeight:62,paddingHorizontal:14,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:theme.border,backgroundColor:theme.white,flexDirection:'row',alignItems:'center',gap:11},
  avatar:{width:34,height:34,borderRadius:17,backgroundColor:theme.border},
  body:{flex:1,gap:8},
  line:{borderRadius:5,backgroundColor:theme.border},
  pill:{width:52,height:18,borderRadius:9,backgroundColor:theme.green50},
});
