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
import { supabase } from '../../lib/supabase';
import { WebView } from 'react-native-webview';

const FEATURE:Record<string,string>={single:'싱글카드',graded:'등급카드',vintage:'빈티지카드',oripa:'오리파',box:'박스제품',pack:'낱개팩',supplies:'카드용품',buy:'카드매입',consignment:'위탁판매',grading:'등급대행',play_space:'플레이스페이스',unmanned:'무인매장',tax_free:'면세'};
const TCG:Record<string,string>={pokemon:'포켓몬',one_piece:'원피스',onepiece:'원피스',dragon_ball:'드래곤볼',dragonball:'드래곤볼',yugioh:'유희왕',lorcana:'로카나',riftbound:'리프트바운드',other:'기타 TCG'};
const SCORE_LABELS:[keyof ShopReview,string][]=[
  ['single_score','싱글카드'],['graded_score','등급카드'],['box_score','박스제품'],['oripa_score','오리파'],
  ['price_score','가격'],['scale_score','규모'],['mood_score','분위기'],['access_score','접근성'],['staff_score','응대']
];
const SW=Dimensions.get('window').width;
type InstaPost={image?:string;thumbnail_url?:string;media_url?:string;permalink?:string};
type GoogleReview={author:string;rating:string;time:string;text:string};
type GooglePlaceData={rating:string;count:string;url:string;reviews:GoogleReview[];photos:string[]};
const GOOGLE_WEB_KEY='AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw';
const cleanInfo=(value?:string|null)=>{const v=String(value||'').trim();return !v||v==='-'||v==='–'||v==='—'?null:v};
const formatHours=(value?:string|null)=>{const v=cleanInfo(value);return v?v.replace(/\s*\/\s*/g,'\n'):null};
const webAsset=(x?:string|null)=>!x?'':/^https?:\/\//i.test(x)?x:`https://funypin.kr/${String(x).replace(/^\//,'')}`;

function SectionTitle({icon,title,color=C.purpleDark}:{icon:keyof typeof Ionicons.glyphMap;title:string;color?:string}){
  return <View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><Ionicons name={icon} size={22} color={color}/></View><Text style={styles.sectionTitle}>{title}</Text></View>;
}
function NaverMapIcon({color='#8062D8'}:{color?:string}){
  return <Text style={[styles.naverMark,{color}]}>N</Text>;
}
function InfoRow({label,value,icon,color=C.purpleDark,soft='#F3EFF9',border='#F0EDF6',last=false}:{label:string;value?:string|null;icon:keyof typeof Ionicons.glyphMap;color?:string;soft?:string;border?:string;last?:boolean}){
  if(!value)return null;
  return <View style={[styles.infoRow,!last&&{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:border}]}><View style={styles.infoLead}><View style={[styles.infoIcon,{backgroundColor:soft}]}><Ionicons name={icon} size={14} color={color}/></View><Text style={styles.infoLabel}>{label}</Text></View><Text style={styles.infoValue}>{value}</Text></View>;
}
function ScoreBar({label,value,progress,index=0,color='#8062D8',track='#EEEAF7'}:{label:string;value:number|null|undefined;progress:Animated.Value;index?:number;color?:string;track?:string}){
  const v=Math.max(0,Math.min(5,Number(value)||0));
  const start=Math.min(.12+index*.11,.48);
  const width=progress.interpolate({inputRange:[0,start,1],outputRange:['0%','0%',`${v/5*100}%`],extrapolate:'clamp'});
  return <View style={styles.barRow}><Text style={styles.barLabel}>{label}</Text><View style={[styles.barTrack,{backgroundColor:track}]}><Animated.View style={[styles.barFill,{width,backgroundColor:color}]} /></View></View>;
}

const RADAR_SIZE=156,RADAR_C=78,RADAR_R=48;
const radarPoint=(index:number,ratio:number)=>{
  const a=-Math.PI/2+index*2*Math.PI/5;
  return {x:RADAR_C+RADAR_R*ratio*Math.cos(a),y:RADAR_C+RADAR_R*ratio*Math.sin(a)};
};
const segmentStyle=(a:{x:number;y:number},b:{x:number;y:number},color:string,width=1)=>{
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy),angle=Math.atan2(dy,dx);
  return {position:'absolute' as const,left:(a.x+b.x)/2-len/2,top:(a.y+b.y)/2-width/2,width:len,height:width,backgroundColor:color,transform:[{rotate:`${angle}rad`}],borderRadius:width};
};
function RadarPentagon({review,progress,color='#8062D8',grid='#E7E1F2',axis='#EEEAF7'}:{review:ShopReview;progress:Animated.Value;color?:string;grid?:string;axis?:string}){
  const compValues=[review.single_score,review.graded_score,review.box_score,review.oripa_score].map(v=>Number(v)||0);
  const comp=compValues.reduce((sum:number,v:number)=>sum+v,0)/4;
  const values=[comp,Number(review.price_score)||0,Number(review.scale_score)||0,Number(review.mood_score)||0,Number(review.access_score)||0];
  const labels=['상품구성','가격','매장규모','매장분위기','접근성'];
  const scorePts=values.map((v,i)=>radarPoint(i,Math.max(0,Math.min(5,v))/5));
  const scale=progress.interpolate({inputRange:[0,1],outputRange:[.05,1]});
  const opacity=progress.interpolate({inputRange:[0,.2,1],outputRange:[0,.55,1]});
  return <View style={styles.radarCanvas}>
    {[1,2,3,4,5].flatMap(level=>{
      const pts=Array.from({length:5},(_,i)=>radarPoint(i,level/5));
      return pts.map((p,i)=><View key={`g-${level}-${i}`} style={segmentStyle(p,pts[(i+1)%5],grid,1)}/>);
    })}
    {Array.from({length:5},(_,i)=>{const p=radarPoint(i,1);return <View key={`a-${i}`} style={segmentStyle({x:RADAR_C,y:RADAR_C},p,axis,1)}/>})}
    {labels.map((label,i)=>{const p=radarPoint(i,1.33);return <Text key={label} style={[styles.radarLabel,{left:p.x-27,top:p.y-8}]}>{label}</Text>})}
    <Animated.View style={[StyleSheet.absoluteFill,{opacity,transform:[{scale}]}]}>
      {scorePts.map((p,i)=><View key={`s-${i}`} style={segmentStyle(p,scorePts[(i+1)%5],color,2)}/>)}
      {scorePts.map((p,i)=><View key={`d-${i}`} style={[styles.radarDot,{left:p.x-3,top:p.y-3,backgroundColor:color}]}/>)}
    </Animated.View>
  </View>;
}

export default function ShopDetail(){
  const {id,from}=useLocalSearchParams<{id:string;from?:string}>();
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
  const [stickyHeader,setStickyHeader]=useState(false);
  const [googlePlace,setGooglePlace]=useState<GooglePlaceData|null>(null);
  const galleryRef=useRef<ScrollView>(null);
  const scrollTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const chartProgress=useRef(new Animated.Value(0)).current;
  const fabProgress=useRef(new Animated.Value(0)).current;
  const analysisY=useRef(Number.POSITIVE_INFINITY);
  const chartStarted=useRef(false);
  const lastScrollY=useRef(0);

  const navBottom=Math.max(insets.bottom,10);
  const homeLivePinBottom=navBottom+54+10;
  const tcgMapBottom=Math.max(navBottom,10);

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
    const reelPick=contents.find(x=>/reel/i.test(x.content_type||''));
    const blogPick=contents.find(x=>/blog/i.test(x.content_type||''));
    const picks=[reelPick,blogPick].filter(Boolean) as ShopContent[];
    if(!picks.length)return;
    let cancelled=false;
    Promise.all(picks.map(async item=>{
      if(item.cover_image_url)return [item.content_id,webAsset(item.cover_image_url)] as const;
      try{
        const {data,error}=await supabase.functions.invoke('refresh-shop-content-thumbnail',{body:{content_id:item.content_id}});
        if(error)return [item.content_id,''] as const;
        return [item.content_id,String(data?.url||'')] as const;
      }catch{return [item.content_id,''] as const}
    })).then(rows=>{if(!cancelled)setReviewThumbs(Object.fromEntries(rows.filter(([,url])=>url)))});
    return()=>{cancelled=true};
  },[contents]);

  useEffect(()=>{
    chartProgress.setValue(0);
    chartStarted.current=false;
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

  const startChartMotion=()=>{
    if(chartStarted.current)return;
    chartStarted.current=true;
    chartProgress.setValue(0);
    Animated.timing(chartProgress,{toValue:1,duration:1560,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  };
  const onDetailScroll=(e:any)=>{
    const y=Number(e?.nativeEvent?.contentOffset?.y||0);
    lastScrollY.current=y;
    setStickyHeader(y>8);
    setScrolling(true);
    const viewportBottom=y+Dimensions.get('window').height;
    if(!chartStarted.current&&y>40&&viewportBottom>=analysisY.current+20)startChartMotion();
    if(scrollTimer.current)clearTimeout(scrollTimer.current);
    scrollTimer.current=setTimeout(()=>setScrolling(false),650);
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
  const isJapan=shop.country_code==='JP';
  const googleFallbackPhotos=isJapan&&images.length===0?(googlePlace?.photos||[]):[];
  const heroImages=images.length?images.map(x=>shopImageUrl(x.storage_path||x.source_path)):googleFallbackPhotos;
  const accent=isJapan?'#D93B55':'#8062D8';
  const accentDark=isJapan?'#B9002D':'#6847BF';
  const accentSoft=isJapan?'#FFF0F2':'#F3EFF9';
  const accentBorder=isJapan?'#F2E4E7':'#ECE7F1';
  const pageBg=isJapan?'#FAF6F7':'#F8F6FF';
  const radarGrid=isJapan?'#F0DFE2':'#E7E1F2';
  const radarAxis=isJapan?'#F4E8EA':'#EEEAF7';
  const location=[shop.area,shop.nearest_station?(shop.nearest_station+(shop.walk_minutes!=null?` 도보 ${shop.walk_minutes}분`:'')):null].filter(Boolean).join(' · ');
  const visitDate=shop.verified_at?String(shop.verified_at).replace(/^(\d{4})-(\d{2})-(\d{2}).*$/,'$1. $2. $3'):'';
  const analysisKeys:(keyof ShopReview)[]=['single_score','graded_score','box_score','oripa_score','price_score','scale_score','mood_score','access_score'];
  const hasAnalysis=!!review&&analysisKeys.some(k=>Number(review[k])>0);
  const reel=contents.find(c=>/reel/i.test(c.content_type||''));
  const blog=contents.find(c=>/blog/i.test(c.content_type||''));
  const reviewPicks=[reel,blog].filter(Boolean) as ShopContent[];
  const instaColumns:[InstaPost[],InstaPost[]]=[[],[]];
  const instaHeights=[0,0];
  instaPosts.forEach((p,i)=>{const ratio=3/4;const col=instaHeights[0]<=instaHeights[1]?0:1;instaColumns[col].push(p);instaHeights[col]+=1/ratio;});
  const fabWidth=fabProgress.interpolate({inputRange:[0,1],outputRange:[132,46]});
  const fabLabelOpacity=fabProgress.interpolate({inputRange:[0,.65,1],outputRange:[1,0,0]});
  const fabLabelWidth=fabProgress.interpolate({inputRange:[0,.65,1],outputRange:[78,20,0]});
  const open=(url?:string|null)=>{if(url)Linking.openURL(url).catch(()=>{})};
  const goToMap=()=>{if(from==='list'||from==='map-popup'||from==='map'||from==='native-map'){router.back();return;}router.replace({pathname:'/(tabs)/map',params:{country:shop.country_code}} as any)};
  const googleBridgeHtml=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="map" style="width:1px;height:1px"></div><script>
  function send(data){try{window.ReactNativeWebView.postMessage(JSON.stringify(data));}catch(e){}}
  function init(){
    try{
      var service=new google.maps.places.PlacesService(document.getElementById('map'));
      var query=${JSON.stringify((shop.name_en||shop.name)+' '+(shop.address||''))};
      service.findPlaceFromQuery({query:query,fields:['place_id']},function(found,status){
        if(status!==google.maps.places.PlacesServiceStatus.OK||!found||!found[0]){send({type:'GOOGLE_PLACE_DATA',rating:'',count:'',url:'',reviews:[],photos:[]});return;}
        service.getDetails({placeId:found[0].place_id,fields:['rating','user_ratings_total','url','reviews','photos']},function(place,detailStatus){
          if(detailStatus!==google.maps.places.PlacesServiceStatus.OK||!place){send({type:'GOOGLE_PLACE_DATA',rating:'',count:'',url:'',reviews:[],photos:[]});return;}
          var reviews=(place.reviews||[]).slice(0,3).map(function(r){return {author:r.author_name||'',rating:String(r.rating||''),time:r.relative_time_description||'',text:r.text||''};});
          var photos=(place.photos||[]).slice(0,5).map(function(p){try{return p.getUrl({maxWidth:1200,maxHeight:1200});}catch(e){return'';}}).filter(Boolean);
          send({type:'GOOGLE_PLACE_DATA',rating:String(place.rating||''),count:String(place.user_ratings_total||''),url:String(place.url||''),reviews:reviews,photos:photos});
        });
      });
    }catch(e){send({type:'GOOGLE_PLACE_DATA',rating:'',count:'',url:'',reviews:[],photos:[]});}
  }
  </script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_WEB_KEY}&libraries=places&callback=init"></script></body></html>`;
  const openContent=(content:ShopContent)=>{if(!content.url)return;setSheetTitle('깽퐌커플 리뷰');setSheetUrl(content.url)};
  const share=()=>Share.share({title:shop.name,message:`${shop.name} | FUNY PIN\nhttps://funypin.kr/shops.html#/shop/${shop.id}`}).catch(()=>{});

  return <SafeAreaView edges={['top']} style={[styles.root,{backgroundColor:pageBg}]}>
    <Stack.Screen options={{headerShown:false}}/>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent,{backgroundColor:pageBg}]} onScroll={onDetailScroll} scrollEventThrottle={16}>
      <View style={styles.hero}>
        {heroImages.length?
          <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e=>setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x/SW))}>
            {heroImages.map((uri,i)=><Image key={uri||String(i)} source={{uri}} style={styles.heroImage} resizeMode="cover"/>)}
          </ScrollView>
          :<View style={styles.heroEmpty}><Text style={styles.heroEmptyText}>매장 이미지 준비 중</Text></View>}
        <View style={styles.heroTop}>
          <Pressable onPress={goToMap} style={styles.heroIcon}><Ionicons name="chevron-back" size={21} color={C.text}/></Pressable>
          <Pressable onPress={share} style={styles.heroIcon}><Ionicons name="share-outline" size={19} color={C.text}/></Pressable>
        </View>
        <View style={styles.heroCount}><Ionicons name="images-outline" size={13} color="#fff"/><Text style={styles.heroCountText}>{heroImages.length?galleryIndex+1:1} / {Math.max(heroImages.length,1)}</Text></View>
      </View>

      <View style={styles.detailContent}>
        <View style={[styles.summaryCard,{borderColor:accentBorder}]}>
          <View style={styles.titleLine}><View style={{flex:1}}><Text style={styles.shopName}>{shop.name}</Text>{shop.name_en?<Text style={styles.shopNameEn}>{shop.name_en}</Text>:null}</View>
            <Pressable onPress={onToggleFavorite} disabled={favoriteBusy} hitSlop={10} style={styles.favorite}><Ionicons name={favorite?'heart':'heart-outline'} size={28} color={favorite?accent:'#A49DAC'}/></Pressable>
          </View>
          {!!location&&<View style={styles.locationRow}><Ionicons name="location-outline" size={15} color={accent}/><Text style={styles.location}>{location}</Text></View>}
          <View style={styles.tags}>{features.map(([k])=><View key={'f'+k} style={[styles.tag,{backgroundColor:accentSoft}]}><Text style={[styles.tagText,{color:isJapan?'#A72D42':'#7358C5'}]}>{FEATURE[k]||k}</Text></View>)}</View>
          {activeEvent?<View style={styles.eventCard}><Text style={styles.eventBadge}>EVENT</Text><Text numberOfLines={2} style={styles.eventText}>{activeEvent}</Text><Text style={styles.eventArrow}>›</Text></View>:null}
          <View style={styles.actionGrid}>
            {shop.naver_map_url?<Pressable onPress={()=>open(shop.naver_map_url)} style={[styles.actionMini,{borderColor:accentBorder}]}><View style={[styles.actionMiniIcon,{backgroundColor:accentSoft}]}><NaverMapIcon color={accent}/></View><Text numberOfLines={1} style={styles.actionMiniText}>네이버지도</Text></Pressable>:null}
            {shop.google_map_url?<Pressable onPress={()=>open(shop.google_map_url)} style={styles.actionMini}><View style={[styles.actionMiniIcon,{backgroundColor:accentSoft}]}><Ionicons name="location-outline" size={18} color={accent}/></View><Text numberOfLines={1} style={styles.actionMiniText}>Google Maps</Text></Pressable>:null}
            {shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)} style={styles.actionMini}><View style={[styles.actionMiniIcon,{backgroundColor:accentSoft}]}><Ionicons name="logo-instagram" size={18} color={accent}/></View><Text numberOfLines={1} style={styles.actionMiniText}>Instagram</Text></Pressable>:null}
            {shop.phone?<Pressable onPress={()=>open('tel:'+shop.phone)} style={styles.actionMini}><View style={[styles.actionMiniIcon,{backgroundColor:accentSoft}]}><Ionicons name="call-outline" size={18} color={accent}/></View><Text numberOfLines={1} style={styles.actionMiniText}>전화하기</Text></Pressable>:null}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle icon="information-circle-outline" title={en?'Basic information':'기본 정보'} color={accent}/>
          <View style={[styles.infoCard,{borderColor:accentBorder}]}>
            <InfoRow icon="location-outline" label={en?'Address':'주소'} value={shop.address} color={accent} soft={accentSoft} border={isJapan?'#F3E8EA':'#F0EDF6'}/>
            <InfoRow icon="time-outline" label={en?'Hours':'영업시간'} value={formatHours(shop.hours_display)} color={accent} soft={accentSoft} border={isJapan?'#F3E8EA':'#F0EDF6'}/>
            <InfoRow icon="calendar-outline" label={en?'Closed':'정기휴무'} value={cleanInfo(shop.closed_display)} color={accent} soft={accentSoft} border={isJapan?'#F3E8EA':'#F0EDF6'}/>
            <InfoRow icon="car-outline" label={en?'Parking':'주차'} value={cleanInfo(shop.parking_status)} color={accent} soft={accentSoft} border={isJapan?'#F3E8EA':'#F0EDF6'} last/>
          </View>
        </View>

        {shop.country_code==='JP'&&shop.google_map_url?<View style={styles.section}>
          <SectionTitle icon="logo-google" title={en?'Google store information':'Google 매장 정보'} color={accent}/>
          <View style={[styles.googleCard,{borderColor:accentBorder}]}>
            {googlePlace?<><View style={styles.googleRatingRow}><View style={styles.googleRatingMain}><Text style={styles.googleRating}>{googlePlace.rating||'-'}</Text><Text style={styles.googleStars}>★★★★★</Text></View><Text style={styles.googleCount}>{googlePlace.count}</Text></View>
              {googlePlace.reviews.length?<View style={styles.googleReviews}><Text style={styles.googleReviewHeading}>Google 리뷰</Text>{googlePlace.reviews.slice(0,3).map((r,i)=><View key={i} style={styles.googleReviewItem}><View style={styles.googleReviewHead}><Text numberOfLines={1} style={styles.googleReviewAuthor}>{r.author||'Google 사용자'}</Text><Text style={styles.googleReviewRating}>{r.rating}</Text></View>{r.time?<Text style={styles.googleReviewTime}>{r.time}</Text>:null}{r.text?<Text numberOfLines={4} style={styles.googleReviewText}>{r.text}</Text>:null}</View>)}</View>:null}
            </>:<Text style={styles.googleSub}>Google 정보를 불러오는 중...</Text>}
            <Pressable onPress={()=>open(googlePlace?.url||shop.google_map_url)} style={styles.googleButton}><Text style={styles.googleButtonText}>Google Maps에서 전체 보기</Text></Pressable>
            <Text style={styles.googleSource}>Google Maps 제공 정보</Text>
          </View>
        </View>:null}

        {hasAnalysis&&review?<View style={styles.section} onLayout={e=>{analysisY.current=e.nativeEvent.layout.y+280}}>
          <SectionTitle icon="analytics-outline" title={en?'Store analysis':'한눈에 보는 매장 분석'} color={accent}/>
          <Text style={styles.note}>※ 깽퐌커플 방문 평점 바탕으로 주관적인 분석으로 단순 참고용으로 활용해주세요.</Text>
          <View style={[styles.analysisCombo,{borderColor:accentBorder}]}>
            <View style={styles.analysisMainRow}>
              <View style={styles.radarPane}><RadarPentagon review={review} progress={chartProgress} color={accent} grid={radarGrid} axis={radarAxis}/></View>
              <View style={[styles.analysisDivider,{borderColor:isJapan?'#F3E8EA':'#F0EDF6'}]}/>
              <View style={styles.compPane}>
                <Text style={styles.subTitle}>상품 구성 상세</Text>
                {tcg.length?<View style={styles.tcgLine}><Text style={styles.tcgLabel}>취급 TCG</Text><Text style={styles.tcgValue}>{tcg.map(([k])=>TCG[k]||k).join(' · ')}</Text></View>:null}
                {SCORE_LABELS.slice(0,4).map(([key,label],index)=><ScoreBar key={String(key)} label={label} value={review[key] as number|null} progress={chartProgress} index={index} color={accent} track={isJapan?'#F2E4E7':'#EEEAF7'}/>)}
              </View>
            </View>
            {visitDate?<View style={styles.analysisVisitDate}><Ionicons name="calendar-outline" size={13} color="#9B96A0"/><Text style={styles.analysisVisitDateText}>매장 방문일 {visitDate}</Text></View>:null}
          </View>
        </View>:null}

        {instaPosts.length?<View style={styles.section}>
          <View style={styles.instagramHead}><SectionTitle icon="logo-instagram" title="Instagram" color={accent}/>{shop.instagram_url?<Pressable onPress={()=>open(shop.instagram_url)}><Text style={styles.moreText}>전체보기 →</Text></Pressable>:null}</View>
          <Text style={styles.instagramGuide}>ⓘ 카드샵에서 직접 전하는 최신 소식이에요.</Text>
          <View style={styles.instagramGrid}>{instaColumns.map((col,colIndex)=><View key={colIndex} style={styles.instagramColumn}>{col.map((p,i)=>{const key=String(p.permalink||i),ratio=3/4;return <Pressable key={key} onPress={()=>{if(p.permalink){setSheetTitle('Instagram');setSheetUrl(String(p.permalink))}}} style={styles.instagramItem}><Image source={{uri:webAsset(String(p.image||p.thumbnail_url||p.media_url))}} style={[styles.instagramImage,{aspectRatio:ratio}]} resizeMode="cover"/></Pressable>})}</View>)}</View>
        </View>:null}

        {reviewPicks.length?<View style={styles.section}>
          <SectionTitle icon="chatbox-ellipses-outline" title="깽퐌커플 리뷰" color={accent}/>
          <View style={styles.reviewGrid}>{reviewPicks.map(c=><Pressable key={c.content_id} onPress={()=>openContent(c)} style={[styles.contentCard,{borderColor:accentBorder}]}>
            {reviewThumbs[c.content_id]?<Image source={{uri:reviewThumbs[c.content_id]}} style={[styles.contentImage,{aspectRatio:c.platform==='Naver'?1:c.platform==='Instagram'?9/16:(reviewRatios[c.content_id]||1)}]} resizeMode="cover"/>:<View style={styles.contentPlaceholder}><Text style={styles.contentPlaceholderText}>{c.platform||'Review'}</Text></View>}
            <View style={styles.contentBody}><View style={styles.contentPlatformRow}>{c.platform==='Instagram'?<Ionicons name="logo-instagram" size={13} color={accentDark}/>:<Ionicons name="globe-outline" size={13} color={accentDark}/>}<Text style={styles.contentMeta}>{c.platform||c.content_type}</Text></View></View>
          </Pressable>)}</View>
        </View>:null}


      </View>
    </ScrollView>

    {stickyHeader?<View style={[styles.stickyHeaderShell,{top:insets.top,backgroundColor:isJapan?'rgba(255,250,251,.98)':'rgba(251,250,255,.98)'}]}>
      <View style={styles.stickyHeader}>
        <Pressable onPress={goToMap} hitSlop={10} style={styles.stickyAction}><Ionicons name="chevron-back" size={21} color={C.text}/></Pressable>
        <Text numberOfLines={1} style={styles.stickyTitle}>{shop.name}</Text>
        <Pressable onPress={share} hitSlop={10} style={styles.stickyAction}><Ionicons name="share-outline" size={19} color={C.text}/></Pressable>
      </View>
    </View>:null}

    <View pointerEvents="box-none" style={styles.floatingLayer}>
      <Animated.View style={[styles.mapFabWrap,{bottom:tcgMapBottom,width:fabWidth}]}>
        <Pressable accessibilityRole="button" onPress={goToMap} style={styles.mapFab}>
          <Animated.View style={[styles.mapFabIconWrap,{left:fabProgress.interpolate({inputRange:[0,1],outputRange:[15,14]})}]}><Ionicons name="location-outline" size={18} color="#fff"/></Animated.View>
          <Animated.View style={[styles.mapFabLabelGroup,{width:fabLabelWidth,opacity:fabLabelOpacity}]}>
            <Text style={styles.mapFabText}>TCG MAP</Text><Text style={styles.mapFabArrow}>›</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
      {shop.country_code==='KR'?<LivePinButton withNav scrolling={scrolling}/>:null}
    </View>

    {isJapan?<View pointerEvents="none" style={styles.googleBridge}><WebView source={{html:googleBridgeHtml,baseUrl:'https://funypin.kr'}} javaScriptEnabled domStorageEnabled originWhitelist={['https://*']} onMessage={e=>{try{const d=JSON.parse(e.nativeEvent.data);if(d?.type==='GOOGLE_PLACE_DATA')setGooglePlace({rating:String(d.rating||''),count:String(d.count||''),url:String(d.url||''),reviews:Array.isArray(d.reviews)?d.reviews.slice(0,3):[],photos:Array.isArray(d.photos)?d.photos.slice(0,5).map(String):[]})}catch{}}}/></View>:null}
    <InAppWebSheet visible={!!sheetUrl} url={sheetUrl} title={sheetTitle} onClose={()=>setSheetUrl(null)}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F8F6FF'},
  loading:{flex:1,justifyContent:'center',backgroundColor:'#fff'},
  scrollContent:{paddingBottom:120,backgroundColor:'#F8F6FF'},

  hero:{height:280,backgroundColor:'#ECE8E1',position:'relative'},
  heroImage:{width:SW,height:280,backgroundColor:'#EEEAF2'},
  heroEmpty:{height:280,alignItems:'center',justifyContent:'center',backgroundColor:'#ECE8E1'},
  heroEmptyText:{fontSize:11,fontWeight:'600',color:'#958D84'},
  heroTop:{position:'absolute',left:14,right:14,top:14,flexDirection:'row',justifyContent:'space-between'},
  heroIcon:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,253,250,.95)',borderWidth:1,borderColor:'rgba(226,219,210,.9)',alignItems:'center',justifyContent:'center',...shadow},
  backText:{fontSize:29,lineHeight:30,color:C.text},
  shareText:{fontSize:19,fontWeight:'800',color:C.text},
  heroCount:{position:'absolute',right:14,bottom:36,height:26,paddingHorizontal:9,borderRadius:13,backgroundColor:'rgba(34,30,26,.62)',flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center'},
  heroCountText:{fontSize:10,fontWeight:'700',color:'#fff'},

  stickyHeaderShell:{position:'absolute',left:0,right:0,height:56,zIndex:999999,elevation:999999,backgroundColor:'rgba(251,250,255,.98)',shadowColor:'#211A2E',shadowOpacity:.06,shadowRadius:8,shadowOffset:{width:0,height:2}},
  stickyHeader:{...StyleSheet.absoluteFillObject,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'rgba(225,219,210,.86)',overflow:'hidden'},
  stickyAction:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  stickyTitle:{position:'absolute',left:56,right:56,textAlign:'center',fontSize:14.5,fontWeight:'800',letterSpacing:-.3,color:'#28231F'},

  detailContent:{paddingHorizontal:16,paddingBottom:64},
  summaryCard:{marginTop:-18,paddingHorizontal:16,paddingTop:22,paddingBottom:18,zIndex:3,backgroundColor:'rgba(255,253,250,.98)',borderWidth:1,borderColor:'#E6DFD6',borderRadius:20,...shadow},
  titleLine:{flexDirection:'row',alignItems:'center',gap:8},
  shopName:{fontSize:23,fontWeight:'900',letterSpacing:-.8,color:'#28231F'},
  shopNameEn:{marginTop:2,fontSize:10.5,fontWeight:'600',letterSpacing:.5,color:'#9690A3'},
  favorite:{width:34,height:34,alignItems:'center',justifyContent:'center'},
  favoriteOn:{},
  favoriteText:{fontSize:21,color:'#99909F'},
  favoriteTextOn:{color:C.purpleDark},
  locationRow:{marginTop:10,flexDirection:'row',alignItems:'center',gap:6},
  location:{fontSize:11.8,fontWeight:'600',color:'#716A62'},

  tags:{marginTop:12,flexDirection:'row',flexWrap:'wrap',gap:5},
  tag:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,backgroundColor:'#F3EFF9'},
  tagText:{fontSize:10.5,fontWeight:'700',color:'#7358C5'},

  eventCard:{marginTop:14,minHeight:54,paddingHorizontal:13,borderRadius:15,borderWidth:1,borderColor:'#C47BFF',backgroundColor:'#FFF9FF',flexDirection:'row',alignItems:'center',gap:10},
  eventBadge:{fontSize:9,fontWeight:'900',color:'#fff',backgroundColor:'#EE7847',paddingHorizontal:8,paddingVertical:5,borderRadius:10},
  eventText:{flex:1,fontSize:12,fontWeight:'800',color:C.textSoft},
  eventArrow:{fontSize:22,color:C.muted},

  actionGrid:{marginTop:17,flexDirection:'row',gap:8,alignItems:'stretch'},
  actionMini:{width:(SW-32-32-24)/4,minHeight:74,borderRadius:14,borderWidth:1,borderColor:'#E6DFD6',backgroundColor:'#FFFDFA',alignItems:'center',justifyContent:'center',paddingHorizontal:3,paddingVertical:8},
  actionMiniIcon:{width:35,height:35,borderRadius:18,backgroundColor:'#F0E8FF',alignItems:'center',justifyContent:'center'},
  naverMark:{fontSize:17,lineHeight:20,fontWeight:'900'},
  actionMiniText:{marginTop:6,fontSize:9.8,fontWeight:'600',color:'#5E5750'},

  section:{marginTop:30},
  sectionTitleRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  sectionIcon:{width:22,height:22,alignItems:'center',justifyContent:'center'},
  sectionIconText:{fontSize:12,fontWeight:'900',color:C.purpleDark},
  sectionTitle:{fontSize:16.5,fontWeight:'800',letterSpacing:-.4,color:'#282331'},

  infoCard:{borderRadius:18,borderWidth:1,borderColor:'#E6DFD6',backgroundColor:'#FFFDFA',paddingHorizontal:15,...shadow},
  infoRow:{minHeight:54,flexDirection:'row',alignItems:'center'},
  infoLead:{width:92,flexDirection:'row',alignItems:'center',gap:8},
  infoIcon:{width:28,height:28,borderRadius:14,backgroundColor:'#F0E8FF',alignItems:'center',justifyContent:'center'},
  infoIconText:{fontSize:11,fontWeight:'900',color:'#8A5BE2'},
  infoLabel:{fontSize:12,fontWeight:'600',color:'#817B8B'},
  infoValue:{flex:1,fontSize:12,lineHeight:18,fontWeight:'500',color:'#34303D'},

  googleCard:{padding:15,borderRadius:17,borderWidth:1,borderColor:C.line,backgroundColor:'#fff'},
  googleSub:{fontSize:11,lineHeight:17,color:C.muted},
  googleRatingRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12,paddingBottom:13,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#F3E8EA'},
  googleRatingMain:{flexDirection:'row',alignItems:'center',gap:8},
  googleRating:{fontSize:24,lineHeight:26,fontWeight:'900',color:'#242128'},
  googleStars:{fontSize:13,color:'#D93B55',letterSpacing:1},
  googleCount:{fontSize:10.5,color:'#8A838C'},
  googleReviews:{marginTop:15},
  googleReviewHeading:{marginBottom:9,fontSize:13,fontWeight:'800',color:'#3B353C'},
  googleReviewItem:{paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#F3E8EA'},
  googleReviewHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  googleReviewAuthor:{flex:1,fontSize:11,fontWeight:'800',color:'#3B353C'},
  googleReviewRating:{fontSize:10,fontWeight:'800',color:'#D93B55'},
  googleReviewTime:{marginTop:2,fontSize:9,color:'#AAA3AA'},
  googleReviewText:{marginTop:7,fontSize:10.5,lineHeight:16,color:'#625B63'},
  googleButton:{marginTop:12,minHeight:38,borderRadius:11,backgroundColor:'#FFF0F2',alignItems:'center',justifyContent:'center'},
  googleButtonText:{fontSize:10.5,fontWeight:'800',color:'#A72D42'},
  googleSource:{marginTop:8,textAlign:'right',fontSize:8.5,color:'#AAA3AA'},

  note:{marginTop:-5,marginBottom:10,fontSize:10.5,lineHeight:16,color:'#9992A4'},
  analysisCombo:{minHeight:190,borderRadius:18,borderWidth:1,borderColor:'#E6DFD6',backgroundColor:'#FFFDFA',overflow:'hidden',...shadow},
  analysisMainRow:{height:180,flexDirection:'row',alignItems:'stretch'},
  radarPane:{width:'48%',height:180,alignItems:'center',justifyContent:'center'},
  analysisDivider:{height:152,marginVertical:14,borderLeftWidth:StyleSheet.hairlineWidth},
  compPane:{flex:1,height:152,marginVertical:14,paddingLeft:14,paddingRight:12,justifyContent:'center'},
  radarCanvas:{width:RADAR_SIZE,height:RADAR_SIZE,position:'relative'},
  radarLabel:{position:'absolute',width:54,textAlign:'center',fontSize:10.5,fontWeight:'700',color:'#504A59'},
  radarDot:{position:'absolute',width:6,height:6,borderRadius:3,backgroundColor:'#8A5BE2'},
  subTitle:{fontSize:14,fontWeight:'800',color:'#272331',marginBottom:1},
  tcgLine:{marginTop:10,marginBottom:0,minHeight:22,flexDirection:'row',alignItems:'center',gap:9},
  tcgLabel:{width:56,fontSize:10.5,lineHeight:15,fontWeight:'800',color:'#37313F'},
  tcgValue:{flex:1,fontSize:10.5,lineHeight:15,fontWeight:'600',color:'#837C8E',textAlign:'left'},
  barRow:{marginTop:10,flexDirection:'row',alignItems:'center',gap:9},
  barLabel:{width:56,fontSize:10.5,lineHeight:15,fontWeight:'700',color:'#494351'},
  barTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#EEEAF7',overflow:'hidden'},
  barFill:{height:7,borderRadius:4,backgroundColor:C.purple},

  analysisVisitDate:{height:30,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  analysisVisitDateText:{fontSize:9,lineHeight:13,fontWeight:'600',color:'#8F8A95'},
  recommendCard:{marginTop:12,padding:14,borderRadius:15,backgroundColor:'#F8F5FC'},
  recommendTitle:{fontSize:10.5,fontWeight:'900',color:C.purpleDark},
  recommendText:{marginTop:6,fontSize:13,lineHeight:20,fontWeight:'800',color:C.text},
  visitText:{marginTop:8,fontSize:11.5,lineHeight:18,color:C.muted},

  instagramHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  moreText:{fontSize:10.5,fontWeight:'700',color:C.purpleDark},
  instagramGuide:{marginTop:-8,marginBottom:11,fontSize:10.5,fontWeight:'600',color:'#938C9E'},
  instagramGrid:{flexDirection:'row',gap:6,alignItems:'flex-start'},
  instagramColumn:{flex:1,gap:6},
  instagramItem:{width:'100%',borderRadius:11,overflow:'hidden',backgroundColor:'#EEEAF4'},
  instagramImage:{width:'100%',backgroundColor:'#EEEAF4'},

  reviewGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'flex-start'},
  contentCard:{width:(SW-32-10)/2,borderRadius:15,borderWidth:1,borderColor:'#ECE7F1',backgroundColor:'#fff',overflow:'hidden',...shadow},
  contentImage:{width:'100%',backgroundColor:'#EEEAF4'},
  contentPlaceholder:{aspectRatio:1,alignItems:'center',justifyContent:'center',backgroundColor:'#F2EEF7'},
  contentPlaceholderText:{fontSize:11,fontWeight:'800',color:C.purpleDark},
  contentBody:{padding:10,minHeight:34,justifyContent:'center'},
  contentTitle:{height:32,fontSize:11.5,lineHeight:15.5,fontWeight:'700',color:C.text},
  contentPlatformRow:{flexDirection:'row',alignItems:'center',gap:4},
  contentMeta:{fontSize:10,color:'#9690A2'},

  relatedRow:{minHeight:58,flexDirection:'row',alignItems:'center',paddingVertical:10},
  relatedTitle:{fontSize:12.5,lineHeight:18,fontWeight:'800',color:C.text},
  relatedMeta:{marginTop:4,fontSize:10,color:C.muted},
  relatedArrow:{fontSize:21,color:C.muted,marginLeft:8},

  googleBridge:{position:'absolute',left:-1200,top:0,width:390,height:640,opacity:.01,overflow:'hidden'},
  floatingLayer:{position:'absolute',left:0,right:0,top:0,bottom:0,zIndex:100000,elevation:100000},
  mapFabWrap:{position:'absolute',right:16,height:46},
  mapFab:{height:46,width:'100%',borderRadius:23,backgroundColor:'#6E6C74',borderWidth:1,borderColor:'rgba(255,255,255,.35)',flexDirection:'row',alignItems:'center',justifyContent:'center',...shadow},
  mapFabIconWrap:{position:'absolute',width:18,height:18,top:13,alignItems:'center',justifyContent:'center'},
  mapFabLabelGroup:{height:24,marginLeft:20,overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  mapFabText:{fontSize:12,fontWeight:'900',color:'#fff'},
  mapFabArrow:{fontSize:19,fontWeight:'500',lineHeight:20,color:'#fff'}
});
