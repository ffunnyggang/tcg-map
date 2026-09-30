import { Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import CmsRenderer from '../../components/CmsRenderer';
import FunyHeader from '../../components/FunyHeader';
import { C,shadow } from '../../lib/theme';

export default function Home(){
  const router=useRouter();
  return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
    <FunyHeader/>
    <ScrollView contentContainerStyle={{paddingBottom:34}} showsVerticalScrollIndicator={false}>
      <View style={{paddingHorizontal:22,paddingTop:28,paddingBottom:26,backgroundColor:'#F7F4FF',borderBottomWidth:1,borderBottomColor:C.line,overflow:'hidden'}}>
        <Text style={{fontSize:10,fontWeight:'800',letterSpacing:2.2,color:'#9C92B5'}}>SHOP · MAP · REVIEW · TALK</Text>
        <Text style={{marginTop:12,fontSize:27,lineHeight:34,fontWeight:'900',letterSpacing:-1.1,color:C.text}}>내 취향의 카드샵을{`\n`}찾아보세요</Text>
        <Text style={{marginTop:9,fontSize:13,lineHeight:20,color:C.muted}}>한국과 일본의 TCG 카드샵 정보부터{`\n`}추천 콘텐츠와 일정까지 한곳에서.</Text>
        <View style={{position:'absolute',right:22,top:48,width:92,height:92,borderRadius:46,borderWidth:14,borderColor:'#EAE3F8',opacity:.8}}/>
        <View style={{position:'absolute',right:51,top:78,width:34,height:34,borderRadius:17,backgroundColor:C.purple,alignItems:'center',justifyContent:'center',...shadow}}><View style={{width:10,height:10,borderRadius:5,backgroundColor:'#fff'}}/></View>
        <Pressable onPress={()=>router.push('/(tabs)/map')} style={{marginTop:22,height:50,borderRadius:15,backgroundColor:C.purple,alignItems:'center',justifyContent:'center',...shadow}}><Text style={{color:'#fff',fontSize:14,fontWeight:'900'}}>TCG MAP에서 카드샵 찾아보기  ›</Text></Pressable>
      </View>
      <View style={{paddingHorizontal:14,paddingTop:16,backgroundColor:'#fff'}}>
        <CmsRenderer placement="home" />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
