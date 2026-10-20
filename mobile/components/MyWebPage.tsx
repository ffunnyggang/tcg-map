import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FunyWebView from './FunyWebView';

export default function MyWebPage({path,title}:{path:string;title:string}){
  const router=useRouter();
  const goBack=()=>{if(router.canGoBack())router.back();else router.replace('/(tabs)/my' as any);};
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyWebView
      url={`https://funypin.kr/${path.replace(/^\//,'')}`}
      title={title}
      showBackHeader
      backTitle={title}
      onNativeBack={goBack}
      surface="page"
    />
  </SafeAreaView>;
}
