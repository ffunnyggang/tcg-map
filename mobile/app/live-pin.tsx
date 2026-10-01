import { Pressable,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FunyWebView from '../components/FunyWebView';
import { C,UI } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';
import { Image } from 'react-native';

export default function LivePin(){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:C.line}}>
      <Pressable onPress={()=>router.back()} hitSlop={8} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:30,lineHeight:32,color:C.text}}>‹</Text></Pressable>
      <Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:30,height:34,marginLeft:2,marginRight:7}}/>
      <Text style={{fontSize:22,fontWeight:'900',letterSpacing:-.5,color:C.text}}>LIVE PIN</Text>
    </View>
    <FunyWebView url="https://funypin.kr/live-pin-test.html" title="FUNY PIN LIVE PIN"/>
  </SafeAreaView>;
}
