import { useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C,T,UI } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const HERO='https://funypin.kr/assets/banners/banner_hero_01.png';

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
      <Pressable onPress={goHome} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text allowFontScaling maxFontSizeMultiplier={1} style={styles.headerTitle}>로그인</Text>
    </View>

    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content,{paddingBottom:Math.max(30,insets.bottom+20)}]}
    >
      <View style={styles.hero}>
        <Image source={{uri:HERO}} resizeMode="cover" style={styles.heroImage}/>
      </View>

      <View style={styles.intro}>
        <Text style={styles.tagline}>내 취향의 카드샵을 찾아보세요</Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>TCG MAP</Text>
          <Text style={styles.feature}>INFORMATION</Text>
          <Text style={styles.feature}>SCHEDULE</Text>
          <Text style={styles.feature}>COMMUNITY</Text>
        </View>
        <Text style={styles.joinNote}>처음 이용하는 소셜 계정은 로그인과 동시에 회원가입됩니다.</Text>
      </View>

      <View style={[styles.providerCard,busy&&{opacity:.62}]} pointerEvents={busy?'none':'auto'}>
        <Pressable onPress={()=>social('kakao')} style={styles.kakao}>
          <View style={styles.providerIcon}><Ionicons name="chatbubble" size={21} color="#17120A"/></View>
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
          <View style={styles.providerIcon}/>
        </Pressable>

        <Pressable onPress={()=>social('google')} style={styles.google}>
          <View style={styles.providerIcon}><Text style={styles.googleIcon}>G</Text></View>
          <Text style={styles.googleText}>Google로 시작하기</Text>
          <View style={styles.providerIcon}/>
        </Pressable>

        {Platform.OS==='ios'?<Pressable onPress={apple} style={styles.apple}>
          <View style={styles.providerIcon}><Ionicons name="logo-apple" size={23} color="#fff"/></View>
          <Text style={styles.appleText}>Apple로 시작하기</Text>
          <View style={styles.providerIcon}/>
        </Pressable>:null}
      </View>

      <View style={styles.consentArea}>
        <Pressable onPress={()=>setAccepted(v=>!v)} style={styles.consentRow}>
          <View style={[styles.checkBox,accepted&&styles.checkBoxOn]}>
            {accepted?<Text style={styles.checkMark}>✓</Text>:null}
          </View>
          <Text style={styles.consentText}>
            <Text style={styles.required}>[필수]</Text> 이용약관 및 커뮤니티 운영정책에 동의합니다.
          </Text>
        </Pressable>
      </View>

      {busy?<View style={styles.busy}>
        <ActivityIndicator color={C.purpleDark}/>
        <Text style={styles.busyText}>로그인 화면을 여는 중...</Text>
      </View>:null}

      <View style={styles.legalLinks}>
        <Pressable onPress={()=>openLegal('terms.html','이용약관')}><Text style={styles.legalLink}>이용약관</Text></Pressable>
        <Text style={styles.divider}>·</Text>
        <Pressable onPress={()=>openLegal('privacy.html','개인정보처리방침')}><Text style={styles.legalLink}>개인정보처리방침</Text></Pressable>
        <Text style={styles.divider}>·</Text>
        <Pressable onPress={()=>openLegal('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalLink}>커뮤니티 운영정책</Text></Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#fff'},
  header:{
    height:UI.headerH,
    paddingHorizontal:14,
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#fff'
  },
  back:{
    width:36,
    height:36,
    alignItems:'center',
    justifyContent:'center',
    marginRight:4
  },
  backText:{
    fontSize:29,
    lineHeight:31,
    fontWeight:'400',
    color:C.text
  },
  headerTitle:{
    ...T.header,
    color:C.text
  },
  content:{
    paddingHorizontal:20,
    paddingTop:10
  },
  hero:{
    width:'72%',
    aspectRatio:1.30,
    alignSelf:'center',
    overflow:'hidden',
    backgroundColor:'#F2F0FF'
  },
  heroImage:{
    position:'absolute',
    top:0,
    bottom:0,
    left:'-50%',
    width:'150%',
    height:'100%'
  },
  intro:{
    alignItems:'center',
    marginTop:0
  },
  tagline:{
    marginTop:0,
    fontSize:21,
    lineHeight:28,
    fontWeight:'900',
    letterSpacing:-.65,
    color:'#111015',
    textAlign:'center'
  },
  featureList:{
    marginTop:18,
    alignItems:'center',
    gap:7
  },
  feature:{
    fontSize:15.5,
    lineHeight:20,
    fontWeight:'500',
    letterSpacing:.1,
    color:'#18151D'
  },
  joinNote:{
    marginTop:13,
    fontSize:10.5,
    lineHeight:16,
    color:'#99919D',
    textAlign:'center'
  },
  providerCard:{
    marginTop:26,
    padding:5,
    gap:10,
    borderRadius:0,
    backgroundColor:'#F7F4FC'
  },
  kakao:{
    height:56,
    borderRadius:15,
    backgroundColor:'#FEE500',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:18
  },
  google:{
    height:56,
    borderRadius:15,
    backgroundColor:'#fff',
    borderWidth:1,
    borderColor:'#DDD8E1',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:18
  },
  apple:{
    height:56,
    borderRadius:15,
    backgroundColor:'#050505',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal:18
  },
  providerIcon:{
    width:28,
    height:28,
    alignItems:'center',
    justifyContent:'center'
  },
  googleIcon:{
    fontSize:20,
    fontWeight:'900',
    color:'#4285F4'
  },
  kakaoText:{
    fontSize:14,
    fontWeight:'900',
    color:'#211A00'
  },
  googleText:{
    fontSize:14,
    fontWeight:'900',
    color:C.text
  },
  appleText:{
    fontSize:14,
    fontWeight:'900',
    color:'#fff'
  },
  consentArea:{
    paddingHorizontal:14,
    marginTop:13
  },
  consentRow:{
    flexDirection:'row',
    alignItems:'center'
  },
  checkBox:{
    width:22,
    height:22,
    borderRadius:6,
    borderWidth:1.5,
    borderColor:'#B8AEC2',
    backgroundColor:'#fff',
    alignItems:'center',
    justifyContent:'center'
  },
  checkBoxOn:{
    backgroundColor:C.purpleDark,
    borderColor:C.purpleDark
  },
  checkMark:{
    fontSize:13,
    lineHeight:16,
    fontWeight:'900',
    color:'#fff'
  },
  consentText:{
    flex:1,
    marginLeft:9,
    fontSize:10.5,
    lineHeight:17,
    fontWeight:'700',
    color:'#6E6673'
  },
  required:{
    color:C.purpleDark,
    fontWeight:'900'
  },
  busy:{
    marginTop:12,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:8
  },
  busyText:{
    fontSize:10.5,
    color:C.muted
  },
  legalLinks:{
    marginTop:74,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    flexWrap:'wrap'
  },
  legalLink:{
    fontSize:10,
    lineHeight:16,
    fontWeight:'700',
    color:'#9A929E',
    textDecorationLine:'underline'
  },
  divider:{
    marginHorizontal:7,
    fontSize:10,
    color:'#C4BDC8'
  }
});
