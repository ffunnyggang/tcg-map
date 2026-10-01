import { useCallback,useState } from 'react';
import { ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect,useRouter } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { AppShop,getFavoriteShops,shopImageUrl } from '../../lib/shops';
import { C } from '../../lib/theme';

export default function Favorites(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [shops,setShops]=useState<AppShop[]>([]);
  const load=async()=>{setLoading(true);try{setShops(await getFavoriteShops())}finally{setLoading(false)}};
  useFocusEffect(useCallback(()=>{load()},[]));

  return <View style={styles.root}>
    <MySubHeader title="관심 매장"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shops.length?shops.map(shop=>{
          const image=shop.images?.slice().sort((a,b)=>Number(b.is_primary)-Number(a.is_primary))[0];
          const station=shop.nearest_station?(shop.nearest_station+(shop.walk_minutes!=null?' 도보 '+shop.walk_minutes+'분':'')):'카드샵';
          return <Pressable key={shop.id} onPress={()=>router.push(('/shop/'+shop.id) as any)} style={styles.card}>
            {image?<Image source={{uri:shopImageUrl(image.storage_path||image.source_path)}} style={styles.image}/>:<View style={styles.imageFallback}><Text style={styles.imageFallbackText}>FUNY PIN</Text></View>}
            <View style={styles.copy}>
              <View style={styles.titleRow}><Text numberOfLines={1} style={styles.name}>{shop.name}</Text><Text style={styles.heart}>♥</Text></View>
              <Text numberOfLines={1} style={styles.meta}>{shop.area||shop.city||'카드샵'} · {station}</Text>
              <Text numberOfLines={1} style={styles.address}>{shop.address}</Text>
            </View>
          </Pressable>
        }):<View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>♡</Text></View><Text style={styles.emptyTitle}>아직 관심 매장이 없어요</Text><Text style={styles.emptyText}>카드샵 상세에서 ♡ 관심 매장을 등록해보세요.</Text><Pressable onPress={()=>router.replace('/(tabs)/map' as any)} style={styles.emptyButton}><Text style={styles.emptyButtonText}>TCG MAP 둘러보기</Text></Pressable></View>}
      </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  content:{padding:16,paddingBottom:36,gap:12},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:C.line,overflow:'hidden',flexDirection:'row',minHeight:112},
  image:{width:112,height:112,backgroundColor:'#eee'},
  imageFallback:{width:112,height:112,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center'},
  imageFallbackText:{fontSize:11,fontWeight:'900',color:C.purpleDark},
  copy:{flex:1,padding:15,justifyContent:'center',minWidth:0},
  titleRow:{flexDirection:'row',alignItems:'center'},
  name:{flex:1,fontSize:16,fontWeight:'900',color:C.text},
  heart:{fontSize:18,color:C.purpleDark,marginLeft:8},
  meta:{marginTop:7,fontSize:11.5,fontWeight:'700',color:C.purpleDark},
  address:{marginTop:5,fontSize:11,color:C.muted},
  empty:{paddingTop:100,alignItems:'center',paddingHorizontal:30},
  emptyIcon:{width:68,height:68,borderRadius:34,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center'},
  emptyIconText:{fontSize:30,color:C.purpleDark},
  emptyTitle:{marginTop:16,fontSize:16,fontWeight:'900',color:C.text},
  emptyText:{marginTop:7,fontSize:12,color:C.muted,textAlign:'center',lineHeight:19},
  emptyButton:{marginTop:20,height:44,paddingHorizontal:18,borderRadius:22,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},
  emptyButtonText:{fontSize:12,fontWeight:'900',color:'#fff'}
});
