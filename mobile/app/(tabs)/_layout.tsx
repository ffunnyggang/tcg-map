import { useEffect,useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Image,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';
import { getWebOverlayOpen,subscribeWebOverlay } from '../../lib/webOverlayState';

type IconKind='home'|'map'|'pick'|'talk';

const ROUTE_KIND:Record<string,IconKind>={index:'home',map:'map',pick:'pick',talk:'talk'};
const ROUTE_LABEL:Record<IconKind,string>={home:'HOME',map:'TCG MAP',pick:'PICK',talk:'TALK'};
const NAV_HEIGHT=50;

const NAV_ICONS:Record<IconKind,{active:any;inactive:any}>={
  home:{
    active:require('../../assets/nav-icons-v3/home-active.png'),
    inactive:require('../../assets/nav-icons-v3/home-inactive.png'),
  },
  map:{
    active:require('../../assets/nav-icons-v3/map-active.png'),
    inactive:require('../../assets/nav-icons-v3/map-inactive.png'),
  },
  pick:{
    active:require('../../assets/nav-icons-v3/pick-active.png'),
    inactive:require('../../assets/nav-icons-v3/pick-inactive.png'),
  },
  talk:{
    active:require('../../assets/nav-icons-v3/talk-active.png'),
    inactive:require('../../assets/nav-icons-v3/talk-inactive.png'),
  },
};

function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  return <Image source={focused?NAV_ICONS[kind].active:NAV_ICONS[kind].inactive} resizeMode="contain" style={styles.icon}/>;
}

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  useEffect(()=>subscribeWebOverlay(setOverlayOpen),[]);
  const bottom=Math.max(insets.bottom,UI.navBottomGap);
  const currentRoute=state.routes[state.index];
  const currentOptions=descriptors[currentRoute.key]?.options;
  const currentStyle=currentOptions?.tabBarStyle;
  const isHidden=!!currentStyle&&!Array.isArray(currentStyle)&&typeof currentStyle==='object'&&'display' in currentStyle&&currentStyle.display==='none';
  if(isHidden||overlayOpen)return null;

  return <View pointerEvents="box-none" style={[styles.outer,{bottom}]}>
    <View style={styles.glassBar}>
      <BlurView pointerEvents="none" tint={Platform.OS==='ios'?'systemUltraThinMaterialLight':'light'} intensity={Platform.OS==='ios'?76:54} style={StyleSheet.absoluteFill}/>
      <View pointerEvents="none" style={styles.glassTint}/>
      {state.routes.map((route,index)=>{
        const kind=ROUTE_KIND[route.name];if(!kind)return null;
        const focused=state.index===index,options=descriptors[route.key]?.options,label=ROUTE_LABEL[kind];
        const onPress=()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(event.defaultPrevented)return;if(focused){navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});return;}navigation.navigate(route.name,route.params);};
        return <Pressable key={route.key} testID={options?.tabBarButtonTestID} accessibilityRole="tab" accessibilityState={focused?{selected:true}:{}} accessibilityLabel={options?.tabBarAccessibilityLabel||label} onPress={onPress} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})} style={({pressed})=>[styles.item,focused&&styles.itemActive,pressed&&styles.itemPressed]}>
          <NavIcon kind={kind} focused={focused}/>
          <Text allowFontScaling maxFontSizeMultiplier={1.1} style={[styles.label,focused&&styles.labelActive]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export default function TabsLayout(){return <Tabs tabBar={(props)=><FunyTabBar {...props}/>} screenOptions={{headerShown:false,tabBarActiveTintColor:C.purpleDark,tabBarInactiveTintColor:TAB_INACTIVE,tabBarShowLabel:true}}><Tabs.Screen name="index" options={{title:'HOME'}}/><Tabs.Screen name="map" options={{title:'TCG MAP'}}/><Tabs.Screen name="pick" options={{title:'PICK'}}/><Tabs.Screen name="talk" options={{title:'TALK'}}/></Tabs>}

const styles=StyleSheet.create({
  outer:{position:'absolute',left:17,right:17,height:NAV_HEIGHT,zIndex:10000,elevation:10000},
  glassBar:{flex:1,position:'relative',flexDirection:'row',alignItems:'center',paddingHorizontal:4,paddingVertical:3,borderRadius:25,overflow:'hidden',borderWidth:.6,borderColor:'rgba(255,255,255,.72)',backgroundColor:'rgba(248,246,252,.08)',shadowColor:'#372B4A',shadowOpacity:.08,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:6},
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.06)'},
  item:{flex:1,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',gap:0},
  itemActive:{backgroundColor:'rgba(117,87,199,.10)',borderWidth:.5,borderColor:'rgba(117,87,199,.16)'},
  itemPressed:{opacity:.7},
  icon:{width:24,height:24},
  label:{fontSize:9,lineHeight:10.5,fontWeight:'700',color:TAB_INACTIVE,letterSpacing:-.05},
  labelActive:{fontWeight:'800',color:C.purpleDark}
});
