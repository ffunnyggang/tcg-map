import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I=({children}:{children:string})=><Text style={{fontSize:18}}>{children}</Text>;

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,8);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarLabelStyle:{fontSize:11,fontWeight:'600'},
    tabBarStyle:{height:56+bottom,paddingBottom:bottom,paddingTop:6}
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:()=> <I>⌂</I>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:()=> <I>⌖</I>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:()=> <I>★</I>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:()=> <I>☵</I>}}/>
  </Tabs>
}
