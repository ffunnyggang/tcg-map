import { useCallback,useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import FunyWebView from '../components/FunyWebView';

export default function LivePin(){
  const router=useRouter();
  const closing=useRef(false);
  const onRouteChange=useCallback((url:string)=>{
    try{
      const u=new URL(url);
      if(u.hostname.toLowerCase()==='funypin.kr'&&u.pathname==='/'&&!closing.current){
        closing.current=true;
        router.back();
      }
    }catch{}
  },[router]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false}/>
    <FunyWebView url="https://funypin.kr/live-pin.html" title="FUNY PIN LIVE PIN" onWebRouteChange={onRouteChange} surface="page"/>
  </SafeAreaView>;
}