import { useCallback,useState } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';

export default function MapScreen(){
  const [webBack,setWebBack]=useState(false);
  const {country,from,marketId,marketRegister}=useLocalSearchParams<{country?:string;from?:string;marketId?:string;marketRegister?:string}>();
  const initialCountry=country==='JP'?'JP':'KR';
  const sourceQuery=from?`&from=${encodeURIComponent(from)}`:'';
  const commandQuery=marketRegister==='1'?'&marketRegister=1':marketId?`&marketId=${encodeURIComponent(marketId)}`:'';
  const commandHash=marketId?`#market/${encodeURIComponent(marketId)}`:'';
  const mapUrl=`https://funypin.kr/shops.html?country=${initialCountry}${sourceQuery}${commandQuery}${commandHash}`;
  const onRoute=useCallback((url:string)=>{
    const back=isWebBackPage(url);
    setWebBack(back);
  },[]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <ViewWithMarket>
      <FunyWebView key={`map-${initialCountry}`} url={mapUrl} title="FUNY PIN TCG MAP" onWebRouteChange={onRoute} showBackHeader={webBack} backTitle="TCG MAP"/>
    </ViewWithMarket>
  </SafeAreaView>;
}

function ViewWithMarket({children}:{children:ReactNode}){
  return <View style={{flex:1}}>{children}</View>;
}
