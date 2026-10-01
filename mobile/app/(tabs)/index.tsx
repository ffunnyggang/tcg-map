import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import LivePinButton from '../../components/LivePinButton';
import FunyWebView,{isShopDetail,isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';

export default function Home(){
  const [webBack,setWebBack]=useState(false);
  const [shopDetail,setShopDetail]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const {__tabRefresh}=useLocalSearchParams<{__tabRefresh?:string}>();
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
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
    {!(webBack||shopDetail)?<View style={{zIndex:9999,elevation:9999}}><FunyHeader/></View>:null}
    <View style={{flex:1}}>
      <FunyWebView key={`home-${__tabRefresh||'0'}`} url="https://funypin.kr/" title="FUNY PIN HOME" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="FUNY PIN" onWebScrollChange={setScrolling}/>
      {!webBack?<LivePinButton withNav scrolling={scrolling}/>:null}
    </View>
  </SafeAreaView>;
}