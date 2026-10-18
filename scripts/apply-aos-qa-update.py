from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str, minimum: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise RuntimeError(f"{path}: expected at least {minimum} matches, found {count}: {old!r}")
    write(path, text.replace(old, new))


def assert_contains(path: str, needle: str) -> None:
    if needle not in read(path):
        raise RuntimeError(f"{path}: missing expected marker {needle!r}")


# ---------------------------------------------------------------------------
# Shared native header primitives
# ---------------------------------------------------------------------------
write(
    "mobile/components/FunyBackButton.tsx",
    """import { Pressable,StyleSheet,Text } from 'react-native';
import { C } from '../lib/theme';

type Props={onPress:()=>void;accessibilityLabel?:string};

export default function FunyBackButton({onPress,accessibilityLabel='이전'}:Props){
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={10} style={styles.button}>
    <Text allowFontScaling={false} style={styles.glyph}>‹</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  button:{width:36,height:36,marginRight:4,alignItems:'center',justifyContent:'center'},
  glyph:{fontSize:29,lineHeight:29,fontWeight:'400',color:C.text,includeFontPadding:false,textAlignVertical:'center',transform:[{translateY:-1}]},
});
""",
)

replace_once(
    "mobile/components/FunyHeader.tsx",
    "import { C,T,UI } from '../lib/theme';\n",
    "import { C,T,UI } from '../lib/theme';\nimport FunyBackButton from './FunyBackButton';\n",
)
replace_once(
    "mobile/components/FunyHeader.tsx",
    "    {back?<Pressable onPress={goBack} hitSlop={10} style={{width:34,height:34,alignItems:'center',justifyContent:'center',marginRight:4}}><Text style={{fontSize:27,lineHeight:29,fontWeight:'400',color:C.text}}>‹</Text></Pressable>:<Image source={{uri:visualAssets.logo}} resizeMode=\"contain\" style={{width:30,height:34,marginRight:8}}/>}\n",
    "    {back?<FunyBackButton onPress={goBack}/>:<Image source={{uri:visualAssets.logo}} resizeMode=\"contain\" style={{width:30,height:34,marginRight:8}}/>}\n",
)

write(
    "mobile/components/MySubHeader.tsx",
    """import { StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C,T,UI } from '../lib/theme';
import FunyBackButton from './FunyBackButton';

export default function MySubHeader({title}:{title:string}){
  const router=useRouter();
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <View style={styles.header}>
      <FunyBackButton onPress={()=>router.back()}/>
      <Text allowFontScaling maxFontSizeMultiplier={1} numberOfLines={1} style={styles.title}>{title}</Text>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{backgroundColor:'#fff'},
  header:{height:UI.headerH,flexDirection:'row',alignItems:'center',paddingHorizontal:UI.screenPad,backgroundColor:'#fff'},
  title:{...T.header,flex:1,color:C.text},
});
""",
)

# ---------------------------------------------------------------------------
# HOME/PICK: Android uses current web floating controls; iOS remains unchanged.
# ---------------------------------------------------------------------------
replace_once(
    "mobile/app/(tabs)/index.tsx",
    "import { View } from 'react-native';\n",
    "import { Platform,View } from 'react-native';\n",
)
replace_once(
    "mobile/app/(tabs)/index.tsx",
    "      {!webBack?<LivePinButton withNav scrolling={scrolling}/>:null}\n",
    "      {Platform.OS!=='android'&&!webBack?<LivePinButton withNav scrolling={scrolling}/>:null}\n",
)
replace_once(
    "mobile/app/(tabs)/pick.tsx",
    "      {!webBack?<LivePinButton scrolling={scrolling}/>:null}\n",
    "      {Platform.OS!=='android'&&!webBack?<LivePinButton scrolling={scrolling}/>:null}\n",
)

# LIVE PIN: move Android to the production page while retaining compatibility in
# the WebView shell for old test links.
replace_once(
    "mobile/app/live-pin.tsx",
    "    <FunyWebView url=\"https://funypin.kr/live-pin-test.html\" title=\"FUNY PIN LIVE PIN\" onWebRouteChange={onRouteChange}/>\n",
    "    <FunyWebView url=\"https://funypin.kr/live-pin.html\" title=\"FUNY PIN LIVE PIN\" onWebRouteChange={onRouteChange} surface=\"page\"/>\n",
)

# ---------------------------------------------------------------------------
# Modern native MY hub aligned to the approved web-service information model.
# ---------------------------------------------------------------------------
write(
    "mobile/app/account.tsx",
    """import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useLocalSearchParams,useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { C,T } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/i18n';
import FunyBackButton from '../components/FunyBackButton';

type IconName=keyof typeof Ionicons.glyphMap;
type MenuProps={icon:IconName;label:string;sub:string;onPress:()=>void;border?:boolean;iconColor?:string;badge?:string};

const SUPPORT=[
  ['공지사항','notice.html','notifications-outline'],
  ['자주 묻는 질문','faq.html','help-circle-outline'],
  ['온라인 문의','support.html','mail-outline'],
  ['서비스 만족도 조사','feedback.html','happy-outline'],
  ['매장 등록 · 정보 수정 요청','shop-request.html','storefront-outline'],
  ['광고 · 제휴 문의','partner.html','megaphone-outline'],
] as const;

const formatJoinDate=(value?:string|null)=>{if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\\. /g,'.').replace(/\\.$/,'');};
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'FUNY PIN 회원';

function MenuRow({icon,label,sub,onPress,border=true,iconColor=C.purpleDark,badge}:MenuProps){
  return <Pressable onPress={onPress} style={[styles.menuRow,border&&styles.rowBorder]}>
    <View style={styles.menuIcon}><Ionicons name={icon} size={19} color={iconColor}/></View>
    <View style={styles.menuCopy}><View style={styles.menuTitleRow}><Text style={styles.menuLabel}>{label}</Text>{badge?<Text style={styles.readyBadge}>{badge}</Text>:null}</View><Text style={styles.menuSub}>{sub}</Text></View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>;
}

export default function Account(){
  const router=useRouter();
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const insets=useSafeAreaInsets();
  const params=useLocalSearchParams<{refresh?:string}>();
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [loading,setLoading]=useState(true),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[busy,setBusy]=useState<string|null>(null);
  const [coinBalance,setCoinBalance]=useState(0),[isTester,setIsTester]=useState(false),[toast,setToast]=useState('');

  const showToast=useCallback((message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),1700);},[]);
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);},[]);

  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const x=await getProfile();setUser(x.user);setProfile(x.profile);
      if(x.user){
        const [wallet,tester]=await Promise.all([
          supabase.from('funy_coin_wallets').select('balance').eq('user_id',x.user.id).maybeSingle(),
          supabase.rpc('is_my_feature_tester'),
        ]);
        setCoinBalance(Number(wallet.data?.balance||0));setIsTester(tester.data===true);
      }else{setCoinBalance(0);setIsTester(false);}
    }finally{setLoading(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  useEffect(()=>{if(params.refresh)void refresh();},[params.refresh,refresh]);
  useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>void refresh(),0);});return()=>subscription.unsubscribe();},[refresh]);
  useEffect(()=>{if(!loading&&!user)router.replace({pathname:'/login',params:{next:'account'}} as any);},[loading,user,router]);

  const openWeb=(file:string,title:string)=>router.push({pathname:'/web',params:{url:encodeURIComponent(`https://funypin.kr/${file}`),title}} as any);
  const openPrepared=(file:string,title:string)=>{if(isTester){openWeb(file,title);return;}showToast(en?'This feature is coming soon.':'준비중인 기능입니다.');};
  const runLogout=async()=>{setBusy('out');try{await signOut();router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('로그아웃 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=()=>{if(busy)return;Alert.alert('로그아웃할까요?','로그아웃해도 저장된 관심 목록과 활동 내역은 계정에 유지돼요.',[{text:'취소',style:'cancel'},{text:'로그아웃',style:'destructive',onPress:runLogout}]);};
  const removeAccount=()=>Alert.alert('계정을 삭제할까요?','계정과 프로필, 관심 목록 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.');router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e));}finally{setBusy(null);}}}]);

  if(loading||!user)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;
  const nickname=profile?.nickname||defaultNickname(user);
  const avatar=profile?(profile.avatar_url||null):(user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
  const joinDate=profile?.created_at||user?.created_at||null;
  const back=()=>Platform.OS==='android'?router.replace('/(tabs)' as any):router.back();

  return <SafeAreaView edges={['top']} style={styles.root}>
    <View style={styles.header}><FunyBackButton onPress={back}/><Text allowFontScaling maxFontSizeMultiplier={1} style={styles.headerTitle}>MY</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="always" contentContainerStyle={[styles.content,{paddingBottom:Math.max(72,insets.bottom+48)}]}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>{avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<Ionicons name="person" size={39} color="#89858C"/>}</View>
        <View style={styles.profileCopy}>
          <View style={styles.profileNameRow}><Text numberOfLines={1} style={styles.nickname}>{nickname}</Text><Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>프로필 편집</Text></Pressable></View>
          <Text style={styles.profileSub}>가입일 {formatJoinDate(joinDate)}</Text>
          <Text style={styles.profileCoin}>FUNY COIN {coinBalance.toLocaleString(en?'en-US':'ko-KR')}</Text>
        </View>
      </View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'My activity':'내 활동'}</Text><View style={styles.card}>
        <MenuRow icon="chatbubbles-outline" label="게시글 관리" sub="작성 게시글 · 댓글 · 좋아요한 게시물" onPress={()=>openWeb('my-community.html','게시글 관리')}/>
        <MenuRow icon="swap-horizontal-outline" label="거래 매물 관리" sub="판매중 · 비노출/종료 매물 관리" onPress={()=>openWeb('my-market.html','거래 매물 관리')}/>
        <MenuRow icon="heart" iconColor="#8062D8" label="관심 목록" sub="관심 카드샵과 거래 매물을 확인해요" border={false} onPress={()=>openWeb('my-favorites.html','관심 목록')}/>
      </View></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Rewards & Collection':'리워드 & 컬렉션'}</Text><View style={styles.card}>
        <MenuRow icon="cash-outline" label="퍼니코인" sub="보유 코인 · 소멸 예정 · 적립/사용 내역" badge="준비중" onPress={()=>openPrepared('my-funy-coin.html','퍼니코인')}/>
        <MenuRow icon="trophy-outline" label="랭킹" sub="출석 · 카드샵 방문 · 퍼니몬 포획 랭킹" badge="준비중" onPress={()=>openPrepared('ranking.html','랭킹')}/>
        <MenuRow icon="ribbon-outline" label="배지" sub="미션과 활동으로 획득한 배지 컬렉션" badge="준비중" onPress={()=>openPrepared('my-badges.html','배지')}/>
        <MenuRow icon="planet-outline" label="퍼니몬 도감" sub="포획한 퍼니몬 컬렉션" onPress={()=>openWeb('my-funymon.html','퍼니몬 도감')}/>
        <MenuRow icon="ticket-outline" label="응모 내역" sub="참여한 이벤트와 응모 내역" onPress={()=>openWeb('my-entries.html','응모 내역')}/>
        <MenuRow icon="pricetag-outline" label="쿠폰함" sub="발급받은 쿠폰을 확인하세요" border={false} onPress={()=>openWeb('my-coupons.html','쿠폰함')}/>
      </View></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Settings':'설정'}</Text><View style={styles.card}>
        <View style={[styles.languageRow,styles.rowBorder]}><View style={styles.menuIcon}><Ionicons name="globe-outline" size={19} color={C.textSoft}/></View><View style={styles.menuCopy}><Text style={styles.menuLabel}>{en?'Language':'언어'}</Text><Text style={styles.menuSub}>{en?'Change the display language':'서비스 표시 언어를 변경해요'}</Text></View><View style={styles.languageToggle}><Pressable onPress={()=>setLanguage('ko')} style={[styles.languageOption,language==='ko'&&styles.languageOptionOn]}><Text style={[styles.languageText,language==='ko'&&styles.languageTextOn]}>한국어</Text></Pressable><Pressable onPress={()=>setLanguage('en')} style={[styles.languageOption,language==='en'&&styles.languageOptionOn]}><Text style={[styles.languageText,language==='en'&&styles.languageTextOn]}>EN</Text></Pressable></View></View>
        <MenuRow icon="lock-closed-outline" iconColor={C.textSoft} label={en?'Account security':'계정 보안'} sub={en?'Manage login and account security':'로그인 및 계정 보안 설정을 관리해요'} onPress={()=>openWeb('my-security.html',en?'Account security':'계정 보안')}/>
        <MenuRow icon="ban-outline" iconColor={C.textSoft} label={en?'Blocked users':'차단한 사용자'} sub={en?'Manage blocked post and trade users':'게시물 · 거래 차단 목록을 관리해요'} border={false} onPress={()=>openWeb('my-blocked-users.html',en?'Blocked users':'차단한 사용자')}/>
      </View></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Support':'고객지원'}</Text><View style={styles.card}>{SUPPORT.map(([label,file,icon],i)=><MenuRow key={file} icon={icon} iconColor={C.textSoft} label={label} sub="" border={i<SUPPORT.length-1} onPress={()=>openWeb(file,label)}/>)}</View></View>

      <View style={styles.accountActions}><Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable><Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable></View>
      <View style={styles.legalLinks}><Pressable onPress={()=>openWeb('terms.html','이용약관')}><Text style={styles.legalText}>이용약관</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('privacy.html','개인정보처리방침')}><Text style={styles.legalText}>개인정보처리방침</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalText}>커뮤니티 운영정책</Text></Pressable></View>
    </ScrollView>
    {toast?<View pointerEvents="none" style={[styles.toast,{bottom:Math.max(insets.bottom+24,28)}]}><Text style={styles.toastText}>{toast}</Text></View>:null}
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},
  header:{height:54,paddingHorizontal:14,flexDirection:'row',alignItems:'center',backgroundColor:'#fff'},headerTitle:{...T.header,color:C.text},content:{padding:14,paddingBottom:40},
  profileCard:{padding:16,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3DDED',flexDirection:'row',alignItems:'center',gap:14},avatar:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED',borderWidth:1,borderColor:'#DAD8DC',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},avatarImage:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED'},profileCopy:{minWidth:0,flex:1},profileNameRow:{minWidth:0,flexDirection:'row',alignItems:'center',gap:9},nickname:{minWidth:0,flex:1,fontSize:17,fontWeight:'900',color:C.text},profileEdit:{height:28,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:'#D7D4D9',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},profileEditText:{fontSize:10.5,fontWeight:'850',color:'#5F5B62'},profileSub:{marginTop:5,fontSize:10,color:C.muted},profileCoin:{marginTop:5,fontSize:10.5,fontWeight:'900',color:C.purpleDark},
  section:{marginTop:22},sectionTitle:{marginLeft:3,marginBottom:8,fontSize:14.5,lineHeight:18,fontWeight:'800',letterSpacing:-.2,color:C.text},card:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},menuRow:{minHeight:70,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},menuIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F1EEF5',alignItems:'center',justifyContent:'center'},menuCopy:{minWidth:0,flex:1,marginLeft:12},menuTitleRow:{flexDirection:'row',alignItems:'center',gap:5},menuLabel:{fontSize:14,fontWeight:'900',color:C.text},menuSub:{marginTop:4,fontSize:10.5,color:C.muted},readyBadge:{height:18,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',color:'#745AB5',fontSize:8.5,lineHeight:18,fontWeight:'900'},rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  languageRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row'},languageOption:{height:30,minWidth:48,paddingHorizontal:8,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageText:{fontSize:10.5,fontWeight:'800',color:C.muted},languageTextOn:{color:'#fff'},
  accountActions:{marginTop:18,alignItems:'center'},logoutButton:{width:'100%',height:52,borderRadius:15,backgroundColor:'#29252D',alignItems:'center',justifyContent:'center'},logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger},legalLinks:{marginTop:21,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},
  toast:{position:'absolute',left:28,right:28,minHeight:42,paddingHorizontal:14,borderRadius:12,backgroundColor:'rgba(38,34,43,.94)',alignItems:'center',justifyContent:'center',zIndex:10000,elevation:10000},toastText:{fontSize:11,fontWeight:'750',color:'#fff',textAlign:'center'},
});
""",
)

# Profile edit uses the same neutral default avatar and does not restore an OAuth
# picture after the user explicitly deletes their FUNY PIN profile image.
replace_once(
    "mobile/app/my/profile-edit.tsx",
    "import { C } from '../../lib/theme';\n",
    "import { C } from '../../lib/theme';\nimport Ionicons from '@expo/vector-icons/Ionicons';\n",
)
replace_once(
    "mobile/app/my/profile-edit.tsx",
    "    setAvatar(profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);\n",
    "    setAvatar(profile?(profile.avatar_url||null):(user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null));\n",
)
replace_once(
    "mobile/app/my/profile-edit.tsx",
    "            {avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>사진</Text></View>}\n",
    "            {avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatarPlaceholder}><Ionicons name=\"person\" size={66} color=\"#89858C\"/></View>}\n",
)
replace_once(
    "mobile/app/my/profile-edit.tsx",
    "avatarPlaceholder:{width:112,height:112,borderRadius:56,backgroundColor:'#EEE8FA',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDD3F1'},avatarPlaceholderText:{fontSize:14,fontWeight:'800',color:C.purpleDark},avatarAdd:{position:'absolute',right:-3,bottom:-3,width:30,height:30,borderRadius:15,backgroundColor:'#fff',borderWidth:1.5,borderColor:C.purpleDark,alignItems:'center',justifyContent:'center',zIndex:3},avatarAddText:{fontSize:20,lineHeight:22,fontWeight:'500',color:C.purpleDark},",
    "avatarPlaceholder:{width:112,height:112,borderRadius:56,backgroundColor:'#ECEBED',alignItems:'center',justifyContent:'flex-end',overflow:'hidden',borderWidth:1,borderColor:'#DAD8DC'},avatarPlaceholderText:{fontSize:14,fontWeight:'800',color:'#6F6B72'},avatarAdd:{position:'absolute',right:-3,bottom:-3,width:30,height:30,borderRadius:15,backgroundColor:'#fff',borderWidth:1.5,borderColor:'#A9A5AD',alignItems:'center',justifyContent:'center',zIndex:3},avatarAddText:{fontSize:20,lineHeight:22,fontWeight:'500',color:'#666169'},",
)

# ---------------------------------------------------------------------------
# WebView shell: Android web-owned FABs, safe-area bridge, image share bridge,
# TALK block exit, current internal routes, and coin-flip audio unlock.
# ---------------------------------------------------------------------------
path = "mobile/components/FunyWebView.tsx"
replace_once(
    path,
    "import { useIsFocused } from '@react-navigation/native';\n",
    "import { useIsFocused } from '@react-navigation/native';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';\nimport * as FileSystem from 'expo-file-system/legacy';\nimport * as Sharing from 'expo-sharing';\n",
)
replace_once(path, "u.searchParams.set('appv','20261005-android-shell');", "u.searchParams.set('appv','20261019-aos-web-sync');")
replace_once(
    path,
    "export const isWebBackPage=(target:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return true;const p=u.pathname.toLowerCase();if(/\\/talk\\.html$/.test(p)&&/^#\\/post\\//.test(u.hash))return true;return /\\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines)\\.html$/.test(p);}catch{return false}};\nconst pageTitleFromUrl=(target:string,fallback:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return '';const p=u.pathname.toLowerCase();if(/\\/talk\\.html$/.test(p)&&/^#\\/post\\//.test(u.hash))return '';const map:Record<string,string>={'/notice.html':'공지사항','/faq.html':'자주 묻는 질문','/support.html':'온라인 문의','/feedback.html':'서비스 만족도 조사','/shop-request.html':'매장 등록 · 정보 수정 요청','/partner.html':'광고 · 제휴 문의','/terms.html':'이용약관','/privacy.html':'개인정보처리방침','/community-guidelines.html':'커뮤니티 운영정책','/promo.html':'프로모션'};return map[p]||fallback;}catch{return fallback}};\n",
    "export const isWebBackPage=(target:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return true;const p=u.pathname.toLowerCase();if(/\\/talk\\.html$/.test(p)&&/^#\\/post\\//.test(u.hash))return true;return /\\/(notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines|my-community|my-market|my-favorites|my-blocked-users|my-security|my-funy-coin|my-badges|my-funymon|my-entries|my-coupons|ranking)\\.html$/.test(p);}catch{return false}};\nconst pageTitleFromUrl=(target:string,fallback:string)=>{try{const u=new URL(target);if(!isFunyHost(target))return '';const p=u.pathname.toLowerCase();if(/\\/talk\\.html$/.test(p)&&/^#\\/post\\//.test(u.hash))return '';if(/\\/shops\\.html$/.test(p)&&/^#market\\//.test(u.hash))return 'TCG 거래';const map:Record<string,string>={'/notice.html':'공지사항','/faq.html':'자주 묻는 질문','/support.html':'온라인 문의','/feedback.html':'서비스 만족도 조사','/shop-request.html':'매장 등록 · 정보 수정 요청','/partner.html':'광고 · 제휴 문의','/terms.html':'이용약관','/privacy.html':'개인정보처리방침','/community-guidelines.html':'커뮤니티 운영정책','/promo.html':'프로모션','/my-community.html':'게시글 관리','/my-market.html':'거래 매물 관리','/my-favorites.html':'관심 목록','/my-blocked-users.html':'차단한 사용자','/my-security.html':'계정 보안','/my-funy-coin.html':'퍼니코인','/ranking.html':'랭킹','/my-badges.html':'배지','/my-funymon.html':'퍼니몬 도감','/my-entries.html':'응모 내역','/my-coupons.html':'쿠폰함','/live-pin.html':'LIVE PIN'};return map[p]||fallback;}catch{return fallback}};\n",
)
replace_once(
    path,
    "  var path=String(location.pathname||'').toLowerCase();\n  var style=document.createElement('style');\n",
    "  var path=String(location.pathname||'').toLowerCase();\n  var shellParams=new URLSearchParams(location.search),shellPlatform=String(shellParams.get('appPlatform')||'').toLowerCase();\n  document.documentElement.classList.add(shellPlatform==='android'?'funy-android-web-floating':'funy-native-floating');\n  var style=document.createElement('style');\n",
)
replace_once(
    path,
    "    'html.app-shell .live-pin-entry-wrap,html.app-shell .live-pin-detail-entry{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',\n",
    "    'html.app-shell.funy-native-floating .live-pin-entry-wrap,html.app-shell.funy-native-floating .live-pin-detail-entry{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',\n",
)
replace_all(path, "\\/live-pin-test\\.html$", "\\/live-pin(?:-test)?\\.html$", minimum=2)
replace_all(
    path,
    "notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines",
    "notice|shop-request|partner|faq|feedback|privacy|promo|support|terms|community-guidelines|my-community|my-market|my-favorites|my-blocked-users|my-security|my-funy-coin|my-badges|my-funymon|my-entries|my-coupons|ranking",
    minimum=2,
)
replace_once(
    path,
    "  style.textContent+='html.app-shell.web-back-page .header{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important}';\n",
    "  style.textContent+='html.app-shell.web-back-page .header,html.app-shell.web-back-page .test-head,html.app-shell.web-back-page .funy-sub-header,html.app-shell.web-back-page .head{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important}';\n",
)
replace_once(
    path,
    "        var target=event.target;\n        if(!target||!target.closest)return;\n        var back=target.closest('#hero-back,#sticky-back,.other-shops-fab');\n",
    "        var target=event.target;\n        if(!target||!target.closest)return;\n        var anchor=target.closest('a[href]');\n        if(anchor){\n          try{\n            var href=anchor.href||anchor.getAttribute('href')||'',u=new URL(href,location.href);\n            if(/\\/live-pin(?:-test)?\\.html$/i.test(u.pathname)){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();earlyPost({type:'OPEN_NATIVE',route:'/live-pin'});return false;}\n            var shopMatch=u.hash.match(/^#\\/shop\\/((?:KR|JP)-[A-Z]{3}-\\d{3})$/i);\n            if(/\\/shops\\.html$/i.test(u.pathname)&&shopMatch){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();earlyPost({type:'OPEN_SHOP_DETAIL',shopId:shopMatch[1].toUpperCase(),country:shopMatch[1].toUpperCase().startsWith('JP-')?'JP':'KR'});return false;}\n          }catch(_){}\n        }\n        var back=target.closest('#hero-back,#sticky-back,.other-shops-fab');\n",
)
replace_once(
    path,
    "      'html.app-shell body .live-pin-entry-wrap,html.app-shell body .live-pin-detail-entry,html.app-shell body #livePinEntry,html.app-shell body [data-live-pin-entry]{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;pointer-events:none!important}'\n",
    "      'html.app-shell.funy-native-floating body .live-pin-entry-wrap,html.app-shell.funy-native-floating body .live-pin-detail-entry,html.app-shell.funy-native-floating body #livePinEntry,html.app-shell.funy-native-floating body [data-live-pin-entry]{display:none!important;visibility:hidden!important;opacity:0!important;width:0!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;pointer-events:none!important}',\n      'html.app-shell.web-back-page body .test-head,html.app-shell.web-back-page body .funy-sub-header,html.app-shell.web-back-page body .head{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important}',\n      'html.app-shell.funy-android-web-floating body .live-pin-entry-wrap,html.app-shell.funy-android-web-floating body .live-pin-detail-entry,html.app-shell.funy-android-web-floating body .market-fab-wrap,html.app-shell.funy-android-web-floating body .pokamo-fab{bottom:calc(var(--funy-native-safe-bottom,0px) + var(--funy-native-nav-height,58px) + 10px)!important}',\n      'html.app-shell.funy-android-web-floating body .market-overlay-register{bottom:calc(var(--funy-native-safe-bottom,0px) + 18px)!important}',\n      'html.app-shell.funy-android-web-floating body .market-register-submit{margin-bottom:calc(var(--funy-native-safe-bottom,0px) + 12px)!important}'\n",
)
replace_once(
    path,
    "  var handleCMSLink=function(event){var node=event.target;",
    "  if(window.ReactNativeWebView&&!window.__FUNY_NATIVE_DOWNLOAD_BRIDGE&&new URLSearchParams(location.search).get('appPlatform')==='android'){\n    window.__FUNY_NATIVE_DOWNLOAD_BRIDGE=true;\n    document.addEventListener('click',function(event){\n      try{\n        var node=event.target&&event.target.closest?event.target.closest('a[download]'):null;if(!node)return;\n        var href=node.href||node.getAttribute('href')||'',fileName=node.getAttribute('download')||('FUNY-PIN-'+Date.now()+'.jpg');if(!href)return;\n        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();\n        var send=function(dataUrl,mime){post({type:'SAVE_APP_IMAGE',dataUrl:dataUrl,fileName:fileName,mimeType:mime||''})};\n        if(/^data:image\\//i.test(href)){send(href,href.slice(5,href.indexOf(';')));return false;}\n        fetch(href).then(function(r){if(!r.ok)throw new Error('image fetch');return r.blob()}).then(function(blob){var reader=new FileReader();reader.onload=function(){send(String(reader.result||''),blob.type)};reader.onerror=function(){post({type:'SAVE_APP_IMAGE_ERROR'})};reader.readAsDataURL(blob)}).catch(function(){post({type:'SAVE_APP_IMAGE_ERROR'})});\n        return false;\n      }catch(_){post({type:'SAVE_APP_IMAGE_ERROR'})}\n    },true);\n  }\n  if(/\\/coin-flip\\.html$/i.test(location.pathname)&&!window.__FUNY_AUDIO_UNLOCK){\n    window.__FUNY_AUDIO_UNLOCK=true;var unlock=function(){try{var Ctx=window.AudioContext||window.webkitAudioContext;if(Ctx){var ctx=window.__FUNY_AUDIO_CONTEXT||(window.__FUNY_AUDIO_CONTEXT=new Ctx());if(ctx.state==='suspended')ctx.resume()}}catch(_){}};document.addEventListener('touchstart',unlock,{capture:true,passive:true});document.addEventListener('pointerdown',unlock,{capture:true,passive:true});\n  }\n  var handleCMSLink=function(event){var node=event.target;",
)
replace_once(path, "  const isFocused=useIsFocused();\n", "  const isFocused=useIsFocused();\n  const nativeInsets=useSafeAreaInsets();\n")
replace_once(
    path,
    "  const {height:windowHeight}=useWindowDimensions();\n  const isMapWebView=(()=>{try{return /\\/shops\\.html$/i.test(new URL(url).pathname)}catch{return false}})();\n",
    "  const {height:windowHeight}=useWindowDimensions();\n  const nativeSafeBottom=Math.max(0,Math.round(nativeInsets.bottom||0));\n  const nativeNavHeight=surface==='tab'&&Platform.OS==='android'?58:0;\n  const isMapWebView=(()=>{try{return /\\/shops\\.html$/i.test(new URL(url).pathname)}catch{return false}})();\n  const isCoinFlipWebView=(()=>{try{return /\\/coin-flip\\.html$/i.test(new URL(currentTarget||url).pathname)}catch{return false}})();\n",
)
replace_once(
    path,
    "  const isTalkPost=(()=>{try{const u=new URL(currentTarget);return /\\/talk\\.html$/.test(u.pathname.toLowerCase())&&/^#\\/post\\//.test(u.hash)}catch{return false}})();\n  const blockTalkAuthor=useCallback(async()=>{\n",
    "  const isTalkPost=(()=>{try{const u=new URL(currentTarget);return /\\/talk\\.html$/.test(u.pathname.toLowerCase())&&/^#\\/post\\//.test(u.hash)}catch{return false}})();\n  const exitBlockedTalkPost=useCallback((ownerId:string,postId:string)=>{\n    const js=`(function(){var owner=${JSON.stringify(ownerId)},post=${JSON.stringify(postId)};try{if(typeof window.FUNY_TALK_HANDLE_BLOCKED_OWNER==='function')window.FUNY_TALK_HANDLE_BLOCKED_OWNER(owner,post)}catch(_){}try{window.dispatchEvent(new CustomEvent('funy:native-talk-blocked',{detail:{ownerId:owner,postId:post}}))}catch(_){}try{if(location.hash){history.replaceState(null,'',location.pathname+location.search);window.dispatchEvent(new Event('hashchange'))}}catch(_){}})();true;`;\n    ref.current?.injectJavaScript(js);\n    const listUrl='https://funypin.kr/talk.html';lastReportedRoute.current=listUrl;setCurrentTarget(listUrl);setTalkPostMine(false);setTalkMenuOpen(false);onWebRouteChange?.(listUrl);\n  },[onWebRouteChange]);\n  const blockTalkAuthor=useCallback(async()=>{\n",
)
replace_all(
    path,
    "              ref.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('funy:native-talk-blocked',{detail:{ownerId:${JSON.stringify(ownerId)},postId:${JSON.stringify(postId)}}}));location.hash='';true;`);\n",
    "              exitBlockedTalkPost(ownerId,postId);\n",
    minimum=2,
)
replace_once(path, "  },[accessToken,currentTarget,router,url]);\n", "  },[accessToken,currentTarget,exitBlockedTalkPost,router,url]);\n")
replace_once(
    path,
    "  const injectEvent=useCallback((name:string,detail:Record<string,unknown>)=>{const js=`window.dispatchEvent(new CustomEvent(${JSON.stringify(name)},{detail:${JSON.stringify(detail)}}));true;`;ref.current?.injectJavaScript(js);},[]);\n",
    "  const injectEvent=useCallback((name:string,detail:Record<string,unknown>)=>{const js=`window.dispatchEvent(new CustomEvent(${JSON.stringify(name)},{detail:${JSON.stringify(detail)}}));true;`;ref.current?.injectJavaScript(js);},[]);\n  const saveAppImage=useCallback(async(data:any)=>{\n    try{\n      const dataUrl=String(data?.dataUrl||''),match=dataUrl.match(/^data:(image\\/[a-z0-9.+-]+);base64,(.+)$/i);if(!match)throw new Error('이미지 데이터를 확인하지 못했습니다.');\n      if(match[2].length>18_000_000)throw new Error('이미지 용량이 너무 큽니다.');\n      const mime=String(data?.mimeType||match[1]||'image/jpeg'),ext=mime.includes('png')?'png':'jpg',base=String(data?.fileName||`FUNY-PIN-${Date.now()}.${ext}`).replace(/[^A-Za-z0-9._-]/g,'-');\n      const directory=FileSystem.cacheDirectory;if(!directory)throw new Error('임시 저장 공간을 사용할 수 없습니다.');\n      const uri=directory+base.replace(/\\.(png|jpe?g)$/i,'')+'.'+ext;\n      await FileSystem.writeAsStringAsync(uri,match[2],{encoding:FileSystem.EncodingType.Base64});\n      if(!(await Sharing.isAvailableAsync()))throw new Error('이 기기에서는 저장·공유 창을 열 수 없습니다.');\n      await Sharing.shareAsync(uri,{mimeType:mime,dialogTitle:'이미지 저장 또는 공유'});\n      injectEvent('funy:native-image-save-result',{ok:true,fileName:base});\n      setTimeout(()=>{FileSystem.deleteAsync(uri,{idempotent:true}).catch(()=>{})},60_000);\n    }catch(e:any){injectEvent('funy:native-image-save-result',{ok:false,message:String(e?.message||e)});Alert.alert('이미지 저장 실패',String(e?.message||'이미지를 저장하지 못했습니다.'));}\n  },[injectEvent]);\n",
)
replace_once(
    path,
    "  useEffect(()=>{if(authReady)setWebViewKey(k=>k+1);},[language,authReady]);\n",
    "  useEffect(()=>{if(authReady)setWebViewKey(k=>k+1);},[language,authReady]);\n  useEffect(()=>{ref.current?.injectJavaScript(`document.documentElement.style.setProperty('--funy-native-safe-bottom','${nativeSafeBottom}px');document.documentElement.style.setProperty('--funy-native-nav-height','${nativeNavHeight}px');true;`);},[nativeNavHeight,nativeSafeBottom]);\n",
)
replace_once(
    path,
    "  const handleUrl=useCallback((target:string)=>{if(target.startsWith('funypin://')){const path=target.replace('funypin://','/');if(path.startsWith('/account')){router.push('/account');return false;}if(path.startsWith('/shop/')){const id=path.slice('/shop/'.length);router.push({pathname:'/shop/[id]',params:{id}} as any);return false;}return false;}if(target==='about:blank'||target.startsWith('http://')||target.startsWith('https://'))return true;if(target.startsWith('mailto:')||target.startsWith('tel:')){Linking.openURL(target).catch(()=>{});return false;}if(/^[a-z][a-z0-9+.-]*:/i.test(target)){Linking.openURL(target).catch(()=>{});return false;}return true;},[router]);\n",
    "  const handleUrl=useCallback((target:string)=>{if(target.startsWith('funypin://')){const path=target.replace('funypin://','/');if(path.startsWith('/account')){router.push('/account');return false;}if(path.startsWith('/shop/')){const id=path.slice('/shop/'.length);router.push({pathname:'/shop/[id]',params:{id}} as any);return false;}return false;}if(target==='about:blank')return true;if(target.startsWith('http://')||target.startsWith('https://')){try{const u=new URL(target);if(isFunyHost(target)&&/\\/live-pin(?:-test)?\\.html$/i.test(u.pathname)){router.push('/live-pin');return false;}if(isShopDetail(target)){const id=(u.hash.match(/^#\\/shop\\/((?:KR|JP)-[A-Z]{3}-\\d{3})$/i)?.[1]||u.searchParams.get('shop')||'').toUpperCase();if(id){router.push({pathname:'/shop/[id]',params:{id,from:'web-link'}} as any);return false;}}}catch{}return true;}if(target.startsWith('mailto:')||target.startsWith('tel:')){Linking.openURL(target).catch(()=>{});return false;}if(/^[a-z][a-z0-9+.-]*:/i.test(target)){Linking.openURL(target).catch(()=>{});return false;}return true;},[router]);\n",
)
replace_once(
    path,
    "  const appContext={surface,platform:Platform.OS,appVersion:Constants.expoConfig?.version||Constants.nativeAppVersion||'',buildVersion:Constants.nativeBuildVersion||'',loggedIn:!!accessToken,language};\n  const contextInjection=`\\n(function(){try{window.__FUNY_APP_CONTEXT=${JSON.stringify(appContext)};localStorage.setItem('funy-pin-lang',${JSON.stringify(language)});}catch(e){}})(); true;`;\n",
    "  const appContext={surface,platform:Platform.OS,appVersion:Constants.expoConfig?.version||Constants.nativeAppVersion||'',buildVersion:Constants.nativeBuildVersion||'',loggedIn:!!accessToken,language};\n  const contextInjection=`\\n(function(){try{window.__FUNY_APP_CONTEXT=${JSON.stringify(appContext)};localStorage.setItem('funy-pin-lang',${JSON.stringify(language)});}catch(e){}})(); true;`;\n  const layoutInjection=`\\n(function(){try{document.documentElement.style.setProperty('--funy-native-safe-bottom','${nativeSafeBottom}px');document.documentElement.style.setProperty('--funy-native-nav-height','${nativeNavHeight}px');}catch(e){}})(); true;`;\n",
)
replace_once(
    path,
    "if(data?.type==='WEB_SCROLL'){onWebScrollChange?.(!!data.scrolling);return;}if(data?.type==='OPEN_SHOP_DETAIL'&&data.shopId){",
    "if(data?.type==='WEB_SCROLL'){onWebScrollChange?.(!!data.scrolling);return;}if(data?.type==='SAVE_APP_IMAGE'){void saveAppImage(data);return;}if(data?.type==='SAVE_APP_IMAGE_ERROR'){Alert.alert('이미지 저장 실패','이미지 데이터를 불러오지 못했습니다.');return;}if(data?.type==='OPEN_SHOP_DETAIL'&&data.shopId){",
)
replace_once(
    path,
    "},[injectShopClose,injectShopOpen,onMapCountryChange,onWebScrollChange,openSheet,reportRoute,requestNativeLocation,router,stopNativeLocation]);\n",
    "},[injectShopClose,injectShopOpen,onMapCountryChange,onWebScrollChange,openSheet,reportRoute,requestNativeLocation,router,saveAppImage,stopNativeLocation]);\n",
)
replace_once(
    path,
    "injectedJavaScriptBeforeContentLoaded={APP_SHELL_BEFORE+authInjection+contextInjection}",
    "injectedJavaScriptBeforeContentLoaded={APP_SHELL_BEFORE+authInjection+contextInjection+layoutInjection}",
)
replace_once(
    path,
    "domStorageEnabled allowsInlineMediaPlayback automaticallyAdjustContentInsets={false}",
    "domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={isCoinFlipWebView?false:undefined} automaticallyAdjustContentInsets={false}",
)

# ---------------------------------------------------------------------------
# Native card-shop event card gets an admin-managed, nullable URL.
# ---------------------------------------------------------------------------
replace_once(
    "mobile/lib/shops.ts",
    "export type FunyMonEvent={id:string;shop_id:string|null;title:string;starts_at:string;ends_at:string;is_force_paused:boolean;is_archived:boolean;target_type:string|null;schedule_event_id:string|null;target_latitude:number|null;target_longitude:number|null;target_name_snapshot:string|null;target_location_snapshot:string|null};\n",
    "export type FunyMonEvent={id:string;shop_id:string|null;title:string;starts_at:string;ends_at:string;is_force_paused:boolean;is_archived:boolean;event_url:string|null;target_type:string|null;schedule_event_id:string|null;target_latitude:number|null;target_longitude:number|null;target_name_snapshot:string|null;target_location_snapshot:string|null};\n",
)
replace_once(
    "mobile/lib/shops.ts",
    ".select('id,shop_id,title,starts_at,ends_at,is_force_paused,is_archived,target_type,schedule_event_id,target_latitude,target_longitude,target_name_snapshot,target_location_snapshot')",
    ".select('id,shop_id,title,starts_at,ends_at,is_force_paused,is_archived,event_url,target_type,schedule_event_id,target_latitude,target_longitude,target_name_snapshot,target_location_snapshot')",
)
replace_once(
    "mobile/app/shop/[id].tsx",
    "import { AppShop,ShopContent,ShopReview,getActiveFunyMonEvents,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';\n",
    "import { AppShop,FunyMonEvent,ShopContent,ShopReview,getActiveFunyMonEvents,getFavoriteIds,getShop,getShopContents,getShopReview,shopImageUrl,toggleFavorite } from '../../lib/shops';\n",
)
replace_once(
    "mobile/app/shop/[id].tsx",
    "  const [activeEvent,setActiveEvent]=useState<string|null>(null);\n",
    "  const [activeEvent,setActiveEvent]=useState<FunyMonEvent|null>(null);\n",
)
replace_once(
    "mobile/app/shop/[id].tsx",
    "        const event=events.find(x=>x.shop_id===id);setActiveEvent(event?.title||null);\n",
    "        const event=events.find(x=>x.shop_id===id);setActiveEvent(event||null);\n",
)
replace_once(
    "mobile/app/shop/[id].tsx",
    "          {activeEvent?<View style={styles.eventCard}><Text style={styles.eventBadge}>EVENT</Text><Text numberOfLines={2} style={styles.eventText}>{activeEvent}</Text><Text style={styles.eventArrow}>›</Text></View>:null}\n",
    "          {activeEvent?<Pressable disabled={!activeEvent.event_url} onPress={()=>{if(activeEvent.event_url){setSheetTitle('FUNY MON 이벤트');setSheetUrl(activeEvent.event_url)}}} style={styles.eventCard}><Text style={styles.eventBadge}>EVENT</Text><Text numberOfLines={2} style={styles.eventText}>{activeEvent.title}</Text>{activeEvent.event_url?<Text style={styles.eventArrow}>›</Text>:null}</Pressable>:null}\n",
)

# Admin local-QA branch: optional URL input. The live database migration remains
# nullable, so older clients continue to work.
admin = read("admin.html")
old_editor = "<div class=\"mon-event-field\"><label>종료 일시</label><input id=\"monEventEnd\" type=\"datetime-local\" value=\"'+monLocal(ev?.ends_at)+'\"></div></div><div class=\"mon-subtitle"
new_editor = "<div class=\"mon-event-field\"><label>종료 일시</label><input id=\"monEventEnd\" type=\"datetime-local\" value=\"'+monLocal(ev?.ends_at)+'\"></div><div class=\"mon-event-field\" style=\"grid-column:1/-1\"><label>이벤트 페이지 URL <small>(선택)</small></label><input id=\"monEventUrl\" type=\"url\" placeholder=\"https://funypin.kr/event-....html\" value=\"'+esc(ev?.event_url||'')+'\"></div></div><div class=\"mon-subtitle"
if old_editor not in admin:
    raise RuntimeError("admin.html: FUNY MON editor anchor not found")
admin = admin.replace(old_editor, new_editor, 1)
old_save = "const shopId=$('monEventShop').value,start=$('monEventStart').value,end=$('monEventEnd').value,selected="
new_save = "const shopId=$('monEventShop').value,start=$('monEventStart').value,end=$('monEventEnd').value,eventUrl=String($('monEventUrl')?.value||'').trim()||null,selected="
if old_save not in admin:
    raise RuntimeError("admin.html: FUNY MON save anchor not found")
admin = admin.replace(old_save, new_save, 1)
old_body = "capture_success_bp:captureSuccessBp,title:'FUNY MON 이벤트'};"
new_body = "capture_success_bp:captureSuccessBp,event_url:eventUrl,title:'FUNY MON 이벤트'};"
if old_body not in admin:
    raise RuntimeError("admin.html: FUNY MON payload anchor not found")
admin = admin.replace(old_body, new_body, 1)
write("admin.html", admin)

# ---------------------------------------------------------------------------
# QA record and static guards.
# ---------------------------------------------------------------------------
write(
    "mobile/QA_AOS_PREBUILD_20261019.md",
    """# AOS prebuild QA — 2026-10-19

This branch is intentionally **not a release build**. It is the local/staging layer used before the next closed-test AAB.

## Locked regression scope

- TCG MAP WebView remains mounted across Android tab switches.
- Android MAP early reveal at WebView progress >= 0.35 remains enabled.
- Existing Supabase native authentication and web access-token injection remain unchanged.
- Existing native card-shop detail routing remains the owner of `#/shop/{id}` links.
- iOS keeps the existing native LIVE PIN floating buttons in this Android-first update.

## Updated scope

- Android HOME / MAP / PICK / TALK use web-owned floating controls.
- Android web floating controls receive native safe-bottom and native tab-height CSS variables.
- TALK block action directly closes the current detail and resets the native header state.
- Production `live-pin.html` replaces the old test URL.
- Native MY hub matches the current web-service menu and profile information hierarchy.
- MY web subpages receive native authentication and use one native back header.
- Android image downloads generated inside the WebView are bridged to a native file share/save sheet.
- Coin flip receives Android Web Audio unlock support without changing other WebViews' playback policy.
- Native card-shop FUNY MON event card supports nullable admin-managed `event_url`.
- Native back-button glyph and title spacing are shared through one component.

## Required device QA before any build

1. Android gesture navigation and 3-button navigation.
2. Cold start and HOME → MAP → PICK → TALK repeated navigation.
3. MAP KR/JP, search, filters, list, detail return, location, MARKET overlay, register sheet.
4. TALK post detail, report, block, immediate list return, hardware back.
5. MY profile, FUNY COIN, web subpages, tester-only prepared pages, logout and account deletion.
6. FUNY MON image save/share.
7. Coin flip sound after first user interaction.
8. Native card-shop event card with and without an event URL.

No EAS build should run until this checklist and the GitHub validation workflow are both green.
""",
)

for required_path, marker in [
    ("mobile/components/FunyWebView.tsx", "SAVE_APP_IMAGE"),
    ("mobile/app/account.tsx", "FUNY COIN"),
    ("mobile/app/live-pin.tsx", "live-pin.html"),
    ("mobile/lib/shops.ts", "event_url"),
    ("admin.html", "monEventUrl"),
]:
    assert_contains(required_path, marker)

print("AOS QA patch applied successfully.")
