import { useCallback,useEffect,useRef,useState } from 'react';
import { Animated,BackHandler,Easing,Linking,Modal,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { useFocusEffect,useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { WebView,WebViewMessageEvent } from 'react-native-webview';
import { C } from '../lib/theme';
import FunyHeader from './FunyHeader';

const makeAppUrl=(value:string)=>{try{const u=new URL(value);if(isFunyHost(value)){u.searchParams.set('app','1');u.searchParams.set('appv','20261001-9');}return u.toString();}catch{return value}};
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
    if(!/\/shops\.html$/.test(u.pathname.toLowerCase()))return false;
    const hash=u.hash.toLowerCase();
    return /shop\//.test(hash)||/shop(?:=|%3d)/.test(hash)||u.searchParams.has('shop');
  }catch{return false}
};

const APP_SHELL_BEFORE=String.raw`(function(){
try{
  var path=String(location.pathname||'').toLowerCase();
  var style=document.createElement('style');
  style.id='__funy_app_shell_critical__';
  style.textContent=[
    'html{--funy-app-shell:1}',
    'html.app-shell nav.portal-bottom-nav,html.app-shell nav.shops-bottom-nav,html.app-shell .portal-bottom-nav,html.app-shell .shops-bottom-nav,html.app-shell .funy-lang-switch{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;pointer-events:none!important}',
    'html.app-shell .info-tabs,html.app-shell .filters{top:0!important}',
    'html.app-shell .popular-sort.show{top:54px!important}',
    'html.app-shell .live-pin-entry-wrap,html.app-shell .live-pin-detail-entry{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',
    'html.app-shell .pokamo-fab{bottom:calc(env(safe-area-inset-bottom) + 78px)!important}'
  ].join('');
  document.documentElement.classList.add('app-shell');
  if(/\/live-pin-test\.html$/.test(path))style.textContent+='html.app-shell .fab{bottom:calc(env(safe-area-inset-bottom) + 78px)!important;right:max(16px,calc((100vw - 420px)/2 + 16px))!important}';
  style.textContent+= 'html.app-shell header.portal-header,html.app-shell .portal-header,html.app-shell .app-header{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important}';
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
    var presentation=link.getAttribute('data-funy-inapp-presentation')||'page';
    var href=link.href||link.getAttribute('href');
    if(!href)return;
    if(mode==='external'){
      event.preventDefault();
      event.stopPropagation();
      post({type:'OPEN_EXTERNAL',url:href});
      return false;
    }
    if(mode==='inapp'&&presentation==='bottom_sheet'){
      event.preventDefault();
      event.stopPropagation();
      post({type:'OPEN_INAPP_SHEET',url:href});
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
  var scrollTimer=null;
  var reportScroll=function(){post({type:'WEB_SCROLL',scrolling:true});clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){post({type:'WEB_SCROLL',scrolling:false});},650);};
  window.addEventListener('scroll',reportScroll,{passive:true});
}catch(e){}
})(); true;`;

type Props={url:string;title?:string;onWebRouteChange?:(target:string)=>void;onWebScrollChange?:(scrolling:boolean)=>void;showBackHeader?:boolean;backTitle?:string};

export default function FunyWebView({url,title='FUNY PIN',onWebRouteChange,onWebScrollChange,showBackHeader=false,backTitle}:Props){
  const router=useRouter();
  const isFocused=useIsFocused();
  const ref=useRef<WebView>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [canGoBack,setCanGoBack]=useState(false);
  const [webViewKey,setWebViewKey]=useState(0);
  const [sheetUrl,setSheetUrl]=useState<string|null>(null);
  const [sheetOpen,setSheetOpen]=useState(false);
  const sheetY=useRef(new Animated.Value(1)).current;
  const backdropOpacity=useRef(new Animated.Value(0)).current;
  const reloadAttempts=useRef(0);
  const {height:windowHeight}=useWindowDimensions();
  const goBack=useCallback(()=>{if(canGoBack&&ref.current){ref.current.goBack();return;}router.back();},[canGoBack,router]);
  const sheetHeight=windowHeight*0.82;

  const reportRoute=useCallback((target:string)=>{onWebRouteChange?.(target);},[onWebRouteChange]);

  useEffect(()=>{reportRoute(url);},[url,reportRoute]);

  const openSheet=useCallback((target:string)=>{
    setSheetUrl(makeAppUrl(target));
    setSheetOpen(true);
    sheetY.setValue(1);
    backdropOpacity.setValue(0);
    requestAnimationFrame(()=>{
      Animated.timing(sheetY,{toValue:0,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(()=>{
        Animated.timing(backdropOpacity,{toValue:1,duration:120,useNativeDriver:true}).start();
      });
    });
  },[backdropOpacity,sheetY]);

  const closeSheet=useCallback(()=>{
    Animated.parallel([
      Animated.timing(backdropOpacity,{toValue:0,duration:100,useNativeDriver:true}),
      Animated.timing(sheetY,{toValue:1,duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:true})
    ]).start(()=>{setSheetOpen(false);setSheetUrl(null);});
  },[backdropOpacity,sheetY]);

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
      if(sheetOpen){closeSheet();return true;}
      if(canGoBack&&ref.current){ref.current.goBack();return true;}
      return false;
    });
    return()=>sub.remove();
  },[canGoBack,closeSheet,sheetOpen]));

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
      if(data?.type==='WEB_SCROLL'){onWebScrollChange?.(!!data.scrolling);return;}
      if(data?.type==='OPEN_NATIVE'&&data.route){router.push(String(data.route) as any);return;}
      if(data?.type==='OPEN_EXTERNAL'&&data.url){
        Linking.openURL(String(data.url)).catch(()=>{});
        return;
      }
      if(data?.type==='OPEN_INAPP_SHEET'&&data.url){openSheet(String(data.url));return;}
    }catch{}
  },[onWebScrollChange,openSheet,reportRoute,router]);

  if(!isFocused)return null;
  if(error)return <View style={styles.error}><Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text><Text style={styles.errorText}>네트워크 연결을 확인한 뒤 다시 시도해주세요.</Text></View>;

  return (
    <View style={styles.container} accessibilityLabel={title}>
    {showBackHeader?<FunyHeader title={(backTitle||title) as 'FUNY PIN'|'PICK'|'TALK'|'MY'} showAccount={false} back onBack={goBack}/>:null}
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
    <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={closeSheet}>
      <View style={styles.sheetModal}>
        <Animated.View pointerEvents="none" style={[styles.sheetBackdrop,{opacity:backdropOpacity}]}/>
        <Pressable style={styles.sheetDismissArea} onPress={closeSheet} />
        <Animated.View style={[styles.sheetPanel,{height:sheetHeight,transform:[{translateY:sheetY.interpolate({inputRange:[0,1],outputRange:[0,sheetHeight]})}]}]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text numberOfLines={1} style={styles.sheetTitle}>FUNY PIN</Text>
            <Pressable hitSlop={10} onPress={closeSheet}><Text style={styles.sheetClose}>×</Text></Pressable>
          </View>
          {sheetUrl?<WebView
            source={{uri:sheetUrl}}
            style={styles.sheetWebview}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            automaticallyAdjustContentInsets={false}
            decelerationRate="normal"
            bounces
            onShouldStartLoadWithRequest={(request)=>{
              const target=request.url;
              if(target.startsWith('http://')||target.startsWith('https://'))return true;
              if(target.startsWith('mailto:')||target.startsWith('tel:')){Linking.openURL(target).catch(()=>{});return false;}
              return false;
            }}
          />:null}
        </Animated.View>
      </View>
    </Modal>
  </View>);
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#fff'},
  webview:{flex:1,backgroundColor:'#fff'},
  error:{flex:1,alignItems:'center',justifyContent:'center',padding:28,backgroundColor:'#fff'},
  errorTitle:{fontSize:16,fontWeight:'800',color:C.text},
  errorText:{marginTop:8,fontSize:12,color:C.muted,textAlign:'center'},
  sheetModal:{flex:1,justifyContent:'flex-end'},
  sheetBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(20,16,24,.38)'},
  sheetDismissArea:{flex:1},
  sheetPanel:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden',shadowColor:'#201C2A',shadowOpacity:.18,shadowRadius:22,shadowOffset:{width:0,height:-6},elevation:20},
  sheetHandle:{width:42,height:5,borderRadius:99,backgroundColor:'#d6d0dc',alignSelf:'center',marginTop:8,marginBottom:6},
  sheetHeader:{height:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:'#eee'},
  sheetTitle:{fontSize:14,fontWeight:'800',color:C.text},
  sheetClose:{fontSize:28,lineHeight:28,color:C.muted},
  sheetWebview:{flex:1,backgroundColor:'#fff'},
});