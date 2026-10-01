import { useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C,shadow } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';

const WEB_MENU=[
  ['공지사항','notice.html'],
  ['자주 묻는 질문','faq.html'],
  ['서비스 만족도 조사','feedback.html'],
  ['매장 등록 · 정보 수정 요청','shop-request.html'],
  ['광고 · 제휴 문의','partner.html'],
] as const;

export default function Account(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [busy,setBusy]=useState<string|null>(null);

  const refresh=async()=>{try{const x=await getProfile();setUser(x.user);setProfile(x.profile);}finally{setLoading(false);}};
  useEffect(()=>{refresh();},[]);

  const social=async(provider:'google'|'kakao')=>{setBusy(provider);try{const ok=await signInSocial(provider);if(ok)await refresh();}catch(e:any){Alert.alert('로그인 실패',String(e?.message||e));}finally{setBusy(null);}};
  const apple=async()=>{setBusy('apple');try{await signInWithApple();await refresh();}catch(e:any){if(e?.code!=='ERR_REQUEST_CANCELED')Alert.alert('Apple 로그인 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=async()=>{setBusy('out');try{await signOut();await refresh();}finally{setBusy(null);}};
  const removeAccount=()=>{Alert.alert('계정을 삭제할까요?','계정과 프로필, 즐겨찾기 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.')}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e))}finally{setBusy(null)}}}]);};

  const openWebMenu=(file:string,title:string)=>{
    router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}});
  };

  if(loading)return <SafeAreaView style={{flex:1,justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const nickname=profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||user?.user_metadata?.full_name||'FUNY PIN 회원';
  const avatar=user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null;
  const initials=String(nickname).trim().slice(0,1).toUpperCase();

  return <SafeAreaView style={{flex:1,backgroundColor:'#F7F5FB'}}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={8} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Text style={styles.headerTitle}>MY</Text>
    </View>

    <View style={styles.content}>
      <View style={styles.profileCard}>
        {user ? (
          avatar
            ? <Image source={{uri:avatar}} style={styles.avatarImage}/>
            : <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        ) : (
          <View style={styles.guestAvatar}><Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:30,height:34}}/></View>
        )}
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.nickname}>{nickname}</Text>
          {user?<Text style={styles.profileMeta}>FUNY PIN 회원</Text>:<Text style={styles.profileMeta}>로그인 후 회원 기능을 이용할 수 있어요.</Text>}
        </View>
        {user?<Pressable onPress={()=>Alert.alert('프로필 수정','프로필 수정 기능은 준비 중입니다.')} style={styles.profileEdit}><Text style={styles.profileEditText}>프로필 수정</Text></Pressable>:null}
      </View>

      {!user?<>{Platform.OS==='ios'?<View style={{marginTop:14,opacity:busy?0.6:1}} pointerEvents={busy?'none':'auto'}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{width:'100%',height:52}} onPress={apple}/></View>:<>
        <Pressable disabled={!!busy} onPress={()=>social('kakao')} style={styles.kakao}><Text style={styles.socialText}>카카오로 시작하기</Text></Pressable>
        <Pressable disabled={!!busy} onPress={()=>social('google')} style={styles.google}><Text style={styles.googleText}>Google로 계속하기</Text></Pressable>
        <Pressable disabled style={styles.naver}><Text style={styles.naverText}>네이버로 시작하기 · 준비 중</Text></Pressable>
      </>}</>:null}

      {user?<View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>내 활동</Text>
        <View style={styles.menuCard}>
          {['관심 매장','퍼니몬 도감','응모 내역'].map((label,i)=>
            <Pressable key={label} onPress={()=>Alert.alert(label,'해당 기능은 준비 중입니다.')} style={[styles.menuRow,i<2&&styles.menuRowBorder]}>
              <Text style={styles.menuLabel}>{label}</Text><Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        </View>
      </View>:null}

      <View style={[styles.menuSection,user&&styles.menuSectionUser]}>
        <Text style={styles.sectionTitle}>고객지원</Text>
        <View style={styles.menuCard}>
          {WEB_MENU.map(([label,file],i)=><Pressable key={file} onPress={()=>openWebMenu(file,label)} style={[styles.menuRow,i<WEB_MENU.length-1&&styles.menuRowBorder]}>
            <Text style={styles.menuLabel}>{label}</Text><Text style={styles.chevron}>›</Text>
          </Pressable>)}
        </View>
      </View>

      {user?<View style={styles.accountActions}>
        <Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{busy==='out'?'처리 중…':'로그아웃'}</Text>
        </Pressable>
        <Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}>
          <Text style={styles.deleteLabel}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text>
        </Pressable>
      </View>:null}
    </View>
  </SafeAreaView>;
const styles={
  header:{height:58,paddingHorizontal:14,flexDirection:'row' as const,alignItems:'center' as const,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:C.line},
  back:{width:36,height:36,alignItems:'center' as const,justifyContent:'center' as const,marginRight:6},
  backText:{fontSize:30,lineHeight:32,color:C.text},
  headerTitle:{fontSize:22,fontWeight:'900' as const,letterSpacing:-.6,color:C.text},
  content:{padding:18,paddingBottom:36},
  profileCard:{minHeight:188,padding:18,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#CFCAD4',alignItems:'center' as const,justifyContent:'center' as const},
  avatar:{width:72,height:72,borderRadius:38,backgroundColor:C.purpleSoft,alignItems:'center' as const,justifyContent:'center' as const,borderWidth:1,borderColor:'#E5DCF8'},
  avatarImage:{width:72,height:72,borderRadius:38},
  avatarText:{fontSize:24,fontWeight:'900' as const,color:C.purpleDark},
  guestAvatar:{width:72,height:72,borderRadius:38,backgroundColor:C.purpleSoft,alignItems:'center' as const,justifyContent:'center' as const},
  profileCopy:{width:'100%',marginTop:10,alignItems:'center' as const,minWidth:0},
  nickname:{fontSize:22,fontWeight:'900' as const,color:C.text,textAlign:'center' as const},
  profileMeta:{marginTop:5,fontSize:12.5,color:C.textSoft,textAlign:'center' as const},
  profileEdit:{marginTop:14,width:'100%',height:42,borderRadius:10,backgroundColor:'#C5C5C7',alignItems:'center' as const,justifyContent:'center' as const},
  profileEditText:{fontSize:13,fontWeight:'800' as const,color:'#17151A'},

  activitySection:{marginTop:24},
  menuSection:{marginTop:24},
  menuSectionUser:{marginTop:28},
  sectionTitle:{fontSize:20,fontWeight:'900' as const,color:C.text,marginBottom:9},
  menuCard:{borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  menuRow:{minHeight:50,paddingHorizontal:16,flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'space-between' as const},
  menuRowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},
  menuLabel:{fontSize:14,fontWeight:'700' as const,color:C.textSoft},
  deleteLabel:{fontSize:12.5,fontWeight:'700' as const,color:C.danger},
  chevron:{fontSize:20,fontWeight:'400' as const,color:C.muted2},
  chevronDanger:{fontSize:20,fontWeight:'400' as const,color:C.danger},
  kakao:{marginTop:14,height:52,borderRadius:14,backgroundColor:'#FEE500',alignItems:'center' as const,justifyContent:'center' as const},
  socialText:{fontWeight:'900' as const,color:'#191600'},
  google:{marginTop:10,height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center' as const,justifyContent:'center' as const},
  googleText:{fontWeight:'800' as const,color:C.text},
  naver:{marginTop:10,height:52,borderRadius:14,backgroundColor:'#03C75A',opacity:.45,alignItems:'center' as const,justifyContent:'center' as const},
  naverText:{fontWeight:'900' as const,color:'#fff'},
  accountActions:{marginTop:18,alignItems:'center' as const},
  logoutButton:{width:'100%',height:54,borderRadius:15,backgroundColor:C.purpleDark,alignItems:'center' as const,justifyContent:'center' as const},
  logoutText:{fontSize:13,fontWeight:'900' as const,color:'#fff'},
  deleteButton:{marginTop:10,minHeight:32,paddingHorizontal:12,alignItems:'center' as const,justifyContent:'center' as const},
} as const;