import { useEffect, useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,SafeAreaView,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { deleteAccount, getProfile, signOut } from '../lib/auth';
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

export default function Account() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => { try { const x = await getProfile(); setUser(x.user); setProfile(x.profile); } finally { setLoading(false); } };
  useEffect(() => { refresh(); }, []);

  const social = async (provider: 'google' | 'kakao') => { setBusy(provider); try { const ok = await signInSocial(provider); if (ok) await refresh(); } catch (e:any) { Alert.alert('로그인 실패', String(e?.message || e)); } finally { setBusy(null); } };
  const apple = async () => { setBusy('apple'); try { await signInWithApple(); await refresh(); } catch (e:any) { if (e?.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple 로그인 실패',String(e?.message || e)); } finally { setBusy(null); } };
  const logout = async () => { setBusy('out'); try { await signOut(); await refresh(); } finally { setBusy(null); } };
  const removeAccount = () => { Alert.alert('계정을 삭제할까요?','계정과 프로필, 즐겨찾기 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.')}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e))}finally{setBusy(null)}}}]); };

  const openWebMenu=(file:string,title:string)=>{
    router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}});
  };

  if (loading) return <SafeAreaView style={{flex:1,justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const nickname=profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||user?.user_metadata?.full_name||'FUNY PIN 회원';
  const avatar=user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null;
  const initials=String(nickname).trim().slice(0,1).toUpperCase();

  return <SafeAreaView style={{flex:1,backgroundColor:'#F7F5FB'}}>
    <View style={styles.header}>
      <Pressable onPress={()=>router.back()} hitSlop={8} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Image source={{uri:visualAssets.logo}} resizeMode="contain" style={styles.logo}/>
      <Text style={styles.brand}>FUNY PIN</Text>
      <Text style={styles.by}>by 깽퐌커플</Text>
      <View style={styles.myPill}><Text style={styles.myPillText}>MY</Text></View>
    </View>

    <View style={styles.content}>
      <Text style={styles.kicker}>MY FUNY PIN</Text>
      <Text style={styles.title}>내 FUNY PIN</Text>
      <Text style={styles.subtitle}>회원 정보와 서비스 메뉴를 한곳에서 관리하세요.</Text>

      {user ? <>
        <View style={[styles.profileCard,shadow]}>
          <View style={styles.profileTop}>
            {avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>}
            <View style={styles.profileCopy}>
              <View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{nickname}</Text><View style={styles.memberBadge}><Text style={styles.memberBadgeText}>MEMBER</Text></View></View>
              <Text numberOfLines={1} style={styles.email}>{user.email||'소셜 로그인 계정'}</Text>
            </View>
          </View>
          <View style={styles.profileDivider}/>
          <View style={styles.profileMeta}><Text style={styles.metaLabel}>ACCOUNT</Text><Text style={styles.metaValue}>FUNY PIN 회원</Text></View>
        </View>
        <Pressable onPress={logout} disabled={!!busy} style={styles.primaryAction}><Text style={styles.primaryActionText}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable>
        <Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteAction}><Text style={styles.deleteText}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable>
      </> : <>
        <View style={[styles.profileCard,shadow]}>
          <View style={styles.guestAvatar}><Image source={{uri:visualAssets.logo}} resizeMode="contain" style={{width:30,height:34}}/></View>
          <Text style={styles.guestTitle}>FUNY PIN을 더 편하게</Text>
          <Text style={styles.guestText}>로그인하면 회원 기능을 사용할 수 있고, 앞으로 추가되는 기능도 한곳에서 관리할 수 있어요.</Text>
        </View>
        {Platform.OS==='ios'?<View style={{marginTop:16,opacity:busy?0.6:1}} pointerEvents={busy?'none':'auto'}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{width:'100%',height:52}} onPress={apple}/></View>:<>
          <Pressable disabled={!!busy} onPress={()=>social('kakao')} style={styles.kakao}><Text style={styles.socialText}>카카오로 시작하기</Text></Pressable>
          <Pressable disabled={!!busy} onPress={()=>social('google')} style={styles.google}><Text style={styles.googleText}>Google로 계속하기</Text></Pressable>
          <Pressable disabled style={styles.naver}><Text style={styles.naverText}>네이버로 시작하기 · 준비 중</Text></Pressable>
        </>}
      </>}

      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>FUNY PIN 메뉴</Text>
        <View style={[styles.menuCard,shadow]}>
          {WEB_MENU.map(([label,file],i)=><Pressable key={file} onPress={()=>openWebMenu(file,label)} style={[styles.menuRow,i<WEB_MENU.length-1&&styles.menuRowBorder]}>
            <Text style={styles.menuLabel}>{label}</Text><Text style={styles.chevron}>›</Text>
          </Pressable>)}
        </View>
      </View>
    </View>
  </SafeAreaView>;
}

const styles={
  header:{height:58,paddingHorizontal:14,flexDirection:'row' as const,alignItems:'center' as const,backgroundColor:'rgba(255,255,255,.96)',borderBottomWidth:1,borderBottomColor:C.line},
  back:{width:32,height:36,alignItems:'center' as const,justifyContent:'center' as const,marginRight:2},
  backText:{fontSize:30,lineHeight:32,color:C.text},
  logo:{width:30,height:34,marginRight:7},
  brand:{fontSize:24,fontWeight:'800' as const,letterSpacing:-.6,color:C.text},
  by:{marginLeft:8,fontSize:11,color:'#85818E'},
  myPill:{marginLeft:'auto' as const,minWidth:36,height:34,paddingHorizontal:10,borderRadius:17,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},
  myPillText:{fontSize:11,fontWeight:'900' as const,color:C.purpleDark},
  content:{padding:18,paddingBottom:36},
  kicker:{fontSize:10,fontWeight:'800' as const,letterSpacing:2,color:'#9C92B5'},
  title:{marginTop:4,fontSize:26,fontWeight:'900' as const,letterSpacing:-.9,color:C.text},
  subtitle:{marginTop:5,fontSize:12.5,lineHeight:19,color:C.muted},
  profileCard:{marginTop:16,padding:18,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},
  profileTop:{flexDirection:'row' as const,alignItems:'center' as const},
  avatar:{width:58,height:58,borderRadius:29,backgroundColor:C.purpleSoft,alignItems:'center' as const,justifyContent:'center' as const,borderWidth:1,borderColor:'#E5DCF8'},
  avatarImage:{width:58,height:58,borderRadius:29},
  avatarText:{fontSize:22,fontWeight:'900' as const,color:C.purpleDark},
  profileCopy:{flex:1,marginLeft:13,minWidth:0},
  nameRow:{flexDirection:'row' as const,alignItems:'center' as const,gap:7},
  name:{flexShrink:1,fontSize:18,fontWeight:'900' as const,color:C.text},
  memberBadge:{paddingHorizontal:7,paddingVertical:4,borderRadius:999,backgroundColor:C.purpleSoft},
  memberBadgeText:{fontSize:8,fontWeight:'900' as const,color:C.purpleDark},
  email:{marginTop:5,fontSize:12,color:C.muted},
  profileDivider:{height:1,backgroundColor:C.divider,marginVertical:15},
  profileMeta:{flexDirection:'row' as const,justifyContent:'space-between' as const,alignItems:'center' as const},
  metaLabel:{fontSize:9,fontWeight:'900' as const,letterSpacing:1.5,color:C.muted2},
  metaValue:{fontSize:11,fontWeight:'700' as const,color:C.textSoft},
  primaryAction:{marginTop:12,height:48,borderRadius:14,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:C.text},
  primaryActionText:{fontSize:13,fontWeight:'800' as const,color:'#fff'},
  deleteAction:{marginTop:8,height:42,alignItems:'center' as const,justifyContent:'center' as const},
  deleteText:{fontSize:11,fontWeight:'700' as const,color:C.danger},
  guestAvatar:{width:58,height:58,borderRadius:29,backgroundColor:C.purpleSoft,alignItems:'center' as const,justifyContent:'center' as const},
  guestTitle:{marginTop:14,fontSize:18,fontWeight:'900' as const,color:C.text},
  guestText:{marginTop:7,fontSize:12.5,lineHeight:19,color:C.muted},
  kakao:{marginTop:16,height:52,borderRadius:14,backgroundColor:'#FEE500',alignItems:'center' as const,justifyContent:'center' as const},
  socialText:{fontWeight:'900' as const,color:'#191600'},
  google:{marginTop:10,height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center' as const,justifyContent:'center' as const},
  googleText:{fontWeight:'800' as const,color:C.text},
  naver:{marginTop:10,height:52,borderRadius:14,backgroundColor:'#03C75A',opacity:.45,alignItems:'center' as const,justifyContent:'center' as const},
  naverText:{fontWeight:'900' as const,color:'#fff'},
  menuSection:{marginTop:22},
  menuTitle:{fontSize:12,fontWeight:'900' as const,color:C.text,marginBottom:8},
  menuCard:{borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  menuRow:{minHeight:50,paddingHorizontal:16,flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'space-between' as const},
  menuRowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},
  menuLabel:{fontSize:12.5,fontWeight:'700' as const,color:C.textSoft},
  chevron:{fontSize:20,fontWeight:'400' as const,color:C.muted2},
} as const;
