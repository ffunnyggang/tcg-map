import { useCallback,useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyWebView from '../../components/FunyWebView';

export default function MapScreen(){
  const navigation=useNavigation();
  const [webBack,setWebBack]=useState(false);
  const [tabRefresh,setTabRefresh]=useState('');
  const {country,from}=useLocalSearchParams<{country?:string;from?:string}>();
  const initialCountry=country==='JP'?'JP':'KR';
  const sourceQuery=from?`&from=${encodeURIComponent(from)}`:'';
  const mapUrl=`https://funypin.kr/shops.html?country=${initialCountry}${sourceQuery}`;

  useEffect(()=>{
    const unsub=navigation.addListener('tabPress',()=>{
      if(navigation.isFocused())setTabRefresh(String(Date.now()));
    });
    return unsub;
  },[navigation]);

  const onRoute=useCallback((url:string)=>{
    const back=(()=>{try{const u=new URL(url);const host=u.hostname.toLowerCase();if(host!=='funypin.kr'&&host!=='www.funypin.kr')return false;return /\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\.html$/i.test(u.pathname)}catch{return false}})();
    setWebBack(back);
  },[]);

  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <ViewWithMarket>
      <FunyWebView key={`map-${initialCountry}`} url={mapUrl} title="FUNY PIN TCG MAP" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="TCG MAP" refreshToken={tabRefresh}/>
    </ViewWithMarket>
  </SafeAreaView>;
}

function ViewWithMarket({children}:{children:ReactNode}){
  return <View style={{flex:1}}>{children}</View>;
}
