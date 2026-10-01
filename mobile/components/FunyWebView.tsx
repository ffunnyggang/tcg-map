import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,BackHandler,Platform,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect,useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { WebView,WebViewMessageEvent } from 'react-native-webview';
import { C } from '../lib/theme';

const makeAppUrl=(value:string)=>{try{const u=new URL(value);if(isFunyHost(value)){u.searchParams.set('app','1');u.searchParams.set('appv','20261001-2');}return u.toString();}catch{return value}};
const isFunyHost=(target:string)=>{const value=String(target||'').toLowerCase();return value==='https://funypin.kr'||value.startsWith('https://funypin.kr/')||value.startsWith('https://www.funypin.kr/')||value.startsWith('https://www.funypin.kr')||value.startsWith('http://funypin.kr/')||value.startsWith('http://www.funypin.kr/');};
const APP_SHELL_BOOTSTRAP=`(function(){try{
document.documentElement.classList.add('app-shell');
var s=document.createElement('style');s.id='__funy_app_shell_critical__';
s.textContent='
html.app-shell .portal-header,
html.app-shell .app-header,
html.app-shell nav.portal-bottom-nav,
html.app-shell nav.shops-bottom-nav,
html.app-shell .portal-bottom-nav,
html.app-shell .shops-bottom-nav,
html.app-shell .funy-lang-switch,
html.app-shell .live-pin-entry-wrap,
html.app-shell .live-pin-detail-entry{
display:none!important;
visibility:hidden!important;
opacity:0!important;
width:0!important;
height:0!important;
min-height:0!important;
max-height:0!important;
margin:0!important;
padding:0!important;
border:0!important;
pointer-events:none!important;
}
html.app-shell .portal-main,
html.app-shell .shops-page-pad{
padding-top:0!important;
margin-top:0!important;
}
';
(document.head||document.documentElement).appendChild(s);
var hide=function(){
var sels=['header.portal-header','.portal-header','.app-header','nav.portal-bottom-nav','nav.shops-bottom-nav','.portal-bottom-nav','.shops-bottom-nav','.funy-lang-switch','.live-pin-entry-wrap','.live-pin-detail-entry'];
sels.forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){
el.style.setProperty('display','none','important');
el.style.setProperty('visibility','hidden','important');
el.style.setProperty('height','0','important');
el.style.setProperty('min-height','0','important');
el.style.setProperty('max-height','0','important');
el.style.setProperty('margin','0','important');
el.style.setProperty('padding','0','important');
});});
};
hide();
new MutationObserver(hide).observe(document.documentElement,{childList:true,subtree:true});
}catch(_){} true;`;
type Props={url:string;title?:string};

export default function FunyWebView({url,title='FUNY PIN'}:Props){
  const router=useRouter();
  const isFocused=useIsFocused();
  const ref=useRef<WebView>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false),[canGoBack,setCanGoBack]=useState(false);
  const [webViewKey,setWebViewKey]=useState(0);
  const reloadAttempts=useRef(0);

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
    reloadAttempts.current=0;
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

  if(!isFocused) return null;

  if(error) return <View style={styles.error}><Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text><Text style={styles.errorText}>네트워크 연결을 확인한 뒤 다시 시도해주세요.</Text></View>;

  return <View style={styles.container} accessibilityLabel={title}>
    <WebView
      ref={ref}
      key={`${url}:${webViewKey}`}
      source={{uri:makeAppUrl(url)}}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      injectedJavaScriptBeforeContentLoaded={APP_SHELL_BOOTSTRAP}
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly
      onLoadStart={(e)=>{console.log('[FUNY WEBVIEW] load start',e.nativeEvent.url);setLoading(true)}}
      onLoad={(e)=>{console.log('[FUNY WEBVIEW] load',e.nativeEvent.url);setLoading(false)}}
      onLoadEnd={(e)=>{console.log('[FUNY WEBVIEW] load end',e.nativeEvent.url);setLoading(false)}}
      onContentProcessDidTerminate={()=>{
        console.warn('[FUNY WEBVIEW] content process terminated');
        if(reloadAttempts.current<2){
          reloadAttempts.current+=1;
          setLoading(true);
          setTimeout(()=>setWebViewKey(k=>k+1),350);
        }else{
          setLoading(false);
          setError(true);
        }
      }}
      onError={(e)=>{
        console.warn('[FUNY WEBVIEW] load error',e.nativeEvent);
        if(reloadAttempts.current<2){
          reloadAttempts.current+=1;
          setLoading(true);
          setTimeout(()=>setWebViewKey(k=>k+1),350);
        }else{
          setLoading(false);
          setError(true);
        }
      }}
    />
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
