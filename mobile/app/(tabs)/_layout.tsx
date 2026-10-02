import { useEffect,useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Image,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';
import { getWebOverlayOpen,subscribeWebOverlay } from '../../lib/webOverlayState';

type IconKind='home'|'map'|'pick'|'talk';

const ROUTE_KIND:Record<string,IconKind>={index:'home',map:'map',pick:'pick',talk:'talk'};
const ROUTE_LABEL:Record<IconKind,string>={home:'HOME',map:'TCG MAP',pick:'PICK',talk:'TALK'};
const NAV_HEIGHT=58;
const NAV_ICONS:Record<IconKind,{active:ImageSourcePropType;inactive:ImageSourcePropType}>={
  home:{
    active:require('../../assets/nav-icons-final/funypin_nav_home_on.png'),
    inactive:require('../../assets/nav-icons-final/funypin_nav_home_off.png'),
  },
  map:{
    active:require('../../assets/nav-icons-final/funypin_nav_map_on.png'),
    inactive:require('../../assets/nav-icons-final/funypin_nav_map_off.png'),
  },
  pick:{
    active:require('../../assets/nav-icons-final/funypin_nav_pick_on.png'),
    inactive:require('../../assets/nav-icons-final/funypin_nav_pick_off.png'),
  },
  talk:{
    active:require('../../assets/nav-icons-final/funypin_nav_talk_on.png'),
    inactive:require('../../assets/nav-icons-final/funypin_nav_talk_off.png'),
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
      <BlurView pointerEvents="none" tint={Platform.OS==='ios'?'systemUltraThinMaterialLight':'light'} intensity={Platform.OS==='ios'?46:38} style={StyleSheet.absoluteFill}/>
      <View pointerEvents="none" style={styles.glassTint}/>
      <View pointerEvents="none" style={styles.glassHighlight}/>
      {state.routes.map((route,index)=>{
        const kind=ROUTE_KIND[route.name];if(!kind)return null;
        const focused=state.index===index,options=descriptors[route.key]?.options,label=ROUTE_LABEL[kind];
        const onPress=()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(event.defaultPrevented)return;if(kind==='map'){navigation.navigate(route.name,{country:'KR',shop:'',__tabRefresh:String(Date.now())});return;}if(focused){navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});return;}navigation.navigate(route.name,route.params);};
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
  outer:{position:'absolute',left:16,right:16,height:NAV_HEIGHT,zIndex:10000,elevation:10000},
  glassBar:{flex:1,position:'relative',flexDirection:'row',alignItems:'center',paddingHorizontal:4,paddingVertical:4,borderRadius:29,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.74)',backgroundColor:'rgba(255,255,255,.035)',shadowColor:'#17131F',shadowOpacity:.19,shadowRadius:18,shadowOffset:{width:0,height:7},elevation:10},
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.012)'},
  glassHighlight:{position:'absolute',left:9,right:9,top:1,height:16,borderRadius:14,backgroundColor:'rgba(255,255,255,.34)',opacity:.88},
  item:{flex:1,height:50,borderRadius:25,alignItems:'center',justifyContent:'center',gap:1},
  itemActive:{backgroundColor:'rgba(126,92,226,.13)',borderWidth:.85,borderColor:'rgba(126,92,226,.22)',shadowColor:'#6547BA',shadowOpacity:.11,shadowRadius:9,shadowOffset:{width:0,height:2}},
  itemPressed:{opacity:.7},
  icon:{width:24,height:24},
  label:{fontSize:9.5,lineHeight:11,fontWeight:'700',color:'#6F6976',letterSpacing:-.05},
  labelActive:{fontWeight:'800',color:C.purpleDark}
});
