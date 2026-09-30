import { Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C,UI } from '../lib/theme';

function FunyPinLogo(){
  return <View style={{width:32,height:36,marginRight:8,alignItems:'center'}}>
    <View style={{position:'absolute',bottom:0.6,width:24,height:5.2,borderRadius:12,backgroundColor:'rgba(117,87,200,.10)'}}/>
    <View style={{position:'absolute',bottom:1.4,width:14.4,height:3.2,borderRadius:8,backgroundColor:'rgba(117,87,200,.16)'}}/>
    <View style={{position:'absolute',top:3,left:5.5,width:21,height:21,borderRadius:10.5,backgroundColor:C.purple}}/>
    <View style={{position:'absolute',top:19,left:9,borderLeftWidth:7,borderRightWidth:7,borderTopWidth:11,borderLeftColor:'transparent',borderRightColor:'transparent',borderTopColor:C.purple}}/>
    <View style={{position:'absolute',top:13,left:6.5,width:19,height:1.2,backgroundColor:'#fff'}}/>
    <View style={{position:'absolute',top:10.7,left:13.8,width:6.4,height:6.4,borderRadius:3.2,backgroundColor:'#fff'}}/>
  </View>;
}

export default function FunyHeader({showAccount=true}:{showAccount?:boolean}){
  const router=useRouter();
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.98)'}}>
    <FunyPinLogo/>
    <Text style={{fontSize:24,fontWeight:'800',letterSpacing:-0.6,color:C.text}}>FUNY PIN</Text>
    <Text style={{marginLeft:8,fontSize:11,color:'#85818E'}}>by 깽퐌커플</Text>
    {showAccount?<Pressable onPress={()=>router.push('/account')} hitSlop={8} style={{marginLeft:'auto',height:36,minWidth:36,paddingHorizontal:10,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.96)',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>MY</Text></Pressable>:null}
  </View>;
}
