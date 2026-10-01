import { useCallback,useState } from 'react';
import { ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

type BlockedUser={blocked_user_id:string;nickname:string;blocked_at:string};

export default function BlockedUsers(){
  const [loading,setLoading]=useState(true);
  const [rows,setRows]=useState<BlockedUser[]>([]);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const {data,error}=await supabase.rpc('list_my_blocked_users');
      if(error)throw error;
      setRows((data||[]) as BlockedUser[]);
    }catch(e:any){Alert.alert('불러오기 실패',String(e?.message||e));}
    finally{setLoading(false);}
  },[]);
  useFocusEffect(useCallback(()=>{load();},[load]));

  const unblock=(row:BlockedUser)=>Alert.alert('차단을 해제할까요?',`${row.nickname}님의 FUNY PIN 게시물이 다시 표시됩니다.`,[
    {text:'취소',style:'cancel'},
    {text:'차단 해제',onPress:async()=>{
      const {data:{user}}=await supabase.auth.getUser();if(!user)return;
      const {error}=await supabase.from('community_user_blocks').delete().eq('blocker_user_id',user.id).eq('blocked_user_id',row.blocked_user_id);
      if(error){Alert.alert('처리 실패',error.message);return;}
      setRows(prev=>prev.filter(x=>x.blocked_user_id!==row.blocked_user_id));
    }}
  ]);

  return <View style={styles.root}>
    <MySubHeader title="차단한 사용자"/>
    {loading?<View style={styles.center}><ActivityIndicator color={C.purple}/></View>:<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {rows.length?rows.map(row=><View key={row.blocked_user_id} style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{row.nickname.slice(0,1).toUpperCase()}</Text></View><View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{row.nickname}</Text><Text style={styles.sub}>FUNY TALK에서 차단한 사용자</Text></View><Pressable onPress={()=>unblock(row)} style={styles.button}><Text style={styles.buttonText}>차단 해제</Text></Pressable></View>):<View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>차단한 사용자가 없어요</Text><Text style={styles.emptyText}>FUNY TALK 게시물에서 불편한 작성자를 차단할 수 있어요.</Text></View>}
    </ScrollView>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:16,paddingBottom:36,gap:9},
  row:{minHeight:72,paddingHorizontal:14,borderWidth:1,borderColor:C.line,borderRadius:16,backgroundColor:'#fff',flexDirection:'row',alignItems:'center'},
  avatar:{width:40,height:40,borderRadius:20,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:15,fontWeight:'900',color:C.purpleDark},
  copy:{flex:1,minWidth:0,marginLeft:11},name:{fontSize:13.5,fontWeight:'800',color:C.text},sub:{marginTop:3,fontSize:10.5,color:C.muted},
  button:{height:34,paddingHorizontal:11,borderRadius:10,borderWidth:1,borderColor:'#DCD4E8',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},buttonText:{fontSize:10.5,fontWeight:'800',color:C.purpleDark},
  empty:{paddingTop:110,alignItems:'center',paddingHorizontal:34},emptyIcon:{fontSize:28,color:C.purpleDark},emptyTitle:{marginTop:12,fontSize:16,fontWeight:'900',color:C.text},emptyText:{marginTop:7,fontSize:12,lineHeight:19,textAlign:'center',color:C.muted}
});
