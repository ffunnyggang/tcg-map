import { Tabs } from 'expo-router';
import { Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';

const I=({children,focused}:{children:string;focused:boolean})=><View style={{width:28,height:25,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:focused?C.purpleSoft:'transparent'}}><Text style={{fontSize:18,color:focused?C.purpleDark:'#6F6976'}}>{children}</Text></View>;

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,8);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:'#6F6976',
    tabBarLabelStyle:{fontSize:10,fontWeight:'700',marginTop:1},
    tabBarStyle:{height:62+bottom,paddingBottom:bottom,paddingTop:5,marginHorizontal:14,marginBottom:8,borderTopWidth:0,borderWidth:1,borderColor:'#E9E5ED',borderRadius:30,backgroundColor:'rgba(255,255,255,0.98)',position:'absolute',shadowColor:'#201C2A',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:8},
    tabBarItemStyle:{borderRadius:25,marginHorizontal:2}
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=> <I focused={focused}>⌂</I>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=> <I focused={focused}>⌖</I>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=> <I focused={focused}>★</I>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=> <I focused={focused}>☵</I>}}/>
  </Tabs>
}
