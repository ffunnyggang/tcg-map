import { useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { Image,Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C,T,UI } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';
import { getWebOverlayOpen,subscribeWebOverlay } from '../lib/webOverlayState';
import { supabase } from '../lib/supabase';

type Props={showAccount?:boolean;title?:string;back?:boolean;onBack?:()=>void;right?:ReactNode};

export default function FunyHeader({showAccount=true,title='FUNY PIN',back=false,onBack,right}:Props){
  const router=useRouter();
  const [overlayOpen,setOverlayOpen]=useState(getWebOverlayOpen());
  const [loggedIn,setLoggedIn]=useState(false);
  useEffect(()=>subscribeWebOverlay(setOverlayOpen),[]);
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted)setLoggedIn(!!data.session);}).catch(()=>{});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setLoggedIn(!!session));
    return()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  const isHome=title==='FUNY PIN';
  const goBack=()=>{if(onBack){onBack();return;}router.back();};
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.96)',position:'relative',zIndex:9999,elevation:9999}}>
    {back?<Pressable onPress={goBack} hitSlop={10} style={{width:34,height:34,alignItems:'center',justifyContent:'center',marginRight:4}}><Text style={{fontSize:27,lineHeight:29,fontWeight:'400',color:C.text}}>‹</Text></Pressable>:<Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:30,height:34,marginRight:8}}/>}
    <Text allowFontScaling maxFontSizeMultiplier={1} style={{...T.header,color:C.text}}>{title}</Text>
    {!back&&isHome?<Text allowFontScaling maxFontSizeMultiplier={1} style={{marginLeft:8,fontSize:11,color:'#85818E'}}>by 깽퐌커플</Text>:null}
    {right?<View style={{marginLeft:'auto',flexDirection:'row',alignItems:'center',gap:4}}>{right}</View>:null}
    {!right&&!back&&showAccount?<Pressable onPress={()=>loggedIn?router.push('/account'):router.push({pathname:'/login',params:{next:'account'}} as any)} hitSlop={8} style={{marginLeft:'auto',height:34,minWidth:loggedIn?34:54,paddingHorizontal:10,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.72)',borderWidth:1,borderColor:'rgba(233,229,237,.9)'}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>{loggedIn?'MY':'로그인'}</Text></Pressable>:null}
    {overlayOpen?<View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(20,16,24,.38)',zIndex:100000,elevation:100000}}/>:null}
  </View>;
}