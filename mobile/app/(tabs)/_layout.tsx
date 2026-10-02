import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';
import { TAB_INACTIVE } from '../../lib/tabBar';

type IconKind='home'|'map'|'pick'|'talk';

const ROUTE_KIND:Record<string,IconKind>={index:'home',map:'map',pick:'pick',talk:'talk'};
const ROUTE_LABEL:Record<IconKind,string>={home:'HOME',map:'TCG MAP',pick:'PICK',talk:'TALK'};
const NAV_HEIGHT=58;
const ICON_COLOR_ACTIVE='#6C4DC4';
const ICON_COLOR_INACTIVE='#77717D';

function HomeIcon({color}:{color:string}){
  return <View style={icon.homeBox}>
    <View style={[icon.roofLeft,{backgroundColor:color}]}/>
    <View style={[icon.roofRight,{backgroundColor:color}]}/>
    <View style={[icon.homeBody,{borderColor:color}]}/>
    <View style={[icon.homeDoor,{backgroundColor:color}]}/>
  </View>;
}
function MapIcon({color}:{color:string}){
  return <View style={icon.pinBox}>
    <View style={[icon.pinHead,{borderColor:color}]}><View style={[icon.pinDot,{backgroundColor:color}]}/></View>
    <View style={[icon.pinTail,{borderTopColor:color}]}/>
  </View>;
}
function PickIcon({color}:{color:string}){
  return <View style={icon.pickBox}>
    <View style={[icon.sparkV,{backgroundColor:color}]}/><View style={[icon.sparkH,{backgroundColor:color}]}/>
    <View style={[icon.sparkCore,{borderColor:color}]}/>
    <View style={[icon.sparkMini,{backgroundColor:color}]}/>
  </View>;
}
function TalkIcon({color}:{color:string}){
  return <View style={icon.talkBox}>
    <View style={[icon.bubble,{borderColor:color}]}><View style={icon.dots}><View style={[icon.dot,{backgroundColor:color}]}/><View style={[icon.dot,{backgroundColor:color}]}/><View style={[icon.dot,{backgroundColor:color}]}/></View></View>
    <View style={[icon.tail,{borderTopColor:color}]}/>
  </View>;
}
function NavIcon({kind,focused}:{kind:IconKind;focused:boolean}){
  const color=focused?ICON_COLOR_ACTIVE:ICON_COLOR_INACTIVE;
  if(kind==='home')return <HomeIcon color={color}/>;
  if(kind==='map')return <MapIcon color={color}/>;
  if(kind==='pick')return <PickIcon color={color}/>;
  return <TalkIcon color={color}/>;
}

function FunyTabBar({state,descriptors,navigation}:BottomTabBarProps){
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,10);
  const currentRoute=state.routes[state.index];
  const currentOptions=descriptors[currentRoute.key]?.options;
  const currentStyle=currentOptions?.tabBarStyle;
  const isHidden=!!currentStyle&&!Array.isArray(currentStyle)&&typeof currentStyle==='object'&&'display' in currentStyle&&currentStyle.display==='none';
  if(isHidden)return null;

  return <View pointerEvents="box-none" style={[styles.outer,{bottom}]}>
    <View style={styles.glassBar}>
      <BlurView pointerEvents="none" tint={Platform.OS==='ios'?'systemUltraThinMaterialLight':'light'} intensity={Platform.OS==='ios'?68:52} style={StyleSheet.absoluteFill}/>
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
  outer:{position:'absolute',left:16,right:16,height:NAV_HEIGHT,zIndex:10000,elevation:10000},
  glassBar:{flex:1,position:'relative',flexDirection:'row',alignItems:'center',paddingHorizontal:4,paddingVertical:3,borderRadius:29,overflow:'hidden',borderWidth:0.8,borderColor:'rgba(255,255,255,.68)',backgroundColor:'rgba(255,255,255,.08)',shadowColor:'#372B4A',shadowOpacity:.13,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:8},
  glassTint:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.10)'},
  item:{flex:1,height:50,borderRadius:25,alignItems:'center',justifyContent:'center',gap:2},
  itemActive:{backgroundColor:'rgba(255,255,255,.30)',borderWidth:.7,borderColor:'rgba(255,255,255,.46)'},
  itemPressed:{opacity:.68},
  label:{fontSize:9,lineHeight:11,fontWeight:'700',color:TAB_INACTIVE,letterSpacing:-.05},
  labelActive:{fontWeight:'800',color:C.purpleDark}
});

const icon=StyleSheet.create({
  homeBox:{width:22,height:21,position:'relative'},
  roofLeft:{position:'absolute',left:2.5,top:5.2,width:10.4,height:1.8,borderRadius:.9,transform:[{rotate:'-40deg'}]},
  roofRight:{position:'absolute',right:2.5,top:5.2,width:10.4,height:1.8,borderRadius:.9,transform:[{rotate:'40deg'}]},
  homeBody:{position:'absolute',left:4,top:9.5,width:14,height:10,borderWidth:1.7,borderTopWidth:0,borderRadius:2},
  homeDoor:{position:'absolute',left:10,top:14.5,width:2,height:5,borderRadius:1},
  pinBox:{width:22,height:22,position:'relative',alignItems:'center'},
  pinHead:{position:'absolute',top:1,width:15,height:15,borderRadius:8,borderWidth:1.8,alignItems:'center',justifyContent:'center'},
  pinDot:{width:4,height:4,borderRadius:2},
  pinTail:{position:'absolute',top:14,width:0,height:0,borderLeftWidth:4,borderRightWidth:4,borderTopWidth:6,borderLeftColor:'transparent',borderRightColor:'transparent'},
  pickBox:{width:22,height:22,position:'relative',alignItems:'center',justifyContent:'center'},
  sparkV:{position:'absolute',width:2,height:18,borderRadius:2},
  sparkH:{position:'absolute',width:18,height:2,borderRadius:2},
  sparkCore:{width:10,height:10,borderWidth:1.5,transform:[{rotate:'45deg'}]},
  sparkMini:{position:'absolute',right:1,top:2,width:3,height:3,borderRadius:2},
  talkBox:{width:23,height:21,position:'relative'},
  bubble:{position:'absolute',left:1,top:2,width:21,height:15,borderWidth:1.7,borderRadius:6,alignItems:'center',justifyContent:'center'},
  tail:{position:'absolute',left:5,top:16,width:0,height:0,borderLeftWidth:1,borderRightWidth:5,borderTopWidth:5,borderLeftColor:'transparent',borderRightColor:'transparent',transform:[{rotate:'12deg'}]},
  dots:{flexDirection:'row',gap:2.4},dot:{width:2.4,height:2.4,borderRadius:2}
});
