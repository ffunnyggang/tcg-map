import { useEffect,useRef,useState } from 'react';
import { Animated,Easing,Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { C } from '../lib/theme';

export default function LivePinButton({withNav=true,scrolling=false}:{withNav?:boolean;scrolling?:boolean}){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const [showTip,setShowTip]=useState(false);
  const progress=useRef(new Animated.Value(0)).current;
  const bottom=withNav?insets.bottom+78:insets.bottom+16;

  useEffect(()=>{
    let mounted=true;
    SecureStore.getItemAsync('funypin_live_entry_clicked').then(value=>{
      if(mounted)setShowTip(!value);
    }).catch(()=>{if(mounted)setShowTip(true);});
    return()=>{mounted=false;};
  },[]);

  useEffect(()=>{
    Animated.timing(progress,{
      toValue:scrolling?1:0,
      duration:220,
      easing:Easing.out(Easing.cubic),
      useNativeDriver:false
    }).start();
  },[scrolling,progress]);

  const open=async()=>{
    try{await SecureStore.setItemAsync('funypin_live_entry_clicked','1');}catch{}
    setShowTip(false);
    router.push('/live-pin');
  };

  const width=progress.interpolate({inputRange:[0,1],outputRange:[132,46]});
  const labelOpacity=progress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const iconOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[1,0,0]});
  const collapsedIconOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[0,0,1]});
  const labelScale=progress.interpolate({inputRange:[0,1],outputRange:[1,.72]});
  const arrowOpacity=labelOpacity;

  return <View pointerEvents="box-none" style={[styles.wrap,{bottom}]}>
    {showTip&&!scrolling?<View style={styles.tip}><Text style={styles.tipText}>실시간으로 정보 공유해요!</Text></View>:null}
    <Animated.View style={{width}}>
      <Pressable accessibilityRole="button" accessibilityLabel="LIVE PIN 열기" onPress={open} style={({pressed})=>[styles.button,pressed&&styles.pressed]}>
        <Animated.Text style={[styles.icon,{opacity:iconOpacity}]}>⚡</Animated.Text>
        <Animated.Text style={[styles.collapsedIcon,{opacity:collapsedIconOpacity}]}>⚡</Animated.Text>
        <Animated.Text style={[styles.label,{opacity:labelOpacity,transform:[{scale:labelScale}]}]}>LIVE PIN</Animated.Text>
        <Animated.Text style={[styles.arrow,{opacity:arrowOpacity,transform:[{scale:labelScale}]}]}>›</Animated.Text>
      </Pressable>
    </Animated.View>
  </View>;
}

const styles=StyleSheet.create({
  wrap:{position:'absolute',right:16,alignItems:'flex-end',gap:8,zIndex:100000,elevation:100000},
  tip:{position:'relative',paddingHorizontal:11,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:'#E8E2F2',backgroundColor:'#fff',shadowColor:'#332941',shadowOpacity:.10,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:4},
  tipText:{fontSize:11,fontWeight:'700',lineHeight:14,color:'#625B67'},
  button:{height:46,width:'100%',paddingHorizontal:16,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:C.purpleDark,borderWidth:1,borderColor:'rgba(255,255,255,.45)',shadowColor:'#6749BD',shadowOpacity:.30,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:8},
  pressed:{opacity:.82,transform:[{scale:.98}]},
  icon:{fontSize:18,lineHeight:20,color:'#fff'},
  collapsedIcon:{position:'absolute',left:0,right:0,textAlign:'center',fontSize:18,lineHeight:20,color:'#fff'},
  label:{fontSize:12,fontWeight:'900',color:'#fff'},
  arrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff',marginLeft:-1},
});