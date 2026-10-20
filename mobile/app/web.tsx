import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import FunyWebView,{isShopDetail} from '../components/FunyWebView';

export default function WebPage(){
  const params=useLocalSearchParams<{url?:string;title?:string;backOnly?:string;inAppOnly?:string}>();
  const router=useRouter();
  const goBack=()=>{if(router.canGoBack())router.back();else router.replace('/account');};
  const titleValue=Array.isArray(params.title)?params.title[0]:params.title;
  const raw=Array.isArray(params.url)?params.url[0]:params.url;
  let url='https://funypin.kr/';
  try{if(raw)url=decodeURIComponent(raw);}catch{if(raw)url=raw;}
  const shopDetail=isShopDetail(url);
  const initialTitle=(()=>{try{const p=new URL(url).pathname.toLowerCase();if(p==='/tcg-tools.html')return 'TCG TOOL';return ''}catch{return ''}})();
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url={url} title="FUNY PIN" showBackHeader={!shopDetail} backTitle={titleValue||initialTitle} backOnlyHeader={params.backOnly==="1"} onNativeBack={goBack} surface="page" blockExternalNavigation={params.inAppOnly==="1"}/>
  </SafeAreaView>;
}
