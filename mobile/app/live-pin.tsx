import { SafeAreaView } from 'react-native-safe-area-context';
import FunyWebView from '../components/FunyWebView';

export default function LivePin(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView url="https://funypin.kr/live-pin-test.html" title="FUNY PIN LIVE PIN"/>
  </SafeAreaView>;
}