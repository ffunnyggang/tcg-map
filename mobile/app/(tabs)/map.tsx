import { useCallback,useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useNavigation } from 'expo-router';
import FunyWebView,{isShopDetail,isWebBackPage} from '../../components/FunyWebView';
import LivePinButton from '../../components/LivePinButton';
import { getTabBarStyle } from '../../lib/tabBar';

export default function MapScreen(){
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const [webBack,setWebBack]=useState(false);
  const [shopDetail,setShopDetail]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    const detail=isShopDetail(url);
    const back=isWebBackPage(url);
    setShopDetail(detail);
    setWebBack(back);
    navigation.setOptions({tabBarStyle:(detail||back)?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <ViewWithLivePin webBack={webBack} shopDetail={shopDetail} scrolling={scrolling} onScrollChange={setScrolling}>
      <FunyWebView url="https://funypin.kr/shops.html" title="FUNY PIN TCG MAP" onWebRouteChange={onRoute} onWebScrollChange={setScrolling}/>
    </ViewWithLivePin>
  </SafeAreaView>;
}

function ViewWithLivePin({children,webBack,shopDetail,scrolling,onScrollChange}:{children:ReactNode;webBack:boolean;shopDetail:boolean;scrolling:boolean;onScrollChange:(value:boolean)=>void}){
  return <View style={{flex:1}}>{children}{!webBack?<LivePinButton withNav={!shopDetail} scrolling={scrolling}/>:null}</View>;
}