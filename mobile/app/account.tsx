import { useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useLocalSearchParams,useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { C,T,UI } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/i18n';

type MenuItem={label:string;sub:string;file:string;icon:keyof typeof Ionicons.glyphMap;coming?:boolean};

const ACTIVITY:MenuItem[]=[
  {label:'게시글 관리',sub:'작성 게시글 · 댓글 · 좋아요한 게시물',file:'my-community.html',icon:'chatbubble-ellipses-outline'},
  {label:'거래 매물 관리',sub:'판매중 · 비노출/종료 매물 관리',file:'my-market.html',icon:'pricetags-outline'},
  {label:'관심 목록',sub:'관심 카드샵과 저장한 거래 매물',file:'my-favorites.html',icon:'heart'},
];
const REWARDS:MenuItem[]=[
  {label:'퍼니코인',sub:'보유 코인 · 소멸 예정 · 적립/사용 내역',file:'my-funy-coin.html',icon:'cash-outline',coming:true},
  {label:'랭킹',sub:'출석 · 카드샵 방문 · 퍼니몬 포획 랭킹',file:'ranking.html',icon:'trophy-outline',coming:true},
  {label:'배지',sub:'미션과 활동으로 획득한 배지 컬렉션',file:'my-badges.html',icon:'ribbon-outline',coming:true},
  {label:'퍼니몬 도감',sub:'포획한 퍼니몬 컬렉션',file:'my-funymon.html',icon:'sparkles-outline'},
  {label:'응모 내역',sub:'참여한 이벤트와 응모 내역',file:'my-entries.html',icon:'ticket-outline'},
  {label:'쿠폰함',sub:'발급받은 쿠폰을 확인하세요',file:'my-coupons.html',icon:'albums-outline'},
];
const WEB_MENU=[
  ['공지사항','notice.html'],['자주 묻는 질문','faq.html'],['온라인 문의','support.html'],['서비스 만족도 조사','feedback.html'],['매장 등록 · 정보 수정 요청','shop-request.html'],['광고 · 제휴 문의','partner.html'],
] as const;

const formatJoinDate=(value?:string|null)=>{if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');};
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'FUNY PIN 회원';

export default function Account(){
  const router=useRouter();
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const insets=useSafeAreaInsets();
  const params=useLocalSearchParams<{refresh?:string}>();
  const [loading,setLoading]=useState(true),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[busy,setBusy]=useState<string|null>(null);
  const [coinBalance,setCoinBalance]=useState(0),[isTester,setIsTester]=useState(false);
  const refresh=useCallback(async()=>{try{
    const x=await getProfile();setUser(x.user);setProfile(x.profile);
    if(x.user){
      const [{data:wallet},{data:tester}]=await Promise.all([
        supabase.from('funy_coin_wallets').select('balance').eq('user_id',x.user.id).maybeSingle(),
        supabase.rpc('is_my_feature_tester'),
      ]);
      setCoinBalance(Number(wallet?.balance||0));setIsTester(tester===true);
    }else{setCoinBalance(0);setIsTester(false)}
  }finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{refresh();},[refresh]));
  useEffect(()=>{if(params.refresh)refresh();},[params.refresh,refresh]);
  useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>refresh(),0);});return()=>subscription.unsubscribe();},[refresh]);
  const runLogout=async()=>{setBusy('out');try{await signOut();router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('로그아웃 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=()=>{if(busy)return;Alert.alert('로그아웃할까요?','로그아웃해도 저장된 관심 목록과 활동 내역은 계정에 유지돼요.',[{text:'취소',style:'cancel'},{text:'로그아웃',style:'destructive',onPress:runLogout}]);};
  const removeAccount=()=>Alert.alert('계정을 삭제할까요?','계정과 프로필, 관심 목록 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.');router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e));}finally{setBusy(null);}}}]);
  const openWebMenu=(file:string,title:string)=>router.push({pathname:'/web',params:{url:encodeURIComponent('https://funypin.kr/'+file),title}});
  const openItem=(item:MenuItem)=>{if(item.coming&&!isTester){Alert.alert('준비중','현재는 사전 테스트 계정에서만 이용할 수 있습니다.');return;}openWebMenu(item.file,item.label);};

  useEffect(()=>{if(!loading&&!user)router.replace({pathname:'/login',params:{next:'account'}} as any);},[loading,user,router]);
  if(loading||!user)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  const nickname=profile?.nickname||defaultNickname(user);
  const avatar=profile?(profile.avatar_url||null):(user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null);
  const joinDate=profile?.created_at||user?.created_at||null;
  const menuSection=(items:MenuItem[])=><View style={styles.menuCard}>{items.map((item,i)=><Pressable key={item.file} onPress={()=>openItem(item)} style={[styles.menuRow,i<items.length-1&&styles.rowBorder]}><View style={styles.menuIcon}><Ionicons name={item.icon} size={20} color={C.purpleDark}/></View><View style={styles.menuCopy}><View style={styles.menuTitleRow}><Text style={styles.menuLabel}>{item.label}</Text>{item.coming?<Text style={styles.comingBadge}>준비중</Text>:null}</View><Text style={styles.menuSub}>{item.sub}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View>;

  return <SafeAreaView edges={['top']} style={styles.root}>
    <View style={styles.header}><Pressable onPress={()=>Platform.OS==='android'?router.replace('/(tabs)'):router.back()} hitSlop={8} style={styles.back}><Text allowFontScaling={false} style={styles.backText}>‹</Text></Pressable><Text allowFontScaling maxFontSizeMultiplier={1} style={styles.headerTitle}>MY</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="always" contentContainerStyle={[styles.content,{paddingBottom:Math.max(72,insets.bottom+48)}]}>
      <View style={styles.profileCard}>
        {avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<View style={styles.avatar}><Ionicons name="person" size={34} color="#85818A"/></View>}
        <View style={styles.profileCopy}><View style={styles.profileNameRow}><Text numberOfLines={1} style={styles.nickname}>{nickname}</Text><Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>프로필 편집</Text></Pressable></View><Text style={styles.joinDate}>가입일 {formatJoinDate(joinDate)}</Text><Text style={styles.coin}>FUNY COIN {coinBalance.toLocaleString('ko-KR')}</Text></View>
      </View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'My activity':'내 활동'}</Text></View>{menuSection(ACTIVITY)}</View>
      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Rewards & Collection':'리워드 & 컬렉션'}</Text></View>{menuSection(REWARDS)}</View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Settings':'설정'}</Text></View><View style={styles.supportCard}>
        <View style={[styles.languageRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Ionicons name="language-outline" size={19} color={C.purpleDark}/></View><View><Text style={styles.supportLabel}>{en?'Language':'언어'}</Text><Text style={styles.settingSub}>{en?'Change display language':'서비스 표시 언어를 변경해요'}</Text></View></View><View style={styles.languageToggle}><Pressable onPress={()=>setLanguage('ko')} style={[styles.languageOption,language==='ko'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='ko'&&styles.languageOptionTextOn]}>한국어</Text></Pressable><Pressable onPress={()=>setLanguage('en')} style={[styles.languageOption,language==='en'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='en'&&styles.languageOptionTextOn]}>EN</Text></Pressable></View></View>
        <Pressable onPress={()=>openWebMenu('my-security.html',en?'Account security':'계정 보안')} style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Ionicons name="shield-checkmark-outline" size={19} color={C.purpleDark}/></View><View><Text style={styles.supportLabel}>{en?'Account security':'계정 보안'}</Text><Text style={styles.settingSub}>{en?'Manage login and security':'로그인 및 계정 보안을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable>
        <Pressable onPress={()=>openWebMenu('my-blocked-users.html',en?'Blocked users':'차단한 사용자')} style={styles.settingRow}><View style={styles.settingLead}><View style={styles.settingIcon}><Ionicons name="ban-outline" size={19} color={C.purpleDark}/></View><View><Text style={styles.supportLabel}>{en?'Blocked users':'차단한 사용자'}</Text><Text style={styles.settingSub}>{en?'Manage post and trade blocks':'게시물 · 거래 차단 목록을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable>
      </View></View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Support':'고객지원'}</Text></View><View style={styles.supportCard}>{WEB_MENU.map(([label,file],i)=><Pressable key={file} onPress={()=>openWebMenu(file,label)} style={[styles.supportRow,i<WEB_MENU.length-1&&styles.rowBorder]}><Text style={styles.supportLabel}>{label}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>

      <View style={styles.accountActions}><Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable><Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable></View>
      <View style={styles.legalLinks}><Pressable onPress={()=>openWebMenu('terms.html','이용약관')}><Text style={styles.legalText}>이용약관</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWebMenu('privacy.html','개인정보처리방침')}><Text style={styles.legalText}>개인정보처리방침</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWebMenu('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalText}>커뮤니티 운영정책</Text></Pressable></View>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},header:{height:UI.headerH,paddingHorizontal:UI.screenPad,flexDirection:'row',alignItems:'center',backgroundColor:'#fff'},back:{width:36,height:36,alignItems:'center',justifyContent:'center',marginRight:4},backText:{fontSize:29,lineHeight:30,fontWeight:'400',color:C.text,textAlign:'center'},headerTitle:{...T.header,color:C.text},content:{padding:16,paddingBottom:40},
  profileCard:{padding:16,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E3DDED',flexDirection:'row',alignItems:'center',gap:14},avatar:{width:62,height:62,borderRadius:31,backgroundColor:'#ECEBED',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDDADD'},avatarImage:{width:62,height:62,borderRadius:31,backgroundColor:'#eee'},profileCopy:{minWidth:0,flex:1},profileNameRow:{minWidth:0,flexDirection:'row',alignItems:'center',gap:9},nickname:{minWidth:0,flex:1,fontSize:17,fontWeight:'900',color:C.text},profileEdit:{height:28,paddingHorizontal:10,borderRadius:14,borderWidth:1,borderColor:'#D8D4DC',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},profileEditText:{fontSize:10.5,fontWeight:'800',color:'#555159'},joinDate:{marginTop:5,fontSize:10.5,color:C.muted},coin:{marginTop:5,fontSize:10.5,fontWeight:'900',color:C.purpleDark},
  section:{marginTop:23},sectionHead:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:3,marginBottom:8},sectionTitle:{fontSize:14.5,lineHeight:18,fontWeight:'800',letterSpacing:-.2,color:C.text},menuCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},menuRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},menuIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},menuCopy:{flex:1,marginLeft:12},menuTitleRow:{flexDirection:'row',alignItems:'center'},menuLabel:{fontSize:14,fontWeight:'900',color:C.text},menuSub:{marginTop:4,fontSize:10.5,color:C.muted},comingBadge:{height:18,marginLeft:6,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',color:'#745AB5',fontSize:8.5,lineHeight:18,fontWeight:'900',overflow:'hidden'},
  supportCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},supportRow:{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},supportLabel:{fontSize:13.5,fontWeight:'700',color:C.textSoft},settingRow:{minHeight:68,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},settingLead:{flexDirection:'row',alignItems:'center',gap:11},settingIcon:{width:38,height:38,borderRadius:13,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},settingSub:{marginTop:3,fontSize:10.5,color:C.muted},languageRow:{minHeight:70,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row',alignItems:'center'},languageOption:{height:30,minWidth:48,paddingHorizontal:8,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageOptionText:{fontSize:11,fontWeight:'800',color:C.muted},languageOptionTextOn:{color:'#fff'},rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  legalLinks:{marginTop:22,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},accountActions:{marginTop:18,alignItems:'center'},logoutButton:{width:'100%',height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger}
});
