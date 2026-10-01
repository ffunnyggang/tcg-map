import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Image,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';

type IconKind='home'|'map'|'pick'|'talk';

const ROUTE_KIND:Record<string,IconKind>={
  index:'home',
  map:'map',
  pick:'pick',
  talk:'talk'
};

const ROUTE_LABEL:Record<IconKind,string>={
  home:'HOME',
  map:'TCG MAP',
  pick:'PICK',
  talk:'TALK'
};

/** Eight supplied navigation image files. Active/inactive render at one identical size. */
const NAV_IMAGES:Record<IconKind,{active:any;inactive:any}>={
  home:{active:require('../../assets/nav-icons-v2/home-active.png'),inactive:require('../../assets/nav-icons-v2/home-inactive.png')},
  map:{active:require('../../assets/nav-icons-v2/map-active.png'),inactive:require('../../assets/nav-icons-v2/map-inactive.png')},
  pick:{active:require('../../assets/nav-icons-v2/pick-active.png'),inactive:require('../../assets/nav-icons-v2/pick-inactive.png')},
  talk:{active:require('../../assets/nav-icons-v2/talk-active.png'),inactive:require('../../assets/nav-icons-v2/talk-inactive.png')}
};

const ICON_SIZE=24;

function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  return <Image
    source={focused?NAV_IMAGES[kind].active:NAV_IMAGES[kind].inactive}
    resizeMode="contain"
    style={styles.icon}
  />;
}

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const currentRoute=state.routes[state.index];
  const currentOptions=descriptors[currentRoute.key]?.options;
  const currentStyle=currentOptions?.tabBarStyle;
  const isHidden=!!currentStyle && !Array.isArray(currentStyle) && typeof currentStyle==='object' && 'display' in currentStyle && currentStyle.display==='none';
  if(isHidden)return null;

  return <View pointerEvents="box-none" style={[styles.outer,{bottom}]}>
    <View style={styles.glassBar}>
      <BlurView pointerEvents="none" tint="light" intensity={Platform.OS==='ios'?78:65} style={StyleSheet.absoluteFill}/>
      <View pointerEvents="none" style={styles.glassTint}/>
      <View pointerEvents="none" style={styles.glassHighlight}/>
      {state.routes.map((route,index)=>{
        const kind=ROUTE_KIND[route.name];
        if(!kind)return null;
        const focused=state.index===index;
        const options=descriptors[route.key]?.options;
        const label=ROUTE_LABEL[kind];
        const onPress=()=>{
          const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});
          if(event.defaultPrevented)return;
          if(focused){
            navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});
            return;
          }
          navigation.navigate(route.name,route.params);
        };
        return <Pressable
          key={route.key}
          testID={options?.tabBarButtonTestID}
          accessibilityRole="tab"
          accessibilityState={focused?{selected:true}:{}}
          accessibilityLabel={options?.tabBarAccessibilityLabel||label}
          onPress={onPress}
          onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})}
          style={({pressed})=>[styles.item,focused&&styles.itemActive,pressed&&styles.itemPressed]}
        >
          <NavIcon kind={kind} focused={focused}/>
          <Text allowFontScaling maxFontSizeMultiplier={1.15} style={[styles.label,focused&&styles.labelActive]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export default function TabsLayout(){
  return <Tabs
    tabBar={(props)=><FunyTabBar {...props}/>}
    screenOptions={{headerShown:false,tabBarActiveTintColor:C.purpleDark,tabBarInactiveTintColor:TAB_INACTIVE,tabBarShowLabel:true}}
  >
    <Tabs.Screen name="index" options={{title:'HOME'}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP'}}/>
    <Tabs.Screen name="pick" options={{title:'PICK'}}/>
    <Tabs.Screen name="talk" options={{title:'TALK'}}/>
  </Tabs>;
}

const styles=StyleSheet.create({
  outer:{position:'absolute',left:13,right:13,height:76,zIndex:10000,elevation:10000},
  glassBar:{
    flex:1,position:'relative',flexDirection:'row',alignItems:'center',
    paddingHorizontal:5,paddingVertical:4,borderRadius:38,overflow:'hidden',
    borderWidth:1,borderColor:'rgba(255,255,255,0.72)',
    backgroundColor:'rgba(255,255,255,0.20)',
    shadowColor:'#4D3A70',shadowOpacity:0.18,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:12
  },
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,0.22)'},
  glassHighlight:{position:'absolute',left:1,right:1,top:1,height:24,borderRadius:36,backgroundColor:'rgba(255,255,255,0.28)'},
  item:{flex:1,height:62,borderRadius:31,alignItems:'center',justifyContent:'center',paddingTop:1,gap:3},
  itemActive:{backgroundColor:'rgba(139,92,246,0.16)'},
  itemPressed:{opacity:0.72},
  icon:{width:ICON_SIZE,height:ICON_SIZE},
  label:{fontSize:9.5,lineHeight:11,fontWeight:'800',color:TAB_INACTIVE,letterSpacing:-0.1},
  labelActive:{color:C.purpleDark}
});
