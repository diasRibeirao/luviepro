import {createContext,type ReactNode,useContext,useEffect,useMemo,useState} from 'react';
import {api,getSession,subscribeSession} from './api';
import {theme} from './theme';
import {subscribeTenantBrand} from './tenantBrandEvents';

export type TenantAccountSummary={
  tenant?:{
    plan?:string;
    status?:string;
    subscriptionExpiresAt?:string|null;
    name?:string;
    logoUrl?:string|null;
    primaryColor?:string|null;
    secondaryColor?:string|null;
    onboardingCompletedAt?:string|null;
  };
  subscription?:{
    id?:string;
    status?:string;
    startsAt?:string;
    expiresAt?:string;
  }|null;
  usage?:{
    clients?:number;
  };
  limit?:{
    maxClients?:number;
  };
};


export type TenantBrand={
  primary:string;
  secondary:string;
  primaryForeground:string;
  secondaryForeground:string;
  primarySoft:string;
  secondarySoft:string;
};

export function validBrandHex(value?:string|null){
  const normalized=String(value??'').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized)?normalized:undefined;
}

export function readableOn(hex:string){
  const value=hex.replace('#','');

  if(!/^[0-9a-f]{6}$/i.test(value)){
    return theme.white;
  }

  const rgb=[0,2,4]
    .map(index=>parseInt(value.slice(index,index+2),16)/255)
    .map(channel=>channel<=.03928
      ?channel/12.92
      :Math.pow((channel+.055)/1.055,2.4));

  const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];

  return luminance>.46?'#17211C':theme.white;
}

export function withAlpha(hex:string,alpha:number){
  const value=hex.replace('#','');

  if(!/^[0-9a-f]{6}$/i.test(value)){
    return `rgba(255,255,255,${alpha})`;
  }

  const r=parseInt(value.slice(0,2),16);
  const g=parseInt(value.slice(2,4),16);
  const b=parseInt(value.slice(4,6),16);

  return `rgba(${r},${g},${b},${alpha})`;
}

export function createTenantBrand(
  primaryColor?:string|null,
  secondaryColor?:string|null,
):TenantBrand{
  const primary=validBrandHex(primaryColor)??theme.g800;
  const secondary=validBrandHex(secondaryColor)??theme.gold;

  return {
    primary,
    secondary,
    primaryForeground:readableOn(primary),
    secondaryForeground:readableOn(secondary),
    primarySoft:withAlpha(primary,.10),
    secondarySoft:withAlpha(secondary,.14),
  };
}

/*
 * Identidade padrao do LuviePro.
 *
 * - usada antes de existir uma sessao tenant;
 * - usada no Platform/Master;
 * - usada como fallback se o tenant nao possuir cores validas.
 */
const defaultBrand=createTenantBrand();

type TenantBrandRuntime={
  brand:TenantBrand;
  account?:TenantAccountSummary;
};

const defaultRuntime:TenantBrandRuntime={
  brand:defaultBrand,
  account:undefined,
};

const TenantBrandContext=createContext<TenantBrandRuntime>(defaultRuntime);

type AccountCacheEntry={
  key:string;
  value:TenantAccountSummary;
};

let accountCache:AccountCacheEntry|undefined;

export function TenantBrandProvider({
  children,
}:{
  children:ReactNode;
}){
  const [sessionVersion,setSessionVersion]=useState(0);
  const session=getSession();

  useEffect(()=>{
    return subscribeSession(()=>{
      setSessionVersion(value=>value+1);
    });
  },[]);

  void sessionVersion;

  const platform=session?.role==='platform_admin';
  const accountKey=session?.id??session?.email??'anonymous';

  const [account,setAccount]=useState<TenantAccountSummary|undefined>(
    ()=>!platform&&accountCache?.key===accountKey
      ?accountCache.value
      :undefined,
  );

  useEffect(()=>{
    let mounted=true;

    if(!session||platform){
      setAccount(undefined);

      return()=>{
        mounted=false;
      };
    }

    const refresh=()=>{
      api<TenantAccountSummary>('/account')
        .then(value=>{
          if(!mounted){
            return;
          }

          accountCache={
            key:accountKey,
            value,
          };

          setAccount(value);
        })
        .catch(()=>undefined);
    };

    const cachedAccount=
      accountCache?.key===accountKey
        ?accountCache.value
        :undefined;

    setAccount(cachedAccount);

    refresh();

    const unsubscribe=subscribeTenantBrand(refresh);

    let resumeTimer:ReturnType<typeof setTimeout>|undefined;

    const refreshOnResume=()=>{
      if(
        typeof document!=='undefined'&&
        document.visibilityState==='hidden'
      ){
        return;
      }

      if(resumeTimer){
        clearTimeout(resumeTimer);
      }

      resumeTimer=setTimeout(()=>{
        if(mounted){
          refresh();
        }
      },150);
    };

    if(
      typeof window!=='undefined'&&
      typeof document!=='undefined'
    ){
      document.addEventListener(
        'visibilitychange',
        refreshOnResume,
      );

      window.addEventListener(
        'pageshow',
        refreshOnResume,
      );

      window.addEventListener(
        'focus',
        refreshOnResume,
      );
    }

    return()=>{
      mounted=false;

      if(resumeTimer){
        clearTimeout(resumeTimer);
      }

      if(
        typeof window!=='undefined'&&
        typeof document!=='undefined'
      ){
        document.removeEventListener(
          'visibilitychange',
          refreshOnResume,
        );

        window.removeEventListener(
          'pageshow',
          refreshOnResume,
        );

        window.removeEventListener(
          'focus',
          refreshOnResume,
        );
      }

      unsubscribe();
    };
  },[accountKey,platform]);

  const brand=useMemo(
    ()=>platform
      ?defaultBrand
      :createTenantBrand(
          account?.tenant?.primaryColor??session?.primaryColor,
          account?.tenant?.secondaryColor??session?.secondaryColor,
        ),
    [
      platform,
      account?.tenant?.primaryColor,
      account?.tenant?.secondaryColor,
      session?.primaryColor,
      session?.secondaryColor,
    ],
  );

  const value=useMemo<TenantBrandRuntime>(
    ()=>({
      brand,
      account:platform?undefined:account,
    }),
    [brand,account,platform],
  );

  return (
    <TenantBrandContext.Provider value={value}>
      {children}
    </TenantBrandContext.Provider>
  );
}

export function useTenantBrand(){
  return useContext(TenantBrandContext).brand;
}

export function useTenantAccount(){
  return useContext(TenantBrandContext).account;
}
