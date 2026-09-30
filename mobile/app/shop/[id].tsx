import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Dimensions,Image,Linking,Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import { AppShop,ShopContent,ShopReview,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';
import { C,shadow } from '../../lib/theme';
const FEATURE:Record<string,string>={single:'싱글카드',graded:'등급카드',vintage:'빈티지카드',oripa:'오리파',box:'박스제품',pack:'낱개팩',supplies:'카드용품',buy:'카드매입',consignment:'위탁판매',grading:'등급대행',play_space:'플레이스페이스',unmanned:'무인매장',tax_free:'면세'};
const TCG:Record<string,string>={pokemon:'포켓몬',onepiece:'원피스',dragonball:'드래곤볼',yugioh:'유희왕',lorcana:'로카나',riftbound:'리프트바운드',other:'기타 TCG'};
const score=(r:ShopReview|null)=>{if(!r)return null;const a=[r.product_score,r.single_score,r.graded_score,r.box_score,r.oripa_score,r.price_score,r.scale_score,r.mood_score,r.access_score,r.staff_score].map(Number).filter(Number.isFinite);return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):null};
const SW=Dimensions.get('window').width;
export default function ShopDetail(){
  const {id}=useLocalSearchParams<{id:string}>(),router=useRouter(),[shop,setShop]=useState<AppShop|null>(null),[review,setReview]=useState<ShopReview|null>(null),[contents,setContents]=useState<ShopContent[]>([]),[fav,setFav]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!id)return;Promise.all([getShop(id),getFavoriteIds(),getShopReview(id),getShopContents(id)]).then(([s,f,r,c])=>{setShop(s);setFav(f.has(id));setReview(r);setContents(c)}).catch(e=>Alert.alert('불러오기 실패',String(e.message||e)))},[id]);
  if(!shop)return <SafeAreaView style={{flex:1,justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.purple}/></SafeAreaView>;
  const images=[...(shop.images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(a.sort_order-b.sort_order)),features=Object.entries(shop.features||{}).filter(([,v])=>v?.value===true),tcg=Object.entries(shop.tcg||{}).filter(([,v])=>v?.status===true),avg=score(review),open=(url?:string|null)=>url&&Linking.openURL(url);
  const chip=(label:string)=><View key={label} style={{paddingHorizontal:11,paddingVertical:7,borderRadius:18,backgroundColor:C.purpleSoft,borderWidth:1,borderColor:C.line}}><Text style={{fontSize:12,fontWeight:'700',color:C.purpleDark}}>{label}</Text></View>;
  return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}><Stack.Screen options={{headerShown:false}}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:34}}>
    <View style={{height:58,paddingHorizontal:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#F7F3FF',borderBottomWidth:1,borderBottomColor:C.line}}>
      <Pressable onPress={()=>router.back()} style={{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:28,lineHeight:30,color:C.text}}>‹</Text></Pressable>
      <Text style={{fontSize:16,fontWeight:'900',color:C.text}}>CARD SHOP</Text>
      <Pressable disabled={busy} onPress={async()=>{setBusy(true);try{await toggleFavorite(shop.id,!fav);setFav(!fav)}catch(e:any){Alert.alert(e?.message==='LOGIN_REQUIRED'?'로그인이 필요해요':'처리 실패',e?.message==='LOGIN_REQUIRED'?'즐겨찾기는 로그인 후 사용할 수 있어요.':String(e?.message||e))}finally{setBusy(false)}}} style={{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:22,color:fav?C.purpleDark:'#8D8792'}}>{fav?'★':'☆'}</Text></Pressable>
    </View>
    {images.length?<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{images.map(x=><Image key={x.id} source={{uri:shopImageUrl(x.storage_path||x.source_path)}} style={{width:SW,height:260,backgroundColor:'#EEEAF4'}} resizeMode="cover"/>)}</ScrollView>:<View style={{height:160,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.muted,fontWeight:'700'}}>FUNY PIN CARD SHOP</Text></View>}
    <View style={{padding:18}}>
      <Text style={{fontSize:10,fontWeight:'800',letterSpacing:1.8,color:'#9C92B5'}}>SHOP DETAIL</Text>
      <Text style={{fontSize:27,fontWeight:'900',marginTop:6,letterSpacing:-.9,color:C.text}}>{shop.name}</Text>
      {shop.name_en?<Text style={{marginTop:3,color:C.muted,fontSize:12}}>{shop.name_en}</Text>:null}
      <Text style={{marginTop:13,lineHeight:21,color:'#514C55'}}>{shop.address}</Text>
      {shop.nearest_station?<Text style={{marginTop:5,color:C.muted,fontSize:12}}>{shop.nearest_station}{shop.walk_minutes!=null?` · 도보 ${shop.walk_minutes}분`:''}</Text>:null}
      <View style={{marginTop:18,padding:16,borderRadius:17,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,...shadow}}>
        {shop.hours_display?<Text style={{fontSize:13,color:C.text}}>영업시간 · {shop.hours_display}</Text>:null}
        {shop.closed_display?<Text style={{marginTop:8,fontSize:13,color:C.text}}>휴무 · {shop.closed_display}</Text>:null}
        {shop.parking_status?<Text style={{marginTop:8,fontSize:13,color:C.text}}>주차 · {shop.parking_status}</Text>:null}
        {shop.phone?<Pressable onPress={()=>open(`tel:${shop.phone}`)}><Text style={{marginTop:8,fontSize:13,color:C.purpleDark}}>전화 · {shop.phone}</Text></Pressable>:null}
      </View>
      {tcg.length?<View style={{marginTop:24}}><Text style={{fontSize:17,fontWeight:'900',color:C.text}}>취급 TCG</Text><View style={{marginTop:10,flexDirection:'row',flexWrap:'wrap',gap:7}}>{tcg.map(([k])=>chip(TCG[k]||k))}</View></View>:null}
      {features.length?<View style={{marginTop:24}}><Text style={{fontSize:17,fontWeight:'900',color:C.text}}>취급 상품 · 서비스</Text><View style={{marginTop:10,flexDirection:'row',flexWrap:'wrap',gap:7}}>{features.map(([k])=>chip(FEATURE[k]||k))}</View></View>:null}
      {review&&(review.one_line_review||avg)?<View style={{marginTop:24,padding:18,borderWidth:1,borderColor:C.line,borderRadius:18,backgroundColor:'#fff',...shadow}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:17,fontWeight:'900',color:C.text}}>깽퐌커플 리뷰</Text>{avg?<Text style={{fontWeight:'900',color:C.purpleDark}}>★ {avg}</Text>:null}</View>{review.one_line_review?<Text style={{marginTop:11,lineHeight:21,fontWeight:'700',color:C.text}}>{review.one_line_review}</Text>:null}{review.visit_review?<Text style={{marginTop:8,lineHeight:21,color:C.muted}}>{review.visit_review}</Text>:null}</View>:null}
      {contents.length?<View style={{marginTop:24}}><Text style={{fontSize:17,fontWeight:'900',color:C.text}}>관련 콘텐츠</Text>{contents.map(c=><Pressable key={c.content_id} onPress={()=>open(c.url)} style={{marginTop:9,padding:14,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:'#fff'}}><Text style={{fontWeight:'800',color:C.text}}>{c.title}</Text><Text style={{marginTop:4,fontSize:11,color:C.muted}}>{[c.platform,c.content_type,c.published_at].filter(Boolean).join(' · ')}</Text></Pressable>)}</View>:null}
      <View style={{marginTop:24,gap:9}}>
        {shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)} style={{height:50,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:'#fff',justifyContent:'center',paddingHorizontal:15}}><Text style={{fontWeight:'800',color:C.text}}>Instagram 보기 <Text style={{color:C.purpleDark}}>›</Text></Text></Pressable>:null}
        {shop.website_url?<Pressable onPress={()=>open(shop.website_url)} style={{height:50,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:'#fff',justifyContent:'center',paddingHorizontal:15}}><Text style={{fontWeight:'800',color:C.text}}>웹사이트 보기 <Text style={{color:C.purpleDark}}>›</Text></Text></Pressable>:null}
        <Pressable onPress={()=>open(shop.country_code==='KR'?(shop.naver_map_url||shop.google_map_url):shop.google_map_url)} style={{height:52,borderRadius:14,backgroundColor:C.purple,justifyContent:'center',paddingHorizontal:15,...shadow}}><Text style={{fontWeight:'900',color:'#fff',textAlign:'center'}}>지도에서 길찾기  ›</Text></Pressable>
      </View>
    </View>
  </ScrollView></SafeAreaView>;
}
