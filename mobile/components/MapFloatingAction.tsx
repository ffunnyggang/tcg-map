import { Fragment,useEffect,useRef,useState } from 'react';
import { Animated,Easing,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWebOverlayOpen,subscribeWebOverlay } from '../lib/webOverlayState';
import { resolveFloatingActionBottom,TAB_BAR_HEIGHT } from '../lib/tabMetrics';

type Props={
  label:string;
  scrolling?:boolean;
  onLivePin:()=>void;
  onMarket:()=>void;
  onMarketRegister:()=>void;
};

export default function MapFloatingAction({label,scrolling=false,onLivePin,onMarket,onMarketRegister}:Props){
  const insets=useSafeAreaInsets();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  const [menuOpen,setMenuOpen]=useState(false);
  const progress=useRef(new Animated.Value(0)).current;
  const bottom=resolveFloatingActionBottom(insets.bottom,Platform.OS==='android',true);
  const navTopOffset=Math.max(insets.bottom,Platform.OS==='android'?16:12)+TAB_BAR_HEIGHT;
  const expandedWidth=Math.max(156,Math.min(208,72+String(label||'').length*8.2));

  useEffect(()=>subscribeWebOverlay(open=>{setOverlayOpen(open);if(open)setMenuOpen(false);}),[]);
  useEffect(()=>{
    Animated.timing(progress,{toValue:scrolling&&!menuOpen?1:0,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  },[menuOpen,progress,scrolling]);

  if(overlayOpen)return null;
  const width=progress.interpolate({inputRange:[0,1],outputRange:[expandedWidth,46]});
  const labelOpacity=progress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const compactOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[0,0,1]});

  const run=(action:()=>void)=>{setMenuOpen(false);requestAnimationFrame(action);};
  return <Fragment>
    {menuOpen?<Pressable accessibilityLabel="메뉴 닫기" onPress={()=>setMenuOpen(false)} style={[styles.backdrop,{bottom:navTopOffset}]}/>:null}
    <View pointerEvents="box-none" style={[styles.wrap,{bottom}]}>
      {menuOpen?<View style={styles.menu}>
        <Pressable style={styles.menuItem} onPress={()=>run(onLivePin)}><Text style={styles.menuIcon}>⚡</Text><Text style={styles.menuText}>LIVE PIN 제보</Text><Text style={styles.menuArrow}>›</Text></Pressable>
        <Pressable style={styles.menuItem} onPress={()=>run(onMarket)}><Text style={styles.menuIcon}>↔</Text><Text style={styles.menuText}>TCG 거래</Text><Text style={styles.menuArrow}>›</Text></Pressable>
        <Pressable style={styles.menuItem} onPress={()=>run(onMarketRegister)}><Text style={styles.menuIcon}>＋</Text><Text style={styles.menuText}>매물 등록</Text><Text style={styles.menuArrow}>›</Text></Pressable>
      </View>:null}
      <Animated.View style={{width}}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{expanded:menuOpen}}
          onPress={()=>setMenuOpen(open=>!open)}
          style={({pressed})=>[styles.button,menuOpen&&styles.buttonOpen,pressed&&styles.pressed]}
        >
          <Animated.Text style={[styles.icon,{opacity:labelOpacity}]}>{menuOpen?'×':'＋'}</Animated.Text>
          <Animated.Text style={[styles.compactIcon,{opacity:compactOpacity}]}>＋</Animated.Text>
          <Animated.Text numberOfLines={1} style={[styles.label,{opacity:labelOpacity}]}>{label}</Animated.Text>
          <Animated.Text style={[styles.arrow,{opacity:labelOpacity}]}>{menuOpen?'⌃':'›'}</Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  </Fragment>;
}

const styles=StyleSheet.create({
  backdrop:{position:'absolute',top:0,left:0,right:0,zIndex:9000,elevation:9000,backgroundColor:'transparent'},
  wrap:{position:'absolute',right:16,alignItems:'flex-end',gap:8,zIndex:100000,elevation:100000},
  menu:{width:210,padding:6,borderWidth:1,borderColor:'#E7E2E9',borderRadius:16,backgroundColor:'#fff',shadowColor:'#211A2E',shadowOpacity:.16,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:18},
  menuItem:{height:46,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10,borderRadius:11},
  menuIcon:{width:22,textAlign:'center',fontSize:17,color:'#6749BD'},
  menuText:{flex:1,fontSize:12,fontWeight:'800',color:'#302A36'},
  menuArrow:{fontSize:19,color:'#A49BAA'},
  button:{height:46,width:'100%',paddingHorizontal:16,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#17151B',borderWidth:1,borderColor:'rgba(255,255,255,.34)',shadowColor:'#111015',shadowOpacity:.24,shadowRadius:11,shadowOffset:{width:0,height:5},elevation:8},
  buttonOpen:{backgroundColor:'#6749BD'},
  pressed:{opacity:.82,transform:[{scale:.98}]},
  icon:{fontSize:20,lineHeight:20,color:'#fff'},
  compactIcon:{position:'absolute',left:0,right:0,textAlign:'center',fontSize:20,lineHeight:20,color:'#fff'},
  label:{maxWidth:144,fontSize:12,fontWeight:'900',color:'#fff'},
  arrow:{fontSize:18,fontWeight:'600',lineHeight:20,color:'#fff',marginLeft:-1},
});
