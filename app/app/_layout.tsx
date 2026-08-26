import { useEffect,useState } from 'react';
import { ActivityIndicator,View } from 'react-native';
import { Stack,router,usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider } from '../src/components/Feedback';
import { I18nProvider } from '../src/i18n';
import { hasToken,restoreSession } from '../src/api';
import { theme } from '../src/theme';
export default function Layout(){const[ready,setReady]=useState(false);const path=usePathname();useEffect(()=>{let active=true;(async()=>{await restoreSession();if(active)setReady(true)})();return()=>{active=false}},[]);useEffect(()=>{if(!ready)return;const publicRoute=path==='/'||path==='/register'||path.startsWith('/p/');if(!hasToken()&&!publicRoute)router.replace('/');if(hasToken()&&(path==='/'||path==='/register'))router.replace('/home')},[ready,path]);if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:theme.cream}}><ActivityIndicator color={theme.green}/></View>;return <SafeAreaProvider><I18nProvider><FeedbackProvider><Stack screenOptions={{headerShown:false}}/></FeedbackProvider></I18nProvider></SafeAreaProvider>;}
