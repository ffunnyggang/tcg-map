import { Tabs } from 'expo-router';
import { Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI,navShadow } from '../../lib/theme';

const I=({children,focused}:{children:string;focused:boolean})=><View style={{width:28,height:24,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:17,color:focused?C.purpleDark:'#6F6976'}}>{children}</Text></View>;

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,8);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:'#6F6976',
    tabBarLabelStyle:{fontSize:9.5,fontWeight:'700',marginTop:0},
    tabBarStyle:{height:UI.navH,paddingBottom:4,paddingTop:4,marginHorizontal:13,borderTopWidth:0,borderWidth:1,borderColor:'rgba(233,229,237,.72)',borderRadius:33,backgroundColor:'rgba(255,255,255,.90)',position:'absolute',bottom,...navShadow},
    tabBarItemStyle:{borderRadius:28,marginHorizontal:1}
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=> <I focused={focused}>⌂</I>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=> <I focused={focused}>⌖</I>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=> <I focused={focused}>★</I>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=> <I focused={focused}>☵</I>}}/>
  </Tabs>
}
