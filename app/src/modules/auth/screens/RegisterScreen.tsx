import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,useWindowDimensions,View } from 'react-native';
import { LanguageSwitch, Text, TextInput } from '../../../i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ApiError,api,establishSession } from '../../../api';
import { theme } from '../../../theme';

const periods = [
  ['monthly', 'Mensal', 1],
  ['quarterly', 'Trimestral', 3],
  ['semiannual', 'Semestral', 6],
  ['annual', 'Anual −20%', 12],
] as const;

type BillingPeriod=(typeof periods)[number][0];

type RegisterPlan={
  id:'starter'|'pro'|'business';
  name:string;
  description:string;
  prices:Record<BillingPeriod,string>;
  totals:Record<BillingPeriod,string>;
  features:string[];
  popular?:boolean;
};

const plans:RegisterPlan[] = [
  {
    id:'starter',name:'Starter',description:'Para quem está começando',
    prices:{monthly:'R$ 49,90',quarterly:'R$ 44,91',semiannual:'R$ 42,42',annual:'R$ 39,92'},
    totals:{monthly:'R$ 49,90',quarterly:'R$ 134,73',semiannual:'R$ 254,49',annual:'R$ 479,04'},
    features:['Até 30 clientes','Até 10 orçamentos/mês','1 usuário','PDF com logo','Dashboard básico'],
  },
  {
    id:'pro',name:'Pro',description:'Para quem quer crescer',popular:true,
    prices:{monthly:'R$ 99,90',quarterly:'R$ 89,91',semiannual:'R$ 84,92',annual:'R$ 79,92'},
    totals:{monthly:'R$ 99,90',quarterly:'R$ 269,73',semiannual:'R$ 509,49',annual:'R$ 959,04'},
    features:['Até 150 clientes','Até 50 orçamentos/mês','Até 3 usuários','Perfis de acesso por área','PDF personalizado','Projetos + etapas','Relatórios avançados'],
  },
  {
    id:'business',name:'Business',description:'Para equipes e estúdios',
    prices:{monthly:'R$ 179,90',quarterly:'R$ 161,91',semiannual:'R$ 152,92',annual:'R$ 143,92'},
    totals:{monthly:'R$ 179,90',quarterly:'R$ 485,73',semiannual:'R$ 917,49',annual:'R$ 1.727,04'},
    features:['Clientes ilimitados','Orçamentos ilimitados','Até 10 usuários','Perfis de acesso por área','Auditoria de atividades','PDF templates premium','Kanban de projetos','Exportação + BI'],
  },
];

type RegisterSession=Parameters<typeof establishSession>[0];
const errorMessage=(error:unknown)=>error instanceof ApiError||error instanceof Error?error.message:'Erro inesperado';

export default function Register(){
  const {width}=useWindowDimensions();
  const wide=width>=900;
  const cardsWide=width>=1160;
  const[company,setCompany]=useState('');
  const[name,setName]=useState('');
  const[phone,setPhone]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[plan,setPlan]=useState<RegisterPlan['id']>('pro');
  const[period,setPeriod]=useState<BillingPeriod>('monthly');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');

  const selectedPeriod=periods.find(([id])=>id===period)!;

  async function submit(){
    try{
      setBusy(true);setError('');
      const result=await api<RegisterSession>('/auth/register',{method:'POST',body:JSON.stringify({company,name,phone,email,password,plan,period})});
      establishSession(result);router.replace('/home');
    }catch(e:unknown){setError(errorMessage(e))}finally{setBusy(false)}
  }

  return <SafeAreaView style={s.page}>
    <View style={s.language}><LanguageSwitch compact/></View>
    <View style={[s.brandSide,!wide&&s.brandSideMobile]}>
      <View style={s.logo}><View style={s.mark}><Text style={s.markText}>L</Text></View><Text style={s.logoText}>LuviePro</Text></View>
      {wide&&<><Text style={s.hero}>Comece a profissionalizar seu negócio hoje.</Text><Text style={s.heroSub}>Teste todos os recursos durante 14 dias. Sem cartão de crédito e sem compromisso.</Text><View style={s.benefits}>{['Orçamentos profissionais em segundos','Gestão completa de clientes','Projetos e etapas organizados','Sua marca em cada proposta'].map(text=><View key={text} style={s.benefit}><Ionicons name="checkmark-circle" size={18} color={theme.gold}/><Text style={s.benefitText}>{text}</Text></View>)}</View></>}
    </View>

    <ScrollView style={s.formSide} contentContainerStyle={[s.formContent,!wide&&{paddingTop:110}]}>
      <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={17} color={theme.green2}/><Text style={s.backText}>Voltar ao login</Text></Pressable>
      <Text style={s.title}>Crie sua conta grátis</Text>
      <Text style={s.subtitle}>Escolha o plano e aproveite 14 dias de teste.</Text>

      <View style={s.periods}>{periods.map(([value,label])=><Pressable key={value} onPress={()=>setPeriod(value)} style={[s.period,period===value&&s.periodOn]}><Text style={[s.periodText,period===value&&s.periodTextOn]}>{label}</Text></Pressable>)}</View>

      <View style={[s.planGrid,!cardsWide&&s.planGridCompact]}>
        {plans.map(item=>{
          const selected=plan===item.id;
          return <Pressable key={item.id} onPress={()=>setPlan(item.id)} style={[s.planCard,selected&&s.planCardOn,!cardsWide&&s.planCardCompact]}>
            {item.popular?<View style={s.popular}><Text style={s.popularText}>MAIS POPULAR</Text></View>:null}
            <View>
              <View style={s.planHead}><Text style={[s.planName,selected&&s.planNameOn]}>{item.name}</Text>{selected?<View style={s.selectedBadge}><Ionicons name="checkmark-circle" size={14} color={theme.green2}/><Text style={s.selectedBadgeText}>SELECIONADO</Text></View>:null}</View>
              <View style={s.priceRow}><Text style={[s.planPrice,selected&&s.planPriceOn]}>{item.prices[period]}</Text><Text style={s.month}>/mês</Text></View>
              <Text style={s.planDescription}>{item.description}</Text>
              <View style={[s.periodSummary,selected&&s.periodSummaryOn]}>
                <View><Text style={s.summaryLabel}>Total do período</Text><Text style={[s.summaryValue,selected&&s.summaryValueOn]}>{item.totals[period]}</Text></View>
                <View style={s.summaryRight}><Text style={s.summaryLabel}>{selectedPeriod[2]} {selectedPeriod[2]===1?'mês':'meses'}</Text><Text style={s.summaryHint}>{period==='monthly'?'Sem fidelidade extra':period==='annual'?'Melhor valor do ciclo':'Valor fechado do ciclo'}</Text></View>
              </View>
              <View style={s.divider}/>
              <View>{item.features.map(feature=><View key={feature} style={s.feature}><Ionicons name="checkmark-circle" size={16} color={selected?theme.green2:theme.gold}/><Text style={s.featureText}>{feature}</Text></View>)}</View>
            </View>
            <View style={[s.selectButton,selected&&s.selectButtonOn]}><Text style={[s.selectButtonText,selected&&s.selectButtonTextOn]}>{selected?'Plano selecionado':`Selecionar ${item.name}`}</Text></View>
          </Pressable>
        })}
      </View>

      <View style={s.selectionSummary}><Ionicons name="shield-checkmark-outline" size={18} color={theme.green2}/><Text style={s.selectionSummaryText}>Você escolheu <Text style={s.selectionSummaryStrong}>{plans.find(p=>p.id===plan)?.name}</Text> · {selectedPeriod[1]} · {plans.find(p=>p.id===plan)?.totals[period]} por período.</Text></View>

      <View style={s.fields}><Field label="NOME DA EMPRESA *" value={company} change={setCompany}/><Field label="SEU NOME *" value={name} change={setName}/><Field label="TELEFONE / WHATSAPP" value={phone} change={setPhone}/><Field label="E-MAIL *" value={email} change={setEmail}/><Field label="SENHA *" value={password} change={setPassword} password/></View>
      {error?<Text style={s.error}>⚠ {error}</Text>:null}
      <Pressable disabled={busy} onPress={submit} style={[s.submit,busy&&{opacity:.6}]}>{busy?<ActivityIndicator color={theme.g900}/>:<Text style={s.submitText}>Começar teste grátis de 14 dias</Text>}</Pressable>
      <Text style={s.terms}>Ao criar sua conta, você concorda com os termos de uso e política de privacidade.</Text>
    </ScrollView>
  </SafeAreaView>
}

function Field({label,value,change,password}:{label:string;value:string;change:(value:string)=>void;password?:boolean}){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={change} secureTextEntry={password} autoCapitalize={label.includes('E-MAIL')?'none':'sentences'} style={s.input}/></View>}

const s=StyleSheet.create({
  language:{position:'absolute',top:18,right:18,zIndex:20},page:{flex:1,flexDirection:'row',backgroundColor:theme.cream},brandSide:{width:'28%',minWidth:280,backgroundColor:theme.g800,padding:42},brandSideMobile:{position:'absolute',top:0,left:0,right:0,width:'100%',minWidth:0,height:86,padding:20,zIndex:2},logo:{flexDirection:'row',alignItems:'center',gap:10},mark:{width:38,height:38,borderRadius:11,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},markText:{fontFamily:'serif',fontSize:21,fontWeight:'800',color:theme.g900},logoText:{fontFamily:'serif',fontSize:22,fontWeight:'700',color:theme.white},hero:{fontFamily:'serif',fontSize:30,lineHeight:37,fontWeight:'700',color:theme.white,marginTop:68,maxWidth:330},heroSub:{fontSize:13,lineHeight:21,color:'rgba(255,255,255,.55)',marginTop:16,maxWidth:330},benefits:{marginTop:38,gap:16},benefit:{flexDirection:'row',alignItems:'center',gap:10},benefitText:{fontSize:13,color:'rgba(255,255,255,.72)'},formSide:{flex:1},formContent:{padding:36,paddingTop:28,maxWidth:1280,width:'100%',alignSelf:'center'},back:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:20},backText:{fontSize:12,fontWeight:'800',color:theme.green2},title:{fontFamily:'serif',fontSize:27,fontWeight:'700',color:theme.ink},subtitle:{fontSize:13,color:theme.muted,marginTop:5,marginBottom:20},periods:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:20},period:{borderWidth:1,borderColor:theme.border,borderRadius:18,paddingHorizontal:13,paddingVertical:8},periodOn:{backgroundColor:theme.gold,borderColor:theme.gold},periodText:{fontSize:11,fontWeight:'700',color:theme.muted},periodTextOn:{color:theme.g900},planGrid:{flexDirection:'row',gap:14,alignItems:'stretch'},planGridCompact:{flexDirection:'column'},planCard:{flex:1,minHeight:410,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:18,backgroundColor:theme.white,justifyContent:'space-between'},planCardCompact:{minHeight:0},planCardOn:{borderColor:theme.gold,borderWidth:2,backgroundColor:theme.green50},popular:{position:'absolute',top:-13,alignSelf:'center',backgroundColor:theme.gold,borderRadius:14,paddingHorizontal:14,paddingVertical:5,zIndex:2},popularText:{fontSize:10,fontWeight:'900',letterSpacing:1,color:theme.g900},planHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},planName:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink},planNameOn:{color:theme.green2},selectedBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:theme.white,borderRadius:8,paddingHorizontal:7,paddingVertical:4},selectedBadgeText:{fontSize:9,fontWeight:'900',color:theme.green2},priceRow:{flexDirection:'row',alignItems:'flex-end',marginTop:12},planPrice:{fontFamily:'serif',fontSize:25,fontWeight:'800',color:theme.gold},planPriceOn:{color:theme.ink},month:{fontSize:11,fontWeight:'500',color:theme.muted,marginBottom:4},planDescription:{fontSize:11,color:theme.muted,marginTop:4},periodSummary:{marginTop:13,borderWidth:1,borderColor:theme.border,borderRadius:10,padding:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},periodSummaryOn:{backgroundColor:theme.white},summaryLabel:{fontSize:9,color:theme.muted},summaryValue:{fontFamily:'serif',fontSize:15,fontWeight:'800',color:theme.gold,marginTop:2},summaryValueOn:{color:theme.ink},summaryRight:{alignItems:'flex-end'},summaryHint:{fontSize:8,color:theme.muted,marginTop:3},divider:{height:1,backgroundColor:theme.border,marginVertical:15},feature:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:8},featureText:{fontSize:11,color:theme.muted},selectButton:{height:40,borderWidth:1,borderColor:theme.green2,borderRadius:9,alignItems:'center',justifyContent:'center',marginTop:14},selectButtonOn:{backgroundColor:theme.gold,borderColor:theme.gold},selectButtonText:{fontSize:11,fontWeight:'900',color:theme.green2},selectButtonTextOn:{color:theme.g900},selectionSummary:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:10,padding:11,marginTop:16},selectionSummaryText:{fontSize:11,color:theme.muted,flex:1},selectionSummaryStrong:{fontWeight:'900',color:theme.ink},fields:{flexDirection:'row',flexWrap:'wrap',gap:11,marginTop:20},field:{minWidth:230,flex:1},label:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:theme.muted,marginBottom:6},input:{height:42,borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:11,fontSize:13,color:theme.ink,backgroundColor:theme.white},error:{fontSize:12,color:theme.danger,marginTop:13},submit:{height:46,borderRadius:10,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center',marginTop:18},submitText:{fontSize:13,fontWeight:'900',color:theme.g900},terms:{fontSize:11,color:theme.muted,textAlign:'center',marginTop:11},
});
