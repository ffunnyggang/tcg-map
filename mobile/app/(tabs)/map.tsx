import { useCallback,useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform,View } from 'react-native';
import { useLocalSearchParams,useRouter } from 'expo-router';
import FunyWebView from '../../components/FunyWebView';
import MapFloatingAction from '../../components/MapFloatingAction';
import { useFloatingAction } from '../../lib/floatingActions';
import type { NativeFloatingCommand } from '../../lib/floatingActions';

export default function MapScreen(){
  const [webBack,setWebBack]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const [nativeCommand,setNativeCommand]=useState<NativeFloatingCommand|null>(null);
  const router=useRouter();
  const {setting}=useFloatingAction('map');
  const floatingMode=Platform.OS==='android'?setting.mode:'web';
  const {country,from,marketId,marketRegister}=useLocalSearchParams<{country?:string;from?:string;marketId?:string;marketRegister?:string}>();
  const initialCountry=country==='JP'?'JP':'KR';
  const sourceQuery=from?`&from=${encodeURIComponent(from)}`:'';
  const marketQuery=marketId?`&focus=market&marketId=${encodeURIComponent(marketId)}`:marketRegister==='1'?'&marketRegister=1':'';
  const mapUrl=`https://funypin.kr/shops.html?country=${initialCountry}${sourceQuery}${marketQuery}`;
  const onRoute=useCallback((url:string)=>{
    const back=(()=>{try{const u=new URL(url);const host=u.hostname.toLowerCase();if(host!=='funypin.kr'&&host!=='www.funypin.kr')return false;return /\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\.html$/i.test(u.pathname)}catch{return false}})();
    setWebBack(back);
  },[]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <ViewWithMarket>
      <FunyWebView key={`map-${initialCountry}`} url={mapUrl} title="FUNY PIN TCG MAP" onWebRouteChange={onRoute} onWebScrollChange={setScrolling} showBackHeader={webBack} backTitle="TCG MAP" floatingActionMode={floatingMode} nativeFloatingCommand={nativeCommand}/>
    </ViewWithMarket>
    {floatingMode==='native'&&!webBack?<MapFloatingAction label={setting.label} scrolling={scrolling} onLivePin={()=>router.push('/live-pin')} onMarket={()=>setNativeCommand({id:Date.now(),action:'open_market'})} onMarketRegister={()=>setNativeCommand({id:Date.now(),action:'open_market_register'})}/>:null}
  </SafeAreaView>;
}

function ViewWithMarket({children}:{children:ReactNode}){
  return <View style={{flex:1}}>{children}</View>;
}