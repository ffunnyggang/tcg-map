import { SafeAreaView } from 'react-native-safe-area-context';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView from '../../components/FunyWebView';

export default function Pick(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <FunyWebView url="https://funypin.kr/reviews.html" title="FUNY PIN PICK"/>
  </SafeAreaView>;
}