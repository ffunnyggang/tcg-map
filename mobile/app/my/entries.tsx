import { useCallback,useState } from 'react';
import { ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { getMyEntries,MyEntry,submitGaraponInstagram } from '../../lib/my';

const date=(value:string)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'numeric',day:'numeric'});
const claimLabel=(value?:string)=>({
  awaiting_instagram:'Instagram ID 입력 필요',
  pending_review:'관리자 확인 대기',
  ready:'상품 처리 대기',
  verified:'확인 완료',
  dm_sent:'Instagram DM 발송 완료',
  fulfilled:'상품 전달 완료',
  expired:'처리 기간 만료',
  cancelled:'당첨 취소'
}[value??'']??value??'처리 중');

export default function Entries(){
  const [loading,setLoading]=useState(true);
  const [items,setItems]=useState<MyEntry[]>([]);
  const [instagramIds,setInstagramIds]=useState<Record<string,string>>({});
  const [submitting,setSubmitting]=useState('');

  const load=async()=>{
    setLoading(true);
    try{setItems(await getMyEntries())}catch{}finally{setLoading(false)}
  };
  useFocusEffect(useCallback(()=>{void load()},[]));

  const submitInstagram=async(item:MyEntry)=>{
    const claimId=String(item.metadata?.claim_id??'');
    const instagramId=String(instagramIds[item.id]??'').trim();
    if(!claimId){Alert.alert('확인할 수 없어요','당첨 처리 정보를 다시 불러온 뒤 시도해주세요.');return}
    if(!/^[a-zA-Z0-9._]{1,30}$/.test(instagramId.replace(/^@/,''))){
      Alert.alert('Instagram ID 확인','@를 제외한 Instagram ID를 정확히 입력해주세요.');
      return;
    }
    setSubmitting(item.id);
    try{
      await submitGaraponInstagram(claimId,instagramId);
      Alert.alert('제출 완료','관리자 확인 후 입력한 Instagram 계정으로 상품 발송 안내 DM을 보내드립니다.');
      setInstagramIds(prev=>({...prev,[item.id]:''}));
      await load();
    }catch(error){
      const message=error instanceof Error?error.message:'';
      Alert.alert('제출하지 못했어요',message==='claim_locked'?'이미 관리자 확인이 완료된 당첨 내역입니다.':'잠시 후 다시 시도해주세요.');
    }finally{setSubmitting('')}
  };

  return <View style={styles.root}>
    <MySubHeader title="응모 내역"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {items.length?items.map(item=>{
          const isGarapon=item.source_type==='garapon_event';
          const metadata=item.metadata??{};
          const claimStatus=String(metadata.claim_status??item.status??'');
          const needsInstagram=isGarapon&&metadata.claim_required===true&&claimStatus==='awaiting_instagram';
          return <View key={item.id} style={styles.card}>
            <View style={[styles.badge,isGarapon&&styles.garaponBadge]}><Text style={[styles.badgeText,isGarapon&&styles.garaponBadgeText]}>{isGarapon?'가라폰 당첨':'응모'}</Text></View>
            <Text style={styles.title}>{item.title}</Text>
            {item.description?<Text style={styles.description}>{item.description}</Text>:null}
            {isGarapon?<View style={styles.resultBox}>
              <View style={[styles.ball,{backgroundColor:String(metadata.color_hex??'#D8D2E1')}]} />
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>{String(metadata.prize_title??item.description??'당첨 상품')}</Text>
                <Text style={styles.resultLabel}>{String(metadata.result_label??'가라폰 이벤트')}</Text>
              </View>
            </View>:null}
            <View style={styles.metaRow}><Text style={styles.meta}>{date(item.created_at)}</Text><Text style={styles.status}>{isGarapon?claimLabel(claimStatus):(item.status==='active'?'응모 완료':item.status)}</Text></View>
            {item.code?<View style={styles.codeBox}><Text style={styles.codeLabel}>응모 코드</Text><Text style={styles.code}>{item.code}</Text></View>:null}
            {needsInstagram?<View style={styles.claimBox}>
              <Text style={styles.claimLabel}>Instagram ID 입력</Text>
              <View style={styles.claimForm}>
                <TextInput
                  style={styles.claimInput}
                  value={instagramIds[item.id]??''}
                  onChangeText={value=>setInstagramIds(prev=>({...prev,[item.id]:value}))}
                  placeholder="@ 제외 아이디"
                  placeholderTextColor="#A9A1AE"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  editable={submitting!==item.id}
                  returnKeyType="done"
                />
                <Pressable style={({pressed})=>[styles.claimButton,pressed&&styles.claimButtonPressed,submitting===item.id&&styles.claimButtonDisabled]} onPress={()=>void submitInstagram(item)} disabled={submitting===item.id}>
                  {submitting===item.id?<ActivityIndicator size="small" color="#fff"/>:<Text style={styles.claimButtonText}>제출</Text>}
                </Pressable>
              </View>
              <Text style={styles.claimNote}>관리자 확인 후 입력한 계정으로 상품 발송 안내 DM을 보내드립니다.</Text>
            </View>:isGarapon?<View style={styles.claimState}><Text style={styles.claimStateText}>{claimLabel(claimStatus)}{metadata.instagram_id?` · @${String(metadata.instagram_id)}`:''}</Text></View>:null}
          </View>
        }):<View style={styles.empty}><Text style={styles.emptyEmoji}>🎟</Text><Text style={styles.emptyTitle}>응모 내역이 없어요</Text><Text style={styles.emptyText}>퍼니몬 이벤트나 가라폰 이벤트에 당첨되면 이곳에서 확인할 수 있어요.</Text></View>}
      </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  content:{paddingHorizontal:14,paddingTop:16,paddingBottom:34,gap:11},
  card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:'#E9E3ED',padding:17,shadowColor:'#332941',shadowOpacity:.035,shadowRadius:16,shadowOffset:{width:0,height:4},elevation:1},
  badge:{alignSelf:'flex-start',height:23,paddingHorizontal:8,borderRadius:999,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center'},
  badgeText:{fontSize:9.5,fontWeight:'850',color:C.purpleDark},
  garaponBadge:{backgroundColor:'#FFF3DF'},
  garaponBadgeText:{color:'#9B6514'},
  title:{marginTop:10,fontSize:15,fontWeight:'900',color:C.text},
  description:{marginTop:6,fontSize:11,lineHeight:17,color:'#7E7684'},
  resultBox:{marginTop:11,padding:11,borderRadius:12,backgroundColor:'#FAF8FC',flexDirection:'row',alignItems:'center',gap:9},
  ball:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:'rgba(50,40,60,.12)'},
  resultCopy:{flex:1,minWidth:0},
  resultTitle:{fontSize:11,fontWeight:'900',color:C.text},
  resultLabel:{marginTop:3,fontSize:9,color:'#8C8491'},
  metaRow:{marginTop:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  meta:{fontSize:10.5,color:C.muted},
  status:{flexShrink:1,textAlign:'right',fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  codeBox:{marginTop:12,padding:11,borderRadius:11,backgroundColor:'#F7F4FC'},
  codeLabel:{fontSize:9,color:'#938B98'},
  code:{marginTop:4,fontSize:13,fontWeight:'900',letterSpacing:1,color:C.text},
  claimBox:{marginTop:12,padding:12,borderRadius:12,borderWidth:1,borderColor:'#E4DDEF',backgroundColor:'#fff'},
  claimLabel:{fontSize:9,fontWeight:'850',color:C.text,marginBottom:7},
  claimForm:{flexDirection:'row',gap:7},
  claimInput:{flex:1,height:40,borderWidth:1,borderColor:'#DDD6E5',borderRadius:10,paddingHorizontal:10,fontSize:11,color:C.text,backgroundColor:'#fff'},
  claimButton:{width:76,height:40,borderRadius:10,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
  claimButtonPressed:{opacity:.85},
  claimButtonDisabled:{opacity:.55},
  claimButtonText:{fontSize:11,fontWeight:'900',color:'#fff'},
  claimNote:{marginTop:8,fontSize:9.5,lineHeight:15,color:C.muted},
  claimState:{marginTop:12,padding:11,borderRadius:11,backgroundColor:'#F1ECFA'},
  claimStateText:{fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  empty:{paddingTop:110,alignItems:'center',paddingHorizontal:30},
  emptyEmoji:{fontSize:34},
  emptyTitle:{marginTop:14,fontSize:16,fontWeight:'900',color:C.text},
  emptyText:{marginTop:7,fontSize:12,lineHeight:19,color:C.muted,textAlign:'center'}
});
