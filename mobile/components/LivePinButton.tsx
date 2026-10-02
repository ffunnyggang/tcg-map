import { useEffect,useRef,useState } from 'react';
import { Animated,Easing,Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { C,UI } from '../lib/theme';
import { getWebOverlayOpen,subscribeWebOverlay } from '../lib/webOverlayState';
import { supabase } from '../lib/supabase';

const NAV_HEIGHT=54;
const NAV_GAP=10;

export default function LivePinButton({withNav=true,scrolling=false,bottomOffset=0}:{withNav?:boolean;scrolling?:boolean;bottomOffset?:number}){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const [showTip,setShowTip]=useState(false);
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  const [badge,setBadge]=useState(0);
  const progress=useRef(new Animated.Value(0)).current;
  const navBottom=Math.max(insets.bottom,UI.navBottomGap);
  const bottom=withNav?navBottom+NAV_HEIGHT+NAV_GAP+bottomOffset:insets.bottom+16+bottomOffset;

  useEffect(()=>subscribeWebOverlay(setOverlayOpen),[]);
  useEffect(()=>{
    let mounted=true;
    SecureStore.getItemAsync('funypin_live_entry_clicked').then(value=>{if(mounted)setShowTip(!value);}).catch(()=>{if(mounted)setShowTip(true);});
    return()=>{mounted=false;};
  },[]);
  const refreshBadge=async()=>{
    try{
      const seen=await SecureStore.getItemAsync('funypin_live_last_seen');
      const now=new Date(),kst=new Date(now.getTime()+9*3600000),day=kst.toISOString().slice(0,10),midnight=new Date(day+'T00:00:00+09:00').toISOString();
      const from=seen&&new Date(seen)>new Date(midnight)?seen:midnight;
      const {count,error}=await supabase.from('live_reports').select('id',{count:'exact',head:true}).eq('post_type','report').like('shop_id','KR-%').eq('is_hidden',false).gt('created_at',from);
      if(!error)setBadge(Math.max(0,count||0));
    }catch{}
  };
  useEffect(()=>{refreshBadge();const id=setInterval(refreshBadge,60000);return()=>clearInterval(id)},[]);

  useEffect(()=>{Animated.timing(progress,{toValue:scrolling?1:0,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();},[scrolling,progress]);

  const open=async()=>{try{await SecureStore.setItemAsync('funypin_live_entry_clicked','1');await SecureStore.setItemAsync('funypin_live_last_seen',new Date().toISOString());}catch{}setShowTip(false);setBadge(0);router.push('/live-pin');};
  const width=progress.interpolate({inputRange:[0,1],outputRange:[132,46]});
  const labelOpacity=progress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const iconOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[1,0,0]});
  const collapsedIconOpacity=progress.interpolate({inputRange:[0,.55,1],outputRange:[0,0,1]});
  const labelScale=progress.interpolate({inputRange:[0,1],outputRange:[1,.72]});

  if(overlayOpen)return null;
  return <View pointerEvents="box-none" style={[styles.wrap,{bottom}]}>
    {showTip&&!scrolling?<View style={styles.tip}><Text style={styles.tipText}>실시간으로 정보 공유해요!</Text></View>:null}
    <Animated.View style={{width}}><Pressable accessibilityRole="button" accessibilityLabel="LIVE PIN 열기" onPress={open} style={({pressed})=>[styles.button,pressed&&styles.pressed]}>
      <Animated.Text style={[styles.icon,{opacity:iconOpacity}]}>⚡</Animated.Text><Animated.Text style={[styles.collapsedIcon,{opacity:collapsedIconOpacity}]}>⚡</Animated.Text><Animated.Text style={[styles.label,{opacity:labelOpacity,transform:[{scale:labelScale}]}]}>LIVE PIN</Animated.Text><Animated.Text style={[styles.arrow,{opacity:labelOpacity,transform:[{scale:labelScale}]}]}>›</Animated.Text>
      {badge>0?<View style={styles.badge}><Text style={styles.badgeText}>{badge>99?'99+':badge}</Text></View>:null}
    </Pressable></Animated.View>
  </View>;
}

const styles=StyleSheet.create({
  wrap:{position:'absolute',right:16,alignItems:'flex-end',gap:8,zIndex:100000,elevation:100000},
  tip:{position:'relative',paddingHorizontal:11,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:'#E8E2F2',backgroundColor:'#fff',shadowColor:'#332941',shadowOpacity:.10,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:4},
  tipText:{fontSize:11,fontWeight:'700',lineHeight:14,color:'#625B67'},
  button:{height:46,width:'100%',paddingHorizontal:16,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#17151B',borderWidth:1,borderColor:'rgba(255,255,255,.34)',shadowColor:'#111015',shadowOpacity:.24,shadowRadius:11,shadowOffset:{width:0,height:5},elevation:8},
  pressed:{opacity:.82,transform:[{scale:.98}]},badge:{position:'absolute',right:-5,top:-7,minWidth:20,height:20,paddingHorizontal:5,borderRadius:10,borderWidth:2,borderColor:'#fff',backgroundColor:'#F05B68',alignItems:'center',justifyContent:'center'},badgeText:{fontSize:9,fontWeight:'900',color:'#fff'},icon:{fontSize:18,lineHeight:20,color:'#fff'},collapsedIcon:{position:'absolute',left:0,right:0,textAlign:'center',fontSize:18,lineHeight:20,color:'#fff'},label:{fontSize:12,fontWeight:'900',color:'#fff'},arrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff',marginLeft:-1}
});
