import { createContext,ReactNode,useCallback,useContext,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal,Platform,Pressable,StyleSheet,useWindowDimensions,View } from 'react-native';
import { Text } from '../i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

type Tone='success'|'error'|'info';
type ToastInput={tone?:Tone;title:string;message?:string};
type ConfirmInput={title:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
type FeedbackValue={notify:(input:ToastInput)=>void;confirm:(input:ConfirmInput)=>Promise<boolean>};
const Context=createContext<FeedbackValue|undefined>(undefined);
let activeNotify:FeedbackValue['notify']|undefined;
export const feedbackAlert={alert:(title:string,message?:string)=>activeNotify?.({tone:title.toLowerCase().includes('não')?'error':'success',title,message})};

export function FeedbackProvider({children}:{children:ReactNode}){
  const insets=useSafeAreaInsets();
  const desktop=useWindowDimensions().width>=900;
  const[toast,setToast]=useState<(ToastInput&{id:number})>();
  const[dialog,setDialog]=useState<ConfirmInput>();
  const resolver=useRef<((value:boolean)=>void)|undefined>(undefined);
  const notify=useCallback((input:ToastInput)=>{const id=Date.now();setToast({...input,id});setTimeout(()=>setToast(current=>current?.id===id?undefined:current),3800)},[]);
  activeNotify=notify;
  const confirm=useCallback((input:ConfirmInput)=>new Promise<boolean>(resolve=>{resolver.current=resolve;setDialog(input)}),[]);
  const answer=(value:boolean)=>{setDialog(undefined);resolver.current?.(value);resolver.current=undefined};
  const tone=toast?.tone??'info';
  const icon=tone==='success'?'checkmark-circle':tone==='error'?'alert-circle':'information-circle';

  const toastContent=toast&&<View pointerEvents="box-none" style={[s.toastLayer,desktop&&s.toastLayerDesktop,Platform.OS!=='web'&&{top:insets.top+16}]}><Pressable onPress={()=>setToast(undefined)} style={[s.toast,tone==='success'&&s.toastSuccess,tone==='error'&&s.toastError]}><View style={[s.toastIcon,tone==='success'&&s.iconSuccess,tone==='error'&&s.iconError]}><Ionicons name={icon as any} size={20} color={tone==='success'?'#287348':tone==='error'?theme.danger:theme.green2}/></View><View style={s.toastText}><Text style={s.toastTitle}>{toast.title}</Text>{toast.message&&<Text style={s.toastMessage}>{toast.message}</Text>}</View><Ionicons name="close" size={17} color={theme.muted}/></Pressable></View>;

  const dialogContent=dialog&&<View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>answer(false)}/><View style={s.dialog}><View style={[s.dialogIcon,dialog.danger&&s.dialogIconDanger]}><Ionicons name={dialog.danger?'warning-outline':'help-circle-outline'} size={25} color={dialog.danger?theme.danger:theme.green2}/></View><Text style={s.dialogTitle}>{dialog.title}</Text><Text style={s.dialogMessage}>{dialog.message}</Text><View style={s.actions}><Pressable onPress={()=>answer(false)} style={s.cancel}><Text style={s.cancelText}>{dialog.cancelLabel??'Cancelar'}</Text></Pressable><Pressable onPress={()=>answer(true)} style={[s.confirm,dialog.danger&&s.confirmDanger]}><Text style={[s.confirmText,dialog.danger&&s.confirmTextDanger]}>{dialog.confirmLabel??'Confirmar'}</Text></Pressable></View></View></View>;

  const webToast=Platform.OS==='web'&&toast&&typeof document!=='undefined'
    ? createPortal(<View pointerEvents="box-none" style={s.webToastHost}>{toastContent}</View>,document.body)
    : null;
  const webDialog=Platform.OS==='web'&&dialog&&typeof document!=='undefined'
    ? createPortal(<View style={s.webDialogHost}>{dialogContent}</View>,document.body)
    : null;

  return <Context.Provider value={{notify,confirm}}>{children}
    {Platform.OS==='web'?webToast:<Modal visible={!!toast} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={()=>setToast(undefined)}><View pointerEvents="box-none" style={s.toastHost}>{toastContent}</View></Modal>}
    {Platform.OS==='web'?webDialog:<Modal visible={!!dialog} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={()=>answer(false)}>{dialogContent}</Modal>}
  </Context.Provider>
}
export function useFeedback(){const value=useContext(Context);if(!value)throw new Error('useFeedback precisa de FeedbackProvider');return value}

const s=StyleSheet.create({
  toastHost:{flex:1},
  webToastHost:{position:'fixed' as any,top:0,left:0,right:0,bottom:0,zIndex:2147483647,pointerEvents:'box-none' as any},
  webDialogHost:{position:'fixed' as any,top:0,left:0,right:0,bottom:0,zIndex:2147483647},
  toastLayer:{position:'absolute',top:16,left:14,right:14,zIndex:2147483647,alignItems:'center'},
  toastLayerDesktop:{left:undefined,right:24,alignItems:'flex-end'},
  toast:{width:'100%',maxWidth:470,minHeight:66,backgroundColor:theme.white,borderWidth:1,borderColor:theme.border,borderLeftWidth:4,borderLeftColor:theme.green2,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:10,shadowColor:'#000',shadowOpacity:.12,shadowRadius:22,elevation:50},
  toastSuccess:{borderLeftColor:'#3B8B5D'},toastError:{borderLeftColor:theme.danger},toastIcon:{width:36,height:36,borderRadius:18,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},iconSuccess:{backgroundColor:'#EAF6EF'},iconError:{backgroundColor:'#FBECEC'},toastText:{flex:1},toastTitle:{fontSize:14,fontWeight:'800',color:theme.ink},toastMessage:{fontSize:11,lineHeight:14,color:theme.muted,marginTop:3},overlay:{flex:1,backgroundColor:'rgba(8,20,14,.62)',alignItems:'center',justifyContent:'center',padding:20},dialog:{width:'100%',maxWidth:400,backgroundColor:theme.white,borderRadius:18,padding:23,alignItems:'center',shadowColor:'#000',shadowOpacity:.22,shadowRadius:28,elevation:50},dialogIcon:{width:50,height:50,borderRadius:25,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},dialogIconDanger:{backgroundColor:'#FBECEC'},dialogTitle:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink,textAlign:'center',marginTop:14},dialogMessage:{fontSize:13,lineHeight:17,color:theme.muted,textAlign:'center',marginTop:7},actions:{width:'100%',flexDirection:'row',gap:9,marginTop:22},cancel:{flex:1,height:43,borderWidth:1,borderColor:theme.border,borderRadius:10,alignItems:'center',justifyContent:'center'},cancelText:{fontSize:12,fontWeight:'800',color:theme.muted},confirm:{flex:1,height:43,borderRadius:10,backgroundColor:theme.gold,alignItems:'center',justifyContent:'center'},confirmDanger:{backgroundColor:theme.danger},confirmText:{fontSize:12,fontWeight:'800',color:theme.g900},confirmTextDanger:{color:theme.white}
});
