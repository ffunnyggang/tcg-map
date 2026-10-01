import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';

const WEB_MENU=[
  ['공지사항','notice.html'],
  ['자주 묻는 질문','faq.html'],
  ['서비스 만족도 조사','feedback.html'],
  ['매장 등록 · 정보 수정 요청','shop-request.html'],
  ['광고 · 제휴 문의','partner.html'],
] as const;

const ACTIVITY=[
  {label:'관심 매장',sub:'좋아하는 카드샵을 모아보세요',route:'/my/favorites',icon:'♡'},
  {label:'퍼니몬 도감',sub:'포획한 퍼니몬을 한눈에 확인',route:'/my/funymon',icon:'✦'},
  {label:'응모 내역',sub:'퍼니핀에서 참여한 이벤트 확인',route:'/my/entries',icon:'🎟'},
  {label:'쿠폰함',sub:'발급받은 쿠폰을 확인하세요',route:'/my/coupons',icon:'▣'},
] as const;

const formatJoinDate=(value?:string|null)=>{
  if(!value)return '-';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '-';
  return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');
};

export default function Account(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [busy,setBusy]=useState<string|null>(null);

  const refresh=async()=>{
    try{
      const x=await getProfile();
      setUser(x.user);
      setProfile(x.profile);
    }finally{setLoading(false);}
  };

  useEffect(()=>{refresh();},[]);

  const social=async(provider:'google'|'kakao')=>{
    setBusy(provider);
    try{const ok=await signInSocial(provider);if(ok)await refresh();}
    catch(e:any){Alert.alert('로그인 실패',String(e?.message||e));}
    finally{setBusy(null);}
  };

  const apple=async()=>{
    setBusy('apple');
    try{await signInWithApple();await refresh();}
    catch(e:any){if(e?.code!=='ERR_REQUEST_CANCELED')Alert.alert('Apple 로그인 실패',String(e?.message||e));}
    finally{setBusy(null);}
  };

  const logout=async()=>{
    setBusy('out');
    try{await signOut();await refresh();}
    finally{setBusy(null);}
  };

  const removeAccount=()=>{
    Alert.alert('계정을 삭제할까요?','계정과 프로필, 관심 매장 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[
      {text:'취소',style:'cancel'},
      {text:'계정 삭제',style:'destructive',onPress:async()=>{
        setBusy('delete');
        try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.');}
        catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e));}
        finally{setBusy(null);}
      }}
    ]);
  };

  const openWebMenu=(file:string,title:string)=>{
    router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}});
  };

  if(loading)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const nickname=profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||user?.user_metadata?.full_name||'FUNY PIN 회원';
  const avatar=profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null;
  const joinDate=profile?.created_at||user?.created_at||null;
  const initials=String(nickname).trim().slice(0,1).toUpperCase();

  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={8} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Text style={styles.headerTitle}>MY</Text>
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        {user ? (
          avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        ) : (
          <View style={styles.avatar}><Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:32,height:36}}/></View>
        )}
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.nickname}>{nickname}</Text>
          {user?<Text style={styles.joinDate}>가입일 {formatJoinDate(joinDate)}</Text>:<Text style={styles.joinDate}>로그인하면 MY 기능을 이용할 수 있어요.</Text>}
        </View>
        {user?<Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>프로필 편집</Text></Pressable>:null}
      </View>

      {!user?<View style={styles.loginCard}>
        <Text style={styles.loginTitle}>FUNY PIN과 더 가까워지기</Text>
        <Text style={styles.loginText}>관심 매장, 퍼니몬 도감, 응모 내역 등을 저장할 수 있어요.</Text>
        {Platform.OS==='ios'
          ?<View style={{marginTop:15,opacity:busy?0.6:1}} pointerEvents={busy?'none':'auto'}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{width:'100%',height:50}} onPress={apple}/></View>
          :<View style={{marginTop:15,gap:9}}>
            <Pressable disabled={!!busy} onPress={()=>social('kakao')} style={styles.kakao}><Text style={styles.socialText}>카카오로 시작하기</Text></Pressable>
            <Pressable disabled={!!busy} onPress={()=>social('google')} style={styles.google}><Text style={styles.googleText}>Google로 계속하기</Text></Pressable>
          </View>}
      </View>:null}

      {user?<View style={styles.section}>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>내 활동</Text><Text style={styles.sectionHint}>MY ACTIVITY</Text></View>
        <View style={styles.activityCard}>
          {ACTIVITY.map((item,i)=><Pressable key={item.route} onPress={()=>router.push(item.route as any)} style={[styles.activityRow,i<ACTIVITY.length-1&&styles.rowBorder]}>
            <View style={styles.activityIcon}><Text style={styles.activityIconText}>{item.icon}</Text></View>
            <View style={styles.activityCopy}><Text style={styles.activityLabel}>{item.label}</Text><Text style={styles.activitySub}>{item.sub}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>)}
        </View>
      </View>:null}

      <View style={[styles.section,!user&&{marginTop:24}]}>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>고객지원</Text><Text style={styles.sectionHint}>SUPPORT</Text></View>
        <View style={styles.supportCard}>
          {WEB_MENU.map(([label,file],i)=><Pressable key={file} onPress={()=>openWebMenu(file,label)} style={[styles.supportRow,i<WEB_MENU.length-1&&styles.rowBorder]}>
            <Text style={styles.supportLabel}>{label}</Text><Text style={styles.chevron}>›</Text>
          </Pressable>)}
        </View>
      </View>

      {user?<View style={styles.accountActions}>
        <Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable>
        <Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable>
      </View>:null}

      <View style={styles.legalLinks}>
        <Pressable onPress={()=>openWebMenu('terms.html','이용약관')}><Text style={styles.legalText}>이용약관</Text></Pressable>
        <Text style={styles.legalDivider}>·</Text>
        <Pressable onPress={()=>openWebMenu('privacy.html','개인정보처리방침')}><Text style={styles.legalText}>개인정보처리방침</Text></Pressable>
        <Text style={styles.legalDivider}>·</Text>
        <Pressable onPress={()=>openWebMenu('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalText}>커뮤니티 운영정책</Text></Pressable>
      </View>

    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},
  header:{height:58,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:C.line},
  back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:5},
  backText:{fontSize:30,lineHeight:32,color:C.text},
  headerTitle:{fontSize:22,fontWeight:'900',letterSpacing:-.7,color:C.text},
  content:{padding:16,paddingBottom:40},
  profileCard:{padding:18,borderRadius:22,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3DDED',alignItems:'center'},
  avatar:{width:78,height:78,borderRadius:39,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E0D5F1'},
  avatarImage:{width:78,height:78,borderRadius:39,backgroundColor:'#eee'},
  avatarText:{fontSize:26,fontWeight:'900',color:C.purpleDark},
  profileCopy:{marginTop:11,alignItems:'center',width:'100%'},
  nickname:{fontSize:21,fontWeight:'900',color:C.text},
  joinDate:{marginTop:5,fontSize:11.5,color:C.muted},
  profileEdit:{marginTop:14,width:'100%',height:42,borderRadius:12,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},
  profileEditText:{fontSize:12.5,fontWeight:'900',color:C.purpleDark},
  loginCard:{marginTop:14,padding:18,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},
  loginTitle:{fontSize:16,fontWeight:'900',color:C.text},
  loginText:{marginTop:6,fontSize:11.5,lineHeight:18,color:C.muted},
  kakao:{height:50,borderRadius:13,backgroundColor:'#FEE500',alignItems:'center',justifyContent:'center'},
  socialText:{fontWeight:'900',color:'#191600'},
  google:{height:50,borderRadius:13,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  googleText:{fontWeight:'800',color:C.text},
  section:{marginTop:25},
  sectionHead:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',paddingHorizontal:3,marginBottom:9},
  sectionTitle:{fontSize:19,fontWeight:'900',color:C.text},
  sectionHint:{fontSize:8.5,fontWeight:'900',letterSpacing:1,color:'#A49AAE'},
  activityCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  activityRow:{minHeight:74,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  activityIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},
  activityIconText:{fontSize:18,color:C.purpleDark},
  activityCopy:{flex:1,marginLeft:12},
  activityLabel:{fontSize:14,fontWeight:'900',color:C.text},
  activitySub:{marginTop:4,fontSize:10.5,color:C.muted},
  supportCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  supportRow:{minHeight:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  supportLabel:{fontSize:13,fontWeight:'700',color:C.textSoft},
  rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},
  chevron:{fontSize:21,color:'#B0A9B5'},
  legalLinks:{marginTop:22,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},
  legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},
  legalDivider:{fontSize:10,color:'#C5BDC9'},
  accountActions:{marginTop:18,alignItems:'center'},
  logoutButton:{width:'100%',height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},
  logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},
  deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},
  deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger}
});
