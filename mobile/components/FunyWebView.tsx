import { useCallback,useEffect,useRef,useState } from 'react';
import { Animated,BackHandler,Easing,Linking,Modal,Platform,Pressable,Share,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useFocusEffect,useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { WebView,WebViewMessageEvent } from 'react-native-webview';
import { C } from '../lib/theme';
import FunyHeader from './FunyHeader';
import { supabase } from '../lib/supabase';
import { setWebOverlayOpen } from '../lib/webOverlayState';

const isFunyHost=(target:string)=>{const value=String(target||'').toLowerCase();return value==='https://funypin.kr'||value.startsWith('https://funypin.kr/')||value.startsWith('https://www.funypin.kr/')||value.startsWith('https://www.funypin.kr')||value.startsWith('http://funypin.kr/')||value.startsWith('http://www.funypin.kr/');};
const makeAppUrl=(value:string)=>{try{const u=new URL(value);if(isFunyHost(value)){u.searchParams.set('app','1');u.searchParams.set('appv','20261002-05');}return u.toString();}catch{return value}};

export const isWebBackPage=(target:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return true;const p=u.pathname.toLowerCase();if(/\/talk\.html$/.test(p)&&/^#\/post\//.test(u.hash))return true;return /\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\.html$/.test(p);}catch{return false}};
const pageTitleFromUrl=(target:string,fallback:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return '';const p=u.pathname.toLowerCase();if(/\/talk\.html$/.test(p)&&/^#\/post\//.test(u.hash))return '게시물';const map:Record<string,string>={'/notice.html':'공지사항','/faq.html':'자주 묻는 질문','/support.html':'고객지원','/feedback.html':'서비스 만족도 조사','/shop-request.html':'매장 등록 · 정보 수정 요청','/partner.html':'광고 · 제휴 문의','/terms.html':'이용약관','/privacy.html':'개인정보처리방침','/community-guidelines.html':'커뮤니티 운영정책','/promo.html':'프로모션'};return map[p]||fallback;}catch{return fallback}};
export const isShopDetail=(target:string)=>{try{const u=new URL(target);if(!/\/shops\.html$/.test(u.pathname.toLowerCase()))return false;const hash=u.hash.toLowerCase();return /shop\//.test(hash)||/shop(?:=|%3d)/.test(hash)||u.searchParams.has('shop');}catch{return false}};

const APP_SHELL_BEFORE=String.raw`(function(){
try{
  var path=String(location.pathname||'').toLowerCase();
  var style=document.createElement('style');
  try{var vp=document.querySelector('meta[name="viewport"]');if(!vp){vp=document.createElement('meta');vp.name='viewport';document.head&&document.head.appendChild(vp)}vp.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')}catch(_){}
  style.id='__funy_app_shell_critical__';
  style.textContent=[
    'html{--funy-app-shell:1;touch-action:pan-x pan-y!important}',
    'html.app-shell,html.app-shell body,html.app-shell .shell,html.app-shell .page,html.app-shell .portal-body,html.app-shell .portal-shell,html.app-shell .home-content-flow{background:#fff!important}',
    'html.app-shell nav.portal-bottom-nav,html.app-shell nav.shops-bottom-nav,html.app-shell .portal-bottom-nav,html.app-shell .shops-bottom-nav,html.app-shell .funy-lang-switch{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none!important}',
    'html.app-shell .info-tabs{top:0!important}',
    'html.app-shell.talk-page .filters{top:0!important}',
    'html.app-shell.live-pin-page .filters{top:54px!important}',
    'html.app-shell .popular-sort.show{top:54px!important}',
    'html.app-shell .live-pin-entry-wrap,html.app-shell .live-pin-detail-entry{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',
    'html.app-shell .pokamo-fab{bottom:calc(max(env(safe-area-inset-bottom,0px),12px) + 64px)!important;right:16px!important}'
  ].join('');
  document.documentElement.classList.add('app-shell');
  if(/\/live-pin-test\.html$/.test(path))document.documentElement.classList.add('live-pin-page');
  if(/\/talk\.html$/.test(path))document.documentElement.classList.add('talk-page');
  if(/\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\.html$/.test(path))document.documentElement.classList.add('web-back-page');
  style.textContent+='html.app-shell header.portal-header,html.app-shell .portal-header,html.app-shell .app-header{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important}';
  style.textContent+='html.app-shell.web-back-page .header{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important}';
  if(/\/live-pin-test\.html$/.test(path))style.textContent+='html.app-shell.live-pin-page .shell{padding-top:54px!important;background:#fff!important}html.app-shell.live-pin-page .head{position:fixed!important;top:0!important;left:50%!important;transform:translateX(-50%)!important;width:min(100%,420px)!important;height:54px!important;z-index:200!important}html.app-shell.live-pin-page .filters{position:sticky!important;top:54px!important;z-index:150!important;background:#fff!important}html.app-shell.live-pin-page .fab{bottom:calc(max(env(safe-area-inset-bottom,0px),12px) + 64px)!important}html.app-shell.live-pin-page .sheetbg.open,html.app-shell.live-pin-page .shop-filter-bg.open,html.app-shell.live-pin-page .flag-sheet.open{z-index:2147483000!important}html.app-shell .map-location-avatar-sheet{z-index:2147483000!important}';
  document.documentElement.appendChild(style);

  /* Install geolocation bridge before page scripts can cache WKWebView geolocation methods. */
  if(window.ReactNativeWebView&&navigator.geolocation&&!window.__FUNY_NATIVE_GEO_BRIDGED){
    window.__FUNY_NATIVE_GEO_BRIDGED=true;
    var post=function(data){try{window.ReactNativeWebView.postMessage(JSON.stringify(data));}catch(e){}};
    var watchers={},seq=0;
    var nativeError=function(detail){return {code:Number(detail&&detail.code)||2,message:String(detail&&detail.message||'현재 위치를 확인하지 못했습니다.')}};
    navigator.geolocation.watchPosition=function(success,error,options){var id=++seq;watchers[id]={success:success,error:error,once:false};post({type:'REQUEST_NATIVE_LOCATION',watchId:id,options:options||{}});return id;};
    navigator.geolocation.getCurrentPosition=function(success,error,options){var id=++seq;watchers[id]={success:success,error:error,once:true};post({type:'REQUEST_NATIVE_LOCATION',watchId:id,options:options||{}});};
    navigator.geolocation.clearWatch=function(id){delete watchers[id];post({type:'STOP_NATIVE_LOCATION',watchId:id});};
    window.addEventListener('funy:nativelocation',function(e){var d=e.detail||{},position={coords:{latitude:Number(d.latitude),longitude:Number(d.longitude),accuracy:Number(d.accuracy)||0,altitude:d.altitude==null?null:Number(d.altitude),altitudeAccuracy:d.altitudeAccuracy==null?null:Number(d.altitudeAccuracy),heading:d.heading==null?null:Number(d.heading),speed:d.speed==null?null:Number(d.speed)},timestamp:Number(d.timestamp)||Date.now()};Object.keys(watchers).forEach(function(k){var w=watchers[k];try{w.success&&w.success(position);}catch(_){}if(w.once)delete watchers[k];});});
    window.addEventListener('funy:nativelocationerror',function(e){var err=nativeError(e.detail);Object.keys(watchers).forEach(function(k){var w=watchers[k];try{w.error&&w.error(err);}catch(_){}delete watchers[k];});});
    try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission=function(){return Promise.resolve('denied');};}catch(_){}
  }
}catch(e){}
})(); true;`;

const APP_SHELL_AFTER=String.raw`(function(){
try{
  var post=function(data){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));}catch(e){}};
  var reportRoute=function(){post({type:'WEB_ROUTE',url:location.href});};
  if(window.ReactNativeWebView&&!window.__FUNY_AUTH_FETCH_BRIDGED&&typeof window.fetch==='function'){
    window.__FUNY_AUTH_FETCH_BRIDGED=true;
    var originalFetch=window.fetch.bind(window);
    window.fetch=function(input,init){try{var target=typeof input==='string'?input:(input&&input.url)||'';if(target.indexOf('/functions/v1/funy-mon-catch')>=0&&window.__FUNY_ACCESS_TOKEN){init=Object.assign({},init||{});var headers=new Headers(init.headers||{});headers.set('Authorization','Bearer '+window.__FUNY_ACCESS_TOKEN);init.headers=headers;}}catch(_){}return originalFetch(input,init);};
  }
  var handleCMSLink=function(event){var node=event.target;var link=node&&node.closest?node.closest('a[data-funy-link-mode]'):null;if(!link)return;var mode=link.getAttribute('data-funy-link-mode')||'inapp';var presentation=link.getAttribute('data-funy-inapp-presentation')||'page';var href=link.href||link.getAttribute('href');if(!href)return;if(mode==='external'){event.preventDefault();event.stopPropagation();post({type:'OPEN_EXTERNAL',url:href});return false;}if(mode==='inapp'&&presentation==='bottom_sheet'){event.preventDefault();event.stopPropagation();post({type:'OPEN_INAPP_SHEET',url:href});return false;}if(mode==='inapp'&&presentation==='page'){event.preventDefault();event.stopPropagation();post({type:'OPEN_INAPP_PAGE',url:href,title:(link.getAttribute('aria-label')||link.textContent||'').replace(/\s+/g,' ').trim()});return false;}if(mode==='inapp'&&link.getAttribute('target')==='_blank'){event.preventDefault();event.stopPropagation();location.href=href;return false;}};
  document.addEventListener('click',handleCMSLink,true);
  window.addEventListener('hashchange',reportRoute);window.addEventListener('pageshow',reportRoute);reportRoute();
  var scrollTimer=null;var reportScroll=function(){post({type:'WEB_SCROLL',scrolling:true});clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){post({type:'WEB_SCROLL',scrolling:false});},650);};window.addEventListener('scroll',reportScroll,{passive:true});
}catch(e){}
})(); true;`;

type Props={url:string;title?:string;onWebRouteChange?:(target:string)=>void;onWebScrollChange?:(scrolling:boolean)=>void;onMapCountryChange?:(country:'KR'|'JP')=>void;showBackHeader?:boolean;backTitle?:string;onNativeBack?:()=>void};

export default function FunyWebView({url,title='FUNY PIN',onWebRouteChange,onWebScrollChange,onMapCountryChange,showBackHeader=false,backTitle,onNativeBack}:Props){
  const router=useRouter();
  const isFocused=useIsFocused();
  const ref=useRef<WebView>(null);
  const locationSub=useRef<Location.LocationSubscription|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [canGoBack,setCanGoBack]=useState(false);
  const [webViewKey,setWebViewKey]=useState(0);
  const [sheetUrl,setSheetUrl]=useState<string|null>(null);
  const [accessToken,setAccessToken]=useState<string|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [sheetOpen,setSheetOpen]=useState(false);
  const [currentTarget,setCurrentTarget]=useState(url);
  const sheetY=useRef(new Animated.Value(1)).current;
  const backdropOpacity=useRef(new Animated.Value(0)).current;
  const reloadAttempts=useRef(0);
  const {height:windowHeight}=useWindowDimensions();
  const goBack=useCallback(()=>{if(onNativeBack){onNativeBack();return;}if(canGoBack&&ref.current){ref.current.goBack();return;}router.back();},[canGoBack,onNativeBack,router]);
  const sheetHeight=windowHeight*0.82;
  const isTalkPost=(()=>{try{const u=new URL(currentTarget);return /\/talk\.html$/.test(u.pathname.toLowerCase())&&/^#\/post\//.test(u.hash)}catch{return false}})();
  const requestTalkReport=()=>ref.current?.injectJavaScript("window.dispatchEvent(new CustomEvent('funy:native-talk-report'));true;");
  const shareCurrent=()=>{Share.share({message:currentTarget}).catch(()=>{})};

  const injectEvent=useCallback((name:string,detail:Record<string,unknown>)=>{const js=`window.dispatchEvent(new CustomEvent(${JSON.stringify(name)},{detail:${JSON.stringify(detail)}}));true;`;ref.current?.injectJavaScript(js);},[]);
  const stopNativeLocation=useCallback(()=>{try{locationSub.current?.remove();}catch{}locationSub.current=null;},[]);
  const requestNativeLocation=useCallback(async()=>{try{const permission=await Location.requestForegroundPermissionsAsync();if(permission.status!=='granted'){stopNativeLocation();injectEvent('funy:nativelocationerror',{code:1,message:'위치 권한을 허용하면 내 위치를 표시할 수 있어요.'});return;}const send=(pos:Location.LocationObject)=>injectEvent('funy:nativelocation',{latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy??0,altitude:pos.coords.altitude??null,altitudeAccuracy:pos.coords.altitudeAccuracy??null,heading:pos.coords.heading??null,speed:pos.coords.speed??null,timestamp:pos.timestamp});const first=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});send(first);stopNativeLocation();locationSub.current=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:3,timeInterval:1800},send);}catch(e:any){stopNativeLocation();injectEvent('funy:nativelocationerror',{code:2,message:String(e?.message||'현재 위치를 확인하지 못했습니다.')});}},[injectEvent,stopNativeLocation]);

  useEffect(()=>()=>{stopNativeLocation();setWebOverlayOpen(false);},[stopNativeLocation]);
  useEffect(()=>{if(!isFocused)setWebOverlayOpen(false);},[isFocused]);
  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(!alive)return;setAccessToken(data.session?.access_token||null);setAuthReady(true);}).catch(()=>{if(alive)setAuthReady(true)});const sub=supabase.auth.onAuthStateChange((_event,session)=>{if(!alive)return;setAccessToken(session?.access_token||null);});return()=>{alive=false;sub.data.subscription.unsubscribe();};},[]);
  useEffect(()=>{if(authReady)setWebViewKey(k=>k+1);},[authReady]);

  const reportRoute=useCallback((target:string)=>{setCurrentTarget(target);onWebRouteChange?.(target);},[onWebRouteChange]);
  useEffect(()=>{reportRoute(url);},[url,reportRoute]);
  const openSheet=useCallback((target:string)=>{setWebOverlayOpen(true);setSheetUrl(makeAppUrl(target));setSheetOpen(true);sheetY.setValue(1);backdropOpacity.setValue(0);requestAnimationFrame(()=>{Animated.timing(sheetY,{toValue:0,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>{Animated.timing(backdropOpacity,{toValue:1,duration:120,useNativeDriver:true}).start();});});},[backdropOpacity,sheetY]);
  const closeSheet=useCallback(()=>{Animated.parallel([Animated.timing(backdropOpacity,{toValue:0,duration:100,useNativeDriver:true}),Animated.timing(sheetY,{toValue:1,duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:true})]).start(()=>{setSheetOpen(false);setSheetUrl(null);setWebOverlayOpen(false);});},[backdropOpacity,sheetY]);

  const handleUrl=useCallback((target:string)=>{if(target.startsWith('funypin://')){const path=target.replace('funypin://','/');if(path.startsWith('/account')){router.push('/account');return false;}if(path.startsWith('/shop/')){const id=path.slice('/shop/'.length);router.push({pathname:'/(tabs)/map',params:{country:id.startsWith('JP-')?'JP':'KR',shop:id}} as any);return false;}return false;}if(target==='about:blank'||target.startsWith('http://')||target.startsWith('https://'))return true;if(target.startsWith('mailto:')||target.startsWith('tel:'))return false;return true;},[router]);

  useFocusEffect(useCallback(()=>{if(Platform.OS!=='android')return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(sheetOpen){closeSheet();return true;}if(canGoBack&&ref.current){ref.current.goBack();return true;}return false;});return()=>sub.remove();},[canGoBack,closeSheet,sheetOpen]));
  useEffect(()=>{setLoading(true);setError(false);reloadAttempts.current=0;const timer=setTimeout(()=>setLoading(false),2500);return()=>clearTimeout(timer);},[url]);

  const onMessage=useCallback((event:WebViewMessageEvent)=>{try{const data=JSON.parse(event.nativeEvent.data);if(data?.type==='WEB_ROUTE'&&data.url){reportRoute(String(data.url));return;}if(data?.type==='WEB_SCROLL'){onWebScrollChange?.(!!data.scrolling);return;}if(data?.type==='OPEN_NATIVE'&&data.route){setWebOverlayOpen(false);router.push(String(data.route) as any);return;}if(data?.type==='OPEN_EXTERNAL'&&data.url){Linking.openURL(String(data.url)).catch(()=>{});return;}if(data?.type==='OPEN_INAPP_SHEET'&&data.url){openSheet(String(data.url));return;}if(data?.type==='OPEN_INAPP_PAGE'&&data.url){setWebOverlayOpen(false);router.push({pathname:'/web',params:{url:encodeURIComponent(String(data.url)),title:String(data.title||'')}} as any);return;}if(data?.type==='FUNY_WEB_OVERLAY_STATE'){setWebOverlayOpen(!!data.open);return;}if(data?.type==='MAP_COUNTRY'&&data.country){onMapCountryChange?.(String(data.country)==='JP'?'JP':'KR');return;}if(data?.type==='REQUEST_NATIVE_LOCATION'){requestNativeLocation();return;}if(data?.type==='STOP_NATIVE_LOCATION'){stopNativeLocation();return;}}catch{}},[onMapCountryChange,onWebScrollChange,openSheet,reportRoute,requestNativeLocation,router,stopNativeLocation]);

  if(!isFocused)return null;
  const authInjection=accessToken?`\n(function(){try{window.__FUNY_ACCESS_TOKEN=${JSON.stringify(accessToken)};}catch(e){}})(); true;`:'';
  const appContext={surface:'app',platform:Platform.OS,appVersion:Constants.expoConfig?.version||Constants.nativeAppVersion||'',buildVersion:Constants.nativeBuildVersion||'',loggedIn:!!accessToken};
  const contextInjection=`\n(function(){try{window.__FUNY_APP_CONTEXT=${JSON.stringify(appContext)};}catch(e){}})(); true;`;
  if(error)return <View style={styles.error}><Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text><Text style={styles.errorText}>네트워크 연결을 확인한 뒤 다시 시도해주세요.</Text></View>;

  return <View style={styles.container} accessibilityLabel={title}>
    {showBackHeader?<FunyHeader title={pageTitleFromUrl(currentTarget,backTitle||title)} showAccount={false} back onBack={goBack} right={isTalkPost?<><Pressable onPress={requestTalkReport} hitSlop={8} style={styles.headerAction}><Text style={styles.headerActionDanger}>신고하기</Text></Pressable><Pressable onPress={shareCurrent} hitSlop={8} style={styles.headerAction}><Text style={styles.headerActionText}>공유하기</Text></Pressable></>:null}/>:null}
    <WebView ref={ref} key={`${url}:${webViewKey}`} source={{uri:makeAppUrl(url)}} style={styles.webview} javaScriptEnabled scalesPageToFit={false} domStorageEnabled allowsInlineMediaPlayback automaticallyAdjustContentInsets={false} scrollEnabled decelerationRate="normal" bounces showsVerticalScrollIndicator={false} overScrollMode="always" onShouldStartLoadWithRequest={(request)=>{reportRoute(request.url);return handleUrl(request.url)}} onNavigationStateChange={(state)=>{setCanGoBack(state.canGoBack);reportRoute(state.url)}} injectedJavaScriptBeforeContentLoaded={APP_SHELL_BEFORE+authInjection+contextInjection} injectedJavaScriptBeforeContentLoadedForMainFrameOnly injectedJavaScript={APP_SHELL_AFTER} injectedJavaScriptForMainFrameOnly onLoadStart={(e)=>{reportRoute(e.nativeEvent.url);setLoading(true)}} onLoad={(e)=>{reportRoute(e.nativeEvent.url);setLoading(false)}} onLoadEnd={(e)=>{reportRoute(e.nativeEvent.url);setLoading(false)}} onMessage={onMessage} onContentProcessDidTerminate={()=>{if(reloadAttempts.current<2){reloadAttempts.current+=1;setLoading(true);setTimeout(()=>setWebViewKey(k=>k+1),350);}else{setLoading(false);setError(true);}}} onError={()=>{if(reloadAttempts.current<2){reloadAttempts.current+=1;setLoading(true);setTimeout(()=>setWebViewKey(k=>k+1),350);}else{setLoading(false);setError(true);}}}/>
    <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={closeSheet}><View style={styles.sheetModal}><Animated.View pointerEvents="none" style={[styles.sheetBackdrop,{opacity:backdropOpacity}]}/><Pressable style={styles.sheetDismissArea} onPress={closeSheet}/><Animated.View style={[styles.sheetPanel,{height:sheetHeight,transform:[{translateY:sheetY.interpolate({inputRange:[0,1],outputRange:[0,sheetHeight]})}]}]}><View style={styles.sheetHandle}/><View style={styles.sheetHeader}><Text numberOfLines={1} style={styles.sheetTitle}>FUNY PIN</Text><Pressable hitSlop={10} onPress={closeSheet}><Text style={styles.sheetClose}>×</Text></Pressable></View>{sheetUrl?<WebView source={{uri:sheetUrl}} style={styles.sheetWebview} javaScriptEnabled scalesPageToFit={false} domStorageEnabled allowsInlineMediaPlayback automaticallyAdjustContentInsets={false} decelerationRate="normal" bounces onShouldStartLoadWithRequest={(request)=>{const target=request.url;if(target.startsWith('http://')||target.startsWith('https://'))return true;if(target.startsWith('mailto:')||target.startsWith('tel:')){Linking.openURL(target).catch(()=>{});return false;}return false;}}/>:null}</Animated.View></View></Modal>
  </View>;
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},webview:{flex:1,backgroundColor:'#fff'},headerAction:{height:32,paddingHorizontal:7,alignItems:'center',justifyContent:'center'},headerActionText:{fontSize:11.5,fontWeight:'800',color:C.textSoft},headerActionDanger:{fontSize:11.5,fontWeight:'800',color:C.danger},error:{flex:1,alignItems:'center',justifyContent:'center',padding:28,backgroundColor:'#fff'},errorTitle:{fontSize:16,fontWeight:'800',color:C.text},errorText:{marginTop:8,fontSize:12,color:C.muted,textAlign:'center'},sheetModal:{flex:1,justifyContent:'flex-end'},sheetBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(20,16,24,.42)'},sheetDismissArea:{flex:1},sheetPanel:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden',shadowColor:'#201C2A',shadowOpacity:.18,shadowRadius:22,shadowOffset:{width:0,height:-6},elevation:20},sheetHandle:{width:42,height:5,borderRadius:99,backgroundColor:'#d6d0dc',alignSelf:'center',marginTop:8,marginBottom:6},sheetHeader:{height:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},sheetTitle:{fontSize:14,fontWeight:'800',color:C.text},sheetClose:{fontSize:28,lineHeight:28,color:C.muted},sheetWebview:{flex:1,backgroundColor:'#fff'}
});
