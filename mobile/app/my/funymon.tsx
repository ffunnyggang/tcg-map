import { useCallback,useState } from 'react';
import { ActivityIndicator,Image,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { FUNYMON_DEFS,getMyFunyMonIds } from '../../lib/my';

export default function FunyMonCollection(){
  const [loading,setLoading]=useState(true);
  const [caught,setCaught]=useState<Set<string>>(new Set());
  const load=async()=>{setLoading(true);try{setCaught(await getMyFunyMonIds())}finally{setLoading(false)}};
  useFocusEffect(useCallback(()=>{load()},[]));

  return <View style={styles.root}>
    <MySubHeader title="퍼니몬 도감"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View><Text style={styles.kicker}>FUNY MON COLLECTION</Text><Text style={styles.heroTitle}>나만의 퍼니몬 도감</Text><Text style={styles.heroText}>{caught.size} / {FUNYMON_DEFS.length}종 포획 완료</Text></View>
          <View style={styles.progress}><View style={[styles.progressFill,{width:((caught.size/FUNYMON_DEFS.length)*100)+'%' as any}]}/></View>
        </View>
        <View style={styles.grid}>
          {FUNYMON_DEFS.map(mon=>{
            const isCaught=caught.has(mon.id);
            return <View key={mon.id} style={[styles.card,isCaught&&styles.cardCaught]}>
              <View style={styles.imageWrap}>
                <Image source={{uri:mon.asset}} resizeMode="contain" style={[styles.monImage,!isCaught&&styles.silhouette]}/>
                {!isCaught?<View style={styles.lockOverlay}><Text style={styles.lock}>?</Text></View>:null}
              </View>
              <Text style={styles.no}>No.{mon.no}</Text>
              <Text style={[styles.name,!isCaught&&styles.lockedText]}>{isCaught?mon.name:'???'}</Text>
              <Text style={styles.type}>{mon.type} · {'★'.repeat(mon.stars)}</Text>
            </View>
          })}
        </View>
      </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  content:{padding:16,paddingBottom:36},
  hero:{padding:18,borderRadius:20,backgroundColor:'#EEE8FA',borderWidth:1,borderColor:'#E1D6F4'},
  kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:C.purpleDark},
  heroTitle:{marginTop:5,fontSize:20,fontWeight:'900',color:C.text},
  heroText:{marginTop:6,fontSize:12,fontWeight:'700',color:C.muted},
  progress:{height:7,marginTop:15,borderRadius:4,backgroundColor:'rgba(255,255,255,.7)',overflow:'hidden'},
  progressFill:{height:'100%',borderRadius:4,backgroundColor:C.purpleDark},
  grid:{marginTop:14,flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{width:'48.5%',minHeight:220,borderRadius:18,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',padding:12},
  cardCaught:{borderColor:'#DED2F2'},
  imageWrap:{height:135,borderRadius:14,backgroundColor:'#F7F4FC',alignItems:'center',justifyContent:'center',overflow:'hidden'},
  monImage:{width:'88%',height:'88%'},
  silhouette:{opacity:.28,tintColor:'#6C637A'},
  lockOverlay:{position:'absolute',width:34,height:34,borderRadius:17,backgroundColor:'rgba(255,255,255,.72)',alignItems:'center',justifyContent:'center'},
  lock:{fontSize:17,fontWeight:'900',color:'#7E748A'},
  no:{marginTop:11,fontSize:9,fontWeight:'900',color:C.purpleDark},
  name:{marginTop:3,fontSize:16,fontWeight:'900',color:C.text},
  lockedText:{color:'#8C8491'},
  type:{marginTop:4,fontSize:10.5,color:C.muted}
});
