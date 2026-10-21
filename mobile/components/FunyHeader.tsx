import { useCallback,useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { Image,Pressable,StatusBar,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C,T,UI } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';
import { getWebOverlayOpen,subscribeWebOverlay } from '../lib/webOverlayState';
import { useAppLanguage } from '../lib/i18n';
import { getUnreadNotificationCount,subscribeNotificationChanges } from '../lib/notifications';
import { supabase } from '../lib/supabase';

type Props={
  showAccount?:boolean;
  title?:string;
  back?:boolean;
  onBack?:()=>void;
  right?:ReactNode;
  dimmed?:boolean;
  showNotifications?:boolean;
};

function NotificationBell(){
  const router=useRouter();
  const [unread,setUnread]=useState(0);
  const refreshUnread=useCallback(async()=>{
    try{setUnread(await getUnreadNotificationCount())}
    catch{setUnread(0)}
  },[]);

  useFocusEffect(useCallback(()=>{
    let active=true;
    let unsubscribe=()=>{};
    void refreshUnread();
    void supabase.auth.getUser().then(({data})=>{
      if(!active||!data.user)return;
      unsubscribe=subscribeNotificationChanges(data.user.id,()=>{if(active)void refreshUnread()});
    }).catch(()=>{});
    return()=>{active=false;unsubscribe()};
  },[refreshUnread]));

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="Notifications"
    hitSlop={8}
    onPress={()=>router.push('/my/notifications' as any)}
    style={{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'}}
  >
    <Ionicons name="notifications-outline" size={22} color={C.text}/>
    {unread>0?<View style={{position:'absolute',right:4,top:1,minWidth:16,height:16,paddingHorizontal:4,borderRadius:8,backgroundColor:'#6E4CC5',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#fff'}}>
      <Text allowFontScaling={false} style={{fontSize:8,lineHeight:10,fontWeight:'900',color:'#fff'}}>{unread>99?'99+':String(unread)}</Text>
    </View>:null}
  </Pressable>;
}

export default function FunyHeader({showAccount=true,title='FUNY PIN',back=false,onBack,right,dimmed=false,showNotifications=false}:Props){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const {language,setLanguage}=useAppLanguage();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  const isHome=title==='FUNY PIN';
  const goBack=()=>{if(onBack){onBack();return;}router.back();};

  useEffect(()=>{const unsubscribe=subscribeWebOverlay(setOverlayOpen);return()=>{unsubscribe()};},[]);

  const languageToggle=!back&&isHome?<View style={{flexDirection:'row',alignItems:'center',padding:2,borderRadius:16,backgroundColor:'#F4F1F8',borderWidth:1,borderColor:'#E8E1EF'}}>
    {(['ko','en'] as const).map(lang=><Pressable key={lang} accessibilityRole="button" accessibilityState={{selected:language===lang}} onPress={()=>{void setLanguage(lang)}} style={{height:25,minWidth:32,paddingHorizontal:7,borderRadius:13,alignItems:'center',justifyContent:'center',backgroundColor:language===lang?'#fff':'transparent'}}><Text allowFontScaling={false} style={{fontSize:10,fontWeight:'800',color:language===lang?C.purpleDark:'#8D8595'}}>{lang==='ko'?'한':'EN'}</Text></Pressable>)}
  </View>:null;

  const dimOpen=overlayOpen||dimmed;
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.96)',position:'relative',zIndex:9999,elevation:9999}}>
    <StatusBar hidden={false} barStyle="dark-content" backgroundColor={dimOpen?'#A6A4A7':'#FFFFFF'} translucent={false}/>
    {back?<Pressable onPress={goBack} hitSlop={10} style={{width:34,height:34,alignItems:'center',justifyContent:'center',marginRight:4}}><Text style={{fontSize:27,lineHeight:29,fontWeight:'400',color:C.text}}>‹</Text></Pressable>:<Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:30,height:34,marginRight:8}}/>}
    <Text allowFontScaling maxFontSizeMultiplier={1} style={{...T.header,color:C.text}}>{title}</Text>
    {!back&&isHome?<Text allowFontScaling maxFontSizeMultiplier={1} style={{marginLeft:8,fontSize:11,color:'#85818E'}}>by 깽퐌커플</Text>:null}
    {right?<View style={{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:4}}>{right}</View>:(!back&&(languageToggle||showNotifications)?<View style={{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:5}}>{languageToggle}{showNotifications?<NotificationBell/>:null}</View>:null)}
    {dimOpen?<View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:-insets.top,bottom:0,backgroundColor:'rgba(20,16,24,.38)',zIndex:100000,elevation:100000}}/>:null}
  </View>;
}
