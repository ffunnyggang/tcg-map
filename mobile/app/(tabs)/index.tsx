import { useEffect,useRef,useState } from 'react';
import { Dimensions,Image,Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import CmsRenderer from '../../components/CmsRenderer';
import FunyHeader from '../../components/FunyHeader';
import { C } from '../../lib/theme';

const HERO=[
  'https://funypin.kr/assets/banners/banner_hero_01.png',
  'https://funypin.kr/assets/banners/banner_hero_02.png',
  'https://funypin.kr/assets/banners/banner_hero_03.png',
  'https://funypin.kr/assets/banners/banner_hero_04.jpg',
];

function Hero(){
  const width=Dimensions.get('window').width;
  const ref=useRef<ScrollView>(null);
  const [index,setIndex]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setIndex(i=>{const n=(i+1)%HERO.length;ref.current?.scrollTo({x:n*width,animated:true});return n}),5000);return()=>clearInterval(id)},[width]);
  return <View style={{backgroundColor:'#fff'}}>
    <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}>
      {HERO.map((uri,i)=><Image key={uri} source={{uri}} resizeMode="cover" style={{width,aspectRatio:2,backgroundColor:C.divider}}/>) }
    </ScrollView>
    <View style={{position:'absolute',left:0,right:0,bottom:12,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6}}>
      {HERO.map((_,i)=><View key={i} style={{width:i===index?16:6,height:6,borderRadius:999,backgroundColor:i===index?'#fff':'rgba(255,255,255,.58)'}}/>) }
    </View>
  </View>;
}

export default function Home(){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <ScrollView contentContainerStyle={{paddingBottom:118,backgroundColor:'#fff'}} showsVerticalScrollIndicator={false}>
      <Hero/>
      <Pressable onPress={()=>router.push('/(tabs)/map')} style={{height:54,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'}}>
        <Text style={{fontSize:12,fontWeight:'800',color:C.textSoft}}>TCG MAP에서 카드샵 찾아보기 <Text style={{color:C.purpleDark}}>›</Text></Text>
      </Pressable>
      <View style={{height:9,backgroundColor:C.divider}}/>
      <View style={{paddingHorizontal:14,paddingTop:12,backgroundColor:'#fff'}}>
        <CmsRenderer placement="home" />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
