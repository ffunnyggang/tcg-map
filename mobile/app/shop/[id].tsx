import { useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Dimensions,Image,Linking,Pressable,ScrollView,Share,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack,useLocalSearchParams,useRouter } from 'expo-router';
import { AppShop,ShopContent,ShopReview,getActiveFunyMonEvents,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';
import { C,shadow } from '../../lib/theme';
import LivePinButton from '../../components/LivePinButton';
import InAppWebSheet from '../../components/InAppWebSheet';
import { useAppLanguage } from '../../lib/i18n';

const FEATURE:Record<string,string>={single:'싱글카드',graded:'등급카드',vintage:'빈티지카드',oripa:'오리파',box:'박스제품',pack:'낱개팩',supplies:'카드용품',buy:'카드매입',consignment:'위탁판매',grading:'등급대행',play_space:'플레이스페이스',unmanned:'무인매장',tax_free:'면세'};
const TCG:Record<string,string>={pokemon:'포켓몬',one_piece:'원피스',onepiece:'원피스',dragon_ball:'드래곤볼',dragonball:'드래곤볼',yugioh:'유희왕',lorcana:'로카나',riftbound:'리프트바운드',other:'기타 TCG'};
const SCORE_LABELS:[keyof ShopReview,string][]=[
  ['single_score','싱글카드'],['graded_score','등급카드'],['box_score','박스제품'],['oripa_score','오리파'],
  ['price_score','가격'],['scale_score','규모'],['mood_score','분위기'],['access_score','접근성'],['staff_score','응대']
];
const SW=Dimensions.get('window').width;
type InstaPost={image?:string;thumbnail_url?:string;media_url?:string;permalink?:string};

function SectionTitle({icon,title}:{icon:string;title:string}){
  return <View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><Text style={styles.sectionIconText}>{icon}</Text></View><Text style={styles.sectionTitle}>{title}</Text></View>;
}
function InfoRow({label,value}:{label:string;value?:string|null}){
  if(!value)return null;
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}
function ScoreBar({label,value}:{label:string;value:number|null|undefined}){
  const v=Math.max(0,Math.min(5,Number(value)||0));
  return <View style={styles.barRow}><Text style={styles.barLabel}>{label}</Text><View style={styles.barTrack}><View style={[styles.barFill,{width:`${v/5*100}%`}]} /></View><Text style={styles.barValue}>{v? v.toFixed(1):'-'}</Text></View>;
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
  const galleryRef=useRef<ScrollView>(null);

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

  const onToggleFavorite=async()=>{
    if(!id||favoriteBusy)return;
    setFavoriteBusy(true);
    try{await toggleFavorite(id,!favorite);setFavorite(v=>!v)}
    catch(e:any){if(e?.message==='LOGIN_REQUIRED')Alert.alert('로그인이 필요해요','관심 매장을 저장하려면 MY에서 로그인해주세요.');else Alert.alert('처리 실패',String(e?.message||e));}
    finally{setFavoriteBusy(false)}
  };

  if(!shop)return <SafeAreaView edges={['top']} style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const images=[...(shop.images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(a.sort_order-b.sort_order)).filter(x=>x.storage_path||x.source_path);
  const features=Object.entries(shop.features||{}).filter(([,v])=>v?.value===true);
  const tcg=Object.entries(shop.tcg||{}).filter(([,v])=>v?.status===true);
  const mapUrl=shop.country_code==='KR'?(shop.naver_map_url||shop.google_map_url):shop.google_map_url;
  const location=[shop.area,shop.nearest_station?(shop.nearest_station+(shop.walk_minutes!=null?` 도보 ${shop.walk_minutes}분`:'')):null].filter(Boolean).join(' · ');
  const reviewPicks=useMemo(()=>{
    const reel=contents.find(c=>/reel/i.test(c.content_type||''));
    const blog=contents.find(c=>/blog/i.test(c.content_type||''));
    return [reel,blog].filter(Boolean) as ShopContent[];
  },[contents]);
  const related=contents.filter(c=>!reviewPicks.some(x=>x.content_id===c.content_id));
  const open=(url?:string|null)=>{if(url)Linking.openURL(url).catch(()=>{})};
  const openContent=(content:ShopContent)=>{if(!content.url)return;setSheetTitle(content.title||'관련 콘텐츠');setSheetUrl(content.url)};
  const share=()=>Share.share({title:shop.name,message:`${shop.name} | FUNY PIN\nhttps://funypin.kr/shops.html#/shop/${shop.id}`}).catch(()=>{});

  return <SafeAreaView edges={['top']} style={styles.root}>
    <Stack.Screen options={{headerShown:false}}/>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.tags}>{tcg.map(([k])=><View key={'t'+k} style={styles.tag}><Text style={styles.tagText}>{TCG[k]||k}</Text></View>)}{features.map(([k])=><View key={'f'+k} style={styles.tag}><Text style={styles.tagText}>{FEATURE[k]||k}</Text></View>)}</View>
          {activeEvent?<View style={styles.eventCard}><Text style={styles.eventBadge}>EVENT</Text><Text numberOfLines={2} style={styles.eventText}>{activeEvent}</Text><Text style={styles.eventArrow}>›</Text></View>:null}
          <View style={styles.actionGrid}>
            <Pressable onPress={()=>open(mapUrl)} style={[styles.actionButton,styles.actionPrimary]}><Text style={styles.actionPrimaryText}>⌖ {en?'Directions':'길찾기'}</Text></Pressable>
            {shop.phone?<Pressable onPress={()=>open('tel:'+shop.phone)} style={styles.actionButton}><Text style={styles.actionText}>☎ {en?'Call':'전화'}</Text></Pressable>:null}
            {shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)} style={styles.actionButton}><Text style={styles.actionText}>◎ Instagram</Text></Pressable>:null}
            {shop.website_url?<Pressable onPress={()=>open(shop.website_url)} style={styles.actionButton}><Text style={styles.actionText}>↗ Website</Text></Pressable>:null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle icon="ⓘ" title={en?'Basic information':'기본 정보'}/>
          <View style={styles.infoCard}>
            <InfoRow label={en?'Address':'주소'} value={shop.address}/>
            <InfoRow label={en?'Hours':'영업시간'} value={shop.hours_display}/>
            <InfoRow label={en?'Closed':'정기휴무'} value={shop.closed_display}/>
            <InfoRow label={en?'Parking':'주차'} value={shop.parking_status}/>
          </View>
        </View>

        {shop.country_code==='JP'&&shop.google_map_url?<View style={styles.section}>
          <SectionTitle icon="★" title={en?'Google store information':'Google 매장 정보'}/>
          <View style={styles.googleCard}>
            <Text style={styles.googleTitle}>{shop.name_en||shop.name}</Text>
            <Text style={styles.googleSub}>{en?'Check ratings, reviews and latest information on Google Maps.':'평점·리뷰·최신 매장 정보는 Google Maps에서 확인할 수 있어요.'}</Text>
            <Pressable onPress={()=>open(shop.google_map_url)} style={styles.googleButton}><Text style={styles.googleButtonText}>Google Maps에서 전체 보기 ›</Text></Pressable>
          </View>
        </View>:null}

        {review?<View style={styles.section}>
          <SectionTitle icon="⌁" title={en?'Store analysis':'한눈에 보는 매장 분석'}/>
          <Text style={styles.note}>※ 깽퐌커플 방문 평점으로 단순 참고용으로 활용해주세요.</Text>
          <View style={styles.analysisCard}>
            <View style={styles.scoreGrid}>
              {SCORE_LABELS.slice(4).map(([key,label])=><View key={String(key)} style={styles.scoreCell}><Text style={styles.scoreCellLabel}>{label}</Text><Text style={styles.scoreCellValue}>{Number(review[key]||0)?Number(review[key]).toFixed(1):'-'}</Text></View>)}
            </View>
          </View>
          <View style={styles.compCard}>
            <Text style={styles.subTitle}>▣ 상품 구성 상세</Text>
            {tcg.length?<View style={styles.tcgLine}><Text style={styles.tcgLabel}>취급 TCG</Text><Text style={styles.tcgValue}>{tcg.map(([k])=>TCG[k]||k).join(' · ')}</Text></View>:null}
            {SCORE_LABELS.slice(0,4).map(([key,label])=><ScoreBar key={String(key)} label={label} value={review[key] as number|null}/>)}
          </View>
          {review.one_line_review?<View style={styles.recommendCard}><Text style={styles.recommendTitle}>한줄 리뷰</Text><Text style={styles.recommendText}>{review.one_line_review}</Text>{review.visit_review?<Text style={styles.visitText}>{review.visit_review}</Text>:null}</View>:null}
        </View>:null}

        {instaPosts.length?<View style={styles.section}>
          <View style={styles.instagramHead}><SectionTitle icon="◎" title="Instagram"/>{shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)}><Text style={styles.moreText}>전체보기 →</Text></Pressable>:null}</View>
          <Text style={styles.instagramGuide}>ⓘ 카드샵에서 직접 전하는 최신 소식이에요.</Text>
          <View style={styles.instagramGrid}>{instaPosts.map((p,i)=><Pressable key={String(p.permalink||i)} onPress={()=>open(p.permalink)} style={styles.instagramItem}><Image source={{uri:String(p.image||p.thumbnail_url||p.media_url)}} style={styles.instagramImage} resizeMode="cover"/></Pressable>)}</View>
        </View>:null}

        {reviewPicks.length?<View style={styles.section}>
          <SectionTitle icon="▣" title="깽퐌커플 리뷰"/>
          <View style={styles.reviewGrid}>{reviewPicks.map(c=><Pressable key={c.content_id} onPress={()=>openContent(c)} style={styles.contentCard}>
            {c.cover_image_url?<Image source={{uri:c.cover_image_url}} style={styles.contentImage}/>:<View style={styles.contentPlaceholder}><Text style={styles.contentPlaceholderText}>{c.platform||'Review'}</Text></View>}
            <View style={styles.contentBody}><Text numberOfLines={2} style={styles.contentTitle}>{c.title}</Text><Text style={styles.contentMeta}>{c.platform||c.content_type}</Text></View>
          </Pressable>)}</View>
        </View>:null}

        {related.length?<View style={styles.section}>
          <SectionTitle icon="+" title={en?'Related content':'관련 콘텐츠'}/>
          {related.map(c=><Pressable key={c.content_id} onPress={()=>openContent(c)} style={styles.relatedRow}><View style={{flex:1}}><Text numberOfLines={2} style={styles.relatedTitle}>{c.title}</Text><Text style={styles.relatedMeta}>{[c.platform,c.content_type,c.published_at].filter(Boolean).join(' · ')}</Text></View><Text style={styles.relatedArrow}>›</Text></Pressable>)}
        </View>:null}
      </View>
    </ScrollView>

    <View pointerEvents="box-none" style={styles.floatingLayer}>
      <Pressable accessibilityRole="button" onPress={()=>router.replace({pathname:'/(tabs)/map',params:{country:shop.country_code}} as any)} style={[styles.mapFab,{bottom:tcgMapBottom}]}>
        <Text style={styles.mapFabText}>⌾ TCG MAP ›</Text>
      </Pressable>
      {shop.country_code==='KR'?<LivePinButton withNav bottomOffset={56}/>:null}
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
  actionGrid:{marginTop:16,flexDirection:'row',flexWrap:'wrap',gap:8},actionButton:{height:44,minWidth:(SW-44)/2,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},actionPrimary:{backgroundColor:C.purple,borderColor:C.purple},actionPrimaryText:{fontSize:12.5,fontWeight:'900',color:'#fff'},actionText:{fontSize:12,fontWeight:'800',color:C.text},
  section:{paddingVertical:20,borderBottomWidth:8,borderBottomColor:C.divider},sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:8},sectionIcon:{width:25,height:25,borderRadius:8,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'},sectionIconText:{fontSize:12,fontWeight:'900',color:C.purpleDark},sectionTitle:{fontSize:16,fontWeight:'900',color:C.text},
  infoCard:{marginTop:12,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',overflow:'hidden'},infoRow:{minHeight:50,paddingHorizontal:14,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider},infoLabel:{width:78,fontSize:11.5,fontWeight:'800',color:C.muted},infoValue:{flex:1,fontSize:12.5,lineHeight:18,color:C.textSoft},
  googleCard:{marginTop:12,padding:15,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'},googleTitle:{fontSize:14,fontWeight:'900',color:C.text},googleSub:{marginTop:6,fontSize:11,lineHeight:17,color:C.muted},googleButton:{marginTop:12,height:42,borderRadius:11,backgroundColor:'#F5F2F8',alignItems:'center',justifyContent:'center'},googleButtonText:{fontSize:11.5,fontWeight:'800',color:C.purpleDark},
  note:{marginTop:6,fontSize:10.5,lineHeight:16,color:C.muted},analysisCard:{marginTop:12,padding:12,borderRadius:15,backgroundColor:'#FBFAFC',borderWidth:1,borderColor:C.line},scoreGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},scoreCell:{width:'30%',minWidth:92,padding:10,borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:C.divider},scoreCellLabel:{fontSize:10,color:C.muted},scoreCellValue:{marginTop:4,fontSize:17,fontWeight:'900',color:C.purpleDark},
  compCard:{marginTop:12,padding:14,borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'},subTitle:{fontSize:13,fontWeight:'900',color:C.text},tcgLine:{marginTop:11,paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.divider,flexDirection:'row'},tcgLabel:{width:70,fontSize:10.5,fontWeight:'800',color:C.muted},tcgValue:{flex:1,fontSize:11.5,fontWeight:'700',color:C.textSoft},barRow:{marginTop:11,flexDirection:'row',alignItems:'center',gap:8},barLabel:{width:60,fontSize:10.5,fontWeight:'700',color:C.textSoft},barTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#EDE8F4',overflow:'hidden'},barFill:{height:7,borderRadius:4,backgroundColor:C.purple},barValue:{width:25,textAlign:'right',fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  recommendCard:{marginTop:12,padding:14,borderRadius:15,backgroundColor:'#F8F5FC'},recommendTitle:{fontSize:10.5,fontWeight:'900',color:C.purpleDark},recommendText:{marginTop:6,fontSize:13,lineHeight:20,fontWeight:'800',color:C.text},visitText:{marginTop:8,fontSize:11.5,lineHeight:18,color:C.muted},
  instagramHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},moreText:{fontSize:10.5,fontWeight:'800',color:C.purpleDark},instagramGuide:{marginTop:5,fontSize:10.5,color:C.muted},instagramGrid:{marginTop:12,flexDirection:'row',flexWrap:'wrap',gap:6},instagramItem:{width:(SW-40)/2,height:180,borderRadius:13,overflow:'hidden',backgroundColor:'#eee'},instagramImage:{width:'100%',height:'100%'},
  reviewGrid:{marginTop:12,flexDirection:'row',gap:9},contentCard:{flex:1,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',overflow:'hidden'},contentImage:{width:'100%',height:110,backgroundColor:'#eee'},contentPlaceholder:{height:110,alignItems:'center',justifyContent:'center',backgroundColor:'#F2EEF7'},contentPlaceholderText:{fontSize:12,fontWeight:'900',color:C.purpleDark},contentBody:{padding:10},contentTitle:{fontSize:11.5,lineHeight:17,fontWeight:'800',color:C.text},contentMeta:{marginTop:5,fontSize:10,color:C.muted},
  relatedRow:{minHeight:58,flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.divider},relatedTitle:{fontSize:12.5,lineHeight:18,fontWeight:'800',color:C.text},relatedMeta:{marginTop:4,fontSize:10,color:C.muted},relatedArrow:{fontSize:21,color:C.muted,marginLeft:8},
  floatingLayer:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:100000,elevation:100000},mapFab:{position:'absolute',right:16,height:46,paddingHorizontal:16,borderRadius:23,backgroundColor:'#6E6C74',borderWidth:1,borderColor:'rgba(255,255,255,.35)',alignItems:'center',justifyContent:'center',...shadow},mapFabText:{fontSize:12,fontWeight:'900',color:'#fff'}
});
