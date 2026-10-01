import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import LivePinButton from '../../components/LivePinButton';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';

export default function Pick(){
  const [webBack,setWebBack]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const {__tabRefresh}=useLocalSearchParams<{__tabRefresh?:string}>();
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
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="PICK"/></View>:null}
    <View style={{flex:1}}>
      <FunyWebView key={`pick-${__tabRefresh||'0'}`} url="https://funypin.kr/reviews.html" title="FUNY PIN PICK" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="PICK" onWebScrollChange={setScrolling}/>
      {!webBack?<LivePinButton scrolling={scrolling}/>:null}
    </View>
  </SafeAreaView>;
}