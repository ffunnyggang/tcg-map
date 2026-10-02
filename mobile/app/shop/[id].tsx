import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Dimensions,Image,Linking,Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import { AppShop,ShopContent,ShopReview,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';
import { C,shadow } from '../../lib/theme';
import LivePinButton from '../../components/LivePinButton';
import InAppWebSheet from '../../components/InAppWebSheet';
const FEATURE:Record<string,string>={single:'싱글카드',graded:'등급카드',vintage:'빈티지카드',oripa:'오리파',box:'박스제품',pack:'낱개팩',supplies:'카드용품',buy:'카드매입',consignment:'위탁판매',grading:'등급대행',play_space:'플레이스페이스',unmanned:'무인매장',tax_free:'면세'};
const TCG:Record<string,string>={pokemon:'포켓몬',onepiece:'원피스',dragonball:'드래곤볼',yugioh:'유희왕',lorcana:'로카나',riftbound:'리프트바운드',other:'기타 TCG'};
const score=(r:ShopReview|null)=>{if(!r)return null;const a=[r.product_score,r.single_score,r.graded_score,r.box_score,r.oripa_score,r.price_score,r.scale_score,r.mood_score,r.access_score,r.staff_score].map(Number).filter(Number.isFinite);return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):null};
const SW=Dimensions.get('window').width;
const Divider=()=> <View style={{height:9,backgroundColor:C.divider,marginHorizontal:-14}}/>;
export default function ShopDetail(){
  const {id}=useLocalSearchParams<{id:string}>(),[shop,setShop]=useState<AppShop|null>(null),[review,setReview]=useState<ShopReview|null>(null),[contents,setContents]=useState<ShopContent[]>([]),[favorite,setFavorite]=useState(false),[favoriteBusy,setFavoriteBusy]=useState(false),[sheetUrl,setSheetUrl]=useState<string|null>(null),[sheetTitle,setSheetTitle]=useState('FUNY PIN');
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const navBottom=Math.max(insets.bottom,10);
  const tcgMapBottom=navBottom+58+12;
  useEffect(()=>{if(!id)return;Promise.all([getShop(id),getShopReview(id),getShopContents(id),getFavoriteIds()]).then(([s,r,c,f])=>{setShop(s);setReview(r);setContents(c);setFavorite(f.has(id))}).catch(e=>Alert.alert('불러오기 실패',String(e.message||e)))},[id]);
  const onToggleFavorite=async()=>{if(!id||favoriteBusy)return;setFavoriteBusy(true);try{await toggleFavorite(id,!favorite);setFavorite(v=>!v)}catch(e:any){if(e?.message==='LOGIN_REQUIRED')Alert.alert('로그인이 필요해요','관심 매장을 저장하려면 MY에서 로그인해주세요.');else Alert.alert('처리 실패',String(e?.message||e));}finally{setFavoriteBusy(false)}};
  if(!shop)return <SafeAreaView edges={['top']} style={{flex:1,justifyContent:'center',backgroundColor:'#fff'}}><ActivityIndicator color={C.purple}/></SafeAreaView>;
  const images=[...(shop.images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(a.sort_order-b.sort_order)),features=Object.entries(shop.features||{}).filter(([,v])=>v?.value===true),tcg=Object.entries(shop.tcg||{}).filter(([,v])=>v?.status===true),avg=score(review),open=(url?:string|null)=>url&&Linking.openURL(url);
  const openContent=(content:ShopContent)=>{if(!content.url)return;setSheetTitle(content.title||'관련 콘텐츠');setSheetUrl(content.url)};
  const chip=(label:string)=><View key={label} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:'#F3EFF9'}}><Text style={{fontSize:11,fontWeight:'700',color:'#6F5E8D'}}>{label}</Text></View>;
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}><Stack.Screen options={{headerShown:false}}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:42,backgroundColor:'#fff'}}>
    {images.length?<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{images.map(x=><Image key={x.id} source={{uri:shopImageUrl(x.storage_path||x.source_path)}} style={{width:SW,height:270,backgroundColor:C.divider}} resizeMode="cover"/>)}</ScrollView>:<View style={{height:180,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.purpleDark,fontWeight:'800'}}>FUNY PIN CARD SHOP</Text></View>}
    <View style={{paddingHorizontal:14,paddingTop:18}}>
      <View style={{flexDirection:'row',alignItems:'center'}}><Text numberOfLines={1} style={{flex:1,fontSize:25,fontWeight:'900',letterSpacing:-.8,color:C.text}}>{shop.name}</Text><Pressable onPress={onToggleFavorite} disabled={favoriteBusy} hitSlop={8} style={{width:42,height:42,borderRadius:21,backgroundColor:favorite?'#EEE8FA':'#F7F4FC',borderWidth:1,borderColor:favorite?'#D9C9F2':C.line,alignItems:'center',justifyContent:'center',opacity:favoriteBusy?.55:1}}><Text style={{fontSize:22,color:favorite?C.purpleDark:'#9A92A0'}}>{favorite?'♥':'♡'}</Text></Pressable></View>
      {shop.name_en?<Text style={{marginTop:3,color:C.muted,fontSize:12}}>{shop.name_en}</Text>:null}
      <Text style={{marginTop:12,lineHeight:20,color:C.textSoft}}>{shop.address}</Text>
      {shop.nearest_station?<Text style={{marginTop:5,color:C.muted,fontSize:11.5}}>{shop.nearest_station}{shop.walk_minutes!=null?`에서 도보 ${shop.walk_minutes}분`:''}</Text>:null}
      <View style={{marginTop:16,borderTopWidth:1,borderBottomWidth:1,borderColor:C.line,paddingVertical:12}}>
        {shop.hours_display?<Text style={{fontSize:12.5,color:C.textSoft}}>영업시간 · {shop.hours_display}</Text>:null}
        {shop.closed_display?<Text style={{marginTop:7,fontSize:12.5,color:C.textSoft}}>휴무 · {shop.closed_display}</Text>:null}
        {shop.parking_status?<Text style={{marginTop:7,fontSize:12.5,color:C.textSoft}}>주차 · {shop.parking_status}</Text>:null}
        {shop.phone?<Pressable onPress={()=>open(`tel:${shop.phone}`)}><Text style={{marginTop:7,fontSize:12.5,color:C.purpleDark}}>전화 · {shop.phone}</Text></Pressable>:null}
      </View>
      <View style={{marginTop:18,gap:8}}>
        <Pressable onPress={()=>open(shop.country_code==='KR'?(shop.naver_map_url||shop.google_map_url):shop.google_map_url)} style={{height:48,borderRadius:12,backgroundColor:C.purple,justifyContent:'center',alignItems:'center',...shadow}}><Text style={{fontWeight:'900',fontSize:13,color:'#fff'}}>지도에서 길찾기 ›</Text></Pressable>
        <View style={{flexDirection:'row',gap:8}}>{shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)} style={{flex:1,height:44,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}><Text style={{fontWeight:'800',fontSize:12,color:C.text}}>Instagram</Text></Pressable>:null}{shop.website_url?<Pressable onPress={()=>open(shop.website_url)} style={{flex:1,height:44,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}><Text style={{fontWeight:'800',fontSize:12,color:C.text}}>Website</Text></Pressable>:null}</View>
      </View>
      {tcg.length?<><View style={{marginTop:22}}><Text style={{fontSize:16,fontWeight:'900',color:C.text}}>취급 TCG</Text><View style={{marginTop:10,flexDirection:'row',flexWrap:'wrap',gap:7}}>{tcg.map(([k])=>chip(TCG[k]||k))}</View></View></>:null}
      {features.length?<View style={{marginTop:22}}><Text style={{fontSize:16,fontWeight:'900',color:C.text}}>취급 상품 · 서비스</Text><View style={{marginTop:10,flexDirection:'row',flexWrap:'wrap',gap:7}}>{features.map(([k])=>chip(FEATURE[k]||k))}</View></View>:null}
      <View style={{marginTop:24}}><Divider/></View>
      {review&&(review.one_line_review||avg)?<View style={{paddingVertical:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:16,fontWeight:'900',color:C.text}}>깽퐌커플 리뷰</Text>{avg?<Text style={{fontWeight:'900',fontSize:12,color:C.purpleDark}}>★ {avg}</Text>:null}</View>{review.one_line_review?<Text style={{marginTop:11,lineHeight:20,fontWeight:'800',color:C.text}}>{review.one_line_review}</Text>:null}{review.visit_review?<Text style={{marginTop:8,lineHeight:20,fontSize:12.5,color:C.muted}}>{review.visit_review}</Text>:null}</View>:null}
      {contents.length?<><Divider/><View style={{paddingVertical:20}}><Text style={{fontSize:16,fontWeight:'900',color:C.text}}>관련 콘텐츠</Text>{contents.map(c=><Pressable key={c.content_id} onPress={()=>openContent(c)} style={{paddingVertical:13,borderBottomWidth:1,borderBottomColor:C.line}}><Text style={{fontWeight:'800',fontSize:13,color:C.text}}>{c.title}</Text><Text style={{marginTop:4,fontSize:10.5,color:C.muted}}>{[c.platform,c.content_type,c.published_at].filter(Boolean).join(' · ')}</Text></Pressable>)}</View></>:null}
    </View>
  </ScrollView>
  <View pointerEvents="box-none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:100000,elevation:100000}}>
    <Pressable accessibilityRole="button" accessibilityLabel="TCG MAP으로 이동" onPress={()=>router.replace({pathname:'/(tabs)/map',params:{country:shop.country_code}} as any)} style={{position:'absolute',right:16,bottom:tcgMapBottom,height:46,paddingHorizontal:18,borderRadius:23,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#6E6C74',borderWidth:1,borderColor:'rgba(255,255,255,.35)',shadowColor:'#201C2A',shadowOpacity:.22,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:8}}>
      <Text style={{fontSize:15,color:'#fff'}}>⌾</Text><Text style={{fontSize:12,fontWeight:'900',color:'#fff'}}>TCG MAP</Text><Text style={{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff'}}>›</Text>
    </Pressable>
    <LivePinButton withNav bottomOffset={46+10}/>
  </View>
  <InAppWebSheet visible={!!sheetUrl} url={sheetUrl} title={sheetTitle} onClose={()=>setSheetUrl(null)}/>
  </SafeAreaView>;
}
