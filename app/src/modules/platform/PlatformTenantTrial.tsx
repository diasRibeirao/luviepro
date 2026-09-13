import Ionicons from '@expo/vector-icons/Ionicons';
import {useEffect,useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {api} from '../../api';
import {feedbackAlert as Alert} from '../../components/Feedback';
import {Text} from '../../i18n';
import {theme} from '../../theme';

type TrialUnit='HOURS'|'DAYS'|'WEEKS';

type TenantTrial={
  id:string;
  name:string;
  status:string;
  plan:string;
  subscriptionExpiresAt:string|null;
  expired:boolean;
  remainingMs:number;
};

type ExtendResult={
  tenantId:string;
  previousExpiresAt:string|null;
  newExpiresAt:string;
  added:string;
  adjustmentId:string;
};

const QUICK=[
  {label:'+1h',value:1},
  {label:'+6h',value:6},
  {label:'+12h',value:12},
  {label:'+24h',value:24},
  {label:'+48h',value:48},
] as const;

const UNITS:Array<{value:TrialUnit;label:string}>=[
  {value:'HOURS',label:'Horas'},
  {value:'DAYS',label:'Dias'},
  {value:'WEEKS',label:'Semanas'},
];

function dateTime(value:string|null){
  if(!value)return 'Sem vencimento definido';

  const date=new Date(value);

  if(Number.isNaN(date.getTime()))return value;

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:'short',
      timeStyle:'short',
    },
  ).format(date);
}

function remaining(ms:number){
  if(ms<=0)return 'Expirado';

  const totalMinutes=Math.floor(ms/60000);
  const days=Math.floor(totalMinutes/(60*24));
  const hours=Math.floor((totalMinutes%(60*24))/60);
  const minutes=totalMinutes%60;

  if(days>0)return `${days}d ${hours}h`;
  if(hours>0)return `${hours}h ${minutes}min`;

  return `${Math.max(1,minutes)}min`;
}

export function PlatformTenantTrial({
  tenantId,
  tenantName,
}:{
  tenantId:string;
  tenantName:string;
}){
  const[data,setData]=useState<TenantTrial>();
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');

  const[value,setValue]=useState('1');
  const[unit,setUnit]=useState<TrialUnit>('HOURS');
  const[reason,setReason]=useState('');

  async function load(){
    try{
      setLoading(true);
      setError('');

      const result=await api<TenantTrial>(
        `/platform/tenants/${tenantId}/trial`,
      );

      setData(result);
    }catch(e:unknown){
      setError(
        e instanceof Error
          ?e.message
          :'Não foi possível consultar o período de teste.',
      );
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    void load();
  },[tenantId]);

  async function extend(
    amount:number,
    durationUnit:TrialUnit,
    extensionReason?:string,
  ){
    if(!Number.isInteger(amount)||amount<1){
      Alert.alert(
        'Valor inválido',
        'Informe uma duração inteira maior que zero.',
      );
      return;
    }

    try{
      setBusy(true);

      const result=await api<ExtendResult>(
        `/platform/tenants/${tenantId}/trial/extend`,
        {
          method:'POST',
          body:JSON.stringify({
            value:amount,
            unit:durationUnit,
            reason:extensionReason?.trim()||undefined,
          }),
        },
      );

      await load();

      Alert.alert(
        'Período prorrogado',
        `Novo vencimento: ${dateTime(result.newExpiresAt)}.`,
      );
    }catch(e:unknown){
      Alert.alert(
        'Não foi possível prorrogar',
        e instanceof Error?e.message:'Erro inesperado',
      );
    }finally{
      setBusy(false);
    }
  }

  async function extendCustom(){
    const numeric=Number(value);

    await extend(
      numeric,
      unit,
      reason,
    );
  }

  return <View style={s.wrap}>
    <View style={s.titleRow}>
      <View style={s.icon}>
        <Ionicons
          name="time-outline"
          size={19}
          color={theme.green2}
        />
      </View>

      <View style={s.titleText}>
        <Text style={s.title}>Período de teste / vencimento</Text>
        <Text style={s.muted}>
          Consulte e prorrogue o acesso de {tenantName}.
        </Text>
      </View>
    </View>

    {loading
      ?<View style={s.state}>
        <ActivityIndicator color={theme.gold}/>
        <Text style={s.muted}>Consultando vencimento...</Text>
       </View>

      :error
        ?<View style={s.state}>
          <Text style={s.error}>{error}</Text>

          <Pressable
            onPress={()=>void load()}
            style={s.retry}
          >
            <Text style={s.retryText}>Tentar novamente</Text>
          </Pressable>
         </View>

        :data
          ?<>
            <View style={s.summary}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>VENCIMENTO ATUAL</Text>
                <Text style={s.summaryValue}>
                  {dateTime(data.subscriptionExpiresAt)}
                </Text>
              </View>

              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>SITUAÇÃO</Text>
                <Text style={[
                  s.summaryValue,
                  data.expired&&s.expired,
                ]}>
                  {!data.subscriptionExpiresAt
                    ?'Sem vencimento'
                    :data.expired
                      ?'Expirado'
                      :'Ativo'}
                </Text>
              </View>

              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>TEMPO RESTANTE</Text>
                <Text style={[
                  s.summaryValue,
                  data.expired&&s.expired,
                ]}>
                  {data.subscriptionExpiresAt
                    ?remaining(data.remainingMs)
                    :'—'}
                </Text>
              </View>
            </View>

            <Text style={s.label}>PRORROGAÇÃO RÁPIDA</Text>

            <View style={s.quick}>
              {QUICK.map(option=>
                <Pressable
                  key={option.value}
                  disabled={busy}
                  onPress={()=>
                    void extend(
                      option.value,
                      'HOURS',
                      `Prorrogação rápida ${option.label}`,
                    )
                  }
                  style={({pressed})=>[
                    s.quickButton,
                    pressed&&s.pressed,
                    busy&&s.disabled,
                  ]}
                >
                  <Text style={s.quickText}>{option.label}</Text>
                </Pressable>
              )}
            </View>

            <Text style={s.label}>PRORROGAÇÃO PERSONALIZADA</Text>

            <View style={s.customRow}>
              <TextInput
                editable={!busy}
                keyboardType="number-pad"
                value={value}
                onChangeText={text=>
                  setValue(text.replace(/\D/g,''))
                }
                placeholder="1"
                style={s.inputValue}
              />

              <View style={s.units}>
                {UNITS.map(option=>
                  <Pressable
                    key={option.value}
                    disabled={busy}
                    onPress={()=>setUnit(option.value)}
                    style={[
                      s.unit,
                      unit===option.value&&s.unitOn,
                      busy&&s.disabled,
                    ]}
                  >
                    <Text style={[
                      s.unitText,
                      unit===option.value&&s.unitTextOn,
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <TextInput
              editable={!busy}
              value={reason}
              onChangeText={setReason}
              placeholder="Motivo da prorrogação (opcional)"
              placeholderTextColor={theme.muted}
              style={s.reason}
            />

            <Pressable
              disabled={busy}
              onPress={()=>void extendCustom()}
              style={[s.extend,busy&&s.disabled]}
            >
              {busy
                ?<ActivityIndicator color="#183328"/>
                :<>
                  <Ionicons
                    name="add-circle-outline"
                    size={17}
                    color="#183328"
                  />
                  <Text style={s.extendText}>
                    Prorrogar período
                  </Text>
                 </>
              }
            </Pressable>

            <View style={s.notice}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={theme.gold}
              />

              <Text style={s.noticeText}>
                Se o vencimento ainda estiver no futuro, o tempo será acrescentado ao vencimento atual. Se já estiver expirado, a contagem começa a partir de agora. O usuário deverá atualizar a sessão ou entrar novamente para refletir o novo vencimento.
              </Text>
            </View>
           </>
          :null}
  </View>;
}

const s=StyleSheet.create({
  wrap:{
    marginTop:24,
    paddingTop:20,
    borderTopWidth:1,
    borderTopColor:theme.border,
  },
  titleRow:{
    flexDirection:'row',
    alignItems:'center',
    gap:10,
    marginBottom:15,
  },
  icon:{
    width:36,
    height:36,
    borderRadius:10,
    backgroundColor:'#EEF5F1',
    alignItems:'center',
    justifyContent:'center',
  },
  titleText:{
    flex:1,
    minWidth:0,
  },
  title:{
    fontSize:13,
    fontWeight:'900',
    color:theme.ink,
  },
  muted:{
    fontSize:10,
    lineHeight:15,
    color:theme.muted,
    marginTop:2,
  },
  error:{
    fontSize:10,
    lineHeight:15,
    color:theme.danger,
    textAlign:'center',
  },
  state:{
    minHeight:90,
    alignItems:'center',
    justifyContent:'center',
    gap:8,
  },
  summary:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:8,
    marginBottom:18,
  },
  summaryItem:{
    flexGrow:1,
    flexBasis:145,
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:9,
    backgroundColor:'#FAFCFB',
    padding:10,
  },
  summaryLabel:{
    fontSize:8,
    fontWeight:'900',
    letterSpacing:.5,
    color:theme.muted,
  },
  summaryValue:{
    fontSize:10,
    fontWeight:'800',
    color:theme.ink,
    marginTop:5,
  },
  expired:{
    color:theme.danger,
  },
  label:{
    fontSize:9,
    fontWeight:'900',
    letterSpacing:.6,
    color:theme.muted,
    marginTop:5,
    marginBottom:8,
  },
  quick:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:6,
    marginBottom:16,
  },
  quickButton:{
    minWidth:54,
    height:35,
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:8,
    paddingHorizontal:10,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#fff',
  },
  quickText:{
    fontSize:9,
    fontWeight:'900',
    color:theme.green2,
  },
  customRow:{
    flexDirection:'row',
    flexWrap:'wrap',
    alignItems:'center',
    gap:8,
  },
  inputValue:{
    width:80,
    height:40,
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:8,
    paddingHorizontal:10,
    color:theme.ink,
    backgroundColor:'#fff',
    fontSize:11,
  },
  units:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:5,
  },
  unit:{
    height:36,
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:8,
    paddingHorizontal:10,
    alignItems:'center',
    justifyContent:'center',
  },
  unitOn:{
    backgroundColor:theme.green2,
    borderColor:theme.green2,
  },
  unitText:{
    fontSize:9,
    fontWeight:'800',
    color:theme.muted,
  },
  unitTextOn:{
    color:'#fff',
  },
  reason:{
    height:40,
    marginTop:9,
    borderWidth:1,
    borderColor:theme.border,
    borderRadius:8,
    paddingHorizontal:10,
    color:theme.ink,
    backgroundColor:'#fff',
    fontSize:10,
  },
  extend:{
    minHeight:42,
    marginTop:10,
    borderRadius:8,
    backgroundColor:theme.gold,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:7,
  },
  extendText:{
    fontSize:10,
    fontWeight:'900',
    color:'#183328',
  },
  notice:{
    marginTop:12,
    flexDirection:'row',
    gap:7,
    backgroundColor:'#FFF8E8',
    borderRadius:8,
    padding:10,
  },
  noticeText:{
    flex:1,
    fontSize:9,
    lineHeight:14,
    color:theme.muted,
  },
  retry:{
    height:34,
    paddingHorizontal:12,
    borderRadius:8,
    backgroundColor:theme.green2,
    alignItems:'center',
    justifyContent:'center',
  },
  retryText:{
    fontSize:9,
    fontWeight:'900',
    color:'#fff',
  },
  pressed:{
    opacity:.75,
  },
  disabled:{
    opacity:.55,
  },
});