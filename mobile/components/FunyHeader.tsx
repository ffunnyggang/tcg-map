import { Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C,UI } from '../lib/theme';

export default function FunyHeader({showAccount=true}:{showAccount?:boolean}){
  const router=useRouter();
  return <View style={{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#fff'}}>
    <View style={{width:32,height:36,alignItems:'center',justifyContent:'center',marginRight:8}}>
      <View style={{position:'absolute',bottom:1,width:22,height:5,borderRadius:11,backgroundColor:'rgba(117,87,200,.10)'}}/>
      <View style={{position:'absolute',bottom:2,width:13,height:3,borderRadius:7,backgroundColor:'rgba(117,87,200,.16)'}}/>
      <View style={{width:23,height:23,backgroundColor:C.purple,borderTopLeftRadius:12,borderTopRightRadius:12,borderBottomRightRadius:12,borderBottomLeftRadius:4,transform:[{rotate:'-45deg'}],alignItems:'center',justifyContent:'center',marginTop:-5}}>
        <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#fff'}}/>
      </View>
    </View>
    <Text style={{fontSize:24,fontWeight:'900',letterSpacing:-0.6,color:C.text}}>FUNY PIN</Text>
    <Text style={{marginLeft:8,fontSize:11,color:'#85818E'}}>by 깽퐌커플</Text>
    {showAccount?<Pressable onPress={()=>router.push('/account')} hitSlop={8} style={{marginLeft:'auto',height:36,minWidth:36,paddingHorizontal:10,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>MY</Text></Pressable>:null}
  </View>;
}
