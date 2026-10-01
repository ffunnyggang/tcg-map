import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView from '../../components/FunyWebView';

export default function Talk(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <View style={{zIndex:9999,elevation:9999}}><FunyHeader/></View>
    <FunyWebView url="https://funypin.kr/talk.htmltalk.html" title="FUNY PIN TALK"/>
  </SafeAreaView>;
}