import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import FunyWebView from '../components/FunyWebView';

export default function WebPage(){
  const params=useLocalSearchParams<{url?:string;title?:string;backOnly?:string}>();
  const router=useRouter();
  const goBack=()=>{if(router.canGoBack())router.back();else router.replace('/account');};
  const titleValue=Array.isArray(params.title)?params.title[0]:params.title;
  const raw=Array.isArray(params.url)?params.url[0]:params.url;
  let url='https://funypin.kr/';
  try{if(raw)url=decodeURIComponent(raw);}catch{if(raw)url=raw;}
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url={url} title="FUNY PIN" showBackHeader backTitle={titleValue||"MY"} backOnlyHeader={params.backOnly==="1"} onNativeBack={goBack}/>
  </SafeAreaView>;
}
