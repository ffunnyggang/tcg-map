import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';

export default function Talk(){
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
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader/></View>:null}
    <FunyWebView url="https://funypin.kr/talk.html" title="FUNY PIN TALK" onWebRouteChange={onRoute}/>
  </SafeAreaView>;
}
