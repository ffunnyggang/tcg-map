import { Tabs } from 'expo-router';
import { Image,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { visualAssets } from '../../lib/visualAssets';
import { getTabBarStyle,TAB_BAR_ITEM_STYLE,TAB_ACTIVE_BG,TAB_INACTIVE,TAB_ACTIVE } from '../../lib/tabBar';

const NavIcon=({uri,focused}:{uri:string;focused:boolean})=><View style={{width:24,height:24,alignItems:'center',justifyContent:'center'}}>
  <Image source={{uri}} resizeMode="contain" style={{width:22,height:22,opacity:focused?1:.88,tintColor:focused?TAB_ACTIVE:TAB_INACTIVE}}/>
</View>;

const TalkIcon=({focused}:{focused:boolean})=><View style={{width:24,height:24,alignItems:'center',justifyContent:'center'}}>
  <View style={{width:20,height:15,borderWidth:1.8,borderColor:focused?TAB_ACTIVE:TAB_INACTIVE,borderRadius:5,position:'relative',alignItems:'center',justifyContent:'center'}}>
    <View style={{position:'absolute',left:3,bottom:-4,width:7,height:7,borderLeftWidth:1.8,borderBottomWidth:1.8,borderColor:focused?TAB_ACTIVE:TAB_INACTIVE,backgroundColor:'transparent',transform:[{skewX:'-18deg'},{rotate:'-8deg'}]}}/>
    <View style={{flexDirection:'row',gap:2}}>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:focused?TAB_ACTIVE:TAB_INACTIVE}}/>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:focused?TAB_ACTIVE:TAB_INACTIVE}}/>
      <View style={{width:2.5,height:2.5,borderRadius:2,backgroundColor:focused?TAB_ACTIVE:TAB_INACTIVE}}/>
    </View>
  </View>
</View>;

export default function TabsLayout(){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:C.purpleDark,
    tabBarInactiveTintColor:TAB_INACTIVE,
    tabBarActiveBackgroundColor:TAB_ACTIVE_BG,
    tabBarBackground:()=> <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:34,overflow:'hidden',backgroundColor:'rgba(255,255,255,.58)'}}>
      <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(244,241,250,.20)'}}/>
      <View style={{position:'absolute',left:'5%',right:'5%',top:1,height:'38%',borderRadius:999,backgroundColor:'rgba(255,255,255,.34)'}}/>
      <View style={{position:'absolute',right:0,top:0,bottom:0,width:'40%',backgroundColor:'rgba(167,143,229,.07)'}}/>
    </View>,
    tabBarStyle:getTabBarStyle(bottom),
    tabBarItemStyle:TAB_BAR_ITEM_STYLE
  }}>
    <Tabs.Screen name="index" options={{title:'HOME',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.home} focused={focused}/>}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.map} focused={focused}/>}}/>
    <Tabs.Screen name="pick" options={{title:'PICK',tabBarIcon:({focused})=> <NavIcon uri={visualAssets.pick} focused={focused}/>}}/>
    <Tabs.Screen name="talk" options={{title:'TALK',tabBarIcon:({focused})=> <TalkIcon focused={focused}/>}}/>
  </Tabs>
}