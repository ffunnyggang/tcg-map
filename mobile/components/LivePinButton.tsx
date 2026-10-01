import { useEffect,useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { C } from '../lib/theme';

export default function LivePinButton({withNav=true,scrolling=false}:{withNav?:boolean;scrolling?:boolean}){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const [showTip,setShowTip]=useState(false);
  const bottom=withNav?insets.bottom+78:insets.bottom+16;

  useEffect(()=>{
    let mounted=true;
    SecureStore.getItemAsync('funypin_live_entry_clicked').then(value=>{
      if(mounted)setShowTip(!value);
    }).catch(()=>{if(mounted)setShowTip(true);});
    return()=>{mounted=false;};
  },[]);

  const open=async()=>{
    try{await SecureStore.setItemAsync('funypin_live_entry_clicked','1');}catch{}
    setShowTip(false);
    router.push('/live-pin');
  };

  return <View pointerEvents="box-none" style={[styles.wrap,{bottom}]}>
    {showTip&&!scrolling?<View style={styles.tip}><Text style={styles.tipText}>실시간으로 정보 공유해요!</Text></View>:null}
    <Pressable accessibilityRole="button" accessibilityLabel="LIVE PIN 열기" onPress={open} style={({pressed})=>[
      styles.button,
      scrolling&&styles.buttonScrolling,
      pressed&&styles.pressed
    ]}>
      <Text style={styles.icon}>⚡</Text>
      {!scrolling?<><Text style={styles.label}>LIVE PIN</Text><Text style={styles.arrow}>›</Text></>:null}
    </Pressable>
  </View>;
}

const styles=StyleSheet.create({
  wrap:{position:'absolute',right:16,alignItems:'flex-end',gap:8,zIndex:100000,elevation:100000},
  tip:{position:'relative',paddingHorizontal:11,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:'#E8E2F2',backgroundColor:'#fff',shadowColor:'#332941',shadowOpacity:.10,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:4},
  tipText:{fontSize:11,fontWeight:'700',lineHeight:14,color:'#625B67'},
  button:{height:46,width:132,paddingHorizontal:16,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:C.purpleDark,borderWidth:1,borderColor:'rgba(255,255,255,.45)',shadowColor:'#6749BD',shadowOpacity:.30,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:8},
  buttonScrolling:{width:46,paddingHorizontal:0,borderRadius:23},
  pressed:{opacity:.82,transform:[{scale:.98}]},
  icon:{fontSize:18,lineHeight:20,color:'#fff'},
  label:{fontSize:12,fontWeight:'900',color:'#fff'},
  arrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff',marginLeft:-1},
});