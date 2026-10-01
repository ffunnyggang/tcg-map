import { useCallback,useEffect,useRef,useState } from 'react';
import { BackHandler,Linking,Platform,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect,useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { WebView,WebViewMessageEvent } from 'react-native-webview';
import { C } from '../lib/theme';

const makeAppUrl=(value:string)=>{try{const u=new URL(value);if(isFunyHost(value)){u.searchParams.set('app','1');u.searchParams.set('appv','20261001-8');}return u.toString();}catch{return value}};
const isFunyHost=(target:string)=>{const value=String(target||'').toLowerCase();return value==='https://funypin.kr'||value.startsWith('https://funypin.kr/')||value.startsWith('https://www.funypin.kr/')||value.startsWith('https://www.funypin.kr')||value.startsWith('http://funypin.kr/')||value.startsWith('http://www.funypin.kr/');};

export const isWebBackPage=(target:string)=>{
  try{
    const u=new URL(target);
    const p=u.pathname.toLowerCase();
    return /\/(notice|shop-request|partner|faq|feedback|privacy|promo)\.html$/.test(p);
  }catch{return false}
};

export const isShopDetail=(target:string)=>{
  try{
    const u=new URL(target);
    return /\/shops\.html$/.test(u.pathname.toLowerCase())&&u.hash.toLowerCase().startsWith('#/shop/');
  }catch{return false}
};

const APP_SHELL_BEFORE=String.raw`(function(){
try{
  var path=String(location.pathname||'').toLowerCase();
  var backPages=['/notice.html','/shop-request.html','/partner.html','/faq.html','/feedback.html','/privacy.html','/promo.html'];
  var keepWebHeader=backPages.indexOf(path)!==-1;
  var style=document.createElement('style');
  style.id='__funy_app_shell_critical__';
  style.textContent=[
    'html{--funy-app-shell:1}',
    'html.app-shell nav.portal-bottom-nav,html.app-shell nav.shops-bottom-nav,html.app-shell .portal-bottom-nav,html.app-shell .shops-bottom-nav,html.app-shell .funy-lang-switch{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none!important}',
    'html.app-shell .live-pin-entry-wrap{bottom:132px!important}',
    'html.app-shell .live-pin-detail-entry{bottom:132px!important}',
    'html.app-shell .pokamo-fab{bottom:132px!important}'
  ].join('');
  document.documentElement.classList.add('app-shell');
  if(!keepWebHeader){
    style.textContent+= 'html.app-shell header.portal-header,html.app-shell .portal-header,html.app-shell .app-header{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important}';
  }
  document.documentElement.appendChild(style);
}catch(e){}
})(); true;`;

const APP_SHELL_AFTER=String.raw`(function(){
try{
  var post=function(data){
    try{
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }catch(e){}
  };
  var reportRoute=function(){post({type:'WEB_ROUTE',url:location.href});};
  var handleCMSLink=function(event){
    var node=event.target;
    var link=node&&node.closest?node.closest('a[data-funy-link-mode]'):null;
    if(!link)return;
    var mode=link.getAttribute('data-funy-link-mode')||'inapp';
    var href=link.href||link.getAttribute('href');
    if(!href)return;
    if(mode==='external'){
      event.preventDefault();
      event.stopPropagation();
      post({type:'OPEN_EXTERNAL',url:href});
      return false;
    }
    if(mode==='inapp'&&link.getAttribute('target')==='_blank'){
      event.preventDefault();
      event.stopPropagation();
      location.href=href;
      return false;
    }
  };
  document.addEventListener('click',handleCMSLink,true);
  window.addEventListener('hashchange',reportRoute);
  window.addEventListener('pageshow',reportRoute);
  reportRoute();
}catch(e){}
})(); true;`;

type Props={url:string;title?:string;onWebRouteChange?:(target:string)=>void};

export default function FunyWebView({url,title='FUNY PIN',onWebRouteChange}:Props){
  const router=useRouter();
  const isFocused=useIsFocused();
  const ref=useRef<WebView>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [canGoBack,setCanGoBack]=useState(false);
  const [webViewKey,setWebViewKey]=useState(0);
  const reloadAttempts=useRef(0);

  const reportRoute=useCallback((target:string)=>{onWebRouteChange?.(target);},[onWebRouteChange]);

  useEffect(()=>{reportRoute(url);},[url,reportRoute]);

  const handleUrl=useCallback((target:string)=>{
    if(target.startsWith('funypin://')){
      const path=target.replace('funypin://','/');
      if(path.startsWith('/account')){router.push('/account');return false;}
      if(path.startsWith('/shop/')){router.push(path as any);return false;}
      return false;
    }
    if(target==='about:blank'||target.startsWith('http://')||target.startsWith('https://'))return true;
    if(target.startsWith('mailto:')||target.startsWith('tel:'))return false;
    return true;
  },[router]);

  useFocusEffect(useCallback(()=>{
    if(Platform.OS!=='android')return;
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
      if(data?.type==='WEB_ROUTE'&&data.url){reportRoute(String(data.url));return;}
      if(data?.type==='OPEN_NATIVE'&&data.route){router.push(String(data.route) as any);return;}
      if(data?.type==='OPEN_EXTERNAL'&&data.url){
        Linking.openURL(String(data.url)).catch(()=>{});
        return;
      }
    }catch{}
  },[router,reportRoute]);

  if(!isFocused)return null;
  if(error)return <View style={styles.error}><Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text><Text style={styles.errorText}>네트워크 연결을 확인한 뒤 다시 시도해주세요.</Text></View>;

  return <View style={styles.container} accessibilityLabel={title}>
    <WebView
      ref={ref}
      key={`${url}:${webViewKey}`}
      source={{uri:makeAppUrl(url)}}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      automaticallyAdjustContentInsets={false}
      scrollEnabled
      decelerationRate="normal"
      bounces
      showsVerticalScrollIndicator={false}
      overScrollMode="always"
      onShouldStartLoadWithRequest={(request)=>{reportRoute(request.url);return handleUrl(request.url)}}
      onNavigationStateChange={(state)=>{setCanGoBack(state.canGoBack);reportRoute(state.url)}}
      injectedJavaScriptBeforeContentLoaded={APP_SHELL_BEFORE}
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly
      injectedJavaScript={APP_SHELL_AFTER}
      injectedJavaScriptForMainFrameOnly
      onLoadStart={(e)=>{reportRoute(e.nativeEvent.url);setLoading(true)}}
      onLoad={(e)=>{reportRoute(e.nativeEvent.url);setLoading(false)}}
      onLoadEnd={(e)=>{reportRoute(e.nativeEvent.url);setLoading(false)}}
      onMessage={onMessage}
      onContentProcessDidTerminate={()=>{
        if(reloadAttempts.current<2){
          reloadAttempts.current+=1;
          setLoading(true);
          setTimeout(()=>setWebViewKey(k=>k+1),350);
        }else{
          setLoading(false);
          setError(true);
        }
      }}
      onError={()=>{
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
  error:{flex:1,alignItems:'center',justifyContent:'center',padding:28,backgroundColor:'#fff'},
  errorTitle:{fontSize:16,fontWeight:'800',color:C.text},
  errorText:{marginTop:8,fontSize:12,color:C.muted,textAlign:'center'},
});