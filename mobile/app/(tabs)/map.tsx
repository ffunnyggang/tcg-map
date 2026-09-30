import { useEffect,useMemo,useRef,useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator,FlatList,Image,Modal,Platform,Pressable,ScrollView,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView,{Callout,Marker,PROVIDER_GOOGLE,Region} from 'react-native-maps';
import * as Location from 'expo-location';
import { AppShop,FunyMonEvent,getActiveFunyMonEvents,getShops,shopImageUrl } from '../../lib/shops';
import FunyHeader from '../../components/FunyHeader';
import { C,shadow } from '../../lib/theme';

const REGIONS:Record<'KR'|'JP',Region>={KR:{latitude:37.5665,longitude:126.978,latitudeDelta:.18,longitudeDelta:.18},JP:{latitude:35.6812,longitude:139.7671,latitudeDelta:.18,longitudeDelta:.18}};
const FILTERS=[['pokemon','포켓몬','tcg'],['onepiece','원피스','tcg'],['dragonball','드래곤볼','tcg'],['single','싱글카드','feature'],['graded','등급카드','feature'],['vintage','빈티지카드','feature'],['oripa','오리파','feature'],['box','박스제품','feature'],['unmanned','무인매장','feature']] as const;
type Sort='recommended'|'name'|'distance';
const km=(a:{latitude:number;longitude:number},b:AppShop)=>{const r=6371,d=Math.PI/180,x=(Number(b.latitude)-a.latitude)*d,y=(Number(b.longitude)-a.longitude)*d,q=Math.sin(x/2)**2+Math.cos(a.latitude*d)*Math.cos(Number(b.latitude)*d)*Math.sin(y/2)**2;return 2*r*Math.asin(Math.sqrt(q))};
const thumb=(s:AppShop)=>{const a=[...(s.images||[])].sort((x,y)=>(Number(y.is_primary)-Number(x.is_primary))+(x.sort_order-y.sort_order))[0];return a?shopImageUrl(a.storage_path||a.source_path):''};

export default function MapScreen(){
  const router=useRouter(),map=useRef<MapView>(null),[shops,setShops]=useState<AppShop[]>([]),[events,setEvents]=useState<FunyMonEvent[]>([]),[q,setQ]=useState(''),[country,setCountry]=useState<'KR'|'JP'>('KR'),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState(''),[locating,setLocating]=useState(false),[filterOpen,setFilterOpen]=useState(false),[filters,setFilters]=useState<string[]>([]),[sort,setSort]=useState<Sort>('recommended'),[me,setMe]=useState<{latitude:number;longitude:number}|null>(null);
  useEffect(()=>{Promise.all([getShops(),getActiveFunyMonEvents()]).then(([s,e])=>{setShops(s);setEvents(e)}).catch(e=>setError(String(e.message||e)))},[]);
  const eventByShop=useMemo(()=>new Map(events.filter(e=>e.shop_id).map(e=>[e.shop_id as string,e])),[events]);
  const list=useMemo(()=>{const k=q.trim().toLowerCase(),active=FILTERS.filter(x=>filters.includes(x[0]));let a=shops.filter(s=>s.country_code===country&&(!k||[s.name,s.name_en,s.city,s.area,s.address].some(v=>String(v||'').toLowerCase().includes(k)))&&active.every(([id,,type])=>type==='tcg'?s.tcg?.[id]?.status===true:s.features?.[id]?.value===true));if(sort==='recommended')a=[...a].sort((x,y)=>Number(eventByShop.has(y.id))-Number(eventByShop.has(x.id)));if(sort==='name')a=[...a].sort((x,y)=>x.name.localeCompare(y.name,'ko'));if(sort==='distance'&&me)a=[...a].sort((x,y)=>km(me,x)-km(me,y));return a},[shops,q,country,filters,sort,me,eventByShop]);
  const changeCountry=(c:'KR'|'JP')=>{setCountry(c);setSelected(null);map.current?.animateToRegion(REGIONS[c],350)};
  const locate=async()=>{setLocating(true);try{const p=await Location.requestForegroundPermissionsAsync();if(p.status!=='granted')return;const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),pos={latitude:x.coords.latitude,longitude:x.coords.longitude};setMe(pos);map.current?.animateToRegion({...pos,latitudeDelta:.018,longitudeDelta:.018},300)}finally{setLocating(false)}};
  const pill=(on:boolean)=>({height:34,paddingHorizontal:14,borderRadius:18,borderWidth:1,borderColor:on?'#272331':'#E5E1EB',backgroundColor:on?'#272331':'#fff',alignItems:'center' as const,justifyContent:'center' as const});
  const header=<>
    <View style={{height:306,backgroundColor:'#EDEAF0'}}>
      <MapView ref={map} provider={Platform.OS==='android'?PROVIDER_GOOGLE:undefined} style={{flex:1}} initialRegion={REGIONS.KR} showsUserLocation showsMyLocationButton={false}>
        {list.map(s=>{const ev=eventByShop.get(s.id);return <Marker key={s.id} coordinate={{latitude:Number(s.latitude),longitude:Number(s.longitude)}} pinColor={ev?C.purple:selected===s.id?C.purpleDark:undefined} onPress={()=>setSelected(s.id)}><Callout onPress={()=>router.push(`/shop/${s.id}`)}><View style={{width:190,padding:4}}><Text style={{fontWeight:'900'}}>{s.name}</Text>{ev?<Text style={{marginTop:4,fontSize:12,fontWeight:'800'}}>✨ {ev.title}</Text>:null}<Text style={{marginTop:4,fontSize:11,color:'#666'}}>{s.area||s.address}</Text><Text style={{marginTop:7,fontSize:11,fontWeight:'800',color:C.purpleDark}}>상세보기 ›</Text></View></Callout></Marker>})}
      </MapView>
      <View style={{position:'absolute',left:14,right:14,top:12}}>
        <TextInput value={q} onChangeText={setQ} placeholder="카드샵 이름 또는 지역으로 검색" placeholderTextColor="#A39DA8" style={{height:46,borderWidth:1,borderColor:C.line,borderRadius:13,paddingHorizontal:15,backgroundColor:'rgba(255,255,255,.96)',color:C.text,...shadow}}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8,flexGrow:0}} contentContainerStyle={{gap:7,paddingRight:8}}>
          {(['KR','JP'] as const).map(c=><Pressable key={c} onPress={()=>changeCountry(c)} style={pill(country===c)}><Text style={{fontWeight:'800',fontSize:12,color:country===c?'#fff':'#716B79'}}>{c==='KR'?'대한민국':'일본'}</Text></Pressable>)}
          <Pressable onPress={()=>setFilterOpen(true)} style={pill(filters.length>0)}><Text style={{fontWeight:'800',fontSize:12,color:filters.length?'#fff':'#716B79'}}>필터{filters.length?` ${filters.length}`:''}</Text></Pressable>
          <Pressable onPress={locate} style={pill(false)}><Text style={{fontWeight:'800',fontSize:12,color:'#716B79'}}>{locating?'확인 중…':'내 위치'}</Text></Pressable>
        </ScrollView>
      </View>
    </View>
    <View style={{height:9,backgroundColor:C.divider}}/>
    <View style={{paddingHorizontal:14,paddingTop:16,paddingBottom:10,backgroundColor:'#fff'}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'}}>
        <View><Text style={{fontSize:10,color:'#9C92B5',fontWeight:'800',letterSpacing:1.5}}>CARD SHOP</Text><Text style={{marginTop:4,fontSize:14,fontWeight:'900',color:C.text}}>카드샵 {list.length}곳</Text></View>
        <View style={{flexDirection:'row',gap:11}}>{([['recommended','추천순'],['name','이름순'],['distance','거리순']] as [Sort,string][]).map(([v,t])=><Pressable key={v} onPress={()=>{if(v==='distance'&&!me)locate();setSort(v)}}><Text style={{fontSize:11,fontWeight:sort===v?'900':'600',color:sort===v?C.purpleDark:'#9A949D'}}>{t}</Text></Pressable>)}</View>
      </View>
    </View>
  </>;
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    {error?<Text style={{padding:14,color:C.danger}}>{error}</Text>:shops.length===0?<ActivityIndicator style={{marginTop:30}} color={C.purple}/>:<FlatList data={list} keyExtractor={x=>x.id} ListHeaderComponent={header} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:118,backgroundColor:'#fff'}} renderItem={({item})=>{const ev=eventByShop.get(item.id),uri=thumb(item);return <Pressable onPress={()=>router.push(`/shop/${item.id}`)} style={{height:128,marginHorizontal:14,marginBottom:9,padding:9,flexDirection:'row',gap:12,borderWidth:1,borderColor:ev?'rgba(154,84,235,.58)':C.line,borderRadius:16,backgroundColor:'#fff',...shadow}}>
      {uri?<Image source={{uri}} resizeMode="cover" style={{width:102,height:108,borderRadius:12,backgroundColor:C.divider}}/>:<View style={{width:102,height:108,borderRadius:12,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:11,fontWeight:'800',color:C.purpleDark}}>FUNY PIN</Text></View>}
      <View style={{flex:1,paddingVertical:5}}><View style={{flexDirection:'row',alignItems:'center',gap:6}}><Text numberOfLines={1} style={{flex:1,fontSize:16,fontWeight:'900',color:C.text}}>{item.name}</Text>{ev?<Text style={{fontSize:9,fontWeight:'900',color:'#F46F1B'}}>EVENT</Text>:null}</View>{ev?<Text numberOfLines={1} style={{marginTop:5,fontSize:11,fontWeight:'800',color:C.purpleDark}}>✨ {ev.title}</Text>:null}<Text numberOfLines={2} style={{marginTop:7,fontSize:11,lineHeight:17,color:'#77717C'}}>{item.area||item.city}{item.address?` · ${item.address}`:''}</Text>{item.hours_display?<Text numberOfLines={1} style={{marginTop:5,fontSize:10.5,color:'#9A949D'}}>{item.hours_display}</Text>:null}</View>
      <View style={{width:14,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22,color:'#8C76BD'}}>›</Text></View>
    </Pressable>}}/>}
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={()=>setFilterOpen(false)}><Pressable onPress={()=>setFilterOpen(false)} style={{flex:1,backgroundColor:'#0006',justifyContent:'flex-end'}}><Pressable onPress={()=>{}} style={{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:34}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:20,fontWeight:'900'}}>필터</Text><Pressable onPress={()=>setFilters([])}><Text style={{color:C.muted}}>초기화</Text></Pressable></View><ScrollView style={{marginTop:16}} contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{FILTERS.map(([id,label])=>{const on=filters.includes(id);return <Pressable key={id} onPress={()=>setFilters(x=>on?x.filter(v=>v!==id):[...x,id])} style={{paddingHorizontal:13,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:on?C.purple:C.line,backgroundColor:on?C.purpleSoft:'#fff'}}><Text style={{fontWeight:on?'800':'600',color:on?C.purpleDark:'#6F6976'}}>{label}</Text></Pressable>})}</ScrollView><Pressable onPress={()=>setFilterOpen(false)} style={{marginTop:22,padding:15,borderRadius:14,backgroundColor:C.purple}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'900'}}>{list.length}개 매장 보기</Text></Pressable></Pressable></Pressable></Modal>
  </SafeAreaView>;
}
