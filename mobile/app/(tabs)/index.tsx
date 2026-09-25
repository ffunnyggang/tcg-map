import { Pressable,SafeAreaView,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
export default function Home(){const router=useRouter();return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{padding:20}}><Text style={{fontSize:28,fontWeight:'800'}}>FUNY PIN</Text><Text style={{marginTop:6,fontSize:16}}>내 취향의 카드샵을 찾아보세요</Text><Pressable onPress={()=>router.push("/account")} style={{marginTop:28,padding:14,borderWidth:1,borderColor:"#ddd",borderRadius:12}}><Text>MY FUNY PIN · 로그인 / 계정</Text></Pressable></View></SafeAreaView>}
