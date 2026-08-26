import { createElement,useCallback,useState } from 'react';
import { Image,Platform,Pressable,ScrollView,StyleSheet,View } from 'react-native';
import { Text } from '../../../src/i18n';
import { router,useFocusEffect,useLocalSearchParams } from 'expo-router';
import { api,money } from '../../../src/api';
import { AsyncState } from '../../../src/components/AsyncState';
import { theme } from '../../../src/theme';

const printCss = `
@media print {
  @page { size: A4 portrait; margin: 12mm; }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #proposal-actions {
    display: none !important;
  }

  #proposal-screen {
    display: block !important;
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
  }

  #proposal-scroll {
    display: block !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }

  #proposal-page {
    width: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}
`;

export default function Proposal(){
  const{id}=useLocalSearchParams<{id:string}>();
  const[data,setData]=useState<any>();
  const[account,setAccount]=useState<any>();
  const[error,setError]=useState('');

  const load=useCallback(()=>{
    setError('');
    Promise.all([api(`/quotes/${id}`),api('/account')])
      .then(([q,a])=>{setData(q);setAccount(a)})
      .catch(e=>setError(e.message));
  },[id]);

  useFocusEffect(load);

  const webPrintStyle=Platform.OS==='web'
    ? createElement('style',{dangerouslySetInnerHTML:{__html:printCss}})
    : null;

  if(error)return <View style={s.statePage}>{webPrintStyle}<AsyncState error={error} onRetry={load}/></View>;
  if(!data||!account)return <View style={s.statePage}>{webPrintStyle}<AsyncState loading/></View>;

  const tenant=account.tenant??account;

  return <View nativeID="proposal-screen" style={s.screen}>
    {webPrintStyle}

    <View nativeID="proposal-actions" style={s.actions}>
      <Pressable onPress={()=>router.back()} style={s.backButton}>
        <Text style={s.backText}>← Voltar ao orçamento</Text>
      </Pressable>

      {Platform.OS==='web'&&<Pressable onPress={()=>globalThis.window?.print()} style={s.print}>
        <Text style={s.printText}>Imprimir / Salvar PDF</Text>
      </Pressable>}
    </View>

    <ScrollView nativeID="proposal-scroll" contentContainerStyle={s.scrollContent}>
      <View nativeID="proposal-page" style={s.paper}>
        <View style={s.header}>
          <View style={s.companyBlock}><View style={s.brandRow}>{tenant.logoUrl?<Image source={{uri:tenant.logoUrl}} style={s.logo}/>:null}<View style={{flex:1}}><Text style={s.brand}>{tenant.name}</Text><Text style={s.sub}>{[tenant.document,tenant.contactEmail,tenant.phone].filter(Boolean).join(' · ')}</Text><Text style={s.sub}>{[[tenant.addressLine,tenant.addressNumber].filter(Boolean).join(', '),tenant.city&&tenant.state?`${tenant.city}/${tenant.state}`:tenant.city].filter(Boolean).join(' · ')}</Text></View></View></View>
          <View style={s.quoteBlock}>
            <Text style={s.number}>{data.number}</Text>
            <Text style={s.date}>{new Date(data.createdAt).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        <Text style={s.kicker}>PROPOSTA COMERCIAL</Text>
        <Text style={s.title}>Olá, {data.client.name}</Text>
        {(data.client.document||data.client.city||data.client.addressLine)&&<Text style={s.clientMeta}>{[data.client.document,[data.client.addressLine,data.client.addressNumber,data.client.neighborhood].filter(Boolean).join(', '),data.client.city&&data.client.state?`${data.client.city}/${data.client.state}`:data.client.city].filter(Boolean).join(' · ')}</Text>}
        <Text style={s.intro}>{tenant.proposalText||'Preparamos esta proposta com os serviços, condições e investimento para a realização do seu projeto.'}</Text>

        <Text style={s.section}>Serviços</Text>
        {data.items.map((item:any)=><View key={item.id} style={s.row}>
          <View style={s.itemContent}>
            <Text style={s.item}>{item.serviceName}</Text>
            <Text style={s.meta}>{item.days} dia(s) · {item.people} pessoa(s)</Text>
          </View>
          <Text style={s.value}>{money(item.totalCents)}</Text>
        </View>)}

        <View style={s.totalBox}>
          <View>
            <Text style={s.totalLabel}>Investimento total</Text>
            <Text style={s.validity}>Validade: {data.validityDays} dias</Text>
          {tenant.proposalPaymentTerms?<Text style={s.meta}>Pagamento: {tenant.proposalPaymentTerms}</Text>:null}
          {tenant.pixKey?<Text style={s.meta}>PIX: {tenant.pixKey}</Text>:null}
          </View>
          <Text style={s.total}>{money(data.finalTotalCents||data.totalCents)}</Text>
        </View>

        {data.discountBps>0&&<Text style={s.discount}>Desconto aplicado: {(data.discountBps/100).toLocaleString('pt-BR')}%</Text>}

        {data.notes&&<>
          <Text style={s.section}>Observações</Text>
          <Text style={s.body}>{data.notes}</Text>
        </>}

        <View style={s.footer}>
          <Text style={s.footerStrong}>{tenant.responsibleName||tenant.name}</Text>
          <Text style={s.meta}>{tenant.siteUrl||tenant.instagram||tenant.contactEmail||''}</Text>
          {tenant.proposalFooter?<Text style={s.meta}>{tenant.proposalFooter}</Text>:null}
        </View>
      </View>
    </ScrollView>
  </View>
}

const s=StyleSheet.create({
  statePage:{flex:1,backgroundColor:theme.cream,alignItems:'center',justifyContent:'center',padding:24},
  screen:{flex:1,minHeight:'100%',backgroundColor:'#ECEBE7'},
  actions:{width:'100%',maxWidth:900,alignSelf:'center',paddingHorizontal:20,paddingTop:18,paddingBottom:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  backButton:{paddingVertical:10,paddingHorizontal:4},
  backText:{fontSize:14,fontWeight:'700',color:theme.green},
  print:{backgroundColor:theme.gold,borderRadius:9,paddingHorizontal:16,paddingVertical:11},
  printText:{fontWeight:'800',fontSize:12,color:theme.g900},
  scrollContent:{paddingHorizontal:20,paddingBottom:40},
  paper:{maxWidth:794,width:'100%',minHeight:1123,alignSelf:'center',backgroundColor:theme.white,paddingHorizontal:54,paddingVertical:48,borderRadius:4},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:20,paddingBottom:24,borderBottomWidth:1,borderBottomColor:theme.border},
  companyBlock:{flex:1},brandRow:{flexDirection:'row',alignItems:'center',gap:12},logo:{width:48,height:48,borderRadius:8,resizeMode:'contain'},
  quoteBlock:{minWidth:130,alignItems:'flex-end'},
  brand:{fontFamily:'serif',fontSize:26,fontWeight:'800',color:theme.green},
  sub:{fontSize:11,color:theme.muted,marginTop:5},
  number:{fontWeight:'800',color:theme.ink,textAlign:'right'},
  date:{fontSize:11,color:theme.muted,textAlign:'right',marginTop:4},
  kicker:{fontSize:11,fontWeight:'900',letterSpacing:2,color:theme.gold,marginTop:32},
  title:{fontFamily:'serif',fontSize:28,fontWeight:'700',color:theme.ink,marginTop:8},
  clientMeta:{fontSize:11,color:theme.muted,marginTop:7},intro:{fontSize:14,lineHeight:20,color:theme.muted,maxWidth:650,marginTop:12},
  section:{fontFamily:'serif',fontSize:18,fontWeight:'700',color:theme.ink,marginTop:28,marginBottom:10},
  row:{flexDirection:'row',alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderBottomColor:theme.border,gap:16},
  itemContent:{flex:1},
  item:{fontWeight:'800',color:theme.ink},
  meta:{fontSize:11,color:theme.muted,marginTop:4},
  value:{fontWeight:'800',color:theme.green},
  totalBox:{marginTop:24,backgroundColor:theme.green,padding:20,borderRadius:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:20},
  totalLabel:{fontSize:12,color:'rgba(255,255,255,.7)'},
  validity:{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:5},
  total:{fontFamily:'serif',fontSize:26,fontWeight:'800',color:theme.goldLight},
  discount:{fontSize:11,color:theme.muted,textAlign:'right',marginTop:7},
  body:{fontSize:13,lineHeight:18,color:theme.muted},
  footer:{marginTop:42,paddingTop:20,borderTopWidth:1,borderTopColor:theme.border},
  footerStrong:{fontWeight:'800',color:theme.ink}
});
