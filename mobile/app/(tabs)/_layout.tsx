import { Tabs } from 'expo-router';
import { Image,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { visualAssets } from '../../lib/visualAssets';

const NavIcon=({uri,focused}:{uri:string;focused:boolean})=><Image source={{uri}} resizeMode="contain" style={{width:21,height:21,tintColor:focused?C.purpleDark:'#29262D'}}/>;

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:'#29262D',
    tabBarActiveBackgroundColor:'rgba(226,220,239,.52)',
    tabBarLabelStyle:{fontSize:10,fontWeight:'700',marginTop:0},
    tabBarBackground:()=> <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:34,overflow:'hidden',backgroundColor:'rgba(255,255,255,.58)'}}><View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(244,241,250,.20)'}}/><View style={{position:'absolute',left:'5%',right:'5%',top:1,height:'38%',borderRadius:999,backgroundColor:'rgba(255,255,255,.34)'}}/><View style={{position:'absolute',right:0,top:0,bottom:0,width:'40%',backgroundColor:'rgba(167,143,229,.07)'}}/></View>,
    tabBarStyle:{height:UI.navH,paddingBottom:4,paddingTop:4,marginHorizontal:17,borderTopWidth:0,borderWidth:1,borderColor:'rgba(255,255,255,.88)',borderRadius:34,backgroundColor:'transparent',position:'absolute',bottom,shadowColor:'#201C2A',shadowOpacity:.16,shadowRadius:38,shadowOffset:{width:0,height:14},elevation:10},
    tabBarItemStyle:{height:56,borderRadius:30,marginHorizontal:1,overflow:'hidden'}
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.home} focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.map} focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.pick} focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.talk} focused={focused}/>}}/>
  </Tabs>
}
