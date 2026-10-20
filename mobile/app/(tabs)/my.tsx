import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { getTabBarStyle } from '../../lib/tabBar';
import { subscribeTabReselect } from '../../lib/tabReselect';

export default function MyTab(){
  const [webBack,setWebBack]=useState(false);
  const [reloadKey,setReloadKey]=useState(0);
  const {__tabRefresh}=useLocalSearchParams<{__tabRefresh?:string}>();
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);

  useEffect(()=>subscribeTabReselect('my',()=>setReloadKey(v=>v+1)),[]);
  const onRoute=useCallback((url:string)=>{
    const back=isWebBackPage(url);
    setWebBack(back);
    navigation.setOptions({tabBarStyle:back?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);

  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="MY" showAccount={false}/></View>:null}
    <FunyWebView
      key={`my-${reloadKey}-${__tabRefresh||'0'}`}
      url="https://funypin.kr/my.html"
      title="MY"
      onWebRouteChange={onRoute}
      showBackHeader={webBack}
      backTitle="MY"
    />
  </SafeAreaView>;
}
