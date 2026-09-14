import { useEffect,useState } from 'react';
import { ActivityIndicator,View } from 'react-native';
import { Stack,router,usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider } from '../src/components/Feedback';
import { I18nProvider } from '../src/i18n';
import { getSession,hasToken,restoreSession,subscribeSession } from '../src/api';
import { theme } from '../src/theme';
import { TenantBrandProvider } from '../src/tenantBrand';
import { authGuardRedirect,isBillingRestrictedSession } from '../src/modules/auth/authFlow.mjs';
export default function Layout(){const[ready,setReady]=useState(false);const[sessionRevision,setSessionRevision]=useState(0);const path=usePathname();useEffect(()=>{let active=true;(async()=>{await restoreSession();if(active)setReady(true)})();return()=>{active=false}},[]);useEffect(()=>subscribeSession(()=>setSessionRevision(value=>value+1)),[]);useEffect(()=>{if(!ready)return;const currentSession=getSession();const redirect=authGuardRedirect(hasToken(),path,currentSession?.role==='platform_admin',isBillingRestrictedSession(currentSession));if(redirect)router.replace(redirect)},[ready,path,sessionRevision]);if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:theme.cream}}><ActivityIndicator color={theme.green}/></View>;return <SafeAreaProvider><I18nProvider><TenantBrandProvider><FeedbackProvider><Stack screenOptions={{headerShown:false}}><Stack.Screen name="(app)/quote-new" options={{presentation:'modal',animation:'slide_from_bottom',contentStyle:{backgroundColor:theme.cream}}}/></Stack></FeedbackProvider></TenantBrandProvider></I18nProvider></SafeAreaProvider>;}
