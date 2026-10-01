import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import FunyWebView from '../components/FunyWebView';

export default function WebPage(){
  const params=useLocalSearchParams<{url?:string}>();
  const raw=Array.isArray(params.url)?params.url[0]:params.url;
  let url='https://funypin.kr/';
  try{if(raw)url=decodeURIComponent(raw);}catch{if(raw)url=raw;}
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url={url} title="FUNY PIN"/>
  </SafeAreaView>;
}
