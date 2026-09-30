import { Pressable,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../lib/theme';

export default function FunyHeader({showAccount=true}:{showAccount?:boolean}){
  const router=useRouter();
  return <View style={{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:'#F7F3FF'}}>
    <View style={{width:31,height:34,alignItems:'center',justifyContent:'center',marginRight:8}}>
      <View style={{width:24,height:24,backgroundColor:C.purple,borderTopLeftRadius:12,borderTopRightRadius:12,borderBottomRightRadius:12,borderBottomLeftRadius:4,transform:[{rotate:'-45deg'}],alignItems:'center',justifyContent:'center'}}>
        <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#fff'}}/>
      </View>
    </View>
    <Text style={{fontSize:23,fontWeight:'900',letterSpacing:-0.5,color:C.text}}>FUNY PIN</Text>
    <Text style={{marginLeft:7,fontSize:10.5,color:C.muted}}>by 깽퐌커플</Text>
    {showAccount?<Pressable onPress={()=>router.push('/account')} style={{marginLeft:'auto',height:34,minWidth:34,paddingHorizontal:10,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:12,fontWeight:'800',color:C.purpleDark}}>MY</Text></Pressable>:null}
  </View>;
}
