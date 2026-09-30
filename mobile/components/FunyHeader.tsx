import { Image,Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C,UI } from '../lib/theme';

export default function FunyHeader({showAccount=true}:{showAccount?:boolean}){
  const router=useRouter();
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.98)'}}>
    <Image source={{uri:'https://funypin.kr/apple-touch-icon.png'}} resizeMode="contain" style={{width:32,height:36,marginRight:8}}/>
    <Text style={{fontSize:24,fontWeight:'800',letterSpacing:-0.6,color:C.text}}>FUNY PIN</Text>
    <Text style={{marginLeft:8,fontSize:10.5,color:'#81798B'}}>by 깽퐌커플</Text>
    {showAccount?<Pressable onPress={()=>router.push('/account')} hitSlop={8} style={{marginLeft:'auto',height:36,minWidth:36,paddingHorizontal:10,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.96)',borderWidth:1,borderColor:'#E9E5ED'}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>MY</Text></Pressable>:null}
  </View>;
}
