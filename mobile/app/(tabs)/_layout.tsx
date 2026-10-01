import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE,TAB_ACTIVE } from '../../lib/tabBar';
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