import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { LanguageProvider } from '../lib/i18n';

export default function RootLayout(){
  return <LanguageProvider>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false}/>
    <Stack screenOptions={{headerShown:false}}>
      <Stack.Screen name="(tabs)"/>
    </Stack>
  </LanguageProvider>;
}
