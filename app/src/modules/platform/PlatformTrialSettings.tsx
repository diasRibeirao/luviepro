import Ionicons from '@expo/vector-icons/Ionicons';
import {useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,TextInput,View} from 'react-native';
import {api} from '../../api';
import {Text} from '../../i18n';
import {feedbackAlert as Alert} from '../../components/Feedback';
import {theme} from '../../theme';

type TrialUnit='HOURS'|'DAYS'|'WEEKS';

type TrialSettings={
  enabled:boolean;
  value:number;
  unit:TrialUnit;
  label:string;
  marketingLabel:string;
};

const units:Array<{value:TrialUnit;label:string}>=[
  {value:'HOURS',label:'Horas'},
  {value:'DAYS',label:'Dias'},
  {value:'WEEKS',label:'Semanas'},
];

export function PlatformTrialSettings(){
  const[data,setData]=useState<TrialSettings>();
  const[value,setValue]=useState('');
  const[unit,setUnit]=useState<TrialUnit>('HOURS');
  const[enabled,setEnabled]=useState(true);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState('');

  function apply(settings:TrialSettings){
    setData(settings);
    setEnabled(settings.enabled);
    setValue(String(settings.value));
    setUnit(settings.unit);
  }

  async function load(){
    try{
      setLoading(true);
      setError('');
      const settings=await api<TrialSettings>('/platform/trial-settings');
      apply(settings);
    }catch(e:unknown){
      setError(e instanceof Error?e.message:'Não foi possível carregar a configuração do período de teste.');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{void load()},[]);

  async function save(){
    const numeric=Number(value);

    if(!Number.isInteger(numeric)||numeric<1){
      Alert.alert('Valor inválido','Informe uma duração inteira maior que zero.');
      return;
    }

    try{
      setSaving(true);

      const settings=await api<TrialSettings>(
        '/platform/trial-settings',
        {
          method:'PATCH',
          body:JSON.stringify({
            enabled,
            value:numeric,
            unit,
          }),
        },
      );

      apply(settings);
      Alert.alert('Período de teste atualizado','A nova configuração será aplicada somente às novas contas.');
    }catch(e:unknown){
      Alert.alert(
        'Não foi possível salvar',
        e instanceof Error?e.message:'Erro inesperado',
      );
    }finally{
      setSaving(false);
    }
  }

  if(loading){
    return <View style={s.state}>
      <ActivityIndicator color={theme.gold}/>
      <Text style={s.muted}>Carregando configuração...</Text>
    </View>;
  }

  if(error){
    return <View style={s.state}>
      <Ionicons name="alert-circle-outline" size={24} color={theme.danger}/>
      <Text style={s.error}>{error}</Text>
      <Pressable onPress={()=>void load()} style={s.retry}>
        <Text style={s.retryText}>Tentar novamente</Text>
      </Pressable>
    </View>;
  }

  return <View style={s.wrap}>
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.icon}>
          <Ionicons name="time-outline" size={22} color={theme.green2}/>
        </View>
        <View style={s.headerText}>
          <Text style={s.cardTitle}>Período de demonstração</Text>
          <Text style={s.muted}>
            Defina quanto tempo novas empresas podem testar o LuviePro antes de contratar.
          </Text>
        </View>
      </View>

      <View style={s.divider}/>

      <View style={s.section}>
        <Text style={s.label}>Disponibilidade</Text>

        <View style={s.toggleRow}>
          <View style={s.toggleText}>
            <Text style={s.strong}>Oferecer período de teste</Text>
            <Text style={s.muted}>
              Quando desativado, novas contas não recebem vencimento gratuito.
            </Text>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{checked:enabled}}
            onPress={()=>setEnabled(current=>!current)}
            style={[s.switch,enabled&&s.switchOn]}
          >
            <View style={[s.switchKnob,enabled&&s.switchKnobOn]}/>
          </Pressable>
        </View>
      </View>

      <View style={[s.section,!enabled&&s.disabled]}>
        <Text style={s.label}>Duração padrão</Text>

        <View style={s.durationRow}>
          <TextInput
            editable={enabled&&!saving}
            keyboardType="number-pad"
            value={value}
            onChangeText={text=>setValue(text.replace(/\D/g,''))}
            placeholder="48"
            style={s.input}
          />

          <View style={s.units}>
            {units.map(item=>
              <Pressable
                key={item.value}
                disabled={!enabled||saving}
                onPress={()=>setUnit(item.value)}
                style={[
                  s.unit,
                  unit===item.value&&s.unitOn,
                ]}
              >
                <Text style={[
                  s.unitText,
                  unit===item.value&&s.unitTextOn,
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={s.preview}>
        <Ionicons
          name={enabled?'sparkles-outline':'pause-circle-outline'}
          size={20}
          color={enabled?theme.green2:theme.muted}
        />

        <View style={s.previewText}>
          <Text style={s.previewTitle}>Prévia</Text>
          <Text style={s.muted}>
            {enabled
              ? `Novas empresas receberão ${data?.label??`${value} ${unit.toLowerCase()}`} de período de teste após salvar.`
              : 'Novas empresas não receberão período de teste gratuito.'}
          </Text>
        </View>
      </View>

      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={18} color={theme.gold}/>
        <Text style={s.noticeText}>
          Alterar esta configuração não modifica empresas já cadastradas. Extensões individuais serão administradas diretamente na empresa.
        </Text>
      </View>

      <Pressable
        disabled={saving}
        onPress={()=>void save()}
        style={[s.save,saving&&s.disabled]}
      >
        {saving
          ?<ActivityIndicator color="#183328"/>
          :<>
            <Ionicons name="save-outline" size={18} color="#183328"/>
            <Text style={s.saveText}>Salvar configuração</Text>
           </>
        }
      </Pressable>
    </View>
  </View>;
}

const s=StyleSheet.create({
  wrap:{width:'100%',maxWidth:900},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:16,padding:22},
  cardHeader:{flexDirection:'row',alignItems:'center',gap:13},
  icon:{width:44,height:44,borderRadius:12,backgroundColor:'#EEF5F1',alignItems:'center',justifyContent:'center'},
  headerText:{flex:1,minWidth:0},
  cardTitle:{fontFamily:'serif',fontSize:21,fontWeight:'800',color:theme.ink},
  strong:{fontSize:12,fontWeight:'800',color:theme.ink},
  muted:{fontSize:11,lineHeight:17,color:theme.muted,marginTop:3},
  error:{fontSize:11,lineHeight:17,color:theme.danger,textAlign:'center'},
  divider:{height:1,backgroundColor:theme.border,marginVertical:20},
  section:{marginBottom:22},
  label:{fontSize:10,fontWeight:'900',letterSpacing:.7,color:theme.muted,textTransform:'uppercase',marginBottom:9},
  toggleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:20},
  toggleText:{flex:1},
  switch:{width:48,height:28,borderRadius:14,padding:3,backgroundColor:'#D6DDD9',justifyContent:'center'},
  switchOn:{backgroundColor:theme.green2},
  switchKnob:{width:22,height:22,borderRadius:11,backgroundColor:'#fff'},
  switchKnobOn:{alignSelf:'flex-end'},
  durationRow:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},
  input:{width:110,height:44,borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:12,fontSize:13,color:theme.ink,backgroundColor:'#fff'},
  units:{flexDirection:'row',flexWrap:'wrap',gap:7},
  unit:{height:40,borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:15,alignItems:'center',justifyContent:'center'},
  unitOn:{backgroundColor:theme.green2,borderColor:theme.green2},
  unitText:{fontSize:10,fontWeight:'800',color:theme.muted},
  unitTextOn:{color:'#fff'},
  preview:{flexDirection:'row',gap:10,backgroundColor:'#F3F7F5',borderRadius:11,padding:14,marginBottom:13},
  previewText:{flex:1},
  previewTitle:{fontSize:11,fontWeight:'900',color:theme.ink},
  notice:{flexDirection:'row',gap:9,backgroundColor:'#FFF8E8',borderRadius:10,padding:13},
  noticeText:{flex:1,fontSize:10,lineHeight:16,color:theme.muted},
  save:{minHeight:45,marginTop:20,borderRadius:9,backgroundColor:theme.gold,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
  saveText:{fontSize:11,fontWeight:'900',color:'#183328'},
  retry:{height:40,borderRadius:9,paddingHorizontal:15,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},
  retryText:{fontSize:10,fontWeight:'900',color:'#fff'},
  state:{minHeight:240,alignItems:'center',justifyContent:'center',gap:10},
  disabled:{opacity:.5},
});