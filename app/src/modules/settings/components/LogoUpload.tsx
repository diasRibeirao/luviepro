import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image,Platform,Pressable,View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../../../i18n';
import { api,apiForm } from '../../../api';
import { feedbackAlert as Alert,useFeedback } from '../../../components/Feedback';
import { theme } from '../../../theme';
import type { TenantSettings } from '../settings.types';
import { errorMessage } from '../settings.utils';
import { emitTenantBrandChanged } from '../../../tenantBrandEvents';
import { s } from '../settings.styles';

async function dominantLogoColor(dataUrl?:string|null):Promise<string|undefined>{
  if(Platform.OS!=='web'||!dataUrl)return undefined;
  const g=globalThis as unknown as {Image?:new()=>any;document?:{createElement:(tag:string)=>any}};
  const BrowserImage=g.Image;
  if(!BrowserImage||!g.document)return undefined;
  return new Promise(resolve=>{
    const image=new BrowserImage();
    image.onload=()=>{
      try{
        const canvas=g.document!.createElement('canvas');canvas.width=32;canvas.height=32;
        const ctx=canvas.getContext('2d');if(!ctx)return resolve(undefined);
        ctx.drawImage(image,0,0,32,32);
        const pixels=ctx.getImageData(0,0,32,32).data;
        const bins=new Map<string,{count:number;r:number;g:number;b:number}>();
        for(let i=0;i<pixels.length;i+=4){const a=pixels[i+3],r=pixels[i],gr=pixels[i+1],b=pixels[i+2];if(a<128)continue;const max=Math.max(r,gr,b),min=Math.min(r,gr,b);if(max>242||max<28||max-min<18)continue;const key=`${Math.round(r/32)}-${Math.round(gr/32)}-${Math.round(b/32)}`;const current=bins.get(key)??{count:0,r:0,g:0,b:0};current.count++;current.r+=r;current.g+=gr;current.b+=b;bins.set(key,current)}
        const best=[...bins.values()].sort((a,b)=>b.count-a.count)[0];if(!best)return resolve(undefined);
        const hex=(value:number)=>Math.round(value/best.count).toString(16).padStart(2,'0');resolve(`#${hex(best.r)}${hex(best.g)}${hex(best.b)}`.toUpperCase());
      }catch{resolve(undefined)}
    };
    image.onerror=()=>resolve(undefined);image.src=dataUrl;
  });
}

export function LogoUpload({value,enabled,canUseCustomColors=false,onChanged,onPrimaryColorDetected}:{value?:string;enabled:boolean;canUseCustomColors?:boolean;onChanged:(value:string|null)=>void;onPrimaryColorDetected?:(value:string)=>void}){const[busy,setBusy]=useState(false);const{confirm}=useFeedback();async function pick(){try{if(Platform.OS!=='web'){const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)return Alert.alert('Permissão necessária','Autorize o acesso às fotos para selecionar o logo.')}const result=await ImagePicker.launchImageLibraryAsync({allowsEditing:true,quality:.9});if(result.canceled)return;const asset=result.assets[0];
      // No navegador, a URL devolvida pelo backend pode estar em outro domínio (ex.: frontend e API no Render).
      // Ler pixels dessa URL em canvas pode ser bloqueado por CORS. Detectamos a cor a partir do arquivo local
      // escolhido pelo usuário, antes do upload, e só depois persistimos a identidade no tenant.
      const detectedPrimary=canUseCustomColors?await dominantLogoColor(asset.uri):undefined;
      const form=new FormData();const file=asset.file??({uri:asset.uri,name:asset.fileName||'logo.jpg',type:asset.mimeType||'image/jpeg'} as unknown as Blob);form.append('file',file);setBusy(true);const tenant=await apiForm<TenantSettings>('/account/logo',form);onChanged(tenant.logoUrl??null);
      // O upload da logo e a sugestão automática de cor são operações independentes.
      // Se a cor não puder ser persistida, a logo já enviada continua válida e a marca deve atualizar.
      emitTenantBrandChanged();
      if(canUseCustomColors&&detectedPrimary){
        try{await api<TenantSettings>('/account/settings',{method:'PATCH',body:JSON.stringify({primaryColor:detectedPrimary})});onPrimaryColorDetected?.(detectedPrimary);emitTenantBrandChanged();Alert.alert('Logo atualizado','A logo foi atualizada e a cor principal foi sugerida automaticamente a partir da imagem.');return}
        catch(colorError:unknown){onPrimaryColorDetected?.(detectedPrimary);Alert.alert('Logo atualizado',`A logo foi salva, mas não foi possível salvar automaticamente a cor sugerida. Revise a cor e use "Salvar alterações". ${errorMessage(colorError)}`);return}
      }
      Alert.alert('Logo atualizado','A nova imagem será usada nas próximas propostas e PDFs.')}catch(e:unknown){Alert.alert('Não foi possível enviar o logo',errorMessage(e))}finally{setBusy(false)}}async function remove(){if(!(await confirm({title:'Remover logo?',message:'A proposta voltará a usar apenas o nome da empresa até que um novo logo seja enviado.',confirmLabel:'Remover logo',danger:true})))return;try{setBusy(true);const tenant=await api<TenantSettings>('/account/logo/remove',{method:'POST'});onChanged(tenant.logoUrl??null);emitTenantBrandChanged();Alert.alert('Logo removido')}catch(e:unknown){Alert.alert('Não foi possível remover o logo',errorMessage(e))}finally{setBusy(false)}}return <View style={s.logoCard}><View style={s.logoPreview}>{value?<Image source={{uri:value}} style={s.logoImage} resizeMode="contain"/>:<View style={s.logoEmpty}><Ionicons name="image-outline" size={28} color={theme.muted}/><Text style={s.logoEmptyText}>Nenhum logo enviado</Text></View>}</View><View style={s.logoInfo}><Text style={s.logoTitle}>Logo da empresa</Text><Text style={s.logoHelp}>PNG, JPG ou WebP · máximo 2 MB. Prefira fundo transparente e formato horizontal.</Text><View style={s.logoActions}><Pressable disabled={!enabled||busy} onPress={pick} style={[s.smallButton,(!enabled||busy)&&{opacity:.45}]}><Ionicons name="cloud-upload-outline" size={15} color={theme.green2}/><Text style={s.smallButtonText}>{busy?'Enviando...':value?'Trocar logo':'Enviar logo'}</Text></Pressable>{value?<Pressable disabled={busy} onPress={remove} style={[s.smallButton,busy&&{opacity:.45}]}><Ionicons name="trash-outline" size={14} color={theme.danger}/><Text style={[s.smallButtonText,{color:theme.danger}]}>Remover</Text></Pressable>:null}</View></View></View>}
