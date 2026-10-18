import { useCallback,useEffect,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useLocalSearchParams,useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { C,T,UI } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/i18n';
import NativeBackButton from '../components/NativeBackButton';

type WebItem={
  key:string;
  labelKo:string;
  labelEn:string;
  subKo:string;
  subEn:string;
  file:string;
  icon:keyof typeof Ionicons.glyphMap;
  coming?:boolean;
};

const ACTIVITY:WebItem[]=[
  {key:'community',labelKo:'게시글 관리',labelEn:'Post management',subKo:'작성 게시글 · 댓글 · 좋아요한 게시물',subEn:'Posts, comments, and liked posts',file:'my-community.html',icon:'chatbubble-ellipses-outline'},
  {key:'market',labelKo:'거래 매물 관리',labelEn:'Trade listings',subKo:'판매중 · 비노출/종료 매물 관리',subEn:'Manage active and inactive listings',file:'my-market.html',icon:'pricetag-outline'},
  {key:'favorites',labelKo:'관심 목록',labelEn:'Favorites',subKo:'관심 카드샵과 저장한 거래 매물',subEn:'Saved card shops and trade listings',file:'my-favorites.html',icon:'heart'},
];

const REWARDS:WebItem[]=[
  {key:'coin',labelKo:'퍼니코인',labelEn:'FUNY Coin',subKo:'보유 코인 · 소멸 예정 · 적립/사용 내역',subEn:'Balance, expiring coins, and history',file:'my-funy-coin.html',icon:'cash-outline',coming:true},
  {key:'ranking',labelKo:'랭킹',labelEn:'Ranking',subKo:'출석 · 카드샵 방문 · 퍼니몬 포획 랭킹',subEn:'Check-in, visits, and FUNY MON rankings',file:'ranking.html',icon:'trophy-outline',coming:true},
  {key:'badges',labelKo:'배지',labelEn:'Badges',subKo:'미션과 활동으로 획득한 배지 컬렉션',subEn:'Badges earned from missions and activities',file:'my-badges.html',icon:'ribbon-outline',coming:true},
  {key:'funymon',labelKo:'퍼니몬 도감',labelEn:'FUNY MON Collection',subKo:'포획한 퍼니몬 컬렉션',subEn:'Your captured FUNY MON collection',file:'my-funymon.html',icon:'sparkles-outline'},
  {key:'entries',labelKo:'응모 내역',labelEn:'Entries',subKo:'참여한 이벤트와 응모 내역',subEn:'Events and entries you joined',file:'my-entries.html',icon:'ticket-outline'},
  {key:'coupons',labelKo:'쿠폰함',labelEn:'Coupons',subKo:'발급받은 쿠폰을 확인하세요',subEn:'Check your issued coupons',file:'my-coupons.html',icon:'card-outline'},
];

const SUPPORT=[
  ['공지사항','Notices','notice.html'],
  ['자주 묻는 질문','FAQ','faq.html'],
  ['온라인 문의','Support','support.html'],
  ['서비스 만족도 조사','Service Survey','feedback.html'],
  ['매장 등록 · 정보 수정 요청','Add / Update Shop','shop-request.html'],
  ['광고 · 제휴 문의','Advertising & Partnerships','partner.html'],
] as const;

const formatJoinDate=(value?:string|null,english=false)=>{
  if(!value)return '-';
  const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';
  return d.toLocaleDateString(english?'en-US':'ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');
};
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'FUNY PIN 회원';

export default function Account(){
  const router=useRouter();
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const insets=useSafeAreaInsets();
  const params=useLocalSearchParams<{refresh?:string}>();
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<any>(null);
  const [profile,setProfile]=useState<any>(null);
  const [coinBalance,setCoinBalance]=useState(0);
  const [isTester,setIsTester]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const [toast,setToast]=useState('');

  const showToast=useCallback((message:string)=>{
    setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),1700);
  },[]);

  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);},[]);

  const refresh=useCallback(async()=>{
    try{
      const x=await getProfile();setUser(x.user);setProfile(x.profile);
      if(!x.user){setCoinBalance(0);setIsTester(false);return;}
      const [wallet,tester]=await Promise.all([
        supabase.from('funy_coin_wallets').select('balance').eq('user_id',x.user.id).maybeSingle(),
        supabase.rpc('is_my_feature_tester'),
      ]);
      setCoinBalance(Number(wallet.data?.balance||0));
      setIsTester(tester.data===true);
    }finally{setLoading(false);}
  },[]);

  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  useEffect(()=>{if(params.refresh)void refresh();},[params.refresh,refresh]);
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>void refresh(),0);});
    return()=>subscription.unsubscribe();
  },[refresh]);

  const runLogout=async()=>{setBusy('out');try{await signOut();router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('로그아웃 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=()=>{if(busy)return;Alert.alert('로그아웃할까요?','로그아웃해도 저장된 관심 목록과 활동 내역은 계정에 유지돼요.',[{text:'취소',style:'cancel'},{text:'로그아웃',style:'destructive',onPress:runLogout}]);};
  const removeAccount=()=>Alert.alert('계정을 삭제할까요?','계정과 프로필, 관심 목록 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.');router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e));}finally{setBusy(null);}}}]);

  const openWeb=(file:string,title:string)=>router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}} as any);
  const openItem=(item:WebItem)=>{
    if(item.coming&&!isTester){showToast(en?'This feature is coming soon.':'준비중인 기능입니다.');return;}
    openWeb(item.file,en?item.labelEn:item.labelKo);
  };

  useEffect(()=>{if(!loading&&!user)router.replace({pathname:'/login',params:{next:'account'}} as any);},[loading,user,router]);

  if(loading||!user)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const nickname=profile?.nickname||defaultNickname(user);
  const avatar=profile?(profile.avatar_url||null):(user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
  const joinDate=profile?.created_at||user?.created_at||null;

  const renderItems=(items:WebItem[])=>items.map((item,index)=><Pressable key={item.key} onPress={()=>openItem(item)} style={[styles.menuRow,index<items.length-1&&styles.rowBorder]}>
    <View style={styles.menuIcon}><Ionicons name={item.icon} size={20} color={item.key==='favorites'?'#7456C5':C.textSoft}/></View>
    <View style={styles.menuCopy}>
      <View style={styles.menuLabelRow}><Text style={styles.menuLabel}>{en?item.labelEn:item.labelKo}</Text>{item.coming?<Text style={styles.comingBadge}>{en?'COMING':'준비중'}</Text>:null}</View>
      <Text style={styles.menuSub}>{en?item.subEn:item.subKo}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>);

  return <SafeAreaView edges={['top']} style={styles.root}>
    <View style={styles.header}><NativeBackButton onPress={()=>Platform.OS==='android'?router.replace('/(tabs)'):router.back()}/><Text allowFontScaling={false} style={styles.headerTitle}>MY</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="always" contentContainerStyle={[styles.content,{paddingBottom:Math.max(72,insets.bottom+48)}]}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>{avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<Ionicons name="person" size={42} color="#8C8991"/>}</View>
        <View style={styles.profileCopy}>
          <View style={styles.profileNameRow}><Text numberOfLines={1} style={styles.nickname}>{nickname}</Text><Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>{en?'Edit profile':'프로필 편집'}</Text></Pressable></View>
          <Text style={styles.joinDate}>{en?'Joined':'가입일'} {formatJoinDate(joinDate,en)}</Text>
          <Text style={styles.coin}>FUNY COIN {coinBalance.toLocaleString(en?'en-US':'ko-KR')}</Text>
        </View>
      </View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'My activity':'내 활동'}</Text><View style={styles.menuCard}>{renderItems(ACTIVITY)}</View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Rewards & Collection':'리워드 & 컬렉션'}</Text><View style={styles.menuCard}>{renderItems(REWARDS)}</View></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Settings':'설정'}</Text><View style={styles.menuCard}>
        <View style={[styles.settingRow,styles.rowBorder]}><View style={styles.menuIcon}><Ionicons name="language-outline" size={20} color={C.textSoft}/></View><View style={styles.menuCopy}><Text style={styles.menuLabel}>{en?'Language':'언어'}</Text><Text style={styles.menuSub}>{en?'Change the display language':'서비스 표시 언어를 변경해요'}</Text></View><View style={styles.languageToggle}><Pressable onPress={()=>setLanguage('ko')} style={[styles.languageOption,language==='ko'&&styles.languageOptionOn]}><Text style={[styles.languageText,language==='ko'&&styles.languageTextOn]}>한국어</Text></Pressable><Pressable onPress={()=>setLanguage('en')} style={[styles.languageOption,language==='en'&&styles.languageOptionOn]}><Text style={[styles.languageText,language==='en'&&styles.languageTextOn]}>EN</Text></Pressable></View></View>
        <Pressable onPress={()=>openWeb('my-security.html',en?'Account security':'계정 보안')} style={[styles.menuRow,styles.rowBorder]}><View style={styles.menuIcon}><Ionicons name="shield-checkmark-outline" size={20} color={C.textSoft}/></View><View style={styles.menuCopy}><Text style={styles.menuLabel}>{en?'Account security':'계정 보안'}</Text><Text style={styles.menuSub}>{en?'Manage login and account security':'로그인 및 계정 보안 설정을 관리해요'}</Text></View><Text style={styles.chevron}>›</Text></Pressable>
        <Pressable onPress={()=>openWeb('my-blocked-users.html',en?'Blocked Users':'차단한 사용자')} style={styles.menuRow}><View style={styles.menuIcon}><Ionicons name="ban-outline" size={20} color={C.textSoft}/></View><View style={styles.menuCopy}><Text style={styles.menuLabel}>{en?'Blocked Users':'차단한 사용자'}</Text><Text style={styles.menuSub}>{en?'Manage blocked users in posts and trades':'게시물 · 거래 차단 목록을 관리해요'}</Text></View><Text style={styles.chevron}>›</Text></Pressable>
      </View></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>{en?'Support':'고객지원'}</Text><View style={styles.supportCard}>{SUPPORT.map(([ko,english,file],index)=><Pressable key={file} onPress={()=>openWeb(file,en?english:ko)} style={[styles.supportRow,index<SUPPORT.length-1&&styles.rowBorder]}><Text style={styles.supportLabel}>{en?english:ko}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>

      <View style={styles.accountActions}><Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?(en?'Processing…':'처리 중…'):(en?'Log out':'로그아웃')}</Text></Pressable><Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?(en?'Deleting…':'삭제 중…'):(en?'Delete account':'계정 삭제')}</Text></Pressable></View>

      <View style={styles.legalLinks}><Pressable onPress={()=>openWeb('terms.html',en?'Terms of Service':'이용약관')}><Text style={styles.legalText}>{en?'Terms of Service':'이용약관'}</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('privacy.html',en?'Privacy Policy':'개인정보처리방침')}><Text style={styles.legalText}>{en?'Privacy Policy':'개인정보처리방침'}</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('community-guidelines.html',en?'Community Guidelines':'커뮤니티 운영정책')}><Text style={styles.legalText}>{en?'Community Guidelines':'커뮤니티 운영정책'}</Text></Pressable></View>
    </ScrollView>
    {toast?<View pointerEvents="none" style={[styles.toast,{bottom:Math.max(insets.bottom,16)+18}]}><Text style={styles.toastText}>{toast}</Text></View>:null}
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},
  header:{height:UI.headerH,paddingHorizontal:UI.screenPad,flexDirection:'row',alignItems:'center',backgroundColor:'#fff'},
  headerTitle:{...T.header,color:C.text},
  content:{padding:14,paddingBottom:40},
  profileCard:{padding:16,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3DDED',flexDirection:'row',alignItems:'center',gap:14},
  avatar:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED',borderWidth:1,borderColor:'#DEDBE1',overflow:'hidden',alignItems:'center',justifyContent:'flex-end'},
  avatarImage:{width:62,height:62,borderRadius:31,backgroundColor:'#eee'},
  profileCopy:{minWidth:0,flex:1},
  profileNameRow:{minWidth:0,flexDirection:'row',alignItems:'center',gap:8},
  nickname:{minWidth:0,flex:1,fontSize:17,lineHeight:22,fontWeight:'900',color:C.text},
  profileEdit:{height:28,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:'#D8D5DA',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
  profileEditText:{fontSize:10.5,fontWeight:'800',color:'#555159'},
  joinDate:{marginTop:5,fontSize:10.5,color:C.muted},
  coin:{marginTop:5,fontSize:10.5,fontWeight:'900',color:C.purpleDark},
  section:{marginTop:22},sectionTitle:{marginLeft:3,marginBottom:8,fontSize:14.5,lineHeight:18,fontWeight:'800',letterSpacing:-.2,color:C.text},
  menuCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},
  menuRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  settingRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  menuIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F1EEF5',alignItems:'center',justifyContent:'center'},
  menuCopy:{flex:1,minWidth:0,marginLeft:12},menuLabelRow:{flexDirection:'row',alignItems:'center',gap:5},menuLabel:{fontSize:14,fontWeight:'900',color:C.text},menuSub:{marginTop:4,fontSize:10.5,color:C.muted},
  comingBadge:{height:18,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',color:'#745AB5',fontSize:8.5,lineHeight:18,fontWeight:'900'},
  rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row',alignItems:'center'},languageOption:{height:30,minWidth:48,paddingHorizontal:8,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageText:{fontSize:10.5,fontWeight:'800',color:C.muted},languageTextOn:{color:'#fff'},
  supportCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},supportRow:{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},supportLabel:{fontSize:13.5,fontWeight:'700',color:C.textSoft},
  legalLinks:{marginTop:22,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},
  accountActions:{marginTop:18,alignItems:'center'},logoutButton:{width:'100%',height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger},
  toast:{position:'absolute',left:24,right:24,alignItems:'center'},toastText:{paddingHorizontal:15,paddingVertical:11,borderRadius:12,backgroundColor:'rgba(38,34,43,.94)',color:'#fff',fontSize:11,fontWeight:'700',overflow:'hidden'},
});
