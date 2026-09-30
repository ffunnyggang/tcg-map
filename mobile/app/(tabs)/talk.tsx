import { Linking,Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import FunyHeader from '../../components/FunyHeader';
import { C,shadow } from '../../lib/theme';

const categories=['✨ 전체','🔥 인기','💬 자유 게시판','🃏 카드 자랑','📍 카드샵 후기','💡 정보 공유','🤝 카드거래'];

export default function Talk(){
  const open=(url:string)=>Linking.openURL(url);
  return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
    <FunyHeader/>
    <ScrollView contentContainerStyle={{paddingBottom:120}}>
      <View style={{paddingHorizontal:18,paddingTop:18}}>
        <Text style={{fontSize:10,fontWeight:'800',letterSpacing:2,color:'#9C92B5'}}>COMMUNITY</Text>
        <Text style={{marginTop:5,fontSize:24,fontWeight:'900',letterSpacing:-.7,color:C.text}}>TALK</Text>
        <Text style={{marginTop:10,fontSize:13,lineHeight:20,color:C.muted}}>TCG 정보부터 카드 자랑, 카드샵 후기까지 자유롭게 이야기를 나눠보세요.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,marginTop:14}} contentContainerStyle={{paddingHorizontal:18,gap:8}}>
        {categories.map((x,i)=><View key={x} style={{paddingHorizontal:13,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:i===0?'#272331':C.line,backgroundColor:i===0?'#272331':'#fff'}}><Text style={{fontSize:12,fontWeight:'700',color:i===0?'#fff':'#716B79'}}>{x}</Text></View>)}
      </ScrollView>
      <View style={{margin:18,padding:20,borderRadius:18,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',...shadow}}>
        <Text style={{fontSize:18,fontWeight:'900',color:C.text}}>FUNY TALK 최신 글</Text>
        <Text style={{marginTop:8,fontSize:13,lineHeight:20,color:C.muted}}>웹에서 운영 중인 FUNY TALK의 최신 이야기와 카테고리별 글을 확인할 수 있어요.</Text>
        <Pressable onPress={()=>open('https://funypin.kr/talk.html')} style={{marginTop:18,paddingVertical:14,borderRadius:14,backgroundColor:C.purple}}><Text style={{textAlign:'center',fontWeight:'900',color:'#fff'}}>FUNY TALK 열기 ›</Text></Pressable>
        <Pressable onPress={()=>open('https://cafe.daangn.com/pokamo-pokesm-1')} style={{marginTop:9,paddingVertical:14,borderRadius:14,backgroundColor:'#F47A22'}}><Text style={{textAlign:'center',fontWeight:'900',color:'#fff'}}>+ POKAMO에 글쓰기</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
