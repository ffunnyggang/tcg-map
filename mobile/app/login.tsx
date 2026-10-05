import { useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C,T,UI } from '../lib/theme';
import { visualAssets } from '../lib/visualAssets';

export default function Login(){
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const {next}=useLocalSearchParams<{next?:string}>();
  const [accepted,setAccepted]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);

  const goHome=()=>router.replace('/(tabs)' as any);
  const finish=()=>{
    if(next==='talk'){router.replace('/(tabs)/talk' as any);return;}
    if(next==='account'){router.replace('/account' as any);return;}
    router.replace('/(tabs)' as any);
  };
  const requireTerms=()=>{
    if(accepted)return true;
    Alert.alert('필수 약관 동의','로그인 또는 회원가입 전에 이용약관 및 커뮤니티 운영정책에 동의해주세요.');
    return false;
  };
  const social=async(provider:'google'|'kakao')=>{
    if(!requireTerms()||busy)return;
    setBusy(provider);
    try{
      const ok=await signInSocial(provider);
      if(ok)finish();
    }catch(e:any){
      Alert.alert('로그인 실패',String(e?.message||e));
    }finally{
      setBusy(null);
    }
  };
  const apple=async()=>{
    if(!requireTerms()||busy)return;
    setBusy('apple');
    try{
      await signInWithApple();
      finish();
    }catch(e:any){
      if(e?.code!=='ERR_REQUEST_CANCELED')Alert.alert('로그인 실패',String(e?.message||e));
    }finally{
      setBusy(null);
    }
  };
  const openLegal=(file:string,title:string)=>router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}} as any);

  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={goHome} hitSlop={10} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <Text allowFontScaling maxFontSizeMultiplier={1} style={styles.headerTitle}>로그인 · 회원가입</Text>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,{paddingBottom:Math.max(40,insets.bottom+24)}]}>
      <View style={styles.brandWrap}>
        <Image source={{uri:visualAssets.logo}} resizeMode="contain" style={styles.logo}/>
        <Text style={styles.brand}>FUNY PIN</Text>
        <Text style={styles.tagline}>내 취향의 카드샵을 찾아보세요</Text>
        <Text style={styles.guide}>카드샵 탐색 등 대부분의 기능은 로그인 없이 이용할 수 있어요.{"\n"}로그인하면 관심 매장, 퍼니몬 도감, 응모 내역과 TALK 활동을 계정에 저장할 수 있습니다.</Text>
        <Text style={styles.joinNote}>처음 이용하는 소셜 계정은 로그인과 동시에 회원가입됩니다.</Text>
      </View>

      <View style={styles.consentBox}>
        <Pressable onPress={()=>setAccepted(v=>!v)} style={styles.consentRow}>
          <View style={[styles.checkBox,accepted&&styles.checkBoxOn]}>{accepted?<Text style={styles.checkMark}>✓</Text>:null}</View>
          <Text style={styles.consentText}><Text style={styles.required}>[필수]</Text> 이용약관 및 커뮤니티 운영정책에 동의합니다.</Text>
        </Pressable>
        <View style={styles.legalLinks}>
          <Pressable onPress={()=>openLegal('terms.html','이용약관')}><Text style={styles.legalLink}>이용약관</Text></Pressable>
          <Text style={styles.divider}>·</Text>
          <Pressable onPress={()=>openLegal('privacy.html','개인정보처리방침')}><Text style={styles.legalLink}>개인정보처리방침</Text></Pressable>
          <Text style={styles.divider}>·</Text>
          <Pressable onPress={()=>openLegal('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalLink}>커뮤니티 운영정책</Text></Pressable>
        </View>
      </View>

      <View style={[styles.providers,busy&&{opacity:.62}]} pointerEvents={busy?'none':'auto'}>
        <Pressable onPress={()=>social('kakao')} style={styles.kakao}>
          <View style={styles.providerIcon}><Text style={styles.kakaoIcon}>●</Text></View>
          <Text style={styles.kakaoText}>카카오로 계속하기</Text>
          <View style={styles.providerIcon}/>
        </Pressable>
        <Pressable onPress={()=>social('google')} style={styles.google}>
          <View style={styles.providerIcon}><Text style={styles.googleIcon}>G</Text></View>
          <Text style={styles.googleText}>Google로 계속하기</Text>
          <View style={styles.providerIcon}/>
        </Pressable>
        {Platform.OS==='ios'?<AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={{width:'100%',height:54}}
          onPress={apple}
        />:null}
      </View>

      {busy?<View style={styles.busy}><ActivityIndicator color={C.purpleDark}/><Text style={styles.busyText}>로그인 화면을 여는 중...</Text></View>:null}
      <Pressable onPress={goHome} style={styles.skip}><Text style={styles.skipText}>로그인 없이 둘러보기</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  header:{height:UI.headerH,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#fff'},
  back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},
  backText:{fontSize:29,lineHeight:31,fontWeight:'400',color:C.text},
  headerTitle:{...T.header,color:C.text},
  content:{paddingHorizontal:20,paddingTop:28},
  brandWrap:{alignItems:'center',paddingHorizontal:8},
  logo:{width:64,height:72},
  brand:{marginTop:7,fontSize:29,fontWeight:'900',letterSpacing:-1,color:C.text},
  tagline:{marginTop:16,fontSize:20,fontWeight:'900',letterSpacing:-.5,color:C.text,textAlign:'center'},
  guide:{marginTop:10,fontSize:12.5,lineHeight:20,color:C.muted,textAlign:'center'},
  joinNote:{marginTop:8,fontSize:10.5,lineHeight:16,color:'#9A929E',textAlign:'center'},
  consentBox:{marginTop:28,padding:14,borderRadius:15,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},
  consentRow:{flexDirection:'row',alignItems:'flex-start'},
  checkBox:{width:21,height:21,borderRadius:6,borderWidth:1.5,borderColor:'#B6ADC1',backgroundColor:'#fff',alignItems:'center',justifyContent:'center',marginTop:1},
  checkBoxOn:{backgroundColor:C.purpleDark,borderColor:C.purpleDark},
  checkMark:{fontSize:13,lineHeight:16,fontWeight:'900',color:'#fff'},
  consentText:{flex:1,marginLeft:9,fontSize:11.5,lineHeight:18,fontWeight:'800',color:C.textSoft},
  required:{fontWeight:'900',color:C.purpleDark},
  legalLinks:{marginTop:9,marginLeft:30,flexDirection:'row',alignItems:'center',flexWrap:'wrap'},
  legalLink:{fontSize:10,fontWeight:'800',color:C.muted,textDecorationLine:'underline'},
  divider:{marginHorizontal:6,fontSize:10,color:'#C2BAC7'},
  providers:{marginTop:14,gap:10},
  kakao:{height:54,borderRadius:14,backgroundColor:'#FEE500',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
  google:{height:54,borderRadius:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#DDD8E1',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16},
  providerIcon:{width:28,height:28,alignItems:'center',justifyContent:'center'},
  kakaoIcon:{fontSize:17,color:'#191600'},
  googleIcon:{fontSize:20,fontWeight:'900',color:'#4285F4'},
  kakaoText:{fontSize:14,fontWeight:'900',color:'#191600'},
  googleText:{fontSize:14,fontWeight:'800',color:C.text},
  busy:{marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  busyText:{fontSize:11,color:C.muted},
  skip:{alignSelf:'center',marginTop:24,minHeight:36,paddingHorizontal:12,justifyContent:'center'},
  skipText:{fontSize:11.5,fontWeight:'800',color:C.purpleDark,textDecorationLine:'underline'}
});
