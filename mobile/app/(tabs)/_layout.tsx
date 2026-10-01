import { Tabs } from 'expo-router';
import { Image,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE } from '../../lib/tabBar';

type IconKind='home'|'map'|'pick'|'talk';

const ICONS={
  home:{active:require('../../assets/nav-icons-v3/home-active.png'),inactive:require('../../assets/nav-icons-v3/home-inactive.png')},
  map:{active:require('../../assets/nav-icons-v3/map-active.png'),inactive:require('../../assets/nav-icons-v3/map-inactive.png')},
  pick:{active:require('../../assets/nav-icons-v3/pick-active.png'),inactive:require('../../assets/nav-icons-v3/pick-inactive.png')},
  talk:{active:require('../../assets/nav-icons-v3/talk-active.png'),inactive:require('../../assets/nav-icons-v3/talk-inactive.png')}
} as const;

const NavIcon=({kind,focused}:{kind:IconKind;focused:boolean})=>{
  const source=focused?ICONS[kind].active:ICONS[kind].inactive;
  return <Image source={source} resizeMode="contain" style={{width:24,height:24}}/>;
};

const TabBarBackground=()=>(
  <View pointerEvents="none" style={{
    flex:1,marginHorizontal:13,borderRadius:33,
    backgroundColor:'rgba(250,248,253,.88)',
    borderWidth:1,borderColor:'rgba(255,255,255,.96)',
    shadowColor:'#201C2A',shadowOpacity:.18,shadowRadius:22,
    shadowOffset:{width:0,height:7},elevation:8
  }}/>
);

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,8);
  return <Tabs screenOptions={{
    headerShown:false,tabBarActiveTintColor:C.purpleDark,tabBarInactiveTintColor:TAB_INACTIVE,
    tabBarActiveBackgroundColor:TAB_ACTIVE_BG,
    tabBarStyle:{...getTabBarStyle(bottom),backgroundColor:'transparent',borderWidth:0,borderColor:'transparent',shadowOpacity:0,elevation:0},
    tabBarBackground:TabBarBackground,tabBarItemStyle:TAB_BAR_ITEM_STYLE,
    tabBarLabelStyle:{fontSize:9.5,fontWeight:'800',marginTop:1},tabBarHideOnKeyboard:true
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=><NavIcon kind="home" focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=><NavIcon kind="map" focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=><NavIcon kind="pick" focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=><NavIcon kind="talk" focused={focused}/>}}/>
  </Tabs>;
}