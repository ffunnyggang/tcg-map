import { Tabs } from 'expo-router';
import { Text } from 'react-native';
const I=({children}:{children:string})=><Text style={{fontSize:18}}>{children}</Text>;
export default function TabsLayout(){return <Tabs screenOptions={{headerShown:false,tabBarLabelStyle:{fontSize:11,fontWeight:'600'},tabBarStyle:{height:64,paddingBottom:8,paddingTop:6}}}><Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:()=> <I>⌂</I>}}/><Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:()=> <I>⌖</I>}}/><Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:()=> <I>★</I>}}/><Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:()=> <I>☵</I>}}/></Tabs>}
