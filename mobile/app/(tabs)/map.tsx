import { useCallback,useEffect } from 'react';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import FunyWebView,{isShopDetail} from '../../components/FunyWebView';
import { getTabBarStyle } from '../../lib/tabBar';

export default function MapScreen(){
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    navigation.setOptions({tabBarStyle:isShopDetail(url)?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url="https://funypin.kr/shops.html" title="FUNY PIN TCG MAP" onWebRouteChange={onRoute}/>
  </SafeAreaView>;
}