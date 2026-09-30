import { useEffect, useState } from 'react';
import { ActivityIndicator,Alert,Platform,Pressable,SafeAreaView,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { deleteAccount, getProfile, signOut } from '../lib/auth';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C,shadow } from '../lib/theme';

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
  if (loading) return <SafeAreaView style={{flex:1,justifyContent:'center',backgroundColor:C.bg}}><ActivityIndicator color={C.purple}/></SafeAreaView>;
  return <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
    <View style={{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:'#F7F3FF'}}>
      <Pressable onPress={()=>router.back()} style={{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontSize:28,lineHeight:30,color:C.text}}>‹</Text></Pressable>
      <Text style={{marginLeft:12,fontSize:20,fontWeight:'900',color:C.text}}>MY FUNY PIN</Text>
    </View>
    <View style={{padding:18}}>
      <Text style={{fontSize:10,fontWeight:'800',letterSpacing:2,color:'#9C92B5'}}>YOUR COLLECTION HUB</Text>
      {user ? <>
        <View style={{marginTop:12,padding:20,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,...shadow}}>
          <View style={{width:52,height:52,borderRadius:26,backgroundColor:C.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:21,fontWeight:'900',color:C.purpleDark}}>FP</Text></View>
          <Text style={{marginTop:14,fontSize:20,fontWeight:'900',color:C.text}}>{profile?.nickname||user.user_metadata?.name||user.user_metadata?.full_name||'FUNY PIN 회원'}</Text>
          <Text style={{marginTop:5,fontSize:13,color:C.muted}}>{user.email||'소셜 로그인 계정'}</Text>
        </View>
        <Pressable onPress={logout} disabled={!!busy} style={{marginTop:14,height:50,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line}}><Text style={{fontWeight:'800',color:C.text}}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable>
        <Pressable onPress={removeAccount} disabled={!!busy} style={{marginTop:10,height:48,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderWidth:1,borderColor:'#F1C7C7'}}><Text style={{fontWeight:'800',color:C.danger}}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable>
      </> : <>
        <View style={{marginTop:12,padding:20,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,...shadow}}>
          <Text style={{fontSize:22,fontWeight:'900',letterSpacing:-.7,color:C.text}}>FUNY PIN을 더 편하게</Text>
          <Text style={{marginTop:8,fontSize:13,lineHeight:20,color:C.muted}}>별도 회원가입 없이 사용 중인 계정으로 시작하세요. 즐겨찾기 등 회원 기능을 사용할 수 있어요.</Text>
        </View>
        {Platform.OS==='ios'?<View style={{marginTop:18,opacity:busy?.6:1}} pointerEvents={busy?'none':'auto'}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={14} style={{width:'100%',height:52}} onPress={apple}/></View>:<>
          <Pressable disabled={!!busy} onPress={()=>social('kakao')} style={{marginTop:18,height:52,borderRadius:14,backgroundColor:'#FEE500',alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900'}}>카카오로 시작하기</Text></Pressable>
          <Pressable disabled={!!busy} onPress={()=>social('google')} style={{marginTop:10,height:52,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'800',color:C.text}}>Google로 계속하기</Text></Pressable>
          <Pressable disabled style={{marginTop:10,height:52,borderRadius:14,backgroundColor:'#03C75A',opacity:.45,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:'#fff'}}>네이버로 시작하기 · 준비 중</Text></Pressable>
        </>}
      </>}
    </View>
  </SafeAreaView>;
}
