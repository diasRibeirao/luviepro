import {useCallback,useEffect,useMemo,useState} from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable,StyleSheet,useWindowDimensions,View} from 'react-native';
import {router} from 'expo-router';
import {AppShell} from '../../../components/AppShell';
import {AsyncState} from '../../../components/AsyncState';
import {HeaderAction} from '../../../components/HeaderAction';
import {FormModal} from '../../../components/FormModal';
import {FormField} from '../../../components/FormField';
import {AsyncButton} from '../../../components/AsyncButton';
import {SearchField} from '../../../components/SearchField';
import {Text} from '../../../i18n';
import {theme} from '../../../theme';
import {useFeedback} from '../../../components/Feedback';
import {ProductCategory,productsApi} from '../../products/api/products.api';

type Form={id:string;name:string;active:boolean};
type StatusFilter='all'|'active'|'inactive';
const empty=():Form=>({id:'',name:'',active:true});
const msg=(e:unknown)=>e instanceof Error?e.message:'Erro inesperado';
const PAGE_SIZE=10;

export default function ProductCategoriesScreen(){
 const[items,setItems]=useState<ProductCategory[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState<StatusFilter>('all'),[page,setPage]=useState(1),[form,setForm]=useState<Form>(empty()),[formError,setFormError]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const compact=useWindowDimensions().width<720; const{notify,confirm}=useFeedback();
 const load=useCallback(()=>{setLoading(true);setError('');productsApi.categories().then(setItems).catch(e=>setError(msg(e))).finally(()=>setLoading(false))},[]);
 useEffect(load,[]);
 useEffect(()=>setPage(1),[query,status]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter(i=>(!q||i.name.toLowerCase().includes(q))&&(status==='all'||(status==='active'?i.active:!i.active)))},[items,query,status]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
 const paged=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const activeCount=items.filter(i=>i.active).length;
 const usedCount=items.filter(i=>(i.usageCount||0)>0).length;
 const edit=(item:ProductCategory)=>{setForm({id:item.id,name:item.name,active:item.active});setFormError('');setOpen(true)};
 const create=()=>{setForm(empty());setFormError('');setOpen(true)};
 async function save(){const name=form.name.trim();if(name.length<2){setFormError('Informe pelo menos 2 caracteres.');return}try{setBusy(true);form.id?await productsApi.updateCategory(form.id,{name,active:form.active}):await productsApi.createCategory(name,form.active);setOpen(false);await load();notify({tone:'success',title:form.id?'Categoria atualizada':'Categoria cadastrada'})}catch(e){notify({tone:'error',title:'Não foi possível salvar a categoria',message:msg(e)})}finally{setBusy(false)}}
 async function toggle(item:ProductCategory){
   if(item.active){const count=item.usageCount||0;const ok=await confirm({title:'Inativar categoria?',message:count>0?`Esta categoria está vinculada a ${count} produto(s). Os produtos existentes manterão a categoria, mas ela não ficará disponível em novos cadastros.`:'A categoria deixará de ficar disponível em novos cadastros de produtos.',confirmLabel:'Inativar',danger:true});if(!ok)return}
   try{setBusy(true);await productsApi.updateCategory(item.id,{name:item.name,active:!item.active});await load();notify({tone:'success',title:item.active?'Categoria inativada':'Categoria ativada'})}catch(e){notify({tone:'error',title:'Não foi possível alterar a categoria',message:msg(e)})}finally{setBusy(false)}}
 return <AppShell title="Categorias de produtos" subtitle="Cadastros usados na classificação dos produtos." action={<HeaderAction label="Nova categoria" onPress={create}/>}> 
  
  {loading||error?<AsyncState loading={loading} error={error} onRetry={load}/>:<>
   <View style={[s.summaryRow,compact&&s.summaryCompact]}><Summary label="Total de categorias" value={String(items.length)} icon="pricetags-outline"/><Summary label="Categorias ativas" value={String(activeCount)} icon="checkmark-circle-outline"/><Summary label="Em uso" value={String(usedCount)} icon="cube-outline"/></View>
   <View style={s.panel}>
    <View style={[s.toolbar,compact&&s.toolbarCompact]}><View style={s.search}><SearchField value={query} onChangeText={setQuery} placeholder="Buscar categoria..."/></View><View style={s.filters}><Filter label="Todas" active={status==='all'} onPress={()=>setStatus('all')}/><Filter label="Ativas" active={status==='active'} onPress={()=>setStatus('active')}/><Filter label="Inativas" active={status==='inactive'} onPress={()=>setStatus('inactive')}/></View></View>
    {paged.length===0?<View style={s.empty}><Ionicons name="pricetags-outline" size={26} color={theme.muted}/><Text style={s.emptyTitle}>Nenhuma categoria encontrada</Text></View>:paged.map((item,index)=><View key={item.id} style={[s.row,index===0&&s.first]}><View style={s.rowInfo}><Text style={s.rowTitle}>{item.name}</Text><Text style={s.rowMeta}>{item.usageCount||0} produto(s) utilizando esta categoria</Text></View><Status active={item.active}/><Pressable accessibilityLabel={`Editar ${item.name}`} onPress={()=>edit(item)} style={s.iconButton}><Ionicons name="pencil-outline" size={17} color={theme.green2}/></Pressable><Pressable accessibilityLabel={item.active?'Inativar categoria':'Ativar categoria'} disabled={busy} onPress={()=>void toggle(item)} style={s.iconButton}><Ionicons name={item.active?'pause-circle-outline':'play-circle-outline'} size={18} color={item.active?theme.muted:theme.green2}/></Pressable></View>)}
    {filtered.length>PAGE_SIZE&&<View style={s.pagination}><Text style={s.pageInfo}>{(page-1)*PAGE_SIZE+1}-{Math.min(page*PAGE_SIZE,filtered.length)} de {filtered.length}</Text><View style={s.pageButtons}><Pressable disabled={page===1} onPress={()=>setPage(p=>Math.max(1,p-1))} style={[s.pageButton,page===1&&s.disabled]}><Ionicons name="chevron-back" size={17} color={theme.ink}/></Pressable><Text style={s.pageNumber}>{page} / {totalPages}</Text><Pressable disabled={page===totalPages} onPress={()=>setPage(p=>Math.min(totalPages,p+1))} style={[s.pageButton,page===totalPages&&s.disabled]}><Ionicons name="chevron-forward" size={17} color={theme.ink}/></Pressable></View></View>}
   </View>
  </>}
  <FormModal visible={open} title={form.id?'Editar categoria':'Nova categoria'} subtitle="Informe os dados da categoria de produto." onClose={()=>!busy&&setOpen(false)} footer={<><Pressable style={s.cancel} onPress={()=>setOpen(false)}><Text style={s.cancelText}>Cancelar</Text></Pressable><AsyncButton busy={busy} label={form.id?'Salvar categoria':'Cadastrar categoria'} onPress={save}/></>}> 
   <FormField label="Nome da categoria" required value={form.name} error={formError} onChangeText={v=>{setForm(f=>({...f,name:v}));setFormError('')}} autoFocus/>
   <Pressable onPress={()=>setForm(f=>({...f,active:!f.active}))} style={[s.activeChoice,form.active&&s.activeChoiceOn]}><Ionicons name={form.active?'checkmark-circle':'ellipse-outline'} size={18} color={form.active?theme.green2:theme.muted}/><Text style={s.activeChoiceText}>{form.active?'Categoria ativa':'Categoria inativa'}</Text></Pressable>
  </FormModal>
 </AppShell>;
}
function Summary({label,value,icon}:{label:string;value:string;icon:any}){return <View style={s.summary}><View style={s.summaryIcon}><Ionicons name={icon} size={17} color={theme.green2}/></View><View><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View></View>}
function Status({active}:{active:boolean}){return <View style={[s.status,active?s.statusOn:s.statusOff]}><Ionicons name={active?'checkmark-circle':'pause-circle-outline'} size={14} color={active?theme.success:theme.muted}/><Text style={[s.statusText,active&&s.statusTextOn]}>{active?'Ativo':'Inativo'}</Text></View>}
function Filter({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={[s.filter,active&&s.filterOn]}><Text style={[s.filterText,active&&s.filterTextOn]}>{label}</Text></Pressable>}
const s=StyleSheet.create({back:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,marginBottom:14,paddingVertical:4},backText:{fontSize:12,fontWeight:'800',color:theme.green2},summaryRow:{flexDirection:'row',gap:12,marginBottom:18},summaryCompact:{flexWrap:'wrap'},summary:{minWidth:190,flex:1,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:15,flexDirection:'row',alignItems:'center',gap:11},summaryIcon:{width:36,height:36,borderRadius:10,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},summaryLabel:{fontSize:11,color:theme.muted},summaryValue:{fontFamily:'serif',fontSize:20,fontWeight:'800',color:theme.ink,marginTop:2},panel:{backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderRadius:16,overflow:'hidden'},toolbar:{padding:14,borderBottomWidth:1,borderBottomColor:theme.border,flexDirection:'row',alignItems:'center',gap:12},toolbarCompact:{flexDirection:'column',alignItems:'stretch'},search:{flex:1,minWidth:220},filters:{flexDirection:'row',gap:6,flexWrap:'wrap'},filter:{height:36,borderRadius:9,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},filterOn:{backgroundColor:theme.green},filterText:{fontSize:11,fontWeight:'900',color:theme.muted},filterTextOn:{color:theme.white},row:{minHeight:72,paddingHorizontal:18,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:theme.border},first:{borderTopWidth:0},rowInfo:{flex:1,minWidth:0},rowTitle:{fontSize:13,fontWeight:'900',color:theme.ink},rowMeta:{fontSize:11,color:theme.muted,marginTop:4},status:{minWidth:78,height:30,borderRadius:999,borderWidth:1,borderColor:theme.border,paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},statusOn:{backgroundColor:theme.successSoft,borderColor:'#CFE7D8'},statusOff:{backgroundColor:theme.cream},statusText:{fontSize:10,fontWeight:'900',color:theme.muted},statusTextOn:{color:theme.success},iconButton:{width:36,height:36,borderRadius:9,borderWidth:1,borderColor:theme.border,alignItems:'center',justifyContent:'center',backgroundColor:theme.white},empty:{padding:38,alignItems:'center',gap:7},emptyTitle:{fontSize:12,fontWeight:'800',color:theme.muted},pagination:{minHeight:54,paddingHorizontal:14,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},pageInfo:{fontSize:11,color:theme.muted},pageButtons:{flexDirection:'row',alignItems:'center',gap:8},pageButton:{width:34,height:34,borderWidth:1,borderColor:theme.border,borderRadius:8,alignItems:'center',justifyContent:'center'},pageNumber:{fontSize:11,fontWeight:'800',color:theme.ink},disabled:{opacity:.35},cancel:{height:40,paddingHorizontal:15,justifyContent:'center'},cancelText:{fontSize:12,fontWeight:'800',color:theme.muted},activeChoice:{minHeight:42,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7},activeChoiceOn:{backgroundColor:theme.green50,borderColor:'#C9D8CE'},activeChoiceText:{fontSize:12,fontWeight:'800',color:theme.ink}});
