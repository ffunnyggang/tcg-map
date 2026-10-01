import { useCallback,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';

export default function Talk(){
  const [webBack,setWebBack]=useState(false);
  const onRoute=useCallback((url:string)=>setWebBack(isWebBackPage(url)),[]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader/></View>:null}
    <FunyWebView url="https://funypin.kr/talk.html" title="FUNY PIN TALK" onWebRouteChange={onRoute}/>
  </SafeAreaView>;
}