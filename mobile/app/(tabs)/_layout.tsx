import { Tabs } from 'expo-router';
import { Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI,navShadow } from '../../lib/theme';

function HomeIcon({focused}:{focused:boolean}){const c=focused?C.purpleDark:'#29262D';return <View style={{width:21,height:21,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',top:4,width:12,height:12,borderLeftWidth:1.8,borderTopWidth:1.8,borderColor:c,transform:[{rotate:'45deg'}]}}/><View style={{position:'absolute',bottom:2,width:12,height:10,borderWidth:1.8,borderTopWidth:0,borderColor:c,backgroundColor:focused?c:'transparent'}}/></View>}
function MapIcon({focused}:{focused:boolean}){const c=focused?C.purpleDark:'#29262D';return <View style={{width:21,height:21}}><View style={{position:'absolute',left:2,top:3,width:17,height:15,borderWidth:1.7,borderColor:c,transform:[{skewY:'-7deg'}]}}/><View style={{position:'absolute',left:7.2,top:3,height:15,borderLeftWidth:1.5,borderColor:c}}/><View style={{position:'absolute',left:13.4,top:3,height:15,borderLeftWidth:1.5,borderColor:c}}/><View style={{position:'absolute',left:9,top:7,width:5,height:5,borderRadius:3,borderWidth:1.5,borderColor:c}}/></View>}
function StarIcon({focused}:{focused:boolean}){return <Text style={{fontSize:22,lineHeight:22,color:focused?C.purpleDark:'#29262D'}}>{focused?'★':'☆'}</Text>}
function TalkIcon({focused}:{focused:boolean}){const c=focused?C.purpleDark:'#29262D';return <View style={{width:22,height:21}}><View style={{position:'absolute',left:2,top:3,width:18,height:13,borderWidth:1.7,borderColor:c,borderRadius:2}}/><View style={{position:'absolute',left:5,bottom:1,width:6,height:6,borderLeftWidth:1.7,borderBottomWidth:1.7,borderColor:c,transform:[{rotate:'-25deg'}]}}/><View style={{position:'absolute',top:8,left:6,width:2,height:2,borderRadius:1,backgroundColor:c}}/><View style={{position:'absolute',top:8,left:10,width:2,height:2,borderRadius:1,backgroundColor:c}}/><View style={{position:'absolute',top:8,left:14,width:2,height:2,borderRadius:1,backgroundColor:c}}/></View>}

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:'#29262D',
    tabBarActiveBackgroundColor:'rgba(231,226,241,.56)',
    tabBarLabelStyle:{fontSize:10,fontWeight:'700',marginTop:0},
    tabBarStyle:{height:UI.navH,paddingBottom:4,paddingTop:4,marginHorizontal:17,borderTopWidth:0,borderWidth:1,borderColor:'rgba(255,255,255,.88)',borderRadius:34,backgroundColor:'rgba(249,247,252,.78)',position:'absolute',bottom,...navShadow},
    tabBarItemStyle:{borderRadius:30,marginHorizontal:1,overflow:'hidden'},
    tabBarBackground:()=> <View style={{flex:1,borderRadius:34,overflow:'hidden',backgroundColor:'rgba(255,255,255,.22)'}}><View style={{position:'absolute',left:'5%',right:'5%',top:1,height:'38%',borderRadius:999,backgroundColor:'rgba(255,255,255,.28)'}}/><View style={{position:'absolute',right:0,top:0,bottom:0,width:'38%',backgroundColor:'rgba(167,143,229,.06)'}}/></View>
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=> <HomeIcon focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=> <MapIcon focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=> <StarIcon focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=> <TalkIcon focused={focused}/>}}/>
  </Tabs>
}
