import { Image,Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C,UI } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';

type Props={showAccount?:boolean;title?:'FUNY PIN'|'PICK'|'TALK'|'MY';back?:boolean;onBack?:()=>void};

export default function FunyHeader({showAccount=true,title='FUNY PIN',back=false,onBack}:Props){
  const router=useRouter();
  const isHome=title==='FUNY PIN';
  const goBack=()=>{if(onBack){onBack();return;}router.back();};
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.94)',position:'relative',zIndex:9999,elevation:9999,borderBottomWidth:back?1:0,borderBottomColor:'rgba(233,229,237,.72)'}}>
    {back?<Pressable onPress={goBack} hitSlop={10} style={{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4}}><Text style={{fontSize:30,lineHeight:32,color:C.text}}>‹</Text></Pressable>:<Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:32,height:36,marginRight:8}}/>}
    <Text style={{fontSize:24,fontWeight:'800',letterSpacing:-0.6,color:C.text}}>{title}</Text>
    {!back&&isHome?<Text style={{marginLeft:8,fontSize:11,color:'#85818E'}}>by 깽퐌커플</Text>:null}
    {!back&&showAccount?<Pressable onPress={()=>router.push('/account')} hitSlop={8} style={{marginLeft:'auto',height:36,minWidth:36,paddingHorizontal:10,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.72)',borderWidth:1,borderColor:'rgba(233,229,237,.9)'}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>MY</Text></Pressable>:null}
  </View>;
}