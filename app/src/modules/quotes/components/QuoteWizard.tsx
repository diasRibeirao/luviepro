import {useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,ScrollView,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router} from 'expo-router';
import {Text,TextInput} from '@/i18n';
import {ApiError,money} from '@/api';
import {AsyncButton} from '@/components/AsyncButton';
import {AppShell} from '@/components/AppShell';
import {useFeedback} from '@/components/Feedback';
import {theme} from '@/theme';
import {decimalInput,integerInput} from '@/inputFormatters';
import {projectDaysFromStages} from '@/servicePlanning';
import {quotesApi} from '../api/quotes.api';
import type {PricingResult,QuoteClientOption,QuoteProductOption,QuoteServiceOption} from '../types/quote.types';

const steps=['Cliente','Itens','Calcular','Revisão'];
type CostLine={label:string;value:string};
type StageLine={description:string;duration?:string|null};
type ServiceItem={serviceId:string;name:string;code?:string;days:string;people:string;margin:string;minimumDailyCents:number;team:CostLine[];variable:CostLine[];fixed:CostLine[];stages:StageLine[]};
type ProductItem={productId:string;name:string;sku:string;unit:string;quantity:string;unitPrice:string;discount:string;available:number};
const toReais=(cents:number)=>String((cents??0)/100);
const toCents=(value:string)=>Math.max(0,Math.round((Number(value.replace(',','.'))||0)*100));

export default function QuoteWizard({embedded=false,onClose,onSaved}:{embedded?:boolean;onClose?:()=>void;onSaved?:()=>void}={}){
  const {notify}=useFeedback();
  const {width}=useWindowDimensions();
  const small=width<620;
  const [step,setStep]=useState(0);
  const [clients,setClients]=useState<QuoteClientOption[]>([]);
  const [clientSearch,setClientSearch]=useState('');
  const [services,setServices]=useState<QuoteServiceOption[]>([]);
  const [products,setProducts]=useState<QuoteProductOption[]>([]);
  const [productSearch,setProductSearch]=useState('');
  const [clientId,setClientId]=useState('');
  const [paymentLinkUrl,setPaymentLinkUrl]=useState('');
  const [selectedServices,setSelectedServices]=useState<string[]>([]);
  const [serviceItems,setServiceItems]=useState<ServiceItem[]>([]);
  const [productItems,setProductItems]=useState<ProductItem[]>([]);
  const [results,setResults]=useState<PricingResult[]>([]);
  const [discount,setDiscount]=useState('0');
  const [validity,setValidity]=useState('30');
  const [notes,setNotes]=useState('');
  const [busy,setBusy]=useState(false);
  const [errors,setErrors]=useState<Record<string,string>>({});

  useEffect(()=>{
    Promise.all([quotesApi.clients(),quotesApi.services(),quotesApi.products(),quotesApi.wizardAccount()])
      .then(([c,s,p,a])=>{
        setClients(c);
        setServices(s.filter(x=>x.active!==false));
        setProducts(p.filter(x=>x.active!==false));
        setValidity(String(a?.tenant?.proposalValidityDays??30));
        if(c.length)setClientId(current=>current||c[0].id);
      })
      .catch((error:unknown)=>notify({tone:'error',title:'Não foi possível carregar o orçamento',message:error instanceof Error?error.message:'Tente novamente.'}));
  },[notify]);

  useEffect(()=>{
    setServiceItems(previous=>selectedServices.map(id=>{
      const old=previous.find(x=>x.serviceId===id);
      if(old)return old;
      const service=services.find(x=>x.id===id);
      if(!service)return null;
      const members=service.team?.filter(x=>x.included!==false)??[];
      const variableCosts=service.costs?.filter(x=>x.type==='variable')??[];
      const fixedCosts=service.costs?.filter(x=>x.type==='fixed')??[];
      const mapped=members.map(x=>({label:x.role,value:toReais(x.dailyRateCents)}));
      const hasResponsible=mapped.some(x=>/p\.?o\.?|respons[aá]vel|minha di[aá]ria/i.test(x.label));
      return {
        serviceId:id,name:service.name,code:service.code??undefined,
        days:String(projectDaysFromStages(service.stages,service.defaultDays??1)),people:String(service.people??1),margin:String((service.safetyMarginBps??0)/100),minimumDailyCents:service.dailyRateCents||0,
        team:hasResponsible?mapped:[{label:'P.O. responsável',value:'0'},...mapped],
        variable:variableCosts.length?variableCosts.map(x=>({label:x.description,value:toReais(x.amountCents)})):(service.variableCostCents?[{label:'Despesas por dia',value:toReais(service.variableCostCents)}]:[]),
        fixed:fixedCosts.length?fixedCosts.map(x=>({label:x.description,value:toReais(x.amountCents)})):(service.fixedCostCents?[{label:'Custo do projeto',value:toReais(service.fixedCostCents)}]:[]),
        stages:(service.stages??[]).filter(x=>x.description?.trim()).map(x=>({description:x.description!.trim(),duration:x.duration}))
      };
    }).filter((item):item is ServiceItem=>item!==null));
  },[selectedServices,services]);

  useEffect(()=>{
    if(!serviceItems.length){setResults([]);return;}
    const timer=setTimeout(()=>Promise.all(serviceItems.map(item=>quotesApi.calculate({
      dailyRateCents:Math.max(item.minimumDailyCents,item.team.reduce((sum,line)=>sum+toCents(line.value),0)),
      days:Number(item.days)||1,people:Number(item.people)||1,
      variableCostCents:item.variable.reduce((sum,line)=>sum+toCents(line.value),0),
      fixedCostCents:item.fixed.reduce((sum,line)=>sum+toCents(line.value),0),
      safetyMarginBps:Math.round((Number(item.margin)||0)*100)
    }))).then(setResults),180);
    return()=>clearTimeout(timer);
  },[serviceItems]);

  const serviceSubtotal=results.reduce((sum,x)=>sum+Number(x?.totalCents??0),0);
  const productSubtotal=productItems.reduce((sum,item)=>{
    const qty=Math.max(1,Number(item.quantity)||1),price=toCents(item.unitPrice),bps=Math.max(0,Math.min(10000,Math.round((Number(item.discount)||0)*100)));
    return sum+Math.round(qty*price*(10000-bps)/10000);
  },0);
  const subtotal=serviceSubtotal+productSubtotal;
  const discountBps=Math.max(0,Math.min(10000,Math.round((Number(discount)||0)*100)));
  const finalTotal=Math.round(subtotal*(10000-discountBps)/10000);
  const visibleProducts=useMemo(()=>products.filter(p=>`${p.name} ${p.sku} ${p.description??''}`.toLowerCase().includes(productSearch.toLowerCase().trim())).slice(0,12),[products,productSearch]);

  const clearError=(key:string)=>setErrors(current=>{if(!current[key])return current;const next={...current};delete next[key];return next;});
  const toggleService=(id:string)=>{clearError('items');setSelectedServices(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);};
  const addProduct=(product:QuoteProductOption)=>{clearError('items');setProductItems(current=>{
    if(current.some(x=>x.productId===product.id))return current;
    return [...current,{productId:product.id,name:product.name,sku:product.sku,unit:product.unit,quantity:'1',unitPrice:toReais(product.salePriceCents),discount:'0',available:product.stockQuantity-product.reservedQuantity}];
  });};
  const updateProduct=(id:string,key:'quantity'|'unitPrice'|'discount',value:string)=>{clearError(`product-${id}-${key}`);setProductItems(current=>current.map(x=>x.productId===id?{...x,[key]:value}:x));};
  const removeProduct=(id:string)=>setProductItems(current=>current.filter(x=>x.productId!==id));
  const updateService=(index:number,key:'days'|'people'|'margin',value:string)=>{clearError(`service-${index}-${key}`);setServiceItems(current=>current.map((x,i)=>i===index?{...x,[key]:value}:x));};
  const updateLine=(itemIndex:number,group:'team'|'variable'|'fixed',lineIndex:number,key:keyof CostLine,value:string)=>{clearError(`service-${itemIndex}-${group}-${lineIndex}-${key}`);setServiceItems(current=>current.map((item,i)=>i===itemIndex?{...item,[group]:item[group].map((line,j)=>j===lineIndex?{...line,[key]:value}:line)}:item));};
  const addLine=(itemIndex:number,group:'team'|'variable'|'fixed')=>setServiceItems(current=>current.map((item,i)=>i===itemIndex?{...item,[group]:[...item[group],{label:group==='team'?'Assistente':'Novo custo',value:'0'}]}:item));
  const removeLine=(itemIndex:number,group:'team'|'variable'|'fixed',lineIndex:number)=>setServiceItems(current=>current.map((item,i)=>i===itemIndex?{...item,[group]:item[group].filter((_,j)=>j!==lineIndex)}:item));
  const removeService=(id:string)=>setSelectedServices(ids=>ids.filter(x=>x!==id));

  const next=()=>{
    const nextErrors:Record<string,string>={};
    if(step===0&&!clientId)nextErrors.client='Selecione uma cliente para continuar.';
    if(step===1&&!selectedServices.length&&!productItems.length)nextErrors.items='Inclua pelo menos um serviço ou produto.';
    if(step===2){
      serviceItems.forEach((item,index)=>{
        if((Number(item.people)||0)<1)nextErrors[`service-${index}-people`]='Informe ao menos 1 pessoa.';
        if((Number(item.days)||0)<1)nextErrors[`service-${index}-days`]='Informe ao menos 1 dia.';
        const margin=Number(item.margin.replace(',','.'));if(!Number.isFinite(margin)||margin<0)nextErrors[`service-${index}-margin`]='Informe uma margem válida.';
        (['team','variable','fixed'] as const).forEach(group=>item[group].forEach((line,lineIndex)=>{const value=Number(String(line.value).replace(',','.'));if(!line.label.trim()&&value>0)nextErrors[`service-${index}-${group}-${lineIndex}-label`]='Informe a descrição deste item.';if(!Number.isFinite(value)||value<0)nextErrors[`service-${index}-${group}-${lineIndex}-value`]='Informe um valor válido.';}));
      });
      productItems.forEach(item=>{const qty=Number(item.quantity)||0;if(qty<1)nextErrors[`product-${item.productId}-quantity`]='Informe uma quantidade maior que zero.';else if(qty>item.available)nextErrors[`product-${item.productId}-quantity`]=`Disponível no estoque: ${item.available} ${item.unit}.`;if(toCents(item.unitPrice)<0)nextErrors[`product-${item.productId}-unitPrice`]='Informe um preço válido.';});
    }
    setErrors(nextErrors);if(Object.keys(nextErrors).length)return;
    setStep(value=>Math.min(3,value+1));
  };

  async function save(){
    const nextErrors:Record<string,string>={};const validityDays=Number(validity);if(!Number.isInteger(validityDays)||validityDays<1||validityDays>365)nextErrors.validity='Informe uma validade entre 1 e 365 dias.';if(!clientId)nextErrors.client='Selecione uma cliente.';if(!serviceItems.length&&!productItems.length)nextErrors.items='Inclua pelo menos um serviço ou produto.';setErrors(nextErrors);if(Object.keys(nextErrors).length)return;
    try{
      setBusy(true);
      await quotesApi.create({
        clientId,discountBps,validityDays,notes,paymentLinkUrl:paymentLinkUrl.trim()||undefined,
        items:serviceItems.map(item=>({serviceId:item.serviceId,days:Number(item.days)||1,people:Number(item.people)||1,dailyRateCents:Math.max(item.minimumDailyCents,item.team.reduce((sum,line)=>sum+toCents(line.value),0)),variableCostCents:item.variable.reduce((sum,line)=>sum+toCents(line.value),0),fixedCostCents:item.fixed.reduce((sum,line)=>sum+toCents(line.value),0),safetyMarginBps:Math.round((Number(item.margin)||0)*100)})),
        productItems:productItems.map(item=>({productId:item.productId,quantity:Number(item.quantity)||1,unitPriceCents:toCents(item.unitPrice),discountBps:Math.round((Number(item.discount)||0)*100)}))
      });
      notify({tone:'success',title:'Orçamento criado',message:'Serviços e produtos foram salvos na proposta.'});
      if(embedded){onSaved?.();onClose?.();}else router.replace('/quotes');
    }catch(error:unknown){notify({tone:'error',title:'Erro ao criar orçamento',message:error instanceof ApiError||error instanceof Error?error.message:'Não foi possível criar o orçamento'});}finally{setBusy(false);}
  }

  const content=<View style={s.container}>
    <View style={s.steps}>{steps.map((label,index)=><View key={label} style={s.stepWrap}><View style={[s.stepCircle,index<=step&&s.stepCircleOn]}>{index<step?<Ionicons name="checkmark" size={14} color={theme.white}/>:<Text style={[s.stepNumber,index<=step&&s.stepNumberOn]}>{index+1}</Text>}</View>{!small&&<Text style={[s.stepLabel,index===step&&s.stepLabelOn]}>{label}</Text>}{index<steps.length-1&&<Ionicons name="chevron-forward" size={14} color={theme.border}/>}</View>)}</View>

    {step===0&&<View style={s.card}><Text style={s.cardTitle}>Selecionar cliente</Text><Text style={s.cardSub}>Escolha para quem este orçamento será preparado.</Text><TextInput value={clientSearch} onChangeText={setClientSearch} placeholder="Buscar por nome, cidade, telefone ou e-mail..." style={s.input}/><View style={s.list}>{clients.filter(c=>`${c.name} ${c.city??''} ${c.phone??''} ${c.email??''}`.toLowerCase().includes(clientSearch.toLowerCase().trim())).slice(0,8).map(client=><Pressable key={client.id} onPress={()=>{setClientId(client.id);clearError('client')}} style={[s.choice,clientId===client.id&&s.choiceOn]}><View style={s.avatar}><Text style={s.avatarText}>{client.name.slice(0,2).toUpperCase()}</Text></View><View style={s.choiceInfo}><Text style={s.choiceTitle}>{client.name}</Text><Text style={s.choiceMeta}>{[client.city,client.phone].filter(Boolean).join(' · ')||'Sem contato informado'}</Text></View>{clientId===client.id&&<Ionicons name="checkmark-circle" size={22} color={theme.green2}/>}</Pressable>)}</View>{errors.client&&<Text style={s.errorText}>{errors.client}</Text>}</View>}

    {step===1&&<View style={s.configure}>
      <View style={s.card}><View style={s.cardHead}><View><Text style={s.cardTitle}>Serviços</Text><Text style={s.cardSub}>Opcional. Selecione um ou mais serviços.</Text></View><View style={s.counter}><Text style={s.counterText}>{selectedServices.length}</Text></View></View><View style={s.list}>{services.map(service=>{const on=selectedServices.includes(service.id);return <Pressable key={service.id} onPress={()=>toggleService(service.id)} style={[s.choice,on&&s.choiceOn]}><View style={[s.serviceIcon,on&&s.serviceIconOn]}><Ionicons name={on?'checkmark':'add'} size={17} color={on?theme.white:theme.green2}/></View><View style={s.choiceInfo}><Text style={s.code}>{service.code??'SERVIÇO'}</Text><Text style={s.choiceTitle}>{service.name}</Text><Text style={s.choiceMeta}>{projectDaysFromStages(service.stages,service.defaultDays??1)} dia(s) · {service.stages?.length??0} etapa(s)</Text></View><Text style={s.baseValue}>{money(service.dailyRateCents)}</Text></Pressable>})}</View></View>
      <View style={s.card}><View style={s.cardHead}><View><Text style={s.cardTitle}>Produtos</Text><Text style={s.cardSub}>Opcional. Pode criar orçamento somente de produtos ou complementar os serviços.</Text></View><View style={s.counter}><Text style={s.counterText}>{productItems.length}</Text></View></View><TextInput value={productSearch} onChangeText={setProductSearch} placeholder="Buscar produto por nome ou SKU..." style={s.input}/><View style={[s.list,{marginTop:12}]}>{visibleProducts.map(product=>{const added=productItems.some(x=>x.productId===product.id);const available=product.stockQuantity-product.reservedQuantity;return <Pressable key={product.id} disabled={added||available<=0} onPress={()=>addProduct(product)} style={[s.choice,added&&s.choiceOn,(available<=0)&&s.disabled]}><View style={s.productIcon}><Ionicons name="cube-outline" size={17} color={theme.green2}/></View><View style={s.choiceInfo}><Text style={s.code}>{product.sku}</Text><Text style={s.choiceTitle}>{product.name}</Text><Text style={s.choiceMeta}>Disponível: {available} {product.unit} · reservado: {product.reservedQuantity}</Text></View><Text style={s.baseValue}>{money(product.salePriceCents)}</Text><Ionicons name={added?'checkmark-circle':'add-circle-outline'} size={21} color={theme.green2}/></Pressable>})}</View>{!products.length&&<Text style={s.noLines}>Nenhum produto ativo cadastrado.</Text>}</View>
      {errors.items&&<Text style={s.errorText}>{errors.items}</Text>}
    </View>}

    {step===2&&<View style={s.configure}><View><Text style={s.cardTitle}>Calcular orçamento</Text><Text style={s.cardSub}>Ajuste serviços e produtos. O total é atualizado automaticamente.</Text></View>{serviceItems.map((item,index)=>{const result=results[index];const daily=item.team.reduce((sum,line)=>sum+toCents(line.value),0);return <View key={item.serviceId} style={s.calcItem}><View style={s.itemHead}><View style={s.itemNumber}><Text style={s.itemNumberText}>{index+1}</Text></View><View style={s.choiceInfo}><Text style={s.code}>{item.code??'SERVIÇO'}</Text><Text style={s.itemTitle}>{item.name}</Text></View><Pressable onPress={()=>removeService(item.serviceId)} style={s.remove}><Ionicons name="trash-outline" size={17} color={theme.danger}/></Pressable></View><View style={[s.calcColumns,small&&s.calcColumnsSmall]}><View style={s.calcForm}><Text style={s.calcSection}>Equipe e dias</Text><View style={s.twoFields}><Field label="QTDE DE PESSOAS" value={item.people} error={errors[`service-${index}-people`]} change={v=>updateService(index,'people',integerInput(v,3))}/><Field label={item.stages.length?'DIAS DE PROJETO · PELAS ETAPAS':'DIAS DE PROJETO'} value={item.days} error={errors[`service-${index}-days`]} editable={item.stages.length===0} change={v=>updateService(index,'days',integerInput(v,3))}/></View>{item.stages.length?<Text style={s.daysHelper}>Calculado automaticamente pela soma das durações das etapas cadastradas no serviço.</Text>:null}<LineGroup title="Diárias da equipe" group="team" lines={item.team} itemIndex={index} update={updateLine} add={addLine} remove={removeLine} errors={errors}/><LineGroup title="Custos variáveis" hint="por dia" group="variable" lines={item.variable} itemIndex={index} update={updateLine} add={addLine} remove={removeLine} errors={errors}/><StageSummary stages={item.stages}/></View><View style={s.calcSide}><View style={s.fixedCard}><LineGroup title="Custos fixos" hint="por projeto" group="fixed" lines={item.fixed} itemIndex={index} update={updateLine} add={addLine} remove={removeLine} errors={errors}/></View><View style={s.liveCard}><Text style={s.calcSection}>Cálculo ao vivo</Text><CalcLine label="Diária base da equipe" value={daily}/><CalcLine label={`Equipe × ${item.days||1} dias`} value={Number(result?.laborCents??0)}/><CalcLine label={`Custos variáveis × ${item.days||1} dias`} value={Number(result?.variableCents??0)}/><CalcLine label="Custos fixos" value={Number(result?.fixedCents??0)}/><CalcLine label={`Margem (${item.margin||0}%)`} value={Number(result?.marginCents??0)} gold/><View style={s.liveTotal}><Text style={s.liveTotalLabel}>Total do serviço</Text><Text style={s.liveTotalValue}>{money(Number(result?.totalCents??0))}</Text></View><View style={s.marginField}><Field label="MARGEM (%)" value={item.margin} error={errors[`service-${index}-margin`]} change={v=>updateService(index,'margin',decimalInput(v,2,999.99))}/></View></View></View></View></View>})}
      {!!productItems.length&&<View style={s.card}><Text style={s.cardTitle}>Produtos</Text><Text style={s.cardSub}>O estoque disponível é validado agora e será reservado quando a proposta for aprovada.</Text>{productItems.map(item=>{const qty=Number(item.quantity)||0;const price=toCents(item.unitPrice);const bps=Math.round((Number(item.discount)||0)*100);const total=Math.round(Math.max(0,qty)*price*(10000-Math.min(10000,Math.max(0,bps)))/10000);const invalid=qty<1||qty>item.available;return <View key={item.productId} style={[s.productLine,invalid&&s.productLineInvalid]}><View style={s.productLineHead}><View style={s.choiceInfo}><Text style={s.code}>{item.sku}</Text><Text style={s.itemTitle}>{item.name}</Text><Text style={[s.choiceMeta,invalid&&{color:theme.danger}]}>Disponível: {item.available} {item.unit}</Text></View><Pressable onPress={()=>removeProduct(item.productId)} style={s.remove}><Ionicons name="trash-outline" size={17} color={theme.danger}/></Pressable></View><View style={[s.productFields,small&&s.calcColumnsSmall]}><Field label="QUANTIDADE" value={item.quantity} error={errors[`product-${item.productId}-quantity`]} change={v=>updateProduct(item.productId,'quantity',integerInput(v,5))}/><MoneyField label="PREÇO UNITÁRIO" value={item.unitPrice} error={errors[`product-${item.productId}-unitPrice`]} change={v=>updateProduct(item.productId,'unitPrice',decimalInput(v,2,999999.99))}/><Field label="DESCONTO (%)" value={item.discount} change={v=>updateProduct(item.productId,'discount',decimalInput(v,2,100))}/><View style={s.productTotal}><Text style={s.fieldLabel}>TOTAL</Text><Text style={s.productTotalValue}>{money(total)}</Text></View></View></View>})}</View>}
      <View style={[s.grandWrap,small&&s.grandWrapSmall]}><View style={s.discountControl}><Text style={s.fieldLabel}>DESCONTO GLOBAL (%)</Text><TextInput value={discount} onChangeText={v=>setDiscount(decimalInput(v,2,100))} keyboardType="decimal-pad" style={s.input}/></View><View style={s.grandTotal}><View><Text style={s.summaryMini}>Serviços {money(serviceSubtotal)} · Produtos {money(productSubtotal)}</Text><Text style={s.grandLabel}>Total do orçamento</Text></View><Text style={s.grandValue}>{money(finalTotal)}</Text></View></View>
    </View>}

    {step===3&&<View style={s.card}><Text style={s.cardTitle}>Revisão final</Text><Text style={s.cardSub}>Confira serviços, produtos e condições antes de salvar.</Text><View style={s.reviewClient}><Text style={s.reviewLabel}>CLIENTE</Text><Text style={s.reviewClientName}>{clients.find(x=>x.id===clientId)?.name}</Text></View>{serviceItems.map((item,index)=><View key={item.serviceId} style={s.reviewItem}><View><Text style={s.reviewName}>{item.name}</Text><Text style={s.choiceMeta}>{item.days} dia(s) · {item.people} pessoa(s)</Text></View><Text style={s.reviewValue}>{money(results[index]?.totalCents??0)}</Text></View>)}{productItems.map(item=>{const qty=Number(item.quantity)||1;const bps=Math.round((Number(item.discount)||0)*100);const total=Math.round(qty*toCents(item.unitPrice)*(10000-Math.min(10000,Math.max(0,bps)))/10000);return <View key={item.productId} style={s.reviewItem}><View><Text style={s.reviewName}>{item.name}</Text><Text style={s.choiceMeta}>{qty} {item.unit} · {item.sku}</Text></View><Text style={s.reviewValue}>{money(total)}</Text></View>})}<View style={[s.conditions,small&&s.calcColumnsSmall]}><Field label="Desconto (%)" value={discount} change={v=>setDiscount(decimalInput(v,2,100))}/><Field label="Validade (dias)" value={validity} error={errors.validity} change={v=>{clearError('validity');setValidity(integerInput(v,3))}}/></View><Text style={s.fieldLabel}>Observações</Text><TextInput value={notes} onChangeText={setNotes} multiline placeholder="Condições, detalhes ou observações..." style={[s.input,s.notes]}/><Text style={s.fieldLabel}>Link de pagamento</Text><TextInput value={paymentLinkUrl} onChangeText={setPaymentLinkUrl} autoCapitalize="none" keyboardType="url" placeholder="https://... (opcional)" style={s.input}/><Text style={s.lineHint}>O botão Pagar agora será exibido ao cliente após a aprovação.</Text><View style={s.summary}><View style={s.summaryLine}><Text style={s.summaryLabel}>Serviços</Text><Text style={s.summaryValue}>{money(serviceSubtotal)}</Text></View><View style={s.summaryLine}><Text style={s.summaryLabel}>Produtos</Text><Text style={s.summaryValue}>{money(productSubtotal)}</Text></View><View style={s.summaryLine}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryValue}>{money(subtotal)}</Text></View>{discountBps>0&&<View style={s.summaryLine}><Text style={s.summaryLabel}>Desconto ({discount}%)</Text><Text style={s.discount}>- {money(subtotal-finalTotal)}</Text></View>}<View style={s.finalLine}><Text style={s.finalLabel}>Total final</Text><Text style={s.finalValue}>{money(finalTotal)}</Text></View></View></View>}

    <View style={s.navigation}><Pressable disabled={step===0} onPress={()=>setStep(v=>Math.max(0,v-1))} style={[s.back,step===0&&s.disabled]}><Ionicons name="chevron-back" size={16} color={theme.green2}/><Text style={s.backText}>Voltar</Text></Pressable>{step<3?<Pressable onPress={next} style={s.next}><Text style={s.nextText}>Continuar</Text><Ionicons name="chevron-forward" size={16} color={theme.g900}/></Pressable>:<AsyncButton busy={busy} onPress={save} label="Salvar orçamento" style={s.next}/>}</View>
  </View>;
  return embedded?<ScrollView contentContainerStyle={{padding:24,alignItems:'center'}}>{content}</ScrollView>:<AppShell title="Novo orçamento">{content}</AppShell>;
}

function StageSummary({stages}:{stages:StageLine[]}){return <View style={s.stageSummary}><View style={s.stageSummaryHead}><Text style={s.lineTitle}>Etapas do serviço</Text><Text style={s.lineHint}>{stages.length} etapa(s)</Text></View>{stages.length===0?<Text style={s.noLines}>Nenhuma etapa padrão cadastrada.</Text>:stages.map((stage,index)=><View key={`${stage.description}-${index}`} style={s.stageRow}><View style={s.stageIndex}><Text style={s.stageIndexText}>{index+1}</Text></View><Text style={s.stageDescription}>{stage.description}</Text>{stage.duration?<Text style={s.stageDuration}>{stage.duration}</Text>:null}</View>)}</View>}
function LineGroup({title,hint,group,lines,itemIndex,update,add,remove,errors}:{title:string;hint?:string;group:'team'|'variable'|'fixed';lines:CostLine[];itemIndex:number;update:(i:number,g:'team'|'variable'|'fixed',l:number,k:keyof CostLine,v:string)=>void;add:(i:number,g:'team'|'variable'|'fixed')=>void;remove:(i:number,g:'team'|'variable'|'fixed',l:number)=>void;errors?:Record<string,string>}){return <View style={s.lineGroup}><View style={s.lineGroupHead}><View style={s.lineTitleRow}><Text style={s.lineTitle}>{title}</Text>{hint&&<Text style={s.lineHint}>({hint})</Text>}</View></View>{lines.length===0?<Text style={s.noLines}>Nenhum item adicionado.</Text>:lines.map((line,lineIndex)=>{const labelError=errors?.[`service-${itemIndex}-${group}-${lineIndex}-label`],valueError=errors?.[`service-${itemIndex}-${group}-${lineIndex}-value`];return <View key={`${group}-${lineIndex}`}><View style={s.costRow}><TextInput value={line.label} onChangeText={v=>update(itemIndex,group,lineIndex,'label',v)} placeholder="Descrição" style={[s.input,s.costName,!!labelError&&s.inputError]}/><View style={[s.costValue,!!valueError&&s.inputError]}><Text style={s.currency}>R$</Text><TextInput value={line.value} onChangeText={v=>update(itemIndex,group,lineIndex,'value',v)} keyboardType="decimal-pad" style={s.costValueInput}/></View><Pressable onPress={()=>remove(itemIndex,group,lineIndex)} style={s.lineRemove}><Ionicons name="close" size={15} color={theme.danger}/></Pressable></View>{labelError?<Text style={s.errorText}>{labelError}</Text>:valueError?<Text style={s.errorText}>{valueError}</Text>:null}</View>})}<Pressable onPress={()=>add(itemIndex,group)} style={s.miniAdd}><Ionicons name="add" size={13} color={theme.green2}/><Text style={s.miniAddText}>Adicionar</Text></Pressable></View>}
function CalcLine({label,value,gold}:{label:string;value:number;gold?:boolean}){return <View style={s.calcLine}><Text style={s.calcLineLabel}>{label}</Text><Text style={[s.calcLineValue,gold&&s.calcLineGold]}>{money(value)}</Text></View>}
function Field({label,value,change,error,editable=true}:{label:string;value:string;change:(value:string)=>void;error?:string;editable?:boolean}){return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput value={value} editable={editable} onChangeText={change} keyboardType="decimal-pad" style={[s.input,!editable&&s.inputReadonly,!!error&&s.inputError]}/>{error?<Text style={s.errorText}>{error}</Text>:null}</View>}
function MoneyField({label,value,change,error}:{label:string;value:string;change:(value:string)=>void;error?:string}){return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={[s.moneyInput,!!error&&s.inputError]}><Text style={s.currency}>R$</Text><TextInput value={value} onChangeText={change} keyboardType="decimal-pad" style={s.costValueInput}/></View>{error?<Text style={s.errorText}>{error}</Text>:null}</View>}

const s=StyleSheet.create({
  container:{maxWidth:980,width:'100%'},steps:{flexDirection:'row',alignItems:'center',marginBottom:24,gap:9},stepWrap:{flexDirection:'row',alignItems:'center',gap:7},stepCircle:{width:28,height:28,borderRadius:14,backgroundColor:theme.border,alignItems:'center',justifyContent:'center'},stepCircleOn:{backgroundColor:theme.green2},stepNumber:{fontSize:12,fontWeight:'800',color:theme.muted},stepNumberOn:{color:theme.white},stepLabel:{fontSize:12,color:theme.muted},stepLabelOn:{fontWeight:'800',color:theme.green2},
  configure:{gap:13},card:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:17,padding:22},cardTitle:{fontFamily:'serif',fontSize:19,fontWeight:'700',color:theme.ink},cardSub:{fontSize:12,color:theme.muted,marginTop:4,marginBottom:18},cardHead:{flexDirection:'row',justifyContent:'space-between',gap:12},counter:{backgroundColor:theme.green50,borderRadius:12,paddingHorizontal:10,paddingVertical:6,height:26},counterText:{fontSize:11,fontWeight:'800',color:theme.green2},list:{gap:9},choice:{minHeight:66,borderWidth:1,borderColor:theme.border,borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:11},choiceOn:{borderColor:theme.green2,backgroundColor:theme.green50},avatar:{width:37,height:37,borderRadius:19,backgroundColor:theme.goldPale,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:12,fontWeight:'800',color:theme.gold},choiceInfo:{flex:1,minWidth:0},choiceTitle:{fontSize:14,fontWeight:'700',color:theme.ink},choiceMeta:{fontSize:11,color:theme.muted,marginTop:3},serviceIcon:{width:34,height:34,borderRadius:10,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},serviceIconOn:{backgroundColor:theme.green2},productIcon:{width:34,height:34,borderRadius:10,backgroundColor:theme.goldPale,alignItems:'center',justifyContent:'center'},code:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:theme.gold,marginBottom:2},baseValue:{fontSize:13,fontWeight:'800',color:theme.green2},
  input:{borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:10,paddingVertical:9,fontSize:12,color:theme.ink,backgroundColor:theme.white},inputReadonly:{backgroundColor:theme.green50,color:theme.muted},daysHelper:{fontSize:10,color:theme.muted,marginTop:-2,marginBottom:8},inputError:{borderColor:theme.danger},errorText:{fontSize:11,color:theme.danger,marginTop:5},calcItem:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:16,padding:18,gap:15},itemHead:{flexDirection:'row',alignItems:'center',gap:10},itemNumber:{width:28,height:28,borderRadius:8,backgroundColor:theme.green2,alignItems:'center',justifyContent:'center'},itemNumberText:{fontSize:12,fontWeight:'800',color:theme.white},itemTitle:{fontFamily:'serif',fontSize:15,fontWeight:'700',color:theme.ink},remove:{padding:8},calcColumns:{flexDirection:'row',alignItems:'flex-start',gap:16},calcColumnsSmall:{flexDirection:'column'},calcForm:{flex:1.15,width:'100%',borderWidth:1,borderColor:theme.border,borderRadius:13,padding:15},calcSide:{flex:1,width:'100%',gap:13},calcSection:{fontFamily:'serif',fontSize:15,fontWeight:'700',color:theme.ink},twoFields:{flexDirection:'row',gap:10,marginTop:13},field:{flex:1,minWidth:110},fieldLabel:{fontSize:11,fontWeight:'800',letterSpacing:.5,color:theme.muted,marginBottom:6},
  lineGroup:{marginTop:16},lineGroupHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:7},lineTitleRow:{flexDirection:'row',alignItems:'center',gap:4},lineTitle:{fontFamily:'serif',fontSize:14,fontWeight:'700',color:theme.ink},lineHint:{fontSize:11,color:theme.muted},miniAdd:{flexDirection:'row',alignItems:'center',gap:2},miniAddText:{fontSize:11,fontWeight:'800',color:theme.green2},costRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:6},costName:{flex:1},costValue:{width:105,height:38,borderWidth:1,borderColor:theme.border,borderRadius:9,flexDirection:'row',alignItems:'center',paddingHorizontal:8},moneyInput:{height:39,borderWidth:1,borderColor:theme.border,borderRadius:9,flexDirection:'row',alignItems:'center',paddingHorizontal:8,backgroundColor:theme.white},currency:{fontSize:11,color:theme.muted},costValueInput:{flex:1,fontSize:12,color:theme.ink,paddingVertical:7},lineRemove:{padding:5},noLines:{fontSize:11,color:theme.muted,paddingVertical:8},
  stageSummary:{marginTop:16,borderTopWidth:1,borderTopColor:theme.border,paddingTop:13},stageSummaryHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6},stageRow:{minHeight:34,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:5,borderBottomWidth:1,borderBottomColor:'#EEF1EE'},stageIndex:{width:22,height:22,borderRadius:11,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},stageIndexText:{fontSize:10,fontWeight:'900',color:theme.green2},stageDescription:{flex:1,fontSize:11,color:theme.ink},stageDuration:{fontSize:10,fontWeight:'800',color:theme.muted},fixedCard:{borderWidth:1,borderColor:theme.border,borderRadius:13,padding:15},liveCard:{borderWidth:1,borderColor:theme.goldLight,borderRadius:13,padding:15,backgroundColor:theme.goldPale},calcLine:{flexDirection:'row',justifyContent:'space-between',gap:10,paddingVertical:7,borderBottomWidth:1,borderBottomColor:'rgba(201,168,76,.18)'},calcLineLabel:{flex:1,fontSize:11,color:theme.muted},calcLineValue:{fontSize:11,fontWeight:'800',color:theme.ink},calcLineGold:{color:theme.gold},liveTotal:{backgroundColor:theme.green,borderRadius:10,padding:13,marginTop:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},liveTotalLabel:{fontSize:11,color:'rgba(255,255,255,.7)'},liveTotalValue:{fontFamily:'serif',fontSize:17,fontWeight:'700',color:theme.goldLight},marginField:{marginTop:11},
  productLine:{borderTopWidth:1,borderTopColor:theme.border,paddingVertical:14},productLineInvalid:{backgroundColor:'#FFF7F6',paddingHorizontal:10,borderRadius:10},productLineHead:{flexDirection:'row',alignItems:'center'},productFields:{flexDirection:'row',gap:10,marginTop:12,alignItems:'flex-end'},productTotal:{minWidth:130},productTotalValue:{height:39,paddingHorizontal:10,paddingVertical:10,borderRadius:9,backgroundColor:theme.green50,fontSize:13,fontWeight:'800',color:theme.green2},
  grandWrap:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:13,padding:13,flexDirection:'row',alignItems:'flex-end',gap:13},grandWrapSmall:{flexDirection:'column',alignItems:'stretch'},discountControl:{width:170},grandTotal:{flex:1,backgroundColor:theme.green,borderRadius:10,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},grandLabel:{fontFamily:'serif',fontSize:15,fontWeight:'700',color:theme.white},grandValue:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.goldLight},summaryMini:{fontSize:10,color:'rgba(255,255,255,.62)',marginBottom:3},
  reviewClient:{backgroundColor:theme.green50,borderRadius:11,padding:13,marginBottom:13},reviewLabel:{fontSize:11,fontWeight:'800',letterSpacing:1,color:theme.muted},reviewClientName:{fontSize:14,fontWeight:'800',color:theme.ink,marginTop:3},reviewItem:{borderTopWidth:1,borderTopColor:theme.border,paddingVertical:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},reviewName:{fontSize:13,fontWeight:'700',color:theme.ink},reviewValue:{fontSize:13,fontWeight:'800',color:theme.ink},conditions:{flexDirection:'row',gap:12,borderTopWidth:1,borderTopColor:theme.border,paddingTop:15,marginTop:3,marginBottom:14},notes:{minHeight:72,textAlignVertical:'top'},summary:{backgroundColor:theme.green,borderRadius:13,padding:16,marginTop:16},summaryLine:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5},summaryLabel:{fontSize:12,color:'rgba(255,255,255,.58)'},summaryValue:{fontSize:12,color:theme.white},discount:{fontSize:12,color:theme.goldLight},finalLine:{borderTopWidth:1,borderTopColor:'rgba(255,255,255,.18)',marginTop:8,paddingTop:13,flexDirection:'row',justifyContent:'space-between'},finalLabel:{fontFamily:'serif',fontSize:16,fontWeight:'700',color:theme.goldLight},finalValue:{fontFamily:'serif',fontSize:18,fontWeight:'700',color:theme.goldLight},
  navigation:{flexDirection:'row',justifyContent:'space-between',marginTop:18},back:{height:42,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:theme.white},backText:{fontSize:12,fontWeight:'800',color:theme.green2},next:{height:42,borderRadius:10,paddingHorizontal:17,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:theme.gold},nextText:{fontSize:12,fontWeight:'800',color:theme.g900},disabled:{opacity:.4}
});
