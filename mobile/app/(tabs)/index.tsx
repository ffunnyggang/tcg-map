import { SafeAreaView } from 'react-native-safe-area-context';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView from '../../components/FunyWebView';

export default function Home(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <FunyWebView url="https://ffunnyggang.github.io/tcg-map/" title="FUNY PIN HOME"/>
  </SafeAreaView>;
}