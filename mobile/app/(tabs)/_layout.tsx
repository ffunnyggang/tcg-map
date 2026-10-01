import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';

type IconKind='home'|'map'|'pick'|'talk';

const ICONS={
  home:{active:require('../../assets/nav-icons-v3/home-active.png'),inactive:require('../../assets/nav-icons-v3/home-inactive.png')},
  map:{active:require('../../assets/nav-icons-v3/map-active.png'),inactive:require('../../assets/nav-icons-v3/map-inactive.png')},
  pick:{active:require('../../assets/nav-icons-v3/pick-active.png'),inactive:require('../../assets/nav-icons-v3/pick-inactive.png')},
  talk:{active:require('../../assets/nav-icons-v3/talk-active.png'),inactive:require('../../assets/nav-icons-v3/talk-inactive.png')}
} as const;

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

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const currentRoute=state.routes[state.index];
  const currentOptions=descriptors[currentRoute.key]?.options;
  const currentStyle=currentOptions?.tabBarStyle;
  const isHidden=!!currentStyle && !Array.isArray(currentStyle) && typeof currentStyle==='object' && 'display' in currentStyle && currentStyle.display==='none';
  if(isHidden)return null;

  return (
    <View pointerEvents="box-none" style={[styles.outer,{bottom}]}>
      <View style={styles.glassBar}>
        <View pointerEvents="none" style={styles.glassHighlight}/>
        {state.routes.map((route,index)=>{
          const kind=ROUTE_KIND[route.name];
          if(!kind)return null;
          const focused=state.index===index;
          const options=descriptors[route.key]?.options;
          const label=ROUTE_LABEL[kind];
          const onPress=()=>{
            const event=navigation.emit({
              type:'tabPress',
              target:route.key,
              canPreventDefault:true
            });
            if(event.defaultPrevented)return;
            if(focused){
              navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});
              return;
            }
            navigation.navigate(route.name,route.params);
          };
          const onLongPress=()=>{
            navigation.emit({type:'tabLongPress',target:route.key});
          };
          const source=focused?ICONS[kind].active:ICONS[kind].inactive;
          return (
            <Pressable
              key={route.key}
              testID={options?.tabBarButtonTestID}
              accessibilityRole="tab"
              accessibilityState={focused?{selected:true}:{}}
              accessibilityLabel={options?.tabBarAccessibilityLabel||label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({pressed})=>[
                styles.item,
                focused&&styles.itemActive,
                pressed&&styles.itemPressed
              ]}
            >
              <Image source={source} resizeMode="contain" style={styles.icon}/>
              <Text allowFontScaling maxFontSizeMultiplier={1.15} style={[styles.label,focused&&styles.labelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout(){
  return <Tabs
    tabBar={(props)=><FunyTabBar {...props}/>}
    screenOptions={{
      headerShown:false,
      tabBarActiveTintColor:C.purpleDark,
      tabBarInactiveTintColor:TAB_INACTIVE,
      tabBarShowLabel:true
    }}
  >
    <Tabs.Screen name="index" options={{title:'HOME'}}/>
    <Tabs.Screen name="map" options={{title:'TCG MAP'}}/>
    <Tabs.Screen name="pick" options={{title:'PICK'}}/>
    <Tabs.Screen name="talk" options={{title:'TALK'}}/>
  </Tabs>;
}

const styles=StyleSheet.create({
  outer:{
    position:'absolute',
    left:13,
    right:13,
    height:68,
    zIndex:10000,
    elevation:10000,
  },
  glassBar:{
    flex:1,
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:4,
    paddingVertical:4,
    borderRadius:34,
    backgroundColor:'rgba(255,255,255,0.74)',
    borderWidth:1,
    borderColor:'rgba(255,255,255,0.92)',
    shadowColor:'#201C2A',
    shadowOpacity:0.13,
    shadowRadius:16,
    shadowOffset:{width:0,height:5},
    elevation:6,
    overflow:'hidden',
  },
  glassHighlight:{
    position:'absolute',
    left:1,
    right:1,
    top:1,
    height:26,
    borderRadius:28,
    backgroundColor:'rgba(255,255,255,0.30)',
  },
  item:{
    flex:1,
    height:58,
    borderRadius:29,
    alignItems:'center',
    justifyContent:'center',
    paddingTop:2,
    gap:1,
  },
  itemActive:{
    backgroundColor:'rgba(218,211,235,0.58)',
  },
  itemPressed:{
    opacity:0.78,
  },
  icon:{
    width:32,
    height:32,
  },
  label:{
    fontSize:9.5,
    lineHeight:11,
    fontWeight:'800',
    color:TAB_INACTIVE,
    letterSpacing:-0.1,
  },
  labelActive:{
    color:C.purpleDark,
  },
});
