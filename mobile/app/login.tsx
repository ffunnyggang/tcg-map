import { useState } from 'react';
import { Alert,Image,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';
import { C,T,UI } from '../lib/theme';

const LOGIN_GRAPHIC=require('../assets/login_graphic.png');

type SocialButtonProps={
  label:string;
  icon:ReactNode;
  backgroundColor:string;
  textColor:string;
  borderColor?:string;
  disabled?:boolean;
  onPress:()=>void;
};

function SocialButton({label,icon,backgroundColor,textColor,borderColor,disabled,onPress}:SocialButtonProps){
  return <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({pressed})=>[
      styles.socialButton,
      {backgroundColor,borderColor:borderColor||backgroundColor},
      pressed&&!disabled&&styles.socialButtonPressed,
    ]}
  >
    <View style={styles.socialIconSlot}>{icon}</View>
    <Text allowFontScaling maxFontSizeMultiplier={1.1} style={[styles.socialLabel,{color:textColor}]}>{label}</Text>
    <View style={styles.socialIconSlot}/>
  </Pressable>;
}

export default function Login(){
  const router=useRouter();
  const {height}=useWindowDimensions();
  const {next}=useLocalSearchParams<{next?:string}>();
  const [accepted,setAccepted]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const compact=height<760;

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

    <View style={[styles.page,compact&&styles.pageCompact]}>
      <View style={styles.main}>
        <View style={[styles.hero,compact&&styles.heroCompact]}>
          <Image source={LOGIN_GRAPHIC} resizeMode="contain" style={styles.heroImage}/>
        </View>

        <View style={[styles.intro,compact&&styles.introCompact]}>
          <Text allowFontScaling maxFontSizeMultiplier={1.05} style={[styles.tagline,compact&&styles.taglineCompact]}>
            내 취향의 카드샵을 찾아보세요
          </Text>
          <View style={[styles.featureList,compact&&styles.featureListCompact]}>
            <Text style={[styles.feature,compact&&styles.featureCompact]}>TCG MAP</Text>
            <Text style={[styles.feature,compact&&styles.featureCompact]}>INFORMATION</Text>
            <Text style={[styles.feature,compact&&styles.featureCompact]}>SCHEDULE</Text>
            <Text style={[styles.feature,compact&&styles.featureCompact]}>COMMUNITY</Text>
          </View>
        </View>

        <View style={[styles.providerGroup,compact&&styles.providerGroupCompact,busy&&styles.providerBusy]} pointerEvents={busy?'none':'auto'}>
          <SocialButton
            label="카카오로 시작하기"
            icon={<Ionicons name="chatbubble" size={20} color="#191600"/>}
            backgroundColor="#FEE500"
            textColor="#191600"
            disabled={!!busy}
            onPress={()=>social('kakao')}
          />
          <SocialButton
            label="Google로 시작하기"
            icon={<Ionicons name="logo-google" size={22} color="#4285F4"/>}
            backgroundColor="#FFFFFF"
            textColor="#27232C"
            borderColor="#DED9E3"
            disabled={!!busy}
            onPress={()=>social('google')}
          />
          {Platform.OS==='ios'?<SocialButton
            label="Apple로 시작하기"
            icon={<Ionicons name="logo-apple" size={23} color="#FFFFFF"/>}
            backgroundColor="#050505"
            textColor="#FFFFFF"
            disabled={!!busy}
            onPress={apple}
          />:null}
        </View>

        <View style={[styles.consentArea,compact&&styles.consentAreaCompact]}>
          <Pressable onPress={()=>setAccepted(v=>!v)} style={styles.consentRow}>
            <View style={[styles.checkBox,accepted&&styles.checkBoxOn]}>
              {accepted?<Text style={styles.checkMark}>✓</Text>:null}
            </View>
            <Text allowFontScaling maxFontSizeMultiplier={1.05} style={styles.consentText}>
              <Text style={styles.required}>[필수]</Text> 이용약관 및 커뮤니티 운영정책에 동의합니다.
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.legalLinks,compact&&styles.legalLinksCompact]}>
        <Pressable onPress={()=>openLegal('terms.html','이용약관')} hitSlop={6}><Text style={styles.legalLink}>이용약관</Text></Pressable>
        <Text style={styles.divider}>·</Text>
        <Pressable onPress={()=>openLegal('privacy.html','개인정보처리방침')} hitSlop={6}><Text style={styles.legalLink}>개인정보처리방침</Text></Pressable>
        <Text style={styles.divider}>·</Text>
        <Pressable onPress={()=>openLegal('community-guidelines.html','커뮤니티 운영정책')} hitSlop={6}><Text style={styles.legalLink}>커뮤니티 운영정책</Text></Pressable>
      </View>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#FFFFFF'},
  header:{
    height:UI.headerH,
    paddingHorizontal:14,
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#FFFFFF',
  },
  back:{
    width:36,
    height:36,
    alignItems:'center',
    justifyContent:'center',
    marginRight:4,
  },
  backText:{
    fontSize:29,
    lineHeight:31,
    fontWeight:'400',
    color:C.text,
  },
  headerTitle:{
    ...T.header,
    color:C.text,
  },

  page:{
    flex:1,
    paddingHorizontal:24,
    paddingTop:6,
    paddingBottom:14,
    justifyContent:'space-between',
  },
  pageCompact:{
    paddingTop:0,
    paddingBottom:8,
  },
  main:{
    alignItems:'stretch',
  },

  hero:{
    height:205,
    alignItems:'center',
    justifyContent:'center',
    overflow:'hidden',
  },
  heroCompact:{
    height:155,
  },
  heroImage:{
    width:'100%',
    height:'100%',
  },

  intro:{
    alignItems:'center',
    marginTop:2,
  },
  introCompact:{
    marginTop:0,
  },
  tagline:{
    fontSize:21,
    lineHeight:28,
    fontWeight:'800',
    letterSpacing:-.55,
    color:'#211D27',
    textAlign:'center',
  },
  taglineCompact:{
    fontSize:19,
    lineHeight:24,
  },
  featureList:{
    marginTop:14,
    alignItems:'center',
    gap:4,
  },
  featureListCompact:{
    marginTop:9,
    gap:2,
  },
  feature:{
    fontSize:13.5,
    lineHeight:18,
    fontWeight:'600',
    letterSpacing:.15,
    color:'#756F83',
  },
  featureCompact:{
    fontSize:12.5,
    lineHeight:16,
  },

  providerGroup:{
    marginTop:22,
    gap:10,
  },
  providerGroupCompact:{
    marginTop:14,
    gap:8,
  },
  providerBusy:{
    opacity:.58,
  },
  socialButton:{
    height:54,
    borderRadius:14,
    borderWidth:1,
    paddingHorizontal:18,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
  },
  socialButtonPressed:{
    transform:[{scale:.995}],
    opacity:.88,
  },
  socialIconSlot:{
    width:28,
    height:28,
    alignItems:'flex-start',
    justifyContent:'center',
  },
  socialLabel:{
    flex:1,
    textAlign:'center',
    fontSize:14,
    lineHeight:19,
    fontWeight:'800',
  },

  consentArea:{
    marginTop:12,
    paddingHorizontal:2,
  },
  consentAreaCompact:{
    marginTop:8,
  },
  consentRow:{
    minHeight:28,
    flexDirection:'row',
    alignItems:'center',
  },
  checkBox:{
    width:21,
    height:21,
    borderRadius:6,
    borderWidth:1.5,
    borderColor:'#B8AEC2',
    backgroundColor:'#FFFFFF',
    alignItems:'center',
    justifyContent:'center',
    flexShrink:0,
  },
  checkBoxOn:{
    backgroundColor:C.purpleDark,
    borderColor:C.purpleDark,
  },
  checkMark:{
    fontSize:13,
    lineHeight:15,
    fontWeight:'900',
    color:'#FFFFFF',
  },
  consentText:{
    flex:1,
    marginLeft:9,
    fontSize:11,
    lineHeight:17,
    fontWeight:'600',
    color:'#716978',
  },
  required:{
    color:C.purpleDark,
    fontWeight:'800',
  },

  legalLinks:{
    minHeight:24,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    flexWrap:'nowrap',
  },
  legalLinksCompact:{
    minHeight:20,
  },
  legalLink:{
    fontSize:10,
    lineHeight:16,
    fontWeight:'600',
    color:'#99919D',
    textDecorationLine:'underline',
  },
  divider:{
    marginHorizontal:6,
    fontSize:10,
    color:'#C4BDC8',
  },
});
