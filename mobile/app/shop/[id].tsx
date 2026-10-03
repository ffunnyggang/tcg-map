import { useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Animated,Dimensions,Easing,Image,Linking,Pressable,ScrollView,Share,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import { AppShop,ShopContent,ShopReview,getActiveFunyMonEvents,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';
import { C,shadow } from '../../lib/theme';
import LivePinButton from '../../components/LivePinButton';
import InAppWebSheet from '../../components/InAppWebSheet';
import { useAppLanguage } from '../../lib/i18n';
import Ionicons from '@expo/vector-icons/Ionicons';

const FEATURE:Record<string,string>={single:'싱글카드',graded:'등급카드',vintage:'빈티지카드',oripa:'오리파',box:'박스제품',pack:'낱개팩',supplies:'카드용품',buy:'카드매입',consignment:'위탁판매',grading:'등급대행',play_space:'플레이스페이스',unmanned:'무인매장',tax_free:'면세'};
const TCG:Record<string,string>={pokemon:'포켓몬',one_piece:'원피스',onepiece:'원피스',dragon_ball:'드래곤볼',dragonball:'드래곤볼',yugioh:'유희왕',lorcana:'로카나',riftbound:'리프트바운드',other:'기타 TCG'};
const SCORE_LABELS:[keyof ShopReview,string][]=[
  ['single_score','싱글카드'],['graded_score','등급카드'],['box_score','박스제품'],['oripa_score','오리파'],
  ['price_score','가격'],['scale_score','규모'],['mood_score','분위기'],['access_score','접근성'],['staff_score','응대']
];
const SW=Dimensions.get('window').width;
type InstaPost={image?:string;thumbnail_url?:string;media_url?:string;permalink?:string};
const webAsset=(x?:string|null)=>!x?'':/^https?:\/\//i.test(x)?x:`https://funypin.kr/${String(x).replace(/^\//,'')}`;

function SectionTitle({icon,title}:{icon:keyof typeof Ionicons.glyphMap;title:string}){
  return <View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><Ionicons name={icon} size={14} color={C.purpleDark}/></View><Text style={styles.sectionTitle}>{title}</Text></View>;
}
function InfoRow({label,value,icon}:{label:string;value?:string|null;icon:keyof typeof Ionicons.glyphMap}){
  if(!value)return null;
  return <View style={styles.infoRow}><View style={styles.infoLead}><View style={styles.infoIcon}><Ionicons name={icon} size={14} color="#8A5BE2"/></View><Text style={styles.infoLabel}>{label}</Text></View><Text style={styles.infoValue}>{value}</Text></View>;
}
function ScoreBar({label,value,progress}:{label:string;value:number|null|undefined;progress:Animated.Value}){
  const v=Math.max(0,Math.min(5,Number(value)||0));
  const width=progress.interpolate({inputRange:[0,1],outputRange:['0%',`${v/5*100}%`]});
  return <View style={styles.barRow}><Text style={styles.barLabel}>{label}</Text><View style={styles.barTrack}><Animated.View style={[styles.barFill,{width}]} /></View><Text style={styles.barValue}>{v? v.toFixed(1):'-'}</Text></View>;
}

export default function ShopDetail(){
  const {id}=useLocalSearchParams<{id:string;from?:string}>();
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const {language}=useAppLanguage();
  const en=language==='en';
  const [shop,setShop]=useState<AppShop|null>(null);
  const [review,setReview]=useState<ShopReview|null>(null);
  const [contents,setContents]=useState<ShopContent[]>([]);
  const [favorite,setFavorite]=useState(false);
  const [favoriteBusy,setFavoriteBusy]=useState(false);
  const [sheetUrl,setSheetUrl]=useState<string|null>(null);
  const [sheetTitle,setSheetTitle]=useState('FUNY PIN');
  const [galleryIndex,setGalleryIndex]=useState(0);
  const [instaPosts,setInstaPosts]=useState<InstaPost[]>([]);
  const [activeEvent,setActiveEvent]=useState<string|null>(null);
  const [reviewThumbs,setReviewThumbs]=useState<Record<string,string>>({});
  const [instaRatios,setInstaRatios]=useState<Record<string,number>>({});
  const [reviewRatios,setReviewRatios]=useState<Record<string,number>>({});
  const [scrolling,setScrolling]=useState(false);
  const galleryRef=useRef<ScrollView>(null);
  const scrollTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const chartProgress=useRef(new Animated.Value(0)).current;
  const fabProgress=useRef(new Animated.Value(0)).current;

  const navBottom=Math.max(insets.bottom,10);
  const tcgMapBottom=navBottom+58+12;

  useEffect(()=>{
    if(!id)return;
    Promise.all([getShop(id),getShopReview(id),getShopContents(id),getFavoriteIds(),getActiveFunyMonEvents()])
      .then(async([s,r,c,f,events])=>{
        setShop(s);setReview(r);setContents(c);setFavorite(f.has(id));
        const event=events.find(x=>x.shop_id===id);setActiveEvent(event?.title||null);
        if(s.instagram_url){
          try{
            const res=await fetch('https://funypin.kr/data/instagram-feed.json?v='+Date.now(),{cache:'no-store'});
            if(res.ok){
              const json=await res.json();
              const posts=(json?.shops?.[id]?.posts||[]).filter((p:any)=>p&&(p.image||p.thumbnail_url||p.media_url)&&p.permalink).slice(0,4);
              setInstaPosts(posts);
            }
          }catch{}
        }
      })
      .catch(e=>Alert.alert('불러오기 실패',String(e.message||e)));
  },[id]);

  useEffect(()=>{
    const picks=contents.filter(x=>/reel|blog/i.test(x.content_type||'')).slice(0,2);
    if(!picks.length)return;
    let cancelled=false;
    Promise.all(picks.map(async item=>{
      if(item.cover_image_url)return [item.content_id,webAsset(item.cover_image_url)] as const;
      try{
        const target=/^https:\/\/blog\.naver\.com\//i.test(item.url||'')?String(item.url).replace('https://blog.naver.com/','https://m.blog.naver.com/'):String(item.url||'');
        const res=await fetch('https://api.microlink.io/?meta=true&url='+encodeURIComponent(target));
        if(!res.ok)return [item.content_id,''] as const;
        const json=await res.json();
        const img=json?.data?.image?.url||json?.data?.image||'';
        return [item.content_id,String(img||'')] as const;
      }catch{return [item.content_id,''] as const}
    })).then(rows=>{if(!cancelled)setReviewThumbs(Object.fromEntries(rows.filter(([,url])=>url)))});
    return()=>{cancelled=true};
  },[contents]);

  useEffect(()=>{
    chartProgress.setValue(0);
    Animated.timing(chartProgress,{toValue:1,duration:680,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  },[review?.review_id,chartProgress]);

  useEffect(()=>{
    Animated.timing(fabProgress,{toValue:scrolling?1:0,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  },[scrolling,fabProgress]);

  useEffect(()=>{
    const next:Record<string,number>={};
    instaPosts.forEach((p,i)=>{
      const key=String(p.permalink||i),uri=webAsset(String(p.image||p.thumbnail_url||p.media_url));
      if(!uri)return;
      Image.getSize(uri,(w,h)=>{next[key]=w>0&&h>0?w/h:1;if(Object.keys(next).length===instaPosts.length)setInstaRatios({...next});},()=>{next[key]=1;if(Object.keys(next).length===instaPosts.length)setInstaRatios({...next});});
    });
  },[instaPosts]);

  useEffect(()=>{
    const entries=Object.entries(reviewThumbs); if(!entries.length)return;
    const next:Record<string,number>={};
    entries.forEach(([key,uri])=>Image.getSize(uri,(w,h)=>{next[key]=w>0&&h>0?w/h:1;if(Object.keys(next).length===entries.length)setReviewRatios({...next});},()=>{next[key]=1;if(Object.keys(next).length===entries.length)setReviewRatios({...next});}));
  },[reviewThumbs]);

  const onDetailScroll=(e:any)=>{
    setScrolling(true);
    if(scrollTimer.current)clearTimeout(scrollTimer.current);
    scrollTimer.current=setTimeout(()=>setScrolling(false),180);
  };

  const onToggleFavorite=async()=>{
    if(!id||favoriteBusy)return;
    setFavoriteBusy(true);
    try{await toggleFavorite(id,!favorite);setFavorite(v=>!v)}
    catch(e:any){if(e?.message==='LOGIN_REQUIRED')Alert.alert('로그인이 필요해요','관심 매장을 저장하려면 MY에서 로그인해주세요.');else Alert.alert('처리 실패',String(e?.message||e));}
    finally{setFavoriteBusy(false)}
  };

  if(!shop)return <SafeAreaView edges={['top']} style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const allImages=[...(shop.images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(a.sort_order-b.sort_order)).filter(x=>x.storage_path||x.source_path);
  const galleryImages=allImages.filter(x=>(x.type||x.image_type)==='gallery');
  const images=galleryImages.length?galleryImages:allImages.filter(x=>(x.type||x.image_type)!=='logo');
  const featureOrder=['single','graded','vintage','oripa','box','pack','supplies','buy','consignment','grading','play_space','unmanned','tax_free'];
  const features=Object.entries(shop.features||{}).filter(([,v])=>v?.value===true).sort(([a],[b])=>featureOrder.indexOf(a)-featureOrder.indexOf(b));
  const tcg=Object.entries(shop.tcg||{}).filter(([,v])=>v?.status===true);
  const mapUrl=shop.country_code==='KR'?(shop.naver_map_url||shop.google_map_url):shop.google_map_url;
  const location=[shop.area,shop.nearest_station?(shop.nearest_station+(shop.walk_minutes!=null?` 도보 ${shop.walk_minutes}분`:'')):null].filter(Boolean).join(' · ');
  const reel=contents.find(c=>/reel/i.test(c.content_type||''));
  const blog=contents.find(c=>/blog/i.test(c.content_type||''));
  const reviewPicks=[reel,blog].filter(Boolean) as ShopContent[];
  const instaColumns:[InstaPost[],InstaPost[]]=[[],[]];
  const instaHeights=[0,0];
  instaPosts.forEach((p,i)=>{const key=String(p.permalink||i),ratio=instaRatios[key]||1;const col=instaHeights[0]<=instaHeights[1]?0:1;instaColumns[col].push(p);instaHeights[col]+=1/ratio;});
  const fabWidth=fabProgress.interpolate({inputRange:[0,1],outputRange:[132,46]});
  const fabLabelOpacity=fabProgress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const radarScale=chartProgress.interpolate({inputRange:[0,1],outputRange:[.15,1]});
  const radarOpacity=chartProgress.interpolate({inputRange:[0,.15,1],outputRange:[0,.35,1]});
  const open=(url?:string|null)=>{if(url)Linking.openURL(url).catch(()=>{})};
  const openContent=(content:ShopContent)=>{if(!content.url)return;setSheetTitle(content.title||'관련 콘텐츠');setSheetUrl(content.url)};
  const share=()=>Share.share({title:shop.name,message:`${shop.name} | FUNY PIN\nhttps://funypin.kr/shops.html#/shop/${shop.id}`}).catch(()=>{});

  return <SafeAreaView edges={['top']} style={styles.root}>
    <Stack.Screen options={{headerShown:false}}/>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} onScroll={onDetailScroll} scrollEventThrottle={16}>
      <View style={styles.hero}>
        {images.length?
          <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e=>setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x/SW))}>
            {images.map(x=><Image key={x.id} source={{uri:shopImageUrl(x.storage_path||x.source_path)}} style={styles.heroImage} resizeMode="cover"/>)}
          </ScrollView>
          :<View style={styles.heroEmpty}><Text style={styles.heroEmptyText}>매장 이미지 준비 중</Text></View>}
        <View style={styles.heroTop}>
          <Pressable onPress={()=>router.back()} style={styles.heroIcon}><Text style={styles.backText}>‹</Text></Pressable>
          <Pressable onPress={share} style={styles.heroIcon}><Text style={styles.shareText}>↗</Text></Pressable>
        </View>
        <View style={styles.heroCount}><Text style={styles.heroCountText}>▧ {images.length?galleryIndex+1:1} / {Math.max(images.length,1)}</Text></View>
      </View>

      <View style={styles.detailContent}>
        <View style={styles.summaryCard}>
          <View style={styles.titleLine}><View style={{flex:1}}><Text style={styles.shopName}>{shop.name}</Text>{shop.name_en?<Text style={styles.shopNameEn}>{shop.name_en}</Text>:null}</View>
            <Pressable onPress={onToggleFavorite} disabled={favoriteBusy} style={[styles.favorite,favorite&&styles.favoriteOn]}><Text style={[styles.favoriteText,favorite&&styles.favoriteTextOn]}>{favorite?'♥':'♡'}</Text></Pressable>
          </View>
          {!!location&&<Text style={styles.location}>⌖ {location}</Text>}
          <View style={styles.tags}>{features.map(([k])=><View key={'f'+k} style={styles.tag}><Text style={styles.tagText}>{FEATURE[k]||k}</Text></View>)}</View>
          {activeEvent?<View style={styles.eventCard}><Text style={styles.eventBadge}>EVENT</Text><Text numberOfLines={2} style={styles.eventText}>{activeEvent}</Text><Text style={styles.eventArrow}>›</Text></View>:null}
          <View style={styles.actionGrid}>
            {shop.naver_map_url?<Pressable onPress={()=>open(shop.naver_map_url)} style={styles.actionMini}><View style={styles.actionMiniIcon}><Ionicons name="map-outline" size={18} color="#8A5BE2"/></View><Text numberOfLines={1} style={styles.actionMiniText}>네이버지도</Text></Pressable>:null}
            {shop.google_map_url?<Pressable onPress={()=>open(shop.google_map_url)} style={styles.actionMini}><View style={styles.actionMiniIcon}><Ionicons name="location-outline" size={18} color="#8A5BE2"/></View><Text numberOfLines={1} style={styles.actionMiniText}>Google Maps</Text></Pressable>:null}
            {shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)} style={styles.actionMini}><View style={styles.actionMiniIcon}><Ionicons name="logo-instagram" size={18} color="#8A5BE2"/></View><Text numberOfLines={1} style={styles.actionMiniText}>Instagram</Text></Pressable>:null}
            {shop.phone?<Pressable onPress={()=>open('tel:'+shop.phone)} style={styles.actionMini}><View style={styles.actionMiniIcon}><Ionicons name="call-outline" size={18} color="#8A5BE2"/></View><Text numberOfLines={1} style={styles.actionMiniText}>전화하기</Text></Pressable>:null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle icon="information-circle-outline" title={en?'Basic information':'기본 정보'}/>
          <View style={styles.infoCard}>
            <InfoRow icon="location-outline" label={en?'Address':'주소'} value={shop.address}/>
            <InfoRow icon="time-outline" label={en?'Hours':'영업시간'} value={shop.hours_display}/>
            <InfoRow icon="calendar-outline" label={en?'Closed':'정기휴무'} value={shop.closed_display}/>
            <InfoRow icon="car-outline" label={en?'Parking':'주차'} value={shop.parking_status}/>
          </View>
        </View>

        {shop.country_code==='JP'&&shop.google_map_url?<View style={styles.section}>
          <SectionTitle icon="logo-google" title={en?'Google store information':'Google 매장 정보'}/>
          <View style={styles.googleCard}>
            <Text style={styles.googleTitle}>{shop.name_en||shop.name}</Text>
            <Text style={styles.googleSub}>{en?'Check ratings, reviews and latest information on Google Maps.':'평점·리뷰·최신 매장 정보는 Google Maps에서 확인할 수 있어요.'}</Text>
            <Pressable onPress={()=>open(shop.google_map_url)} style={styles.googleButton}><Text style={styles.googleButtonText}>Google Maps에서 전체 보기 ›</Text></Pressable>
          </View>
        </View>:null}

        {review?<View style={styles.section}>
          <SectionTitle icon="analytics-outline" title={en?'Store analysis':'한눈에 보는 매장 분석'}/>
          <Text style={styles.note}>※ 깽퐌커플 방문 평점으로 단순 참고용으로 활용해주세요.</Text>
          <View style={styles.analysisCombo}>
            <View style={styles.radarPane}>
              <Text style={[styles.radarLabel,{top:10,left:'35%'}]}>상품구성</Text>
              <Text style={[styles.radarLabel,{top:62,right:2}]}>가격</Text>
              <Text style={[styles.radarLabel,{bottom:8,right:8}]}>매장규모</Text>
              <Text style={[styles.radarLabel,{bottom:8,left:2}]}>매장분위기</Text>
              <Text style={[styles.radarLabel,{top:62,left:2}]}>접근성</Text>
              <View style={styles.radarDiamondOuter}><View style={styles.radarDiamondMid}><View style={styles.radarDiamondInner}/></View></View>
              <View style={[styles.radarAxis,{transform:[{rotate:'0deg'}]}]}/><View style={[styles.radarAxis,{transform:[{rotate:'72deg'}]}]}/><View style={[styles.radarAxis,{transform:[{rotate:'144deg'}]}]}/>
              <Animated.View style={[styles.radarCore,{opacity:radarOpacity,transform:[{rotate:'45deg'},{scale:radarScale}]}]}/>
            </View>
            <View style={styles.compPane}>
              <Text style={styles.subTitle}>상품 구성 상세</Text>
              {tcg.length?<View style={styles.tcgLine}><Text style={styles.tcgLabel}>취급 TCG</Text><Text style={styles.tcgValue}>{tcg.map(([k])=>TCG[k]||k).join(' · ')}</Text></View>:null}
              {SCORE_LABELS.slice(0,4).map(([key,label])=><ScoreBar key={String(key)} label={label} value={review[key] as number|null} progress={chartProgress}/>)}
            </View>
          </View>
          {review.one_line_review?<View style={styles.recommendCard}><Text style={styles.recommendTitle}>한줄 리뷰</Text><Text style={styles.recommendText}>{review.one_line_review}</Text>{review.visit_review?<Text style={styles.visitText}>{review.visit_review}</Text>:null}</View>:null}
        </View>:null}

        {instaPosts.length?<View style={styles.section}>
          <View style={styles.instagramHead}><SectionTitle icon="logo-instagram" title="Instagram"/>{shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)}><Text style={styles.moreText}>전체보기 →</Text></Pressable>:null}</View>
          <Text style={styles.instagramGuide}>ⓘ 카드샵에서 직접 전하는 최신 소식이에요.</Text>
          <View style={styles.instagramGrid}>{instaColumns.map((col,colIndex)=><View key={colIndex} style={styles.instagramColumn}>{col.map((p,i)=>{const key=String(p.permalink||i),ratio=instaRatios[key]||1;return <Pressable key={key} onPress={()=>open(p.permalink)} style={styles.instagramItem}><Image source={{uri:webAsset(String(p.image||p.thumbnail_url||p.media_url))}} style={[styles.instagramImage,{aspectRatio:ratio}]} resizeMode="cover"/></Pressable>})}</View>)}</View>
        </View>:null}

        {reviewPicks.length?<View style={styles.section}>
          <SectionTitle icon="chatbox-ellipses-outline" title="깽퐌커플 리뷰"/>
          <View style={styles.reviewGrid}>{reviewPicks.map(c=><Pressable key={c.content_id} onPress={()=>openContent(c)} style={styles.contentCard}>
            {reviewThumbs[c.content_id]?<Image source={{uri:reviewThumbs[c.content_id]}} style={[styles.contentImage,{aspectRatio:reviewRatios[c.content_id]||1}]} resizeMode="cover"/>:<View style={styles.contentPlaceholder}><Text style={styles.contentPlaceholderText}>{c.platform||'Review'}</Text></View>}
            <View style={styles.contentBody}><Text numberOfLines={2} style={styles.contentTitle}>{c.title}</Text><Text style={styles.contentMeta}>{c.platform||c.content_type}</Text></View>
          </Pressable>)}</View>
        </View>:null}


      </View>
    </ScrollView>

    <View pointerEvents="box-none" style={styles.floatingLayer}>
      <Animated.View style={[styles.mapFabWrap,{bottom:tcgMapBottom,width:fabWidth}]}>
        <Pressable accessibilityRole="button" onPress={()=>router.replace({pathname:'/(tabs)/map',params:{country:shop.country_code}} as any)} style={styles.mapFab}>
          <Ionicons name="navigate-circle-outline" size={18} color="#fff"/>
          <Animated.Text style={[styles.mapFabText,{opacity:fabLabelOpacity}]}>TCG MAP</Animated.Text>
          <Animated.Text style={[styles.mapFabArrow,{opacity:fabLabelOpacity}]}>›</Animated.Text>
        </Pressable>
      </Animated.View>
      {shop.country_code==='KR'?<LivePinButton withNav scrolling={scrolling} bottomOffset={56}/>:null}
    </View>

    <InAppWebSheet visible={!!sheetUrl} url={sheetUrl} title={sheetTitle} onClose={()=>setSheetUrl(null)}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#fff'},loading:{flex:1,justifyContent:'center',backgroundColor:'#fff'},scrollContent:{paddingBottom:120,backgroundColor:'#fff'},
  hero:{height:280,backgroundColor:'#F0EDF5',position:'relative'},heroImage:{width:SW,height:280,backgroundColor:'#EEEAF2'},heroEmpty:{height:280,alignItems:'center',justifyContent:'center',backgroundColor:'#F1EEF5'},heroEmptyText:{fontSize:13,fontWeight:'800',color:C.muted},
  heroTop:{position:'absolute',left:14,right:14,top:14,flexDirection:'row',justifyContent:'space-between'},heroIcon:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.92)',borderWidth:1,borderColor:'rgba(225,220,230,.9)',alignItems:'center',justifyContent:'center',...shadow},backText:{fontSize:29,lineHeight:30,color:C.text},shareText:{fontSize:19,fontWeight:'800',color:C.text},
  heroCount:{position:'absolute',right:14,bottom:12,height:28,paddingHorizontal:10,borderRadius:14,backgroundColor:'rgba(20,18,24,.55)',alignItems:'center',justifyContent:'center'},heroCountText:{fontSize:10.5,fontWeight:'800',color:'#fff'},
  detailContent:{paddingHorizontal:14},summaryCard:{paddingTop:20,paddingBottom:18,borderBottomWidth:8,borderBottomColor:C.divider},titleLine:{flexDirection:'row',alignItems:'center',gap:8},shopName:{fontSize:25,fontWeight:'900',letterSpacing:-.8,color:C.text},shopNameEn:{marginTop:3,fontSize:11.5,color:C.muted},favorite:{width:42,height:42,borderRadius:21,backgroundColor:'#F7F4FC',borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},favoriteOn:{backgroundColor:'#EEE8FA',borderColor:'#D9C9F2'},favoriteText:{fontSize:22,color:'#99909F'},favoriteTextOn:{color:C.purpleDark},location:{marginTop:12,fontSize:12.5,fontWeight:'700',color:C.textSoft},
  tags:{marginTop:12,flexDirection:'row',flexWrap:'wrap',gap:6},tag:{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:'#F3EFF9'},tagText:{fontSize:10.5,fontWeight:'800',color:'#6F5E8D'},
  eventCard:{marginTop:14,minHeight:54,paddingHorizontal:13,borderRadius:15,borderWidth:1,borderColor:'#C47BFF',backgroundColor:'#FFF9FF',flexDirection:'row',alignItems:'center',gap:10},eventBadge:{fontSize:9,fontWeight:'900',color:'#fff',backgroundColor:'#EE7847',paddingHorizontal:8,paddingVertical:5,borderRadius:10},eventText:{flex:1,fontSize:12,fontWeight:'800',color:C.textSoft},eventArrow:{fontSize:22,color:C.muted},
  actionGrid:{marginTop:16,flexDirection:'row',gap:7},actionMini:{flex:1,height:68,borderRadius:13,borderWidth:1,borderColor:'#ECE7F1',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',paddingHorizontal:3},actionMiniIcon:{width:29,height:29,borderRadius:15,backgroundColor:'#F0E8FF',alignItems:'center',justifyContent:'center'},actionMiniText:{marginTop:6,fontSize:8.5,fontWeight:'800',color:C.text},
  section:{paddingVertical:20,borderBottomWidth:8,borderBottomColor:C.divider},sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:8},sectionIcon:{width:25,height:25,borderRadius:8,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'},sectionIconText:{fontSize:12,fontWeight:'900',color:C.purpleDark},sectionTitle:{fontSize:16,fontWeight:'900',color:C.text},
  infoCard:{marginTop:12,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',overflow:'hidden'},infoRow:{minHeight:58,paddingHorizontal:12,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider},infoLead:{width:92,flexDirection:'row',alignItems:'center',gap:8},infoIcon:{width:28,height:28,borderRadius:14,backgroundColor:'#F0E8FF',alignItems:'center',justifyContent:'center'},infoIconText:{fontSize:11,fontWeight:'900',color:'#8A5BE2'},infoLabel:{fontSize:10.5,fontWeight:'700',color:C.muted},infoValue:{flex:1,fontSize:11.5,lineHeight:18,color:C.textSoft},
  googleCard:{marginTop:12,padding:15,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'},googleTitle:{fontSize:14,fontWeight:'900',color:C.text},googleSub:{marginTop:6,fontSize:11,lineHeight:17,color:C.muted},googleButton:{marginTop:12,height:42,borderRadius:11,backgroundColor:'#F5F2F8',alignItems:'center',justifyContent:'center'},googleButtonText:{fontSize:11.5,fontWeight:'800',color:C.purpleDark},
  note:{marginTop:6,fontSize:10.5,lineHeight:16,color:C.muted},analysisCombo:{marginTop:12,minHeight:190,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',overflow:'hidden',flexDirection:'row'},radarPane:{width:'46%',position:'relative',alignItems:'center',justifyContent:'center',borderRightWidth:1,borderRightColor:C.divider},compPane:{flex:1,padding:12},radarLabel:{position:'absolute',fontSize:8.5,fontWeight:'700',color:C.muted,zIndex:3},radarDiamondOuter:{width:86,height:86,borderWidth:1,borderColor:'#E6DDF5',transform:[{rotate:'45deg'}],alignItems:'center',justifyContent:'center'},radarDiamondMid:{width:58,height:58,borderWidth:1,borderColor:'#E6DDF5',alignItems:'center',justifyContent:'center'},radarDiamondInner:{width:29,height:29,borderWidth:1,borderColor:'#E6DDF5'},radarAxis:{position:'absolute',width:1,height:88,backgroundColor:'#E6DDF5',top:51,left:'50%'},radarCore:{position:'absolute',width:50,height:50,backgroundColor:'rgba(138,91,226,.13)',borderWidth:1,borderColor:'rgba(138,91,226,.35')},subTitle:{fontSize:12,fontWeight:'900',color:C.text},tcgLine:{marginTop:11,paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.divider,flexDirection:'row'},tcgLabel:{width:70,fontSize:10.5,fontWeight:'800',color:C.muted},tcgValue:{flex:1,fontSize:11.5,fontWeight:'700',color:C.textSoft},barRow:{marginTop:11,flexDirection:'row',alignItems:'center',gap:8},barLabel:{width:60,fontSize:10.5,fontWeight:'700',color:C.textSoft},barTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#EDE8F4',overflow:'hidden'},barFill:{height:7,borderRadius:4,backgroundColor:C.purple},barValue:{width:25,textAlign:'right',fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  recommendCard:{marginTop:12,padding:14,borderRadius:15,backgroundColor:'#F8F5FC'},recommendTitle:{fontSize:10.5,fontWeight:'900',color:C.purpleDark},recommendText:{marginTop:6,fontSize:13,lineHeight:20,fontWeight:'800',color:C.text},visitText:{marginTop:8,fontSize:11.5,lineHeight:18,color:C.muted},
  instagramHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},moreText:{fontSize:10.5,fontWeight:'800',color:C.purpleDark},instagramGuide:{marginTop:5,fontSize:10.5,color:C.muted},instagramGrid:{marginTop:12,flexDirection:'row',gap:6,alignItems:'flex-start'},instagramColumn:{flex:1,gap:6},instagramItem:{width:'100%',borderRadius:13,overflow:'hidden',backgroundColor:'#eee'},instagramImage:{width:'100%',backgroundColor:'#eee'},
  reviewGrid:{marginTop:12,flexDirection:'row',gap:9},contentCard:{flex:1,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',overflow:'hidden'},contentImage:{width:'100%',backgroundColor:'#eee'},contentPlaceholder:{height:110,alignItems:'center',justifyContent:'center',backgroundColor:'#F2EEF7'},contentPlaceholderText:{fontSize:12,fontWeight:'900',color:C.purpleDark},contentBody:{padding:10},contentTitle:{fontSize:11.5,lineHeight:17,fontWeight:'800',color:C.text},contentMeta:{marginTop:5,fontSize:10,color:C.muted},
  relatedRow:{minHeight:58,flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.divider},relatedTitle:{fontSize:12.5,lineHeight:18,fontWeight:'800',color:C.text},relatedMeta:{marginTop:4,fontSize:10,color:C.muted},relatedArrow:{fontSize:21,color:C.muted,marginLeft:8},
  floatingLayer:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:100000,elevation:100000},mapFabWrap:{position:'absolute',right:16,height:46},mapFab:{height:46,width:'100%',paddingHorizontal:14,borderRadius:23,backgroundColor:'#6E6C74',borderWidth:1,borderColor:'rgba(255,255,255,.35)',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,...shadow},mapFabText:{fontSize:12,fontWeight:'900',color:'#fff'},mapFabArrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff'}
});
