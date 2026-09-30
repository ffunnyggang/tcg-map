import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,BackHandler,Platform,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect,useRouter } from 'expo-router';
import { WebView,WebViewMessageEvent } from 'react-native-webview';
import { C } from '../lib/theme';

const isFunyHost=(target:string)=>{const value=String(target||'').toLowerCase();return value==='https://funypin.kr'||value.startsWith('https://funypin.kr/')||value.startsWith('https://www.funypin.kr/')||value.startsWith('https://www.funypin.kr')||value.startsWith('http://funypin.kr/')||value.startsWith('http://www.funypin.kr/');};
const APP_BOOTSTRAP="(function(){try{var s=document.getElementById('__funy_app_css__');if(!s){s=document.createElement('style');s.id='__funy_app_css__';s.textContent=\".portal-header{display:none!important}.portal-bottom-nav{display:none!important}.portal-main{padding-top:0!important}.filters{top:0!important}.popular-sort.show{top:58px!important}.header-more-menu{display:none!important}html,body{background:#fff!important;min-height:100%!important}\";(document.head||document.documentElement).appendChild(s);}document.documentElement.setAttribute('data-funy-app','1');}catch(e){}})();true;";

type Props={url:string;title?:string};

export default function FunyWebView({url,title='FUNY PIN'}:Props){
  const router=useRouter();
  const ref=useRef<WebView>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false),[canGoBack,setCanGoBack]=useState(false);

    const handleUrl=useCallback((target:string)=>{
    if(target.startsWith('funypin://')){
      const path=target.replace('funypin://','/');
      if(path.startsWith('/account')){router.push('/account');return false;}
      if(path.startsWith('/shop/')){router.push(path as any);return false;}
      return false;
    }
    // Debug/launch mode: keep all web navigation inside the WebView.
    // External-browser routing will be restored after the WebView path is verified.
    if(target==='about:blank'||target.startsWith('http://')||target.startsWith('https://')) return true;
    if(target.startsWith('mailto:')||target.startsWith('tel:')) return false;
    return true;
  },[router]);

  useFocusEffect(useCallback(()=>{
    if(Platform.OS!=='android') return;
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(canGoBack&&ref.current){ref.current.goBack();return true;}
      return false;
    });
    return()=>sub.remove();
  },[canGoBack]));

  useEffect(()=>{
    setLoading(true);
    setError(false);
    const timer=setTimeout(()=>setLoading(false),2500);
    return()=>clearTimeout(timer);
  },[url]);

  const onMessage=useCallback((event:WebViewMessageEvent)=>{
    try{
      const data=JSON.parse(event.nativeEvent.data);
      if(data?.type==='OPEN_NATIVE'&&data.route) router.push(String(data.route) as any);
      else if(data?.type==='OPEN_EXTERNAL'&&data.url) { /* keep web content inside WebView during launch validation */ }
    }catch{}
  },[router]);

  if(error) return <View style={styles.error}><Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text><Text style={styles.errorText}>네트워크 연결을 확인한 뒤 다시 시도해주세요.</Text></View>;

  return <View style={styles.container} accessibilityLabel={title}>
    <WebView
      ref={ref}
      source={{html:'<!doctype html><html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#fff"><div style="height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column"><div style="font-size:28px;font-weight:800;color:#6749bd">FUNY PIN</div><div style="margin-top:10px;font-size:14px;color:#666">iOS WebView 테스트 화면</div><div style="margin-top:8px;font-size:12px;color:#999">REMOTE URL TEST BYPASS</div></div></body></html>'}}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      onLoadStart={()=>{console.log('[FUNY WEBVIEW] local load start');setLoading(true)}}
      onLoad={()=>{console.log('[FUNY WEBVIEW] local load');setLoading(false)}}
      onLoadEnd={()=>{console.log('[FUNY WEBVIEW] local load end');setLoading(false)}}
      onError={(e)=>{console.warn('[FUNY WEBVIEW] local error',e.nativeEvent);setLoading(false);setError(true)}}
    />
    {loading?<View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator color={C.purple}/></View>:null}
  </View>;
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  webview:{flex:1,backgroundColor:'#fff'},
  loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  loadingOverlay:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  error:{flex:1,alignItems:'center',justifyContent:'center',padding:28,backgroundColor:'#fff'},
  errorTitle:{fontSize:16,fontWeight:'800',color:C.text},
  errorText:{marginTop:8,fontSize:12,color:C.muted,textAlign:'center'},
});
