import { useEffect,useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C,UI } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';
import { getWebOverlayOpen,subscribeWebOverlay } from '../../lib/webOverlayState';

type IconKind='home'|'map'|'pick'|'talk';

const ROUTE_KIND:Record<string,IconKind>={index:'home',map:'map',pick:'pick',talk:'talk'};
const ROUTE_LABEL:Record<IconKind,string>={home:'HOME',map:'TCG MAP',pick:'PICK',talk:'TALK'};
const NAV_HEIGHT=50;
const ACTIVE='#6C4DC4';
const INACTIVE='#77717D';

function HomeIcon({focused}:{focused:boolean}){
  const color=focused?ACTIVE:INACTIVE;
  return <View style={icon.box}>
    <View style={[icon.homeRoofL,{backgroundColor:color}]}/>
    <View style={[icon.homeRoofR,{backgroundColor:color}]}/>
    <View style={[icon.homeBody,focused?{backgroundColor:color,borderColor:color}:{borderColor:color}]}/>
    {focused&&<View style={icon.homeDoorCut}/>} 
  </View>;
}

function MapIcon({focused}:{focused:boolean}){
  const color=focused?ACTIVE:INACTIVE;
  return <View style={icon.box}>
    <View style={[icon.pinTail,focused?{backgroundColor:color}:{borderColor:color}]}/>
    <View style={[icon.pinHead,focused?{backgroundColor:color,borderColor:color}:{borderColor:color}]}> 
      <View style={[icon.pinHole,focused?{backgroundColor:'#fff'}:{borderColor:color}]}/>
    </View>
  </View>;
}

function PickIcon({focused}:{focused:boolean}){
  return <View style={icon.box}>
    <Text allowFontScaling={false} style={[icon.star,{color:focused?ACTIVE:INACTIVE}]}>{focused?'★':'☆'}</Text>
  </View>;
}

function TalkIcon({focused}:{focused:boolean}){
  const color=focused?ACTIVE:INACTIVE;
  return <View style={icon.box}>
    <View style={[icon.chatTail,focused?{backgroundColor:color}:{borderColor:color}]}/>
    <View style={[icon.chatBody,focused?{backgroundColor:color,borderColor:color}:{borderColor:color}]}/>
  </View>;
}

function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  if(kind==='home')return <HomeIcon focused={focused}/>;
  if(kind==='map')return <MapIcon focused={focused}/>;
  if(kind==='pick')return <PickIcon focused={focused}/>;
  return <TalkIcon focused={focused}/>;
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
  itemActive:{backgroundColor:'rgba(117,87,199,.055)'},
  itemPressed:{opacity:.7},
  label:{fontSize:9,lineHeight:10.5,fontWeight:'700',color:TAB_INACTIVE,letterSpacing:-.05},
  labelActive:{fontWeight:'800',color:C.purpleDark}
});

const icon=StyleSheet.create({
  box:{width:24,height:24,position:'relative',alignItems:'center',justifyContent:'center'},

  homeRoofL:{position:'absolute',width:11,height:1.8,left:2.8,top:6.2,borderRadius:.9,transform:[{rotate:'-40deg'}]},
  homeRoofR:{position:'absolute',width:11,height:1.8,right:2.8,top:6.2,borderRadius:.9,transform:[{rotate:'40deg'}]},
  homeBody:{position:'absolute',left:5,top:10,width:14,height:10,borderWidth:1.8,borderTopWidth:0,borderBottomLeftRadius:3,borderBottomRightRadius:3},
  homeDoorCut:{position:'absolute',left:10,top:15,width:4,height:5,backgroundColor:'#fff',borderTopLeftRadius:1.5,borderTopRightRadius:1.5},

  pinTail:{position:'absolute',top:12.7,width:9,height:9,borderWidth:1.8,borderRadius:2,transform:[{rotate:'45deg'}]},
  pinHead:{position:'absolute',top:2.4,width:16,height:16,borderWidth:1.8,borderRadius:8,zIndex:2,alignItems:'center',justifyContent:'center'},
  pinHole:{width:5,height:5,borderWidth:1.6,borderRadius:2.5},

  star:{fontSize:22,lineHeight:24,fontWeight:'700',textAlign:'center',marginTop:-1},

  chatTail:{position:'absolute',left:5.2,top:14.5,width:7,height:7,borderWidth:1.8,borderRadius:1.6,transform:[{rotate:'45deg'}]},
  chatBody:{position:'absolute',left:2.5,top:3.5,width:19,height:14.5,borderWidth:1.8,borderRadius:6,zIndex:2},
});
