import { useCallback,useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyWebView,{isShopDetail,isWebBackPage} from '../../components/FunyWebView';
import LivePinButton from '../../components/LivePinButton';
import { getTabBarStyle } from '../../lib/tabBar';

export default function MapScreen(){
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const [webBack,setWebBack]=useState(false);
  const [shopDetail,setShopDetail]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const [routeUi,setRouteUi]=useState({detail:false,back:false});
  const {__tabRefresh,country,shop,from}=useLocalSearchParams<{__tabRefresh?:string;country?:string;shop?:string;from?:string}>();
  const initialCountry=country==='JP'?'JP':'KR';
  const [mapCountry,setMapCountry]=useState<'KR'|'JP'>(initialCountry);
  useEffect(()=>{setMapCountry(initialCountry)},[initialCountry]);
  const shopHash=shop?`#/shop/${encodeURIComponent(shop)}`:'';
  const sourceQuery=from?`&from=${encodeURIComponent(from)}`:'';
  const mapUrl=`https://funypin.kr/shops.html?country=${initialCountry}${sourceQuery}${shopHash}`;
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    const detail=isShopDetail(url);
    const back=(()=>{try{const u=new URL(url);const host=u.hostname.toLowerCase();if(host!=='funypin.kr'&&host!=='www.funypin.kr')return false;return /\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\.html$/i.test(u.pathname)}catch{return false}})();
    setShopDetail(detail);
    setWebBack(back);
    setRouteUi(prev=>prev.detail===detail&&prev.back===back?prev:{detail,back});
  },[]);
  useEffect(()=>{navigation.setOptions({tabBarStyle:(routeUi.detail||routeUi.back)?{display:'none'}:getTabBarStyle(bottom)});},[bottom,navigation,routeUi]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <ViewWithLivePin webBack={webBack} shopDetail={shopDetail} scrolling={scrolling} country={mapCountry}>
      <FunyWebView key={`map-${initialCountry}-${shop||'list'}-${__tabRefresh||'0'}`} url={mapUrl} title="FUNY PIN TCG MAP" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="TCG MAP" onWebScrollChange={setScrolling} onMapCountryChange={value=>setMapCountry(value==='JP'?'JP':'KR')}/>
    </ViewWithLivePin>
  </SafeAreaView>;
}

function ViewWithLivePin({children,webBack,shopDetail,scrolling,country}:{children:ReactNode;webBack:boolean;shopDetail:boolean;scrolling:boolean;country:'KR'|'JP'}){
  const hideLivePin=webBack||shopDetail||country==='JP';
  return <View style={{flex:1}}>{children}{!hideLivePin?<LivePinButton withNav scrolling={scrolling}/>:null}</View>;
}