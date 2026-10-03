// FUNY PIN final release verification
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
import { useAppLanguage } from '../../lib/i18n';

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
  return <Image source={focused?NAV_ICONS[kind].active:NAV_ICONS[kind].inactive} resizeMode="contain" style={[styles.icon,{tintColor:focused?'#5C36B5':'#17151A'}]}/>;
}

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const {language}=useAppLanguage();
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
      <BlurView pointerEvents="none" tint={Platform.OS==='ios'?'systemUltraThinMaterialLight':'light'} intensity={Platform.OS==='ios'?64:48} style={StyleSheet.absoluteFill}/>
      <View pointerEvents="none" style={styles.glassRefraction}/>
      <View pointerEvents="none" style={styles.glassTint}/>
      <View pointerEvents="none" style={styles.glassEdge}/>
      {state.routes.map((route,index)=>{
        const kind=ROUTE_KIND[route.name];if(!kind)return null;
        const focused=state.index===index,options=descriptors[route.key]?.options,label=ROUTE_LABEL[kind];
        const accessibilityLabel=language==='en'?label:({home:'홈',map:'TCG 지도',pick:'픽',talk:'톡'} as Record<IconKind,string>)[kind];
        const onPress=()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(event.defaultPrevented)return;if(kind==='map'){navigation.navigate(route.name,{country:'KR',shop:'',__tabRefresh:String(Date.now())});return;}if(focused){navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});return;}navigation.navigate(route.name,route.params);};
        return <Pressable key={route.key} testID={options?.tabBarButtonTestID} accessibilityRole="tab" accessibilityState={focused?{selected:true}:{}} accessibilityLabel={options?.tabBarAccessibilityLabel||accessibilityLabel} onPress={onPress} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})} style={({pressed})=>[styles.item,focused&&styles.itemActive,pressed&&styles.itemPressed]}>
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
  glassBar:{flex:1,position:'relative',flexDirection:'row',alignItems:'center',paddingHorizontal:4,paddingVertical:4,borderRadius:29,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.78)',backgroundColor:'rgba(255,255,255,.018)',shadowColor:'#211A2E',shadowOpacity:.18,shadowRadius:20,shadowOffset:{width:0,height:8},elevation:10},
  glassRefraction:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(245,242,250,.075)',transform:[{scaleY:1.035}]},
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.012)'},
  glassEdge:{...StyleSheet.absoluteFillObject,borderRadius:29,borderWidth:.75,borderColor:'rgba(93,77,126,.16)',backgroundColor:'transparent'},
  item:{flex:1,height:50,borderRadius:25,alignItems:'center',justifyContent:'center',gap:1,overflow:'hidden'},
  itemActive:{backgroundColor:'rgba(126,92,226,.11)',borderWidth:.7,borderColor:'rgba(126,92,226,.22)',shadowColor:'#6547BA',shadowOpacity:.10,shadowRadius:8,shadowOffset:{width:0,height:2}},
  itemPressed:{opacity:.72},
  icon:{width:25,height:25},
  label:{fontSize:9.5,lineHeight:11,fontWeight:'800',color:'#17151A',letterSpacing:-.05},
  labelActive:{fontWeight:'900',color:'#5C36B5'}
});
