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
      source={{uri:url}}
      style={styles.webview}
      originWhitelist={['https://*/*','http://*/*','about:blank']}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      geolocationEnabled
      cacheEnabled
      allowsInlineMediaPlayback
      allowsBackForwardNavigationGestures
      onShouldStartLoadWithRequest={(request)=>handleUrl(String(request.url||''))}
      onLoadStart={(e)=>{console.log('[FUNY WEBVIEW] load start',e.nativeEvent.url);setLoading(true);setError(false)}}
      onLoadProgress={({nativeEvent})=>console.log('[FUNY WEBVIEW] progress',nativeEvent.progress,nativeEvent.url)}
      onLoad={(e)=>{console.log('[FUNY WEBVIEW] load',e.nativeEvent.url);setLoading(false)}}
      onLoadEnd={(e)=>{console.log('[FUNY WEBVIEW] load end',e.nativeEvent.url);setLoading(false)}}
      onError={(e)=>{console.warn('[FUNY WEBVIEW] load error',e.nativeEvent);setLoading(false);setError(true)}}
      onHttpError={(e)=>{console.warn('[FUNY WEBVIEW] http error',e.nativeEvent.statusCode,e.nativeEvent.url);if(e.nativeEvent.statusCode>=400)setError(true)}}
      onNavigationStateChange={(state)=>{setCanGoBack(!!state.canGoBack);console.log('[FUNY WEBVIEW] nav',state.url)}}
      showsVerticalScrollIndicator={false}
      bounces
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
