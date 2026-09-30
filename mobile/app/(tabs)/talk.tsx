import { SafeAreaView,Text,View } from 'react-native';
import FunyHeader from '../../components/FunyHeader';
import { C } from '../../lib/theme';

export default function Talk(){
  return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
    <FunyHeader/>
    <View style={{padding:18}}>
      <Text style={{fontSize:10,fontWeight:'800',letterSpacing:2,color:'#9C92B5'}}>COMMUNITY</Text>
      <Text style={{marginTop:5,fontSize:24,fontWeight:'900',letterSpacing:-.7,color:C.text}}>TALK</Text>
      <View style={{marginTop:18,padding:20,borderRadius:18,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'}}>
        <Text style={{fontSize:17,fontWeight:'900',color:C.text}}>FUNY PIN 커뮤니티</Text>
        <Text style={{marginTop:8,fontSize:13,lineHeight:20,color:C.muted}}>카드 수집가들이 편하게 소식을 나눌 수 있는 공간을 준비하고 있어요.</Text>
      </View>
    </View>
  </SafeAreaView>;
}
