import { useEffect,useRef,useState } from 'react';
import { Dimensions,Image,Linking,Pressable,ScrollView,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import CmsRenderer from '../../components/CmsRenderer';
import FunyHeader from '../../components/FunyHeader';
import { C } from '../../lib/theme';

const HERO=[
  {image:'https://funypin.kr/assets/banners/banner_hero_01.png',target:'map'},
  {image:'https://funypin.kr/assets/banners/banner_hero_02.png',target:'pick'},
  {image:'https://funypin.kr/assets/banners/banner_hero_03.png',target:'talk'},
  {image:'https://funypin.kr/assets/banners/banner_hero_04.jpg',url:'https://funypin.kr/shop-request.html'},
] as const;

function Hero(){
  const router=useRouter();
  const width=Dimensions.get('window').width;
  const height=width/2;
  const ref=useRef<ScrollView>(null);
  const [index,setIndex]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setIndex(i=>{const n=(i+1)%HERO.length;ref.current?.scrollTo({x:n*width,animated:true});return n}),4500);return()=>clearInterval(id)},[width]);
  const open=(item:(typeof HERO)[number])=>{
    if('url' in item&&item.url)return Linking.openURL(item.url);
    if('target' in item){
      if(item.target==='map')router.push('/(tabs)/map');
      else if(item.target==='pick')router.push('/(tabs)/pick');
      else router.push('/(tabs)/talk');
    }
  };
  return <View style={{width,height,backgroundColor:'#fff',overflow:'hidden'}}>
    <ScrollView ref={ref} horizontal pagingEnabled snapToInterval={width} decelerationRate="fast" showsHorizontalScrollIndicator={false} style={{width,height}} onMomentumScrollEnd={e=>setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}>
      {HERO.map(item=><Pressable key={item.image} onPress={()=>open(item)} style={{width,height}}><Image source={{uri:item.image}} resizeMode="cover" style={{width,height,backgroundColor:C.divider}}/></Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={{position:'absolute',left:0,right:0,bottom:12,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6}}>
      {HERO.map((_,i)=><View key={i} style={{width:i===index?16:6,height:6,borderRadius:999,backgroundColor:i===index?'#fff':'rgba(255,255,255,.58)'}}/>)}
    </View>
  </View>;
}

export default function Home(){
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <ScrollView contentContainerStyle={{paddingBottom:112,backgroundColor:'#fff'}} showsVerticalScrollIndicator={false}>
      <Hero/>
      <View style={{paddingHorizontal:16,paddingTop:12,backgroundColor:'#fff'}}>
        <CmsRenderer placement="home" />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
