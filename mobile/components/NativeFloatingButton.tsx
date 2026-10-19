import { useEffect,useRef,useState } from 'react';
import { Animated,Easing,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWebOverlayOpen,subscribeWebOverlay } from '../lib/webOverlayState';
import { resolveFloatingActionBottom } from '../lib/tabMetrics';

type Props={
  label:string;
  icon?:string;
  accessibilityLabel?:string;
  onPress:()=>void|Promise<void>;
  scrolling?:boolean;
  withNav?:boolean;
  bottomOffset?:number;
  backgroundColor?:string;
};

export default function NativeFloatingButton({
  label,icon='＋',accessibilityLabel,onPress,scrolling=false,withNav=true,bottomOffset=0,backgroundColor='#17151B',
}:Props){
  const insets=useSafeAreaInsets();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  const progress=useRef(new Animated.Value(0)).current;
  const bottom=resolveFloatingActionBottom(insets.bottom,Platform.OS==='android',withNav,bottomOffset);
  const expandedWidth=Math.max(132,Math.min(196,66+String(label||'').length*8.4));

  useEffect(()=>subscribeWebOverlay(setOverlayOpen),[]);
  useEffect(()=>{
    Animated.timing(progress,{toValue:scrolling?1:0,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  },[progress,scrolling]);

  if(overlayOpen)return null;
  const width=progress.interpolate({inputRange:[0,1],outputRange:[expandedWidth,46]});
  const labelOpacity=progress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const compactOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[0,0,1]});
  const labelScale=progress.interpolate({inputRange:[0,1],outputRange:[1,.72]});

  return <View pointerEvents="box-none" style={[styles.wrap,{bottom}]}>
    <Animated.View style={{width}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel||label}
        onPress={()=>{void onPress();}}
        style={({pressed})=>[styles.button,{backgroundColor},pressed&&styles.pressed]}
      >
        <Animated.Text style={[styles.icon,{opacity:labelOpacity}]}>{icon}</Animated.Text>
        <Animated.Text style={[styles.compactIcon,{opacity:compactOpacity}]}>{icon}</Animated.Text>
        <Animated.Text numberOfLines={1} style={[styles.label,{opacity:labelOpacity,transform:[{scale:labelScale}]}]}>{label}</Animated.Text>
        <Animated.Text style={[styles.arrow,{opacity:labelOpacity,transform:[{scale:labelScale}]}]}>›</Animated.Text>
      </Pressable>
    </Animated.View>
  </View>;
}

const styles=StyleSheet.create({
  wrap:{position:'absolute',right:16,alignItems:'flex-end',zIndex:100000,elevation:100000},
  button:{height:46,width:'100%',paddingHorizontal:16,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:'rgba(255,255,255,.34)',shadowColor:'#111015',shadowOpacity:.24,shadowRadius:11,shadowOffset:{width:0,height:5},elevation:8},
  pressed:{opacity:.82,transform:[{scale:.98}]},
  icon:{fontSize:18,lineHeight:20,color:'#fff'},
  compactIcon:{position:'absolute',left:0,right:0,textAlign:'center',fontSize:19,lineHeight:20,color:'#fff'},
  label:{maxWidth:132,fontSize:12,fontWeight:'900',color:'#fff'},
  arrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff',marginLeft:-1},
});
