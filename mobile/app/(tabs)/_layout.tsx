import { Tabs } from 'expo-router';
import { Image,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE } from '../../lib/tabBar';
import { NAV_ICONS } from '../../lib/navIcons';

type IconKind='home'|'map'|'pick'|'talk';

const NavIcon=({kind,focused}:{kind:IconKind;focused:boolean})=>{
  const source=focused?NAV_ICONS[kind].active:NAV_ICONS[kind].inactive;
  return <Image source={source} resizeMode="contain" style={{width:22,height:22}}/>;
};

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,8);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:TAB_INACTIVE,
    tabBarActiveBackgroundColor:TAB_ACTIVE_BG,
    tabBarBackground:()=> <View pointerEvents="none" style={{
      position:'absolute',left:0,right:0,top:0,bottom:0,
      borderRadius:33,overflow:'hidden',
      backgroundColor:'rgba(255,255,255,.58)',
      borderWidth:1,borderColor:'rgba(255,255,255,.88)'
    }}>
      <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(236,231,248,.34)'}}/>
      <View style={{position:'absolute',left:'4%',right:'4%',top:0,height:'38%',borderRadius:999,backgroundColor:'rgba(255,255,255,.44)'}}/>
      <View style={{position:'absolute',left:'5%',right:'5%',top:1,height:1,backgroundColor:'rgba(255,255,255,.95)'}}/>
      <View style={{position:'absolute',left:'18%',right:'18%',bottom:3,height:1,backgroundColor:'rgba(103,73,189,.06)'}}/>
    </View>,
    tabBarStyle:getTabBarStyle(bottom),
    tabBarItemStyle:TAB_BAR_ITEM_STYLE,
    tabBarLabelStyle:{fontSize:9.5,fontWeight:'800',marginTop:1},
    tabBarHideOnKeyboard:true
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=><NavIcon kind="home" focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=><NavIcon kind="map" focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=><NavIcon kind="pick" focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=><NavIcon kind="talk" focused={focused}/>}}/>
  </Tabs>;
}