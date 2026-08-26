import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider } from '../src/components/Feedback';
export default function Layout(){return <SafeAreaProvider><FeedbackProvider><Stack screenOptions={{headerShown:false}}/></FeedbackProvider></SafeAreaProvider>;}
