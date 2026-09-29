import { Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import CmsRenderer from '../../components/CmsRenderer';

export default function Home(){
  const router=useRouter();
  return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
    <ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>
      <Text style={{fontSize:28,fontWeight:'800'}}>FUNY PIN</Text>
      <Text style={{marginTop:6,fontSize:16}}>내 취향의 카드샵을 찾아보세요</Text>
      <Pressable onPress={()=>router.push('/account')} style={{marginTop:20,marginBottom:28,padding:14,borderWidth:1,borderColor:'#ddd',borderRadius:12}}><Text>MY FUNY PIN · 로그인 / 계정</Text></Pressable>
      <CmsRenderer placement="home" />
    </ScrollView>
  </SafeAreaView>;
}
