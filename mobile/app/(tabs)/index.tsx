import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView from '../../components/FunyWebView';

export default function Home(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <View style={{zIndex:9999,elevation:9999}}><FunyHeader/></View>
    <FunyWebView url="https://funypin.kr/" title="FUNY PIN HOME"/>
  </SafeAreaView>;
}