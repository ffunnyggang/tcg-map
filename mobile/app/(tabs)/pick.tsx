import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import LivePinButton from '../../components/LivePinButton';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';

export default function Pick(){
  const [webBack,setWebBack]=useState(false);
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    const back=isWebBackPage(url);
    setWebBack(back);
    navigation.setOptions({tabBarStyle:back?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    {!(webBack||shopDetail)?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="PICK"/></View>:null}
    <View style={{flex:1}}>
      <FunyWebView url="https://funypin.kr/reviews.html" title="FUNY PIN PICK" onWebRouteChange={onRoute} onWebScrollChange={setScrolling}/>
      {!webBack?<LivePinButton scrolling={scrolling}/>:null}
    </View>
  </SafeAreaView>;
}
