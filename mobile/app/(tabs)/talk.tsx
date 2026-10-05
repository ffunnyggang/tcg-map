import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform,View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';

export default function Talk(){
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
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="TALK"/></View>:null}
    <FunyWebView key={Platform.OS==='android'?'talk-android-stable':`talk-${__tabRefresh||'0'}`} refreshToken={Platform.OS==='android'?__tabRefresh:undefined} url="https://funypin.kr/talk.html" title="FUNY PIN TALK" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="TALK" onWebScrollChange={setScrolling}/>
  </SafeAreaView>;
}