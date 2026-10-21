import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import FunyWebView from '../components/FunyWebView';

export default function Market(){
  const router=useRouter();
  const params=useLocalSearchParams<{target?:string}>();
  const raw=Array.isArray(params.target)?params.target[0]:params.target;
  let url='https://funypin.kr/market.html';
  try{
    if(raw){
      const decoded=decodeURIComponent(raw);
      const u=new URL(decoded);
      if((u.hostname==='funypin.kr'||u.hostname==='www.funypin.kr')&&u.pathname==='/market.html')url=u.toString();
    }
  }catch{}
  const goBack=()=>{if(router.canGoBack())router.back();else router.replace('/(tabs)/map' as any);};
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url={url} title="FUNY PIN TCG 거래" onNativeBack={goBack} surface="page"/>
  </SafeAreaView>;
}
