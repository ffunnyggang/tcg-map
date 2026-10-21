import { useEffect } from 'react';
import { Stack,useRouter } from 'expo-router';
import { StatusBar } from 'react-native';
import { LanguageProvider } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import {
  addNotificationResponseListener,
  handleInitialNotificationResponse,
  syncPushTokenIfEnabled,
} from '../lib/notifications';

function NotificationBootstrap(){
  const router=useRouter();

  useEffect(()=>{
    const disposeResponse=addNotificationResponseListener(router);
    const timer=setTimeout(()=>{void handleInitialNotificationResponse(router)},450);
    void syncPushTokenIfEnabled().catch(()=>{});

    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session?.user)setTimeout(()=>{void syncPushTokenIfEnabled().catch(()=>{})},0);
    });

    return ()=>{
      clearTimeout(timer);
      disposeResponse();
      subscription.unsubscribe();
    };
  },[router]);

  return null;
}

export default function RootLayout(){
  return <LanguageProvider>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false}/>
    <NotificationBootstrap/>
    <Stack screenOptions={{headerShown:false}}>
      <Stack.Screen name="(tabs)"/>
    </Stack>
  </LanguageProvider>;
}
