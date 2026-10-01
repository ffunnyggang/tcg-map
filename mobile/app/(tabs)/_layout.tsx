import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image,Pressable,StyleSheet,Text,View } from 'react-native';
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

const SPRITE_INDEX:Record<IconKind,{active:number;inactive:number}>={
  home:{active:0,inactive:1},
  map:{active:2,inactive:3},
  pick:{active:4,inactive:5},
  talk:{active:6,inactive:7}
};

const SPRITE=require('../../assets/nav-icons-v4/nav-sprite-32.png');
const ICON_SIZE=24;

function SpriteIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  const index=focused?SPRITE_INDEX[kind].active:SPRITE_INDEX[kind].inactive;
  return (
    <View style={styles.iconViewport} pointerEvents="none">
      <Image
        source={SPRITE}
        resizeMode="stretch"
        style={[styles.iconSprite,{width:ICON_SIZE*8,height:ICON_SIZE,left:-index*ICON_SIZE}]}
      />
    </View>
  );
}

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
            const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});
            if(event.defaultPrevented)return;
            if(focused){
              navigation.navigate(route.name,{...(route.params||{}),__tabRefresh:String(Date.now())});
              return;
            }
            navigation.navigate(route.name,route.params);
          };
          const onLongPress=()=>navigation.emit({type:'tabLongPress',target:route.key});
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
              <SpriteIcon kind={kind} focused={focused}/>
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
    height:70,
    zIndex:10000,
    elevation:10000,
  },
  glassBar:{
    flex:1,
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:5,
    paddingVertical:4,
    borderRadius:35,
    backgroundColor:'rgba(255,255,255,0.72)',
    borderWidth:1,
    borderColor:'rgba(255,255,255,0.82)',
    shadowColor:'#5B4A77',
    shadowOpacity:0.16,
    shadowRadius:18,
    shadowOffset:{width:0,height:6},
    elevation:7,
    overflow:'hidden',
  },
  glassHighlight:{
    position:'absolute',
    left:1,
    right:1,
    top:1,
    height:24,
    borderRadius:30,
    backgroundColor:'rgba(255,255,255,0.38)',
  },
  item:{
    flex:1,
    height:58,
    borderRadius:29,
    alignItems:'center',
    justifyContent:'center',
    paddingTop:1,
    gap:2,
  },
  itemActive:{
    backgroundColor:'rgba(139,92,246,0.13)',
  },
  itemPressed:{
    opacity:0.72,
  },
  iconViewport:{
    width:ICON_SIZE,
    height:ICON_SIZE,
    overflow:'hidden',
  },
  iconSprite:{
    position:'absolute',
    top:0,
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