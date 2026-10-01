import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import FunyWebView,{isShopDetail,isWebBackPage} from '../../components/FunyWebView';

export default function MapScreen(){
  const navigation=useNavigation();
  const [webBack,setWebBack]=useState(false);
  const onRoute=useCallback((url:string)=>{
    setWebBack(isWebBackPage(url));
    navigation.setOptions({tabBarStyle:isShopDetail(url)?{display:'none'}:undefined});
  },[navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:undefined});},[navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url="https://funypin.kr/shops.html" title="FUNY PIN TCG MAP" onWebRouteChange={onRoute}/>
  </SafeAreaView>;
}