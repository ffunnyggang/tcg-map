import { Tabs } from 'expo-router';
import { Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE,TAB_ACTIVE } from '../../lib/tabBar';

type IconKind='home'|'map'|'pick'|'talk';

const NavIcon=({kind,focused}:{kind:IconKind;focused:boolean})=>{
  const fill=focused?TAB_ACTIVE:TAB_INACTIVE;
  if(kind==='home')return <View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
    <View style={{position:'absolute',top:5,width:18,height:18,backgroundColor:fill,borderRadius:4,transform:[{rotate:'45deg'}]}}/>
    <View style={{position:'absolute',top:10,width:20,height:17,backgroundColor:fill,borderRadius:5}}/>
    <View style={{position:'absolute',bottom:1,width:6,height:9,borderTopLeftRadius:3,borderTopRightRadius:3,backgroundColor:'#fff'}}/>
  </View>;
  if(kind==='map')return <View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
    <View style={{width:22,height:19,borderRadius:3,backgroundColor:fill,transform:[{skewY:'-10deg'}],position:'absolute'}}/>
    <View style={{position:'absolute',width:1.5,height:18,backgroundColor:'#fff',left:8,opacity:.85}}/>
    <View style={{position:'absolute',width:1.5,height:18,backgroundColor:'#fff',right:8,opacity:.85}}/>
    <View style={{position:'absolute',width:10,height:13,borderRadius:7,backgroundColor:'#fff',top:5,alignItems:'center',justifyContent:'center'}}>
      <View style={{width:4,height:4,borderRadius:2,backgroundColor:fill}}/>
    </View>
  </View>;
  if(kind==='pick')return <View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontSize:25,lineHeight:28,color:fill}}>★</Text>
  </View>;
  return <View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
    <View style={{width:22,height:17,borderRadius:6,backgroundColor:fill,position:'absolute',top:5}}/>
    <View style={{position:'absolute',left:5,bottom:4,width:7,height:7,backgroundColor:fill,transform:[{rotate:'45deg'}]}}/>
    <View style={{position:'absolute',top:11,flexDirection:'row',gap:3}}>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:'#fff'}}/>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:'#fff'}}/>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:'#fff'}}/>
    </View>
  </View>;
};

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:TAB_INACTIVE,
    tabBarActiveBackgroundColor:TAB_ACTIVE_BG,
    tabBarBackground:()=> <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:34,overflow:'hidden',backgroundColor:'rgba(255,255,255,.48)',borderWidth:1,borderColor:'rgba(255,255,255,.55)'}}>
      <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(239,235,249,.30)'}}/>
      <View style={{position:'absolute',left:'4%',right:'4%',top:1,height:'42%',borderRadius:999,backgroundColor:'rgba(255,255,255,.42)'}}/>
      <View style={{position:'absolute',left:'18%',right:'18%',top:'16%',height:1,backgroundColor:'rgba(255,255,255,.68)'}}/>
    </View>,
    tabBarStyle:getTabBarStyle(bottom),
    tabBarItemStyle:TAB_BAR_ITEM_STYLE,
    tabBarLabelStyle:{fontSize:9.5,fontWeight:'800',marginTop:0},
    tabBarHideOnKeyboard:true
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=><NavIcon kind="home" focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=><NavIcon kind="map" focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=><NavIcon kind="pick" focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=><NavIcon kind="talk" focused={focused}/>}}/>
  </Tabs>;
}
