import { Linking,Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FunyHeader from '../../components/FunyHeader';
import { C } from '../../lib/theme';

const categories=['✨ 전체','🔥 인기','💬 자유 게시판','🃏 카드 자랑','📍 카드샵 후기','💡 정보 공유','🤝 카드거래'];

export default function Talk(){
  const open=(url:string)=>Linking.openURL(url);
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <ScrollView contentContainerStyle={{paddingBottom:118,backgroundColor:'#fff'}} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:14,paddingTop:14,paddingBottom:10,gap:8}}>
        {categories.map((x,i)=><View key={x} style={{paddingHorizontal:14,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:i===0?'#272331':'#E5E1EB',backgroundColor:i===0?'#272331':'#fff'}}><Text style={{fontSize:12,fontWeight:'700',color:i===0?'#fff':'#716B79'}}>{x}</Text></View>)}
      </ScrollView>
      <View style={{paddingHorizontal:14}}>
        <View style={{paddingVertical:18,borderTopWidth:1,borderBottomWidth:1,borderColor:C.line}}>
          <Text style={{fontSize:16,fontWeight:'900',color:C.text}}>FUNY TALK</Text>
          <Text style={{marginTop:7,fontSize:12.5,lineHeight:19,color:C.muted}}>자체 커뮤니티 전환 전까지 웹 FUNY TALK와 POKAMO를 함께 운영합니다.</Text>
          <Pressable onPress={()=>open('https://funypin.kr/talk.html')} style={{marginTop:15,height:46,borderRadius:12,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12.5,fontWeight:'900',color:'#fff'}}>FUNY TALK 열기 ›</Text></Pressable>
        </View>
      </View>
      <View style={{height:9,marginTop:10,backgroundColor:C.divider}}/>
      <View style={{padding:14}}>
        <Text style={{fontSize:14,fontWeight:'900',color:C.text}}>POKAMO 병행 운영</Text>
        <Text style={{marginTop:7,fontSize:12,lineHeight:18,color:C.muted}}>FUNY PIN 자체 커뮤니티가 활성화될 때까지 POKAMO 글쓰기도 계속 제공해요.</Text>
        <Pressable onPress={()=>open('https://cafe.daangn.com/pokamo-pokesm-1')} style={{marginTop:13,height:46,borderRadius:23,backgroundColor:C.orange,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12.5,fontWeight:'900',color:'#fff'}}>+ POKAMO에 글쓰기</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
