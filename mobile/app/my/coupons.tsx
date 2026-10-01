import { useCallback,useState } from 'react';
import { ActivityIndicator,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { getMyCoupons,MyCoupon } from '../../lib/my';

const date=(value:string)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'numeric',day:'numeric'});

export default function Coupons(){
  const [loading,setLoading]=useState(true);
  const [items,setItems]=useState<MyCoupon[]>([]);
  const load=async()=>{setLoading(true);try{setItems(await getMyCoupons())catch{}finally{setLoading(false)}};
  useFocusEffect(useCallback(()=>{load()},[]));

  return <View style={styles.root}>
    <MySubHeader title="쿠폰함"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length?items.map(item=><View key={item.id} style={styles.coupon}>
          <View style={styles.left}><Text style={styles.kicker}>FUNY PIN COUPON</Text><Text style={styles.title}>{item.title}</Text>{item.description?<Text style={styles.description}>{item.description}</Text>:null}{item.shop_name?<Text style={styles.shop}>{item.shop_name}</Text>:null}</View>
          <View style={styles.right}><Text style={styles.code}>{item.code||'COUPON'}</Text><Text style={styles.date}>{item.expires_at?'~ '+date(item.expires_at):date(item.issued_at)}</Text></View>
        </View>):<View style={styles.empty}><Text style={styles.emptyEmoji}>🎫</Text><Text style={styles.emptyTitle}>사용 가능한 쿠폰이 없어요</Text><Text style={styles.emptyText}>이벤트 등을 통해 발급된 쿠폰이 이곳에 표시됩니다.</Text></View>}
      </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  content:{padding:16,paddingBottom:36,gap:12},
  coupon:{minHeight:132,backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:C.line,overflow:'hidden',flexDirection:'row'},
  left:{flex:1,padding:17,justifyContent:'center'},
  right:{width:100,padding:13,justifyContent:'center',alignItems:'center',backgroundColor:'#EEE8FA',borderLeftWidth:1,borderLeftColor:'#E0D5F0'},
  kicker:{fontSize:8.5,fontWeight:'900',letterSpacing:1,color:C.purpleDark},
  title:{marginTop:7,fontSize:15,fontWeight:'900',color:C.text},
  description:{marginTop:5,fontSize:10.5,lineHeight:16,color:C.muted},
  shop:{marginTop:7,fontSize:10,fontWeight:'800',color:C.purpleDark},
  code:{fontSize:12,fontWeight:'900',color:C.text,textAlign:'center'},
  date:{marginTop:7,fontSize:9,color:C.muted,textAlign:'center'},
  empty:{paddingTop:110,alignItems:'center',paddingHorizontal:30},
  emptyEmoji:{fontSize:34},
  emptyTitle:{marginTop:14,fontSize:16,fontWeight:'900',color:C.text},
  emptyText:{marginTop:7,fontSize:12,lineHeight:19,color:C.muted,textAlign:'center'}
});
