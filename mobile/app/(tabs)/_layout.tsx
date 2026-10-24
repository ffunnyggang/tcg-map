// FUNY PIN final release verification
import { useEffect,useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Image,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';
import { getWebOverlayOpen,subscribeWebOverlay } from '../../lib/webOverlayState';
import { useAppLanguage } from '../../lib/i18n';
import { emitTabReselect } from '../../lib/tabReselect';

type IconKind='home'|'map'|'pick'|'talk'|'my';

const ROUTE_KIND:Record<string,IconKind>={index:'home',map:'map',pick:'pick',talk:'talk',my:'my'};
const ROUTE_LABEL:Record<IconKind,string>={home:'HOME',map:'TCG MAP',pick:'PICK',talk:'TALK',my:'MY'};
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
  my:{
    active:{uri:'https://funypin.kr/assets/nav-icons-final-v2/funypin_nav_my_on.png'},
    inactive:{uri:'https://funypin.kr/assets/nav-icons-final-v2/funypin_nav_my_off.png'},
  },
};

function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  return <View style={styles.iconSlot}>
    {kind==='my'
      ?<Ionicons name="person-outline" size={21} color={focused?'#5C36B5':'#17151A'}/>
      :<Image source={focused?NAV_ICONS[kind].active:NAV_ICONS[kind].inactive} resizeMode="contain" style={[styles.icon,{tintColor:focused?'#5C36B5':'#17151A'}]}/>
    }
  </View>;
}

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const {language}=useAppLanguage();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  useEffect(()=>subscribeWebOverlay(setOverlayOpen),[]);
  const isAndroid=Platform.OS==='android';
  const bottom=isAndroid?0:Math.max(insets.bottom,UI.navBottomGap);
  const currentRoute=state.routes[state.index];
  const currentOptions=descriptors[currentRoute.key]?.options;
  const currentStyle=currentOptions?.tabBarStyle;
  const isHidden=!!currentStyle&&!Array.isArray(currentStyle)&&typeof currentStyle==='object'&&'display' in currentStyle&&currentStyle.display==='none';
  if(isHidden||overlayOpen)return null;

  return <View pointerEvents="box-none" style={[styles.outer,isAndroid&&styles.outerAndroid,{bottom,height:isAndroid?NAV_HEIGHT+insets.bottom:NAV_HEIGHT,paddingBottom:isAndroid?insets.bottom:0}]}>
    <View style={[styles.glassBar,isAndroid&&styles.androidBar]}>
      {!isAndroid?<><BlurView pointerEvents="none" tint="systemUltraThinMaterialLight" intensity={64} style={StyleSheet.absoluteFill}/><View pointerEvents="none" style={styles.glassRefraction}/><View pointerEvents="none" style={styles.glassTint}/><View pointerEvents="none" style={styles.glassEdge}/></>:null}
      {state.routes.map((route,index)=>{
        const kind=ROUTE_KIND[route.name];if(!kind)return null;
        const focused=state.index===index,options=descriptors[route.key]?.options,label=ROUTE_LABEL[kind];
        const accessibilityLabel=language==='en'?label:({home:'홈',map:'TCG 지도',pick:'픽',talk:'톡',my:'마이'} as Record<IconKind,string>)[kind];
        const onPress=()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(event.defaultPrevented)return;if(focused){if(kind==='map'||kind==='my'||kind==='talk'){emitTabReselect(kind);return;}navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});return;}if(kind==='talk'){navigation.navigate(route.name,{...(route.params||{}),postId:undefined,editPost:undefined,__tabRefresh:String(Date.now())});emitTabReselect('talk');return;}navigation.navigate(route.name,route.params);};
        return <Pressable key={route.key} testID={options?.tabBarButtonTestID} accessibilityRole="tab" accessibilityState={focused?{selected:true}:{}} accessibilityLabel={options?.tabBarAccessibilityLabel||accessibilityLabel} onPress={onPress} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})} style={({pressed})=>[styles.item,!isAndroid&&focused&&styles.itemActive,isAndroid&&styles.androidItem,pressed&&styles.itemPressed]}>
          <NavIcon kind={kind} focused={focused}/>
          <Text allowFontScaling maxFontSizeMultiplier={1.1} style={[styles.label,focused&&styles.labelActive]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export default function TabsLayout(){return <Tabs tabBar={(props)=><FunyTabBar {...props}/>} screenOptions={{headerShown:false,tabBarActiveTintColor:C.purpleDark,tabBarInactiveTintColor:TAB_INACTIVE,tabBarShowLabel:true}}><Tabs.Screen name="index" options={{title:'HOME'}}/><Tabs.Screen name="map" options={{title:'TCG MAP'}}/><Tabs.Screen name="pick" options={{title:'PICK'}}/><Tabs.Screen name="talk" options={{title:'TALK'}}/><Tabs.Screen name="my" options={{title:'MY'}}/></Tabs>}

const styles=StyleSheet.create({
  outer:{position:'absolute',left:16,right:16,height:NAV_HEIGHT,zIndex:10000,elevation:10000},
  outerAndroid:{left:0,right:0,backgroundColor:'#fff',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#DDD9E1',shadowColor:'#000',shadowOpacity:.08,shadowRadius:8,shadowOffset:{width:0,height:-2},elevation:24},
  glassBar:{flex:1,position:'relative',flexDirection:'row',alignItems:'center',paddingHorizontal:4,paddingVertical:4,borderRadius:29,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.78)',backgroundColor:'rgba(255,255,255,.018)',shadowColor:'#211A2E',shadowOpacity:.18,shadowRadius:20,shadowOffset:{width:0,height:8},elevation:10},
  androidBar:{borderRadius:0,borderWidth:0,backgroundColor:'#fff',shadowOpacity:0,elevation:0,paddingHorizontal:8,paddingVertical:2,overflow:'visible'},
  glassRefraction:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(245,242,250,.075)',transform:[{scaleY:1.035}]},
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.012)'},
  glassEdge:{...StyleSheet.absoluteFillObject,borderRadius:29,borderWidth:.75,borderColor:'rgba(93,77,126,.16)',backgroundColor:'transparent'},
  item:{flex:1,height:50,borderRadius:25,alignItems:'center',justifyContent:'center',gap:1,overflow:'hidden'},
  androidItem:{height:54,borderRadius:0,overflow:'visible'},
  itemActive:{backgroundColor:'rgba(126,92,226,.11)',borderWidth:.7,borderColor:'rgba(126,92,226,.22)',shadowColor:'#6547BA',shadowOpacity:.10,shadowRadius:8,shadowOffset:{width:0,height:2}},
  itemPressed:{opacity:.72},
  iconSlot:{width:25,height:25,alignItems:'center',justifyContent:'center'},
  icon:{width:25,height:25},
  label:{width:'100%',height:12,fontSize:9.5,lineHeight:12,fontWeight:'800',color:'#17151A',letterSpacing:-.05,textAlign:'center',textAlignVertical:'center',includeFontPadding:false},
  labelActive:{fontWeight:'900',color:'#5C36B5'}
});
