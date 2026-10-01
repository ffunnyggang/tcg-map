import { useCallback,useState } from 'react';
import { ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { getMyEntries,MyEntry } from '../../lib/my';

const date=(value:string)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'numeric',day:'numeric'});

export default function Entries(){
  const [loading,setLoading]=useState(true);
  const [items,setItems]=useState<MyEntry[]>([]);
  const load=async()=>{setLoading(true);try{setItems(await getMyEntries())}catch{}finally{setLoading(false)}};
  useFocusEffect(useCallback(()=>{load()},[]));

  return <View style={styles.root}>
    <MySubHeader title="응모 내역"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length?items.map(item=><View key={item.id} style={styles.card}>
          <View style={styles.badge}><Text style={styles.badgeText}>응모</Text></View>
          <Text style={styles.title}>{item.title}</Text>
          {item.description?<Text style={styles.description}>{item.description}</Text>:null}
          <View style={styles.metaRow}><Text style={styles.meta}>{date(item.created_at)}</Text><Text style={styles.status}>{item.status==='active'?'응모 완료':item.status}</Text></View>
          {item.code?<View style={styles.codeBox}><Text style={styles.codeLabel}>응모 코드</Text><Text style={styles.code}>{item.code}</Text></View>:null}
        </View>):<View style={styles.empty}><Text style={styles.emptyEmoji}>🎟</Text><Text style={styles.emptyTitle}>응모 내역이 없어요</Text><Text style={styles.emptyText}>퍼니몬 이벤트 등에 응모하면 이곳에서 확인할 수 있어요.</Text></View>}
      </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  content:{padding:16,paddingBottom:36,gap:12},
  card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:C.line,padding:17},
  badge:{alignSelf:'flex-start',paddingHorizontal:9,paddingVertical:5,borderRadius:999,backgroundColor:'#EEE8FA'},
  badgeText:{fontSize:10,fontWeight:'900',color:C.purpleDark},
  title:{marginTop:10,fontSize:16,fontWeight:'900',color:C.text},
  description:{marginTop:6,fontSize:12,lineHeight:18,color:C.muted},
  metaRow:{marginTop:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  meta:{fontSize:10.5,color:C.muted},
  status:{fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  codeBox:{marginTop:13,padding:12,borderRadius:12,backgroundColor:'#F7F4FC'},
  codeLabel:{fontSize:9.5,color:C.muted},
  code:{marginTop:4,fontSize:13,fontWeight:'900',letterSpacing:1,color:C.text},
  empty:{paddingTop:110,alignItems:'center',paddingHorizontal:30},
  emptyEmoji:{fontSize:34},
  emptyTitle:{marginTop:14,fontSize:16,fontWeight:'900',color:C.text},
  emptyText:{marginTop:7,fontSize:12,lineHeight:19,color:C.muted,textAlign:'center'}
});
