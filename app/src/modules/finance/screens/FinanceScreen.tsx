import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppShell } from '../../../components/AppShell';
import { AsyncState } from '../../../components/AsyncState';
import { SearchField } from '../../../components/SearchField';
import { FormModal } from '../../../components/FormModal';
import { FormField } from '../../../components/FormField';
import { FilterChip } from '../../../components/BusinessList';
import { DateField, formatDateBR } from '../../../components/DateField';
import { Text } from '../../../i18n';
import { theme } from '../../../theme';
import { useFeedback } from '../../../components/Feedback';
import {
  financeApi,
  FinanceCategory,
  FinanceEntry,
  FinanceObligation,
  FinanceReport,
  FinanceSummary,
} from '../api/finance.api';

const money=(c:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((c||0)/100);
const cents=(v:string)=>Math.round((Number(v.replace(/\./g,'').replace(',','.'))||0)*100);
const dateTime=(v:string)=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const methodLabel:Record<string,string>={pix:'PIX',cash:'Dinheiro',bank_transfer:'Transferência',card:'Cartão',boleto:'Boleto',other:'Outro'};
type Tab='open'|'history'|'report';
type Kind='all'|'income'|'expense';

export function FinanceScreen(){
  const {width}=useWindowDimensions();
  const compact=width<760;
  const {notify}=useFeedback();
  const [summary,setSummary]=useState<FinanceSummary>();
  const [entries,setEntries]=useState<FinanceEntry[]>([]);
  const [obligations,setObligations]=useState<FinanceObligation[]>([]);
  const [categories,setCategories]=useState<FinanceCategory[]>([]);
  const [report,setReport]=useState<FinanceReport>();
  const [reportMonths,setReportMonths]=useState(12);
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [tab,setTab]=useState<Tab>('open');
  const [kind,setKind]=useState<Kind>('all');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [entryOpen,setEntryOpen]=useState(false);
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [payOpen,setPayOpen]=useState(false);
  const [selected,setSelected]=useState<FinanceObligation|null>(null);
  const [saving,setSaving]=useState(false);
  const [type,setType]=useState<'income'|'expense'>('expense');
  const [description,setDescription]=useState('');
  const [counterparty,setCounterparty]=useState('');
  const [amount,setAmount]=useState('');
  const [dueAt,setDueAt]=useState('');
  const [entryStatus,setEntryStatus]=useState<'pending'|'paid'>('pending');
  const [method,setMethod]=useState('pix');
  const [notes,setNotes]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [categoryName,setCategoryName]=useState('');
  const [errors,setErrors]=useState<Record<string,string>>({});

  const load=async(months=reportMonths)=>{
    setLoading(true);
    try{
      const [s,e,o,c,r]=await Promise.all([
        financeApi.summary(),financeApi.entries(),financeApi.obligations(),financeApi.categories(),financeApi.report(months),
      ]);
      setSummary(s);setEntries(e);setObligations(o);setCategories(c);setReport(r);
    }catch(err:any){
      notify({tone:'error',title:'Não foi possível carregar o financeiro',message:err?.message});
    }finally{setLoading(false)}
  };
  useEffect(()=>{void load()},[]);

  const matches=(values:unknown[])=>{const x=q.trim().toLowerCase();return !x||values.some(v=>String(v||'').toLowerCase().includes(x))};
  const inPeriod=(v?:string|null)=>{if(!v)return !from&&!to;const d=String(v).slice(0,10);return (!from||d>=from)&&(!to||d<=to)};
  const openRows=useMemo(()=>obligations.filter(e=>(kind==='all'||e.type===kind)&&matches([e.counterparty,e.referenceNumber,e.description,e.category])&&inPeriod(e.dueAt)),[obligations,q,kind,from,to]);
  const historyRows=useMemo(()=>entries.filter(e=>(kind==='all'||e.type===kind)&&matches([e.counterparty,e.referenceNumber,e.method,e.notes,e.description,e.category])&&inPeriod(e.date)),[entries,q,kind,from,to]);
  const resetForm=()=>{setType('expense');setDescription('');setCounterparty('');setAmount('');setDueAt('');setEntryStatus('pending');setMethod('pix');setNotes('');setCategoryId('');setErrors({})};
  const saveCategory=async()=>{if(categoryName.trim().length<2){setErrors(e=>({...e,categoryName:'Informe um nome com pelo menos 2 caracteres.'}));return}setErrors(e=>({...e,categoryName:''}));setSaving(true);try{const c=await financeApi.createCategory({name:categoryName.trim(),type});setCategoryName('');setCategoryOpen(false);await load();setCategoryId(c.id);notify({tone:'success',title:'Categoria criada'})}catch(e:any){notify({tone:'error',title:'Não foi possível criar categoria',message:e?.message})}finally{setSaving(false)}};
  const saveEntry=async()=>{const amountCents=cents(amount);const next:Record<string,string>={};if(!description.trim())next.description='Informe a descrição do lançamento.';if(amountCents<=0)next.amount='Informe um valor maior que zero.';setErrors(next);if(Object.keys(next).length)return;setSaving(true);try{await financeApi.createEntry({type,description:description.trim(),counterparty:counterparty.trim()||undefined,amountCents,categoryId:categoryId||undefined,dueAt:dueAt||undefined,status:entryStatus,method:entryStatus==='paid'?method:undefined,notes:notes.trim()||undefined});setEntryOpen(false);resetForm();await load();notify({tone:'success',title:entryStatus==='paid'?'Movimentação registrada':'Conta registrada'})}catch(e:any){notify({tone:'error',title:'Não foi possível salvar lançamento',message:e?.message})}finally{setSaving(false)}};
  const openPay=(row:FinanceObligation)=>{setSelected(row);setMethod('pix');setNotes('');setPayOpen(true)};
  const payManual=async()=>{if(!selected||selected.source!=='manual')return;setSaving(true);try{await financeApi.payEntry(selected.id,{method,notes:notes.trim()||undefined});setPayOpen(false);setSelected(null);await load();notify({tone:'success',title:'Baixa financeira registrada'})}catch(e:any){notify({tone:'error',title:'Não foi possível baixar a conta',message:e?.message})}finally{setSaving(false)}};
  const goSource=(row:FinanceObligation)=>{if(row.source==='order')router.push(`/orders?id=${encodeURIComponent(row.id)}` as Href);else if(row.source==='purchase')router.push(`/purchases?id=${encodeURIComponent(row.id)}` as Href);else openPay(row)};
  const overdue=(d?:string|null)=>!!d&&String(d).slice(0,10)<new Date().toISOString().slice(0,10);
  const typedCategories=categories.filter(c=>c.type===type);
  const maxMonthly=useMemo(()=>Math.max(1,...(report?.monthly??[]).flatMap(m=>[m.incomeCents,m.expenseCents,m.projectedIncomeCents,m.projectedExpenseCents])),[report]);
  const topCategories=useMemo(()=>report?.categories.slice(0,10)??[],[report]);
  const changeReportMonths=async(months:number)=>{setReportMonths(months);setLoading(true);try{setReport(await financeApi.report(months))}catch(e:any){notify({tone:'error',title:'Não foi possível atualizar o relatório',message:e?.message})}finally{setLoading(false)}};

  return <AppShell title="Financeiro" subtitle="Previsto × realizado, contas abertas, fluxo de caixa e relatórios">
    <View style={[s.metrics,compact&&s.wrap]}><Metric label="A receber" value={money(summary?.receivableCents||0)}/><Metric label="A pagar" value={money(summary?.payableCents||0)}/><Metric label="Saldo realizado / mês" value={money(summary?.netCashMonthCents||0)} strong/><Metric label="Resultado previsto / mês" value={money(summary?.projectedMonthCents||0)}/></View>
    <View style={[s.metrics,compact&&s.wrap]}><Metric label="Receber hoje" value={money(summary?.dueTodayReceivableCents||0)}/><Metric label="Pagar hoje" value={money(summary?.dueTodayPayableCents||0)}/><Metric label="Receber vencido" value={money(summary?.overdueReceivableCents||0)} warn={!!summary?.overdueReceivableCents}/><Metric label="Pagar vencido" value={money(summary?.overduePayableCents||0)} warn={!!summary?.overduePayableCents}/></View>
    <View style={[s.toolbar,compact&&s.wrap]}><Pressable style={[s.primary,compact&&s.toolbarButtonMobile]} onPress={()=>{resetForm();setEntryOpen(true)}}><Ionicons name="add" size={18} color={theme.white}/><Text style={s.primaryText}>Novo lançamento</Text></Pressable><Pressable style={[s.secondary,compact&&s.toolbarButtonMobile]} onPress={()=>setCategoryOpen(true)}><Ionicons name="pricetag-outline" size={17} color={theme.green2}/><Text style={s.secondaryText}>Nova categoria</Text></Pressable><Pressable style={[s.secondary,compact&&s.toolbarButtonMobile]} onPress={()=>router.push('/orders' as Href)}><Text style={s.secondaryText}>Vendas</Text></Pressable><Pressable style={[s.secondary,compact&&s.toolbarButtonMobile]} onPress={()=>router.push('/purchases' as Href)}><Text style={s.secondaryText}>Compras</Text></Pressable></View>
    <View style={s.tabs}><FilterChip label={`Contas abertas (${obligations.length})`} active={tab==='open'} onPress={()=>setTab('open')}/><FilterChip label={`Movimentações (${entries.length})`} active={tab==='history'} onPress={()=>setTab('history')}/><FilterChip label="Relatórios" active={tab==='report'} onPress={()=>setTab('report')}/></View>

    {tab!=='report'&&<View style={[s.filters,compact&&s.wrap]}><View style={{flex:1,minWidth:230}}><SearchField value={q} onChangeText={setQ} placeholder="Buscar pessoa, referência, descrição ou categoria..."/></View><View style={s.kind}><FilterChip label="Todos" active={kind==='all'} onPress={()=>setKind('all')}/><FilterChip label="Entradas" active={kind==='income'} onPress={()=>setKind('income')}/><FilterChip label="Saídas" active={kind==='expense'} onPress={()=>setKind('expense')}/></View><View style={[s.dateFilter,compact&&s.dateFilterMobile]}><DateField value={from} onChange={setFrom} placeholder="De"/><Text style={s.to}>até</Text><DateField value={to} onChange={setTo} placeholder="Até"/></View></View>}

    {loading?<AsyncState loading/>:tab==='open'?(openRows.length===0?<AsyncState empty emptyTitle="Nenhuma conta aberta" emptyMessage="Pedidos, compras e lançamentos manuais pendentes aparecerão aqui."/>:<View style={s.list}>{openRows.map(e=><View key={`${e.source}-${e.id}`} style={[s.row,compact&&s.rowMobile]}><View style={[s.icon,e.type==='expense'&&s.iconExpense]}><Ionicons name={e.type==='income'?'arrow-down-outline':'arrow-up-outline'} size={18} color={e.type==='income'?theme.green2:theme.danger}/></View><View style={{flex:1,minWidth:0}}><Text style={s.name}>{e.description}</Text><Text style={s.meta}>{e.counterparty||'Sem favorecido'} · {e.category}{e.dueAt?` · vence ${formatDateBR(e.dueAt)}`:' · sem vencimento'}</Text>{overdue(e.dueAt)&&<Text style={s.overdue}>Vencido</Text>}</View><View style={[s.right,compact&&s.rightMobile]}><Text style={[s.amount,e.type==='expense'&&s.expense]}>{money(e.amountCents)}</Text><Pressable onPress={()=>goSource(e)} style={s.smallAction}><Text style={s.smallActionText}>{e.source==='manual'?'Dar baixa':'Abrir origem'}</Text></Pressable></View></View>)}</View>):tab==='history'?(historyRows.length===0?<AsyncState empty emptyTitle="Nenhuma movimentação no período" emptyMessage="Ajuste os filtros ou registre uma movimentação."/>:<View style={s.list}>{historyRows.map(e=><View key={`${e.source}-${e.id}`} style={[s.row,compact&&s.rowMobile]}><View style={[s.icon,e.type==='expense'&&s.iconExpense]}><Ionicons name={e.type==='income'?'arrow-down-outline':'arrow-up-outline'} size={18} color={e.type==='income'?theme.green2:theme.danger}/></View><View style={{flex:1,minWidth:0}}><Text style={s.name}>{e.description}</Text><Text style={s.meta}>{e.counterparty} · {e.category||e.referenceNumber} · {methodLabel[e.method||'']||e.method||'Forma não informada'} · {dateTime(e.date)}</Text>{e.notes?<Text style={s.notes}>{e.notes}</Text>:null}</View><View><Text style={[s.amount,e.type==='expense'&&s.expense]}>{e.type==='income'?'+':'−'} {money(e.amountCents)}</Text><Text style={s.kindText}>{e.type==='income'?'Entrada':'Saída'}</Text></View></View>)}</View>):<View style={s.reportArea}>
      <View style={s.reportToolbar}><Text style={s.reportTitle}>Fluxo de caixa</Text><View style={s.kind}><FilterChip label="6 meses" active={reportMonths===6} onPress={()=>void changeReportMonths(6)}/><FilterChip label="12 meses" active={reportMonths===12} onPress={()=>void changeReportMonths(12)}/><FilterChip label="24 meses" active={reportMonths===24} onPress={()=>void changeReportMonths(24)}/></View></View>
      <View style={[s.metrics,compact&&s.wrap]}><Metric label="Entradas realizadas" value={money(report?.incomeCents||0)}/><Metric label="Saídas realizadas" value={money(report?.expenseCents||0)}/><Metric label="Resultado realizado" value={money(report?.netCents||0)} strong/></View>
      <View style={s.reportCard}><Text style={s.cardTitle}>Realizado × previsto por mês</Text><Text style={s.cardHelp}>As barras sólidas mostram o realizado; a faixa clara inclui valores ainda previstos para o mês.</Text><View style={s.monthList}>{report?.monthly.map(m=><View key={m.key} style={s.monthRow}><View style={s.monthLabel}><Text style={s.monthName}>{m.label}</Text><Text style={[s.monthNet,m.netCents<0&&s.expense]}>{money(m.netCents)}</Text></View><View style={s.barColumn}><Bar label="Entradas" value={m.incomeCents} projected={m.projectedIncomeCents} max={maxMonthly} income/><Bar label="Saídas" value={m.expenseCents} projected={m.projectedExpenseCents} max={maxMonthly}/></View></View>)}</View></View>
      <View style={s.reportCard}><Text style={s.cardTitle}>Composição do realizado por categoria</Text><Text style={s.cardHelp}>Vendas e Compras são agrupadas automaticamente; lançamentos manuais usam a categoria cadastrada.</Text>{topCategories.length===0?<Text style={s.meta}>Ainda não há movimentações realizadas no período.</Text>:<View style={s.categoryList}>{topCategories.map((c,i)=><View key={`${c.type}-${c.name}-${i}`} style={s.categoryRow}><View style={[s.categoryDot,c.type==='expense'&&s.categoryDotExpense]}/><Text style={s.categoryName}>{c.name}</Text><Text style={[s.categoryValue,c.type==='expense'&&s.expense]}>{c.type==='income'?'+':'−'} {money(c.amountCents)}</Text></View>)}</View>}</View>
    </View>}

    <FormModal visible={entryOpen} title="Novo lançamento financeiro" subtitle="Registre receitas e despesas que não nasceram de pedidos ou compras" size="lg" onClose={()=>setEntryOpen(false)}><Text style={s.label}>TIPO</Text><View style={s.tabs}><FilterChip label="Despesa" active={type==='expense'} onPress={()=>{setType('expense');setCategoryId('')}}/><FilterChip label="Receita" active={type==='income'} onPress={()=>{setType('income');setCategoryId('')}}/></View><Field label="Descrição" required error={errors.description} value={description} onChangeText={v=>{setDescription(v);setErrors(e=>({...e,description:''}))}}/><Field label={type==='income'?'Cliente / origem':'Fornecedor / favorecido'} value={counterparty} onChangeText={setCounterparty}/><Field label="Valor (R$)" required error={errors.amount} value={amount} onChangeText={v=>{setAmount(v);setErrors(e=>({...e,amount:''}))}} keyboardType="decimal-pad"/><Text style={s.label}>CATEGORIA</Text><View style={s.choices}>{typedCategories.map(c=><Pressable key={c.id} onPress={()=>setCategoryId(c.id)} style={[s.choice,categoryId===c.id&&s.choiceActive]}><Text style={[s.choiceText,categoryId===c.id&&s.choiceTextActive]}>{c.name}</Text></Pressable>)}<Pressable onPress={()=>setCategoryOpen(true)} style={s.choice}><Text style={s.choiceText}>+ Nova</Text></Pressable></View><DateField label="Vencimento" value={dueAt} onChange={setDueAt}/><Text style={s.label}>SITUAÇÃO</Text><View style={s.tabs}><FilterChip label="Pendente" active={entryStatus==='pending'} onPress={()=>setEntryStatus('pending')}/><FilterChip label="Já realizado" active={entryStatus==='paid'} onPress={()=>setEntryStatus('paid')}/></View>{entryStatus==='paid'&&<><Text style={s.label}>FORMA DE PAGAMENTO</Text><View style={s.choices}>{Object.entries(methodLabel).map(([k,v])=><Pressable key={k} onPress={()=>setMethod(k)} style={[s.choice,method===k&&s.choiceActive]}><Text style={[s.choiceText,method===k&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View></>}<Field label="Observações" value={notes} onChangeText={setNotes}/><Pressable disabled={saving} style={s.primary} onPress={()=>void saveEntry()}><Text style={s.primaryText}>Salvar lançamento</Text></Pressable></FormModal>
    <FormModal visible={categoryOpen} title="Nova categoria financeira" onClose={()=>setCategoryOpen(false)}><Text style={s.label}>TIPO</Text><View style={s.tabs}><FilterChip label="Despesa" active={type==='expense'} onPress={()=>setType('expense')}/><FilterChip label="Receita" active={type==='income'} onPress={()=>setType('income')}/></View><Field label="Nome da categoria" required error={errors.categoryName} value={categoryName} onChangeText={v=>{setCategoryName(v);setErrors(e=>({...e,categoryName:''}))}}/><Pressable disabled={saving} style={s.primary} onPress={()=>void saveCategory()}><Text style={s.primaryText}>Salvar categoria</Text></Pressable></FormModal>
    <FormModal visible={payOpen} title="Dar baixa no lançamento" subtitle={selected?`${selected.description} · ${money(selected.amountCents)}`:undefined} onClose={()=>setPayOpen(false)}><Text style={s.label}>FORMA DE PAGAMENTO</Text><View style={s.choices}>{Object.entries(methodLabel).map(([k,v])=><Pressable key={k} onPress={()=>setMethod(k)} style={[s.choice,method===k&&s.choiceActive]}><Text style={[s.choiceText,method===k&&s.choiceTextActive]}>{v}</Text></Pressable>)}</View><Field label="Observações" value={notes} onChangeText={setNotes}/><Pressable disabled={saving} style={s.primary} onPress={()=>void payManual()}><Text style={s.primaryText}>Confirmar baixa</Text></Pressable></FormModal>
  </AppShell>;
}

function Metric({label,value,strong=false,warn=false}:{label:string;value:string;strong?:boolean;warn?:boolean}){return <View style={[s.metric,strong&&s.metricStrong,warn&&s.metricWarn]}><Text style={[s.metricLabel,strong&&s.white]}>{label}</Text><Text style={[s.metricValue,strong&&s.white,warn&&s.danger]}>{value}</Text></View>}
function Field({label,value,onChangeText,keyboardType,error,required}:{label:string;value:string;onChangeText:(v:string)=>void;keyboardType?:any;error?:string;required?:boolean}){return <FormField label={label} required={required} error={error||undefined} value={value} onChangeText={onChangeText} keyboardType={keyboardType}/>}
function Bar({label,value,projected,max,income=false}:{label:string;value:number;projected:number;max:number;income?:boolean}){const base=Math.min(100,(value/max)*100),forecast=Math.min(100,(projected/max)*100);return <View style={s.barRow}><Text style={s.barLabel}>{label}</Text><View style={s.barTrack}><View style={[s.barForecast,{width:`${forecast}%`}]} /><View style={[s.barValue,income?s.barIncome:s.barExpense,{width:`${base}%`}]} /></View><Text style={s.barAmount}>{money(value)}</Text></View>}

const s=StyleSheet.create({
  metrics:{flexDirection:'row',gap:10,marginBottom:10},wrap:{flexWrap:'wrap'},metric:{minWidth:155,flex:1,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:15},metricStrong:{backgroundColor:theme.green},metricWarn:{backgroundColor:'#FFF8F4'},metricLabel:{fontSize:10,fontWeight:'800',color:theme.muted,textTransform:'uppercase'},metricValue:{fontSize:18,fontWeight:'900',color:theme.ink,marginTop:5},white:{color:theme.white},danger:{color:theme.danger},toolbar:{flexDirection:'row',alignItems:'center',gap:9,marginVertical:8,flexWrap:'wrap'},toolbarButtonMobile:{flex:1,minWidth:145},primary:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:theme.green,borderRadius:10,paddingHorizontal:14,paddingVertical:11},primaryText:{color:theme.white,fontWeight:'800',fontSize:12},secondary:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,backgroundColor:theme.white},secondaryText:{fontWeight:'800',fontSize:12,color:theme.green2},tabs:{flexDirection:'row',gap:7,flexWrap:'wrap',marginVertical:8},filters:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:16},kind:{flexDirection:'row',gap:6,flexWrap:'wrap'},dateFilter:{flexDirection:'row',alignItems:'center',gap:6,minWidth:290},dateFilterMobile:{width:'100%',minWidth:0},to:{fontSize:11,color:theme.muted},list:{gap:9},row:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:14},rowMobile:{flexWrap:'wrap',alignItems:'flex-start'},icon:{width:38,height:38,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:theme.green50},iconExpense:{backgroundColor:'#FDECEC'},name:{fontSize:13,fontWeight:'900',color:theme.ink},meta:{fontSize:11,color:theme.muted,marginTop:3},notes:{fontSize:11,color:theme.ink,marginTop:4},overdue:{fontSize:10,fontWeight:'900',color:theme.danger,marginTop:4,textTransform:'uppercase'},amount:{fontSize:13,fontWeight:'900',color:theme.green2,textAlign:'right'},expense:{color:theme.danger},kindText:{fontSize:10,color:theme.muted,textAlign:'right',marginTop:2},right:{alignItems:'flex-end',gap:5},rightMobile:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:49},smallAction:{paddingHorizontal:8,paddingVertical:5,borderRadius:8,backgroundColor:theme.green50},smallActionText:{fontSize:10,fontWeight:'900',color:theme.green2},label:{fontSize:11,fontWeight:'800',color:theme.muted},input:{borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:11,paddingVertical:10,color:theme.ink,backgroundColor:theme.white},choices:{flexDirection:'row',flexWrap:'wrap',gap:6},choice:{borderWidth:1,borderColor:theme.border,borderRadius:9,paddingHorizontal:10,paddingVertical:7},choiceActive:{backgroundColor:theme.green,borderColor:theme.green},choiceText:{fontSize:11,fontWeight:'700',color:theme.ink},choiceTextActive:{color:theme.white},reportArea:{gap:12},reportToolbar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'},reportTitle:{fontSize:16,fontWeight:'900',color:theme.ink},reportCard:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:15,gap:10},cardTitle:{fontSize:14,fontWeight:'900',color:theme.ink},cardHelp:{fontSize:11,color:theme.muted},monthList:{gap:10},monthRow:{gap:7,paddingTop:8,borderTopWidth:1,borderTopColor:theme.border},monthLabel:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},monthName:{fontSize:12,fontWeight:'900',color:theme.ink,textTransform:'capitalize'},monthNet:{fontSize:11,fontWeight:'900',color:theme.green2},barColumn:{gap:6},barRow:{flexDirection:'row',alignItems:'center',gap:8},barLabel:{width:58,fontSize:10,fontWeight:'800',color:theme.muted},barTrack:{height:9,borderRadius:6,backgroundColor:'#EEF0EC',flex:1,overflow:'hidden',position:'relative'},barForecast:{position:'absolute',left:0,top:0,bottom:0,backgroundColor:'#D7DFD8',borderRadius:6},barValue:{position:'absolute',left:0,top:0,bottom:0,borderRadius:6},barIncome:{backgroundColor:theme.green2},barExpense:{backgroundColor:theme.danger},barAmount:{width:90,textAlign:'right',fontSize:10,fontWeight:'800',color:theme.ink},categoryList:{gap:7},categoryRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderTopWidth:1,borderTopColor:theme.border},categoryDot:{width:8,height:8,borderRadius:4,backgroundColor:theme.green2},categoryDotExpense:{backgroundColor:theme.danger},categoryName:{flex:1,fontSize:12,fontWeight:'800',color:theme.ink},categoryValue:{fontSize:12,fontWeight:'900',color:theme.green2}
});
