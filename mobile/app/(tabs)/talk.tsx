import { useCallback,useEffect,useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking,Platform,View } from 'react-native';
import { useLocalSearchParams,useNavigation } from 'expo-router';
import FunyHeader from '../../components/FunyHeader';
import FunyWebView,{isWebBackPage} from '../../components/FunyWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarStyle } from '../../lib/tabBar';
import NativeFloatingButton from '../../components/NativeFloatingButton';
import { useFloatingAction } from '../../lib/floatingActions';

export default function Talk(){
  const [webBack,setWebBack]=useState(false);
  const [scrolling,setScrolling]=useState(false);
  const {setting}=useFloatingAction('talk');
  const floatingMode=Platform.OS==='android'?setting.mode:'web';
  const {__tabRefresh,postId,editPost}=useLocalSearchParams<{__tabRefresh?:string;postId?:string;editPost?:string}>();
  const navigation=useNavigation();
  const insets=useSafeAreaInsets();
  const bottom=Math.max(insets.bottom,12);
  const onRoute=useCallback((url:string)=>{
    const back=isWebBackPage(url);
    setWebBack(back);
    navigation.setOptions({tabBarStyle:back?{display:'none'}:getTabBarStyle(bottom)});
  },[bottom,navigation]);
  useEffect(()=>()=>{navigation.setOptions({tabBarStyle:getTabBarStyle(bottom)});},[bottom,navigation]);
  const talkUrl=postId?`https://funypin.kr/talk.html${editPost==='1'?`?editPost=${encodeURIComponent(postId)}`:''}#/post/${encodeURIComponent(postId)}`:'https://funypin.kr/talk.html';
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    {!webBack?<View style={{zIndex:9999,elevation:9999}}><FunyHeader title="TALK"/></View>:null}
    <FunyWebView key={Platform.OS==='android'?'talk-android-stable':`talk-${__tabRefresh||'0'}`} refreshToken={Platform.OS==='android'?__tabRefresh:undefined} url={talkUrl} title="FUNY PIN TALK" onWebRouteChange={onRoute} onWebScrollChange={setScrolling} showBackHeader={webBack} backTitle="TALK" floatingActionMode={floatingMode}/>
    {floatingMode==='native'&&!webBack?<NativeFloatingButton label={setting.label} icon="＋" backgroundColor="#6749BD" scrolling={scrolling} onPress={async()=>{if(setting.targetUrl)await Linking.openURL(setting.targetUrl)}}/>:null}
  </SafeAreaView>;
}