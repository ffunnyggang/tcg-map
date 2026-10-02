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

function HomeIcon({color}:{color:string}){
  return <View style={icon.box}>
    <View style={[icon.homeRoofL,{backgroundColor:color}]}/>
    <View style={[icon.homeRoofR,{backgroundColor:color}]}/>
    <View style={[icon.homeBody,{borderColor:color}]}/>
    <View style={[icon.homeDoor,{borderColor:color}]}/>
  </View>;
}

function MapIcon({color}:{color:string}){
  return <View style={icon.box}>
    <View style={[icon.pinRing,{borderColor:color}]}> 
      <View style={[icon.pinDot,{backgroundColor:color}]}/>
    </View>
    <View style={[icon.pinStem,{backgroundColor:color}]}/>
    <View style={[icon.pinTip,{borderLeftColor:color,borderBottomColor:color}]}/>
  </View>;
}

function PickIcon({color}:{color:string}){
  return <View style={icon.box}>
    <View style={[icon.sparkMainV,{backgroundColor:color}]}/>
    <View style={[icon.sparkMainH,{backgroundColor:color}]}/>
    <View style={[icon.sparkCut1,{backgroundColor:'#fff'}]}/>
    <View style={[icon.sparkCut2,{backgroundColor:'#fff'}]}/>
    <View style={[icon.sparkMiniV,{backgroundColor:color}]}/>
    <View style={[icon.sparkMiniH,{backgroundColor:color}]}/>
  </View>;
}

function TalkIcon({color}:{color:string}){
  return <View style={icon.box}>
    <View style={[icon.chatBody,{borderColor:color}]}> 
      <View style={icon.chatDots}>
        <View style={[icon.chatDot,{backgroundColor:color}]}/>
        <View style={[icon.chatDot,{backgroundColor:color}]}/>
        <View style={[icon.chatDot,{backgroundColor:color}]}/>
      </View>
    </View>
    <View style={[icon.chatTail,{borderLeftColor:color,borderBottomColor:color}]}/>
  </View>;
}

function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  const color=focused?ACTIVE:INACTIVE;
  if(kind==='home')return <HomeIcon color={color}/>;
  if(kind==='map')return <MapIcon color={color}/>;
  if(kind==='pick')return <PickIcon color={color}/>;
  return <TalkIcon color={color}/>;
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

  homeRoofL:{position:'absolute',width:11.5,height:1.9,left:2.45,top:6.25,borderRadius:1,transform:[{rotate:'-39deg'}]},
  homeRoofR:{position:'absolute',width:11.5,height:1.9,right:2.45,top:6.25,borderRadius:1,transform:[{rotate:'39deg'}]},
  homeBody:{position:'absolute',left:5,top:10,width:14,height:10,borderWidth:1.8,borderTopWidth:0,borderBottomLeftRadius:3,borderBottomRightRadius:3},
  homeDoor:{position:'absolute',left:9.25,top:14.25,width:5.5,height:5.75,borderWidth:1.8,borderBottomWidth:0,borderTopLeftRadius:2,borderTopRightRadius:2},

  pinRing:{position:'absolute',top:2.1,width:14.5,height:14.5,borderRadius:7.25,borderWidth:1.8,alignItems:'center',justifyContent:'center'},
  pinDot:{width:4.4,height:4.4,borderRadius:2.2},
  pinStem:{position:'absolute',top:15.1,width:1.8,height:3.2,borderRadius:.9},
  pinTip:{position:'absolute',top:16.2,width:7,height:7,borderLeftWidth:1.8,borderBottomWidth:1.8,borderBottomLeftRadius:1.5,transform:[{rotate:'-45deg'}]},

  sparkMainV:{position:'absolute',width:1.8,height:18,borderRadius:.9},
  sparkMainH:{position:'absolute',width:18,height:1.8,borderRadius:.9},
  sparkCut1:{position:'absolute',width:7.2,height:7.2,transform:[{rotate:'45deg'}]},
  sparkCut2:{position:'absolute',width:5.2,height:5.2,transform:[{rotate:'45deg'}]},
  sparkMiniV:{position:'absolute',right:2,top:1,width:1.4,height:6,borderRadius:.7},
  sparkMiniH:{position:'absolute',right:-.3,top:3.3,width:6,height:1.4,borderRadius:.7},

  chatBody:{position:'absolute',left:2,top:3,width:20,height:15,borderWidth:1.8,borderRadius:6.5,alignItems:'center',justifyContent:'center'},
  chatDots:{flexDirection:'row',gap:2.5,marginTop:-.5},
  chatDot:{width:2.5,height:2.5,borderRadius:1.25},
  chatTail:{position:'absolute',left:5.2,top:15.2,width:6.5,height:6.5,borderLeftWidth:1.8,borderBottomWidth:1.8,borderBottomLeftRadius:1.5,transform:[{rotate:'-12deg'}]},
});
