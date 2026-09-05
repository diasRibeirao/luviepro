import {useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,useWindowDimensions,View} from 'react-native';
import {Text,TextInput} from '../../../i18n';
import {AppShell} from '../../../components/AppShell';
import {SelectField} from '../../../components/SelectField';
import {AsyncState} from '../../../components/AsyncState';
import {theme} from '../../../theme';
import {buildXlsx,presentXlsx} from '../../../utils/xlsxExport';
import {casaNovaApi,CasaNovaCategory,CasaNovaItem} from '../api/casaNova.api';

const categories=['Todos','Cozinha e mesa','Eletrodomésticos','Mercado','Hortifruti','Cama e banho'] as const;
const categoryOptions=categories.slice(1).map(x=>({label:x,value:x}));
const unitOptions=[
 {label:'Unidade (un.)',value:'un.'},{label:'Peça',value:'peça'},{label:'Peças',value:'peças'},
 {label:'Jogo',value:'jogo'},{label:'Jogos',value:'jogos'},{label:'Quilograma (kg)',value:'kg'},
 {label:'Grama (g)',value:'g'},{label:'Pacote (pct.)',value:'pct.'},{label:'Pacote',value:'pacote'},
 {label:'Rolo',value:'rolo'},{label:'Rolos',value:'rolos'},{label:'Maço',value:'maço'},
 {label:'Litro (L)',value:'L'},{label:'Mililitro (ml)',value:'ml'}
];
const automaticQuantity=(item:CasaNovaItem,guests:number)=>item.isScalable?Math.max(1,Math.ceil(item.baseQuantity*(guests/2))):item.baseQuantity;
const quantity=(item:CasaNovaItem,guests:number)=>item.quantityOverride??automaticQuantity(item,guests);
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Não foi possível concluir a operação.';

export function CasaNovaScreen(){
 const {width}=useWindowDimensions();
 const compact=width<980;
 const[guests,setGuests]=useState(2);
 const[guestInput,setGuestInput]=useState('2');
 const[items,setItems]=useState<CasaNovaItem[]>([]);
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[filter,setFilter]=useState<(typeof categories)[number]>('Todos');
 const[selectedIds,setSelectedIds]=useState<string[]>([]);
 const[bulkCategory,setBulkCategory]=useState<CasaNovaCategory>('Cozinha e mesa');
 const[bulkDeleteConfirm,setBulkDeleteConfirm]=useState(false);
 const[name,setName]=useState('');
 const[category,setCategory]=useState<CasaNovaCategory>('Cozinha e mesa');
 const[qty,setQty]=useState('1');
 const[unit,setUnit]=useState('un.');
 const[notes,setNotes]=useState('');
 const[scalable,setScalable]=useState(true);
 const[editingId,setEditingId]=useState<string|null>(null);
 const[deleteConfirmId,setDeleteConfirmId]=useState<string|null>(null);
 const[message,setMessage]=useState('');

 const load=async()=>{setLoading(true);try{const data=await casaNovaApi.get();setGuests(data.guests);setGuestInput(String(data.guests));setItems(data.items);setSelectedIds(ids=>ids.filter(id=>data.items.some(item=>item.id===id)))}catch(error){setMessage(errorMessage(error))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);

 const visible=useMemo(()=>filter==='Todos'?items:items.filter(x=>x.category===filter),[items,filter]);
 const done=items.filter(x=>x.checked).length;
 const progress=items.length?Math.round(done/items.length*100):0;
 const allVisibleSelected=visible.length>0&&visible.every(item=>selectedIds.includes(item.id));

 const changeGuests=async(next:number)=>{
  if(busy)return;
  const normalized=Math.min(999999,Math.max(2,Math.trunc(next)));
  const previous=guests;
  setGuests(normalized);
  setGuestInput(String(normalized));
  try{await casaNovaApi.updateGuests(normalized)}catch(error){setGuests(previous);setGuestInput(String(previous));setMessage(errorMessage(error))}
 };
 const commitGuestInput=()=>{
  const parsed=Number(guestInput.replace(/\D/g,''));
  if(!Number.isFinite(parsed)||parsed<2){setGuestInput(String(guests));setMessage('Informe no mínimo 2 pessoas.');return}
  void changeGuests(parsed);
 };

 const toggle=async(item:CasaNovaItem)=>{
  setItems(rows=>rows.map(x=>x.id===item.id?{...x,checked:!x.checked}:x));
  try{await casaNovaApi.updateItem(item.id,{checked:!item.checked})}catch(error){setItems(rows=>rows.map(x=>x.id===item.id?item:x));setMessage(errorMessage(error))}
 };

 const toggleSelected=(id:string)=>setSelectedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
 const toggleSelectAll=()=>setSelectedIds(ids=>allVisibleSelected?ids.filter(id=>!visible.some(item=>item.id===id)):[...new Set([...ids,...visible.map(item=>item.id)])]);

 const resetForm=()=>{setEditingId(null);setName('');setCategory('Cozinha e mesa');setQty('1');setUnit('un.');setNotes('');setScalable(true)};
 const edit=(item:CasaNovaItem)=>{setEditingId(item.id);setName(item.itemName);setCategory(item.category);setQty(String(item.baseQuantity));setUnit(item.unit);setNotes(item.notes||'');setScalable(item.isScalable);setMessage('Editando detalhes do item. A quantidade também pode ser ajustada diretamente pelas setas da lista.')};

 const remove=async(item:CasaNovaItem)=>{
  if(busy)return;
  setBusy(true);
  try{await casaNovaApi.removeItem(item.id);setItems(rows=>rows.filter(x=>x.id!==item.id));setSelectedIds(ids=>ids.filter(id=>id!==item.id));if(editingId===item.id)resetForm();setDeleteConfirmId(null);setMessage('Item excluído da lista.')}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}
 };

 const essentials=async()=>{
  if(busy)return;
  setBusy(true);
  try{const result=await casaNovaApi.addEssentials();await load();setMessage(result.added?`${result.added} itens padrão restaurados na lista.`:'Todos os itens padrão já estão nesta conta.')}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}
 };

 const save=async()=>{
  if(busy)return;
  const clean=name.trim();
  if(clean.length<2){setMessage('Informe o nome do item com pelo menos 2 caracteres.');return}
  const parsedQuantity=Number(String(qty).replace(',','.'));
  if(!isFinite(parsedQuantity)||parsedQuantity<1){setMessage('Informe uma quantidade válida, maior ou igual a 1.');return}
  const baseQuantity=Math.max(1,Math.round(parsedQuantity));
  const duplicate=items.some(x=>x.id!==editingId&&x.itemName.trim().toLocaleLowerCase('pt-BR')===clean.toLocaleLowerCase('pt-BR'));
  if(duplicate){setMessage('Este item já existe na lista. Edite o item existente em vez de duplicá-lo.');return}
  setBusy(true);
  try{
   const payload={itemName:clean,category,baseQuantity,unit:unit.trim()||'un.',isScalable:scalable,notes:notes.trim()};
   if(editingId){
    const updated=await casaNovaApi.updateItem(editingId,{...payload,quantityOverride:null});
    setItems(rows=>rows.map(item=>item.id===updated.id?updated:item));
    setMessage('Item atualizado com sucesso.');
   }else{
    const created=await casaNovaApi.addItem(payload);
    setItems(rows=>[...rows,created]);
    setFilter(created.category);
    setMessage(`Item “${created.itemName}” adicionado à lista.`);
   }
   resetForm();
  }catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}
 };

 const changeItemQuantity=async(item:CasaNovaItem,delta:-1|1)=>{
  if(busy)return;
  const current=quantity(item,guests);
  const next=Math.max(1,current+delta);
  if(next===current)return;
  const previous=item.quantityOverride;
  setItems(rows=>rows.map(x=>x.id===item.id?{...x,quantityOverride:next}:x));
  try{await casaNovaApi.updateItem(item.id,{quantityOverride:next})}catch(error){setItems(rows=>rows.map(x=>x.id===item.id?{...x,quantityOverride:previous}:x));setMessage(errorMessage(error))}
 };

 const bulkUpdate=async(patch:{category?:CasaNovaCategory;isScalable?:boolean;checked?:boolean})=>{
  if(!selectedIds.length||busy)return;
  setBusy(true);
  try{const result=await casaNovaApi.bulkUpdate({ids:selectedIds,...patch});await load();setMessage(`${result.updated} item(ns) atualizado(s) em massa.`)}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}
 };

 const bulkRemove=async()=>{
  if(!selectedIds.length||busy)return;
  setBusy(true);
  try{const result=await casaNovaApi.bulkRemove(selectedIds);setSelectedIds([]);setBulkDeleteConfirm(false);await load();setMessage(`${result.deleted} item(ns) excluído(s) da lista.`)}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}
 };

 const exportList=async()=>{
  try{
   const ordered=[...items].sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')||a.itemName.localeCompare(b.itemName,'pt-BR'));
   const rows=ordered.map(item=>[item.itemName,item.category,quantity(item,guests),item.unit,item.checked?'Sim':'Não',item.isScalable?'Automática':'Fixa',item.notes||'']);
   const bytes=buildXlsx(['Item','Categoria','Quantidade','Unidade','Comprado','Tipo de quantidade','Observações'],rows,'Casa Nova');
   await presentXlsx(`casa-nova-${new Date().toISOString().slice(0,10)}.xlsx`,bytes);
   setMessage('Planilha Excel gerada para envio ao cliente ou uso na curadoria de enxoval.');
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível exportar a lista.')}
 };

 return <AppShell title="Casa Nova" subtitle="Lista inteligente para montar uma casa pronta para receber qualquer quantidade de pessoas.">
  {loading?<AsyncState loading/>:<View style={s.page}>
   <View style={[s.hero,compact&&s.heroCompact]}>
    <View style={s.heroText}><Text style={s.kicker}>LISTA CASA NOVA</Text><Text style={s.heroTitle}>Sua casa pronta para todo encontro especial.</Text><Text style={s.heroDesc}>A lista padrão é criada por conta. Ajuste pessoas, quantidades e itens sem misturar dados entre clientes ou empresas.</Text></View>
    <View style={s.guestCard}><Text style={s.guestLabel}>Quantas pessoas estarão à mesa?</Text><View style={s.guestRow}><Pressable disabled={guests<=2||busy} onPress={()=>void changeGuests(guests-1)} style={[s.round,(guests<=2||busy)&&s.roundDisabled]}><Ionicons name="remove" size={20} color={guests<=2?theme.muted:theme.green}/></Pressable><View style={s.guestInputWrap}>
  <View style={s.guestInputBox}>
   <TextInput
    value={guestInput}
    onChangeText={value=>setGuestInput(value.replace(/[^0-9]/g,'').slice(0,6))}
    onBlur={commitGuestInput}
    onSubmitEditing={commitGuestInput}
    keyboardType="number-pad"
    inputMode="numeric"
    maxLength={6}
    selectTextOnFocus
    returnKeyType="done"
    placeholder="2"
    style={s.guestInput}
   />
   <Ionicons name="create-outline" size={16} color={theme.muted}/>
  </View>
  <Text style={s.guestEditHint}>Toque no número para editar</Text>
  <Text style={s.guestWord}>pessoas</Text>
 </View><Pressable disabled={guests>=999999||busy} onPress={()=>void changeGuests(guests+1)} style={[s.round,s.roundActive,(guests>=999999||busy)&&s.roundDisabled]}><Ionicons name="add" size={20} color={theme.white}/></Pressable></View><Text style={s.minGuests}>Mínimo: 2 pessoas · máximo técnico: 999.999</Text></View>
   </View>

   <View style={[s.summary,compact&&s.summaryCompact]}><Summary icon="list-outline" label="Itens na lista" value={String(items.length)} tone="dark"/><Summary icon="checkmark-circle-outline" label="Já comprados" value={String(done)}/><Summary icon="sparkles-outline" label="Lista concluída" value={`${progress}%`} tone="gold"/></View>

   {message?<View style={s.message}><Ionicons name="information-circle-outline" size={17} color={theme.green2}/><Text style={s.messageText}>{message}</Text><Pressable onPress={()=>setMessage('')}><Ionicons name="close" size={17} color={theme.muted}/></Pressable></View>:null}

   <View style={[s.body,compact&&s.bodyCompact]}>
    <View style={s.listCol}>
     <View style={s.listHeader}>
      <View><Text style={s.eyebrow}>LISTA INTELIGENTE</Text><Text style={s.sectionTitle}>O que falta para a casa ficar completa</Text></View>
      <View style={s.headerActions}><Pressable onPress={()=>{if(name.trim()){void save();return}resetForm();setMessage(compact?'Preencha os dados no formulário “Adicionar item” logo abaixo da lista e confirme no botão amarelo.':'Preencha os dados no formulário “Adicionar item” à direita e confirme no botão amarelo.')}} style={s.addItemShortcut}><Ionicons name="add-circle-outline" size={16} color={theme.white}/><Text style={s.addItemShortcutText}>Adicionar item</Text></Pressable><Pressable onPress={()=>void exportList()} style={s.exportBtn}><Ionicons name="document-outline" size={16} color={theme.green2}/><Text style={s.exportText}>Exportar Excel</Text></Pressable><Pressable onPress={()=>void essentials()} style={s.essentialBtn}><Ionicons name="sparkles-outline" size={16} color={theme.white}/><Text style={s.essentialText}>{busy?'Aguarde...':'Restaurar padrão'}</Text></Pressable></View>
     </View>

     <View style={s.filters}>{categories.map(c=><Pressable key={c} onPress={()=>setFilter(c)} style={[s.filter,filter===c&&s.filterOn]}><Text style={[s.filterText,filter===c&&s.filterTextOn]}>{c}</Text></Pressable>)}</View>

     {visible.length>0?<View style={s.bulkBar}>
      <Pressable onPress={toggleSelectAll} style={s.selectAll}><View style={[s.selectBox,allVisibleSelected&&s.selectBoxOn]}>{allVisibleSelected?<Ionicons name="checkmark" size={14} color={theme.white}/>:null}</View><Text style={s.selectAllText}>{allVisibleSelected?'Desmarcar tudo':'Selecionar tudo'}</Text></Pressable>
      <Text style={s.selectedCount}>{selectedIds.length} selecionado(s)</Text>
      {selectedIds.length>0?<View style={s.bulkActions}><View style={s.bulkSelect}><SelectField label="Categoria em massa" value={bulkCategory} options={categoryOptions} onChange={v=>setBulkCategory(v as CasaNovaCategory)}/></View><Pressable disabled={busy} onPress={()=>void bulkUpdate({category:bulkCategory})} style={s.bulkButton}><Text style={s.bulkButtonText}>Aplicar categoria</Text></Pressable><Pressable disabled={busy} onPress={()=>void bulkUpdate({isScalable:true})} style={s.bulkButton}><Text style={s.bulkButtonText}>Qtd. automática</Text></Pressable><Pressable disabled={busy} onPress={()=>void bulkUpdate({isScalable:false})} style={s.bulkButton}><Text style={s.bulkButtonText}>Qtd. fixa</Text></Pressable><Pressable disabled={busy} onPress={()=>setBulkDeleteConfirm(true)} style={s.bulkDanger}><Ionicons name="trash-outline" size={15} color={theme.white}/><Text style={s.bulkDangerText}>Excluir selecionados</Text></Pressable></View>:null}
      {bulkDeleteConfirm?<View style={s.bulkConfirm}><Text style={s.bulkConfirmText}>Excluir {selectedIds.length} item(ns) selecionado(s)?</Text><Pressable onPress={()=>void bulkRemove()} style={s.deleteYes}><Text style={s.deleteYesText}>Confirmar exclusão</Text></Pressable><Pressable onPress={()=>setBulkDeleteConfirm(false)} style={s.deleteNo}><Text style={s.deleteNoText}>Cancelar</Text></Pressable></View>:null}
     </View>:null}

     {visible.length===0?<View style={s.empty}><Ionicons name="basket-outline" size={30} color={theme.gold}/><Text style={s.emptyTitle}>Nenhum item nesta categoria</Text><Text style={s.emptyText}>Restaure a lista padrão ou personalize sua própria lista.</Text></View>:<View style={s.cards}>{visible.map(item=><View key={item.id} style={[s.item,item.checked&&s.itemDone,selectedIds.includes(item.id)&&s.itemSelected]}>
      <Pressable accessibilityLabel={`Selecionar ${item.itemName}`} onPress={()=>toggleSelected(item.id)} style={[s.selectBox,selectedIds.includes(item.id)&&s.selectBoxOn]}>{selectedIds.includes(item.id)?<Ionicons name="checkmark" size={14} color={theme.white}/>:null}</Pressable>
      <View style={s.itemBody}>
       <View style={s.itemTop}>
        <View style={{flex:1,minWidth:0}}><Text style={[s.itemName,item.checked&&s.itemNameDone]}>{item.itemName}</Text><Text style={s.itemMeta}>{item.category}{item.notes?` · ${item.notes}`:''}</Text><Pressable onPress={()=>void toggle(item)} style={s.boughtRow}><View style={[s.checkbox,item.checked&&s.checkboxOn]}>{item.checked?<Ionicons name="checkmark" size={13} color={theme.white}/>:null}</View><Text style={s.boughtText}>{item.checked?'Comprado':'Marcar como comprado'}</Text></Pressable></View>
        <View style={s.qtyControl}><Pressable disabled={quantity(item,guests)<=1||busy} onPress={()=>void changeItemQuantity(item,-1)} style={[s.qtyStep,(quantity(item,guests)<=1||busy)&&s.qtyStepDisabled]}><Ionicons name="chevron-down" size={16} color={theme.green2}/></Pressable><View style={s.qtyBox}><Text style={s.qty}>{quantity(item,guests)} {item.unit}</Text><Text style={s.qtyCaption}>{item.quantityOverride!=null?'ajuste manual':item.isScalable?`automático · ${guests} pessoas`:'item fixo'}</Text></View><Pressable disabled={busy} onPress={()=>void changeItemQuantity(item,1)} style={s.qtyStep}><Ionicons name="chevron-up" size={16} color={theme.green2}/></Pressable></View>
        <Pressable onPress={()=>edit(item)} style={s.detailEdit}><Ionicons name="settings-outline" size={17} color={theme.green2}/></Pressable>
        <Pressable onPress={()=>setDeleteConfirmId(item.id)} style={s.trash}><Ionicons name="trash-outline" size={18} color={theme.danger}/></Pressable>
       </View>
       {deleteConfirmId===item.id?<View style={s.deleteConfirm}><Text style={s.deleteConfirmText}>Excluir este item?</Text><Pressable onPress={()=>void remove(item)} style={s.deleteYes}><Text style={s.deleteYesText}>Excluir</Text></Pressable><Pressable onPress={()=>setDeleteConfirmId(null)} style={s.deleteNo}><Text style={s.deleteNoText}>Cancelar</Text></Pressable></View>:null}
      </View>
     </View>)}</View>}
    </View>

    <View style={s.addPanel}><View style={s.addHead}><View><Text style={s.addEyebrow}>{editingId?'EDITAR DETALHES':'PERSONALIZE'}</Text><Text style={s.addTitle}>{editingId?'Atualize os dados do item':'Adicionar item'}</Text></View>{editingId?<Pressable onPress={resetForm} style={s.cancelEdit}><Ionicons name="close" size={18} color={theme.white}/></Pressable>:null}</View><Field label="Item" value={name} onChange={setName} placeholder="Ex.: taças de vinho"/><SelectField label="Categoria" value={category} options={categoryOptions} onChange={v=>setCategory(v as CasaNovaCategory)}/><View style={s.two}><View style={s.formColumn}><Field label="Qtd. base para 2 pessoas" value={qty} onChange={v=>setQty(v.replace(/\D/g,'').slice(0,4))} keyboard="numeric"/></View><View style={s.formColumn}><SelectField label="Unidade de medida" value={unit} options={unitOptions} onChange={setUnit}/></View></View><Field label="Observações" value={notes} onChange={setNotes} placeholder="Opcional"/><Pressable onPress={()=>setScalable(v=>!v)} style={s.scaleRow}><View style={[s.checkbox,scalable&&s.checkboxOn]}>{scalable?<Ionicons name="checkmark" size={15} color={theme.white}/>:null}</View><Text style={s.scaleText}>Ajustar automaticamente conforme o número de pessoas</Text></Pressable><Pressable disabled={busy} onPress={()=>void save()} style={[s.addButton,busy&&s.addButtonDisabled]}><Ionicons name={editingId?'save-outline':'add'} size={18} color={theme.g900}/><Text style={s.addButtonText}>{busy?'Salvando...':editingId?'Salvar detalhes':'Adicionar item'}</Text></Pressable>{editingId?<Pressable onPress={resetForm} style={s.cancelButton}><Text style={s.cancelButtonText}>Cancelar edição</Text></Pressable>:null}</View>
   </View>
  </View>}
 </AppShell>
}

function Summary({icon,label,value,tone}:{icon:any;label:string;value:string;tone?:'dark'|'gold'}){return <View style={[s.sumCard,tone==='dark'&&s.sumDark,tone==='gold'&&s.sumGold]}><View><Text style={[s.sumLabel,tone==='dark'&&s.sumDarkText]}>{label}</Text><Text style={[s.sumValue,tone==='dark'&&s.sumDarkText]}>{value}</Text></View><Ionicons name={icon} size={26} color={tone==='dark'?theme.goldLight:tone==='gold'?theme.gold:theme.green2}/></View>}
function Field({label,value,onChange,placeholder,keyboard}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;keyboard?:'numeric'}){return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboard} style={s.input}/></View>}

const s=StyleSheet.create({
 page:{gap:18},hero:{backgroundColor:theme.green,borderRadius:20,padding:28,flexDirection:'row',gap:24,alignItems:'center'},heroCompact:{flexDirection:'column',alignItems:'stretch'},heroText:{flex:1},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1.5,color:theme.goldLight},heroTitle:{fontFamily:'serif',fontSize:30,fontWeight:'800',lineHeight:36,color:theme.white,marginTop:8,maxWidth:620},heroDesc:{fontSize:13,lineHeight:20,color:'rgba(255,255,255,.72)',marginTop:10,maxWidth:620},guestCard:{minWidth:260,borderRadius:16,backgroundColor:theme.white,padding:18},guestLabel:{fontSize:12,fontWeight:'800',color:theme.ink},guestRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12},round:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:theme.green50},roundActive:{backgroundColor:theme.green2},roundDisabled:{opacity:.38},guestInputWrap:{alignItems:'center',minWidth:150},
guestInputBox:{minWidth:132,maxWidth:170,minHeight:52,borderWidth:1.5,borderColor:theme.green2,borderRadius:12,backgroundColor:'#fff',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
guestInput:{minWidth:86,maxWidth:120,paddingVertical:6,fontFamily:'serif',fontSize:30,fontWeight:'800',color:theme.ink,textAlign:'center'},
guestEditHint:{fontSize:8,fontWeight:'700',color:theme.muted,textAlign:'center',marginTop:4},
guestWord:{fontSize:10,fontWeight:'800',color:theme.muted,textAlign:'center',marginTop:2},
minGuests:{fontSize:9,fontWeight:'700',color:theme.muted,textAlign:'center',marginTop:9},
 summary:{flexDirection:'row',gap:12},summaryCompact:{flexDirection:'column'},sumCard:{flex:1,borderRadius:15,borderWidth:1,borderColor:theme.border,backgroundColor:theme.white,padding:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sumDark:{backgroundColor:theme.green,borderColor:theme.green},sumGold:{backgroundColor:theme.goldPale,borderColor:'#EAD99B'},sumLabel:{fontSize:11,fontWeight:'700',color:theme.muted},sumValue:{fontFamily:'serif',fontSize:27,fontWeight:'800',color:theme.ink,marginTop:4},sumDarkText:{color:theme.white},
 body:{flexDirection:'row',alignItems:'flex-start',gap:18},bodyCompact:{flexDirection:'column'},listCol:{flex:1,minWidth:0,width:'100%'},listHeader:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12,flexWrap:'wrap'},headerActions:{flexDirection:'row',gap:8,flexWrap:'wrap'},addItemShortcut:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:theme.green2,borderRadius:999,paddingHorizontal:14,paddingVertical:10},addItemShortcutText:{fontSize:11,fontWeight:'900',color:theme.white},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:theme.gold},sectionTitle:{fontFamily:'serif',fontSize:22,fontWeight:'800',color:theme.ink,marginTop:4},essentialBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:theme.green2,borderRadius:999,paddingHorizontal:14,paddingVertical:10},essentialText:{fontSize:11,fontWeight:'900',color:theme.white},exportBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:theme.borderStrong,backgroundColor:theme.white,borderRadius:999,paddingHorizontal:14,paddingVertical:10},exportText:{fontSize:11,fontWeight:'900',color:theme.green2},
 filters:{flexDirection:'row',gap:7,flexWrap:'wrap',marginVertical:14},filter:{borderWidth:1,borderColor:theme.borderStrong,borderRadius:999,paddingHorizontal:12,paddingVertical:8,backgroundColor:theme.white},filterOn:{backgroundColor:theme.green,borderColor:theme.green},filterText:{fontSize:11,fontWeight:'800',color:theme.green2},filterTextOn:{color:theme.white},
 bulkBar:{borderWidth:1,borderColor:theme.border,backgroundColor:theme.white,borderRadius:13,padding:12,marginBottom:10,gap:10},selectAll:{flexDirection:'row',alignItems:'center',gap:8},selectAllText:{fontSize:11,fontWeight:'900',color:theme.green2},selectedCount:{fontSize:10,fontWeight:'800',color:theme.muted},bulkActions:{flexDirection:'row',alignItems:'flex-end',gap:8,flexWrap:'wrap'},bulkSelect:{minWidth:210,flexGrow:1,maxWidth:280},bulkButton:{minHeight:38,borderRadius:9,borderWidth:1,borderColor:theme.borderStrong,backgroundColor:theme.green50,paddingHorizontal:10,alignItems:'center',justifyContent:'center'},bulkButtonText:{fontSize:10,fontWeight:'900',color:theme.green2},bulkDanger:{minHeight:38,borderRadius:9,backgroundColor:theme.danger,paddingHorizontal:11,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},bulkDangerText:{fontSize:10,fontWeight:'900',color:theme.white},bulkConfirm:{paddingTop:9,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},bulkConfirmText:{fontSize:11,fontWeight:'800',color:theme.muted},
 cards:{gap:9},item:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderLeftWidth:4,borderLeftColor:theme.borderStrong,borderRadius:13,padding:13,flexDirection:'row',gap:10},itemDone:{opacity:.72,borderLeftColor:theme.success},itemSelected:{borderColor:theme.green2,backgroundColor:'#FBFDFB'},selectBox:{width:22,height:22,borderRadius:6,borderWidth:2,borderColor:'#91A59A',alignItems:'center',justifyContent:'center',flexShrink:0},selectBoxOn:{backgroundColor:theme.green2,borderColor:theme.green2},checkbox:{width:19,height:19,borderRadius:5,borderWidth:2,borderColor:'#91A59A',alignItems:'center',justifyContent:'center'},checkboxOn:{backgroundColor:theme.green2,borderColor:theme.green2},itemBody:{flex:1},itemTop:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},itemName:{fontSize:13,fontWeight:'900',color:theme.ink},itemNameDone:{textDecorationLine:'line-through'},itemMeta:{fontSize:11,color:theme.muted,marginTop:3},boughtRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7,alignSelf:'flex-start'},boughtText:{fontSize:9,fontWeight:'800',color:theme.muted},qtyControl:{flexDirection:'row',alignItems:'center',gap:4},qtyStep:{width:31,height:31,borderRadius:8,borderWidth:1,borderColor:theme.borderStrong,backgroundColor:theme.white,alignItems:'center',justifyContent:'center'},qtyStepDisabled:{opacity:.35},qtyBox:{borderRadius:10,backgroundColor:theme.goldPale,paddingHorizontal:10,paddingVertical:6,minWidth:118},qty:{fontSize:12,fontWeight:'900',color:'#6B5521',textAlign:'center'},qtyCaption:{fontSize:9,fontWeight:'700',color:'#8A7747',textAlign:'center',marginTop:1},detailEdit:{padding:7},trash:{padding:7},
 deleteConfirm:{marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},deleteConfirmText:{fontSize:11,fontWeight:'800',color:theme.muted,marginRight:4},deleteYes:{borderRadius:8,backgroundColor:theme.danger,paddingHorizontal:10,paddingVertical:7},deleteYesText:{fontSize:10,fontWeight:'900',color:theme.white},deleteNo:{borderRadius:8,backgroundColor:theme.green50,paddingHorizontal:10,paddingVertical:7},deleteNoText:{fontSize:10,fontWeight:'900',color:theme.green2},
 empty:{borderWidth:2,borderStyle:'dashed',borderColor:theme.borderStrong,borderRadius:16,backgroundColor:theme.white,padding:28,alignItems:'center'},emptyTitle:{fontFamily:'serif',fontSize:17,fontWeight:'800',color:theme.ink,marginTop:6},emptyText:{fontSize:12,color:theme.muted,marginTop:5,textAlign:'center'},message:{borderWidth:1,borderColor:theme.border,backgroundColor:theme.green50,borderRadius:12,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:8},messageText:{flex:1,fontSize:11,fontWeight:'700',color:theme.green2},
 addPanel:{width:330,maxWidth:'100%',backgroundColor:theme.green,borderRadius:17,padding:18,gap:12},addHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},cancelEdit:{padding:6,borderRadius:999,backgroundColor:'rgba(255,255,255,.12)'},addEyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:theme.goldLight},addTitle:{fontFamily:'serif',fontSize:20,fontWeight:'800',color:theme.white,marginBottom:2},field:{gap:5},fieldLabel:{fontSize:11,fontWeight:'800',color:'rgba(255,255,255,.82)'},input:{minHeight:42,borderWidth:1,borderColor:'rgba(255,255,255,.18)',borderRadius:10,backgroundColor:theme.white,paddingHorizontal:10,paddingVertical:9,fontSize:12,color:theme.ink},two:{gap:12},formColumn:{width:'100%',minWidth:0},scaleRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,.08)',padding:10,borderRadius:10},scaleText:{flex:1,fontSize:11,lineHeight:16,color:'rgba(255,255,255,.82)'},addButton:{minHeight:44,borderRadius:10,backgroundColor:theme.gold,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},addButtonDisabled:{opacity:.65},addButtonText:{fontSize:12,fontWeight:'900',color:theme.g900},cancelButton:{minHeight:38,borderRadius:10,borderWidth:1,borderColor:'rgba(255,255,255,.22)',alignItems:'center',justifyContent:'center'},cancelButtonText:{fontSize:11,fontWeight:'800',color:theme.white}
});
