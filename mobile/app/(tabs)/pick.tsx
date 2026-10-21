import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform,View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';
import LivePinButton from '../../components/LivePinButton';
import { useFloatingAction } from '../../lib/floatingActions';

export default function Pick(){
  const [webBack,setWebBack]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const {setting,ready}=useFloatingAction('pick');
  const floatingMode=Platform.OS==='android'?(ready?setting.mode:'off'):'native';
  const {__tabRefresh}=useLocalSearchParams<{__tabRefresh?:string}>();
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    const back=isWebBackPage(url);
    setWebBack(back);
    navigation.setOptions({tabBarStyle:back?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="PICK"/></View>:null}
    <View style={{flex:1}}>
      <FunyWebView key={Platform.OS==='android'?'pick-android-stable':`pick-${__tabRefresh||'0'}`} refreshToken={Platform.OS==='android'?__tabRefresh:undefined} url="https://funypin.kr/reviews.html" title="FUNY PIN PICK" onWebRouteChange={onRoute} onWebScrollChange={setScrolling} showBackHeader={webBack} backTitle="PICK" floatingActionMode={floatingMode}/>
    </View>
    {floatingMode==='native'&&!webBack?<LivePinButton label={setting.label} withNav scrolling={scrolling}/>:null}
  </SafeAreaView>;
}