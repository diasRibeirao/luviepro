import {useCallback,useEffect} from 'react';
import {Platform} from 'react-native';
import {useFeedback} from '../components/Feedback';

export function useUnsavedChanges(dirty:boolean,message='Existem alterações não salvas. Deseja descartá-las?'){
  const{confirm}=useFeedback();
  useEffect(()=>{
    if(!dirty||Platform.OS!=='web'||typeof window==='undefined')return;
    const onBeforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
    window.addEventListener('beforeunload',onBeforeUnload);
    return()=>window.removeEventListener('beforeunload',onBeforeUnload);
  },[dirty]);
  const confirmDiscard=useCallback(async(onDiscard:()=>void|Promise<void>)=>{
    if(!dirty){await onDiscard();return true}
    const accepted=await confirm({title:'Alterações não salvas',message,confirmLabel:'Descartar',cancelLabel:'Continuar editando',danger:true});
    if(accepted)await onDiscard();
    return accepted;
  },[confirm,dirty,message]);
  return{dirty,confirmDiscard};
}
