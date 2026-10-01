import { Tabs } from 'expo-router';
import { Image,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { visualAssets } from '../../lib/visualAssets';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE,TAB_ACTIVE } from '../../lib/tabBar';

const NavIcon=({activeUri,inactiveUri,focused}:{activeUri:string;inactiveUri:string;focused:boolean})=><View style={{width:28,height:28,alignItems:'center',justifyContent:'center'}}>
  <Image source={{uri:focused?activeUri:inactiveUri}} resizeMode="contain" style={{width:24,height:24}}/>
</View>;

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
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=><NavIcon activeUri={visualAssets.home} inactiveUri={visualAssets.homeInactive} focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=><NavIcon activeUri={visualAssets.map} inactiveUri={visualAssets.mapInactive} focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=><NavIcon activeUri={visualAssets.pick} inactiveUri={visualAssets.pickInactive} focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=><NavIcon activeUri={visualAssets.talk} inactiveUri={visualAssets.talkInactive} focused={focused}/>}}/>
  </Tabs>
}
