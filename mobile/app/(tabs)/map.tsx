import { useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,FlatList,Pressable,SafeAreaView,Text,TextInput,View } from 'react-native';
import MapView,{Marker,PROVIDER_GOOGLE,Region} from 'react-native-maps';
import * as Location from 'expo-location';
import { AppShop,getShops } from '../../lib/shops';

const REGIONS:Record<'KR'|'JP',Region>={KR:{latitude:37.5665,longitude:126.978,latitudeDelta:.18,longitudeDelta:.18},JP:{latitude:35.6812,longitude:139.7671,latitudeDelta:.18,longitudeDelta:.18}};
export default function MapScreen(){
 const map=useRef<MapView>(null),[shops,setShops]=useState<AppShop[]>([]),[q,setQ]=useState(''),[country,setCountry]=useState<'KR'|'JP'>('KR'),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState(''),[locating,setLocating]=useState(false);
 useEffect(()=>{getShops().then(setShops).catch(e=>setError(String(e.message||e)))},[]);
 const list=useMemo(()=>{const k=q.trim().toLowerCase();return shops.filter(s=>s.country_code===country&&(!k||[s.name,s.name_en,s.city,s.area,s.address].some(v=>String(v||'').toLowerCase().includes(k))))},[shops,q,country]);
 const changeCountry=(c:'KR'|'JP')=>{setCountry(c);setSelected(null);map.current?.animateToRegion(REGIONS[c],350)};
 const focus=(s:AppShop)=>{setSelected(s.id);map.current?.animateToRegion({latitude:Number(s.latitude),longitude:Number(s.longitude),latitudeDelta:.018,longitudeDelta:.018},300)};
 const locate=async()=>{setLocating(true);try{const p=await Location.requestForegroundPermissionsAsync();if(p.status!=='granted')return;const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});map.current?.animateToRegion({latitude:x.coords.latitude,longitude:x.coords.longitude,latitudeDelta:.018,longitudeDelta:.018},300)}finally{setLocating(false)}};
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{paddingHorizontal:16,paddingTop:10,flex:1}}>
  <Text style={{fontSize:24,fontWeight:'800'}}>TCG MAP</Text>
  <TextInput value={q} onChangeText={setQ} placeholder="카드샵 이름 또는 지역으로 검색" style={{marginTop:12,borderWidth:1,borderColor:'#ddd',borderRadius:12,paddingHorizontal:14,paddingVertical:11}}/>
  <View style={{flexDirection:'row',gap:8,marginVertical:10}}>{(['KR','JP'] as const).map(c=><Pressable key={c} onPress={()=>changeCountry(c)} style={{paddingHorizontal:14,paddingVertical:8,borderRadius:20,borderWidth:1,borderColor:country===c?'#222':'#ddd'}}><Text style={{fontWeight:country===c?'700':'400'}}>{c==='KR'?'대한민국':'일본'}</Text></Pressable>)}<Pressable onPress={locate} style={{marginLeft:'auto',paddingHorizontal:12,paddingVertical:8,borderRadius:20,borderWidth:1,borderColor:'#ddd'}}><Text>{locating?'확인 중…':'내 위치'}</Text></Pressable></View>
  <View style={{height:260,borderRadius:16,overflow:'hidden'}}><MapView ref={map} provider={PROVIDER_GOOGLE} style={{flex:1}} initialRegion={REGIONS.KR} showsUserLocation showsMyLocationButton={false}>{list.map(s=><Marker key={s.id} coordinate={{latitude:Number(s.latitude),longitude:Number(s.longitude)}} title={s.name} description={s.area||s.address} pinColor={selected===s.id?'#6f4bd8':undefined} onPress={()=>setSelected(s.id)}/>)}</MapView></View>
  {error?<Text style={{marginTop:12}}>{error}</Text>:shops.length===0?<ActivityIndicator style={{marginTop:20}}/>:<FlatList style={{marginTop:12}} data={list} keyExtractor={x=>x.id} ListHeaderComponent={<Text style={{marginBottom:6,fontWeight:'700'}}>카드샵 {list.length}곳</Text>} renderItem={({item})=><Pressable onPress={()=>focus(item)} style={{paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#eee'}}><Text style={{fontWeight:selected===item.id?'800':'700'}}>{item.name}</Text><Text numberOfLines={1} style={{marginTop:3}}>{item.area||item.city} · {item.address}</Text></Pressable>}/>}
 </View></SafeAreaView>
}
