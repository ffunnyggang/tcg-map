import { useCallback,useEffect,useRef,useState } from 'react';
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

const formatJoinDate=(value?:string|null)=>{if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');};
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
  profileCard:{padding:16,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3DDED',flexDirection:'row',alignItems:'center',gap:14},avatar:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED',borderWidth:1,borderColor:'#DAD8DC',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},avatarImage:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED'},profileCopy:{minWidth:0,flex:1},profileNameRow:{minWidth:0,flexDirection:'row',alignItems:'center',gap:9},nickname:{minWidth:0,flex:1,fontSize:17,fontWeight:'900',color:C.text},profileEdit:{height:28,paddingHorizontal:10,borderRadius:999,borderWidth:1,borderColor:'#D7D4D9',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},profileEditText:{fontSize:10.5,fontWeight:'800',color:'#5F5B62'},profileSub:{marginTop:5,fontSize:10,color:C.muted},profileCoin:{marginTop:5,fontSize:10.5,fontWeight:'900',color:C.purpleDark},
  section:{marginTop:22},sectionTitle:{marginLeft:3,marginBottom:8,fontSize:14.5,lineHeight:18,fontWeight:'800',letterSpacing:-.2,color:C.text},card:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},menuRow:{minHeight:70,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},menuIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F1EEF5',alignItems:'center',justifyContent:'center'},menuCopy:{minWidth:0,flex:1,marginLeft:12},menuTitleRow:{flexDirection:'row',alignItems:'center',gap:5},menuLabel:{fontSize:14,fontWeight:'900',color:C.text},menuSub:{marginTop:4,fontSize:10.5,color:C.muted},readyBadge:{height:18,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',color:'#745AB5',fontSize:8.5,lineHeight:18,fontWeight:'900'},rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  languageRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row'},languageOption:{height:30,minWidth:48,paddingHorizontal:8,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageText:{fontSize:10.5,fontWeight:'800',color:C.muted},languageTextOn:{color:'#fff'},
  accountActions:{marginTop:18,alignItems:'center'},logoutButton:{width:'100%',height:52,borderRadius:15,backgroundColor:'#29252D',alignItems:'center',justifyContent:'center'},logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger},legalLinks:{marginTop:21,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},
  toast:{position:'absolute',left:28,right:28,minHeight:42,paddingHorizontal:14,borderRadius:12,backgroundColor:'rgba(38,34,43,.94)',alignItems:'center',justifyContent:'center',zIndex:10000,elevation:10000},toastText:{fontSize:11,fontWeight:'700',color:'#fff',textAlign:'center'},
});
