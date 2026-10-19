import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,RefreshControl,ScrollView,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useLocalSearchParams,useRouter } from 'expo-router';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { C,T,UI } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { visualAssets } from '../lib/visualAssets';
import { useAppLanguage } from '../lib/i18n';

const WEB_MENU=[
  ['공지사항','notice.html'],['자주 묻는 질문','faq.html'],['온라인 문의','support.html'],['서비스 만족도 조사','feedback.html'],['매장 등록 · 정보 수정 요청','shop-request.html'],['광고 · 제휴 문의','partner.html'],
] as const;

type MissionItem={id:string;mission_type:string;title:string;description?:string|null;target_count:number;reward_coin:number;cta_type:'checkin'|'route'|'web'|'none';cta_label?:string|null;cta_target?:string|null;progress_count:number;status:'in_progress'|'completed';completed_at?:string|null;rewarded_at?:string|null};
type MissionCampaign={id:string;title:string;description?:string|null;period_type:'daily'|'weekly'|'monthly';completed_count:number;total_count:number;missions:MissionItem[]};
type Dashboard={ok:boolean;is_tester?:boolean;profile?:{nickname?:string|null;avatar_url?:string|null;created_at?:string|null};activity?:{post_count?:number;listing_count?:number;favorite_count?:number;shop_favorite_count?:number;market_favorite_count?:number};funy_coin?:{visible?:boolean;balance?:number;url?:string};mission_features?:{visible?:boolean;reward_enabled?:boolean;release_locked?:boolean};mission_campaigns?:MissionCampaign[]};

const formatJoinDate=(value?:string|null)=>{if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');};
const defaultNickname=(user:any)=>user?`FUNY회원${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:'FUNY PIN 회원';
const number=(value?:number|null)=>Number(value||0).toLocaleString('ko-KR');
const ringUri=(percent:number)=>{const value=Math.max(0,Math.min(100,percent));const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="29" fill="none" stroke="#ECE8F1" stroke-width="7"/><circle cx="36" cy="36" r="29" fill="none" stroke="#7657D6" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(182.21*value/100).toFixed(2)} 182.21" transform="rotate(-90 36 36)"/></svg>`;return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;};

export default function Account(){
  const router=useRouter();
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const insets=useSafeAreaInsets();
  const params=useLocalSearchParams<{refresh?:string}>();
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[dashboard,setDashboard]=useState<Dashboard|null>(null),[busy,setBusy]=useState<string|null>(null),[missionIndex,setMissionIndex]=useState(0),[missionOpen,setMissionOpen]=useState(false);
  const touchStartX=useRef(0);

  const refresh=useCallback(async(showRefresh=false)=>{
    if(showRefresh)setRefreshing(true);
    try{
      const [account,rpc]=await Promise.all([getProfile(),supabase.rpc('get_my_dashboard_v1')]);
      setUser(account.user);setProfile(account.profile);
      if(!rpc.error&&rpc.data?.ok)setDashboard(rpc.data as Dashboard);
      else setDashboard({ok:true,profile:account.profile||{},activity:{post_count:0,listing_count:0,favorite_count:0},funy_coin:{visible:false,balance:0,url:'https://funypin.kr/my-funy-coin.html'},mission_features:{visible:false},mission_campaigns:[]});
    }finally{setLoading(false);setRefreshing(false)}
  },[]);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  useEffect(()=>{if(params.refresh)void refresh();},[params.refresh,refresh]);
  useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>refresh(),0);});return()=>subscription.unsubscribe();},[refresh]);
  useEffect(()=>{const count=dashboard?.mission_campaigns?.length||0;if(missionIndex>=count)setMissionIndex(0);},[dashboard,missionIndex]);

  const runLogout=async()=>{setBusy('out');try{await signOut();router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('로그아웃 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=()=>{if(busy)return;Alert.alert('로그아웃할까요?','로그아웃해도 저장된 관심 매장과 활동 내역은 계정에 유지돼요.',[{text:'취소',style:'cancel'},{text:'로그아웃',style:'destructive',onPress:runLogout}]);};
  const removeAccount=()=>Alert.alert('계정을 삭제할까요?','계정과 프로필, 관심 매장 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:'취소',style:'cancel'},{text:'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert('계정 삭제 완료','FUNY PIN 계정이 삭제되었습니다.');router.replace('/(tabs)' as any);}catch(e:any){Alert.alert('계정 삭제 실패',String(e?.message||e));}finally{setBusy(null);}}}]);
  const openWeb=(target:string,title:string)=>{const url=/^https?:\/\//i.test(target)?target:`https://funypin.kr/${target.replace(/^\//,'')}`;router.push({pathname:'/web',params:{url:encodeURIComponent(url),title}});};
  const openPrepared=(target:string,title:string)=>{if(dashboard?.is_tester)openWeb(target,title);else Alert.alert('준비중','준비중인 기능입니다.');};

  useEffect(()=>{if(!loading&&!user)router.replace({pathname:'/login',params:{next:'account'}} as any);},[loading,user,router]);

  const campaigns=dashboard?.mission_features?.visible?(dashboard?.mission_campaigns||[]):[];
  const activeCampaign=campaigns[missionIndex]||null;
  const activity=dashboard?.activity||{};
  const coin=dashboard?.funy_coin||{};
  const currentProfile=dashboard?.profile||profile||{};
  const generatedNickname=defaultNickname(user);
  const nickname=currentProfile?.nickname||profile?.nickname||generatedNickname;
  const avatar=currentProfile?.avatar_url||profile?.avatar_url||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||null;
  const joinDate=currentProfile?.created_at||profile?.created_at||user?.created_at||null;
  const initials=String(nickname).trim().slice(0,1).toUpperCase();
  const missionPercent=activeCampaign?.total_count?Math.round(activeCampaign.completed_count/activeCampaign.total_count*100):0;

  const changeMission=(next:number)=>{if(!campaigns.length)return;setMissionIndex(Math.max(0,Math.min(campaigns.length-1,next)));setMissionOpen(false);};
  const runMission=async(item:MissionItem)=>{
    if(item.status==='completed'||busy)return;
    if(item.cta_type==='checkin'){
      setBusy(`mission:${item.id}`);
      try{const {data,error}=await supabase.rpc('mission_checkin');if(error)throw error;if(data?.ok===false)throw new Error(data?.error||'mission_failed');await refresh();Alert.alert('미션 반영 완료',Number(data?.rewarded_coin||0)>0?`퍼니코인 ${number(data.rewarded_coin)}개를 받았어요.`:'미션 진행 상태를 갱신했어요.');}catch(e:any){Alert.alert('미션 반영 실패',String(e?.message||e));}finally{setBusy(null)}
      return;
    }
    const target=String(item.cta_target||'').trim();
    if(!target){Alert.alert('이동할 화면 없음','관리자가 이동할 화면을 아직 설정하지 않았어요.');return}
    openWeb(target,item.title);
  };

  const activityRows=useMemo(()=>[
    {label:'게시글 관리',sub:'작성 게시글 · 댓글 · 좋아요한 게시물',icon:'💬',onPress:()=>openWeb('my-community.html','게시글 관리')},
    {label:'거래 매물 관리',sub:'판매중 · 비노출/종료 매물 관리',icon:'🃏',onPress:()=>openWeb('my-market.html','거래 매물 관리')},
    {label:'관심 목록',sub:'관심 카드샵과 저장한 매물 확인',icon:'♥',onPress:()=>router.push('/my/favorites')},
  ],[router]);
  const rewardRows=useMemo(()=>[
    {label:'랭킹',sub:'출석 · 카드샵 방문 · 퍼니몬 포획 랭킹',icon:'🏆',prepared:true,onPress:()=>openPrepared('ranking.html','랭킹')},
    {label:'배지',sub:'미션과 활동으로 획득한 배지 컬렉션',icon:'🎖️',prepared:true,onPress:()=>openPrepared('my-badges.html','배지')},
    {label:'퍼니몬 도감',sub:'포획한 퍼니몬 컬렉션',icon:'👾',onPress:()=>router.push('/my/funymon')},
    {label:'응모 내역',sub:'참여한 이벤트와 응모 내역',icon:'🎟️',onPress:()=>router.push('/my/entries')},
    {label:'쿠폰함',sub:'발급받은 쿠폰을 확인하세요',icon:'🎫',onPress:()=>router.push('/my/coupons')},
  ],[router,dashboard?.is_tester]);

  if(loading||!user)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  return <SafeAreaView edges={['top']} style={styles.root}>
    <View style={styles.header}><Image source={{uri:visualAssets.logo}} resizeMode="contain" style={styles.headerLogo}/><Text allowFontScaling={false} style={styles.headerTitle}>MY</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="always" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>refresh(true)} tintColor={C.purple}/>} contentContainerStyle={[styles.content,{paddingBottom:Math.max(72,insets.bottom+48)}]}>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          {avatar?<Image source={{uri:avatar}} style={styles.avatarImage}/>:<View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>}
          <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.nickname}>{nickname}</Text><Text style={styles.joinDate}>가입일 {formatJoinDate(joinDate)}</Text><View style={styles.statsRow}><Pressable onPress={()=>openWeb('my-community.html','게시글 관리')} style={styles.statLink}><Text style={styles.statText}>게시글 <Text style={styles.statValue}>{number(activity.post_count)}</Text></Text></Pressable><View style={styles.statDivider}/><Pressable onPress={()=>openWeb('my-market.html','거래 매물 관리')} style={styles.statLink}><Text style={styles.statText}>매물 <Text style={styles.statValue}>{number(activity.listing_count)}</Text></Text></Pressable><View style={styles.statDivider}/><Pressable onPress={()=>router.push('/my/favorites')} style={styles.statLink}><Text style={styles.statText}>관심 <Text style={styles.statValue}>{number(activity.favorite_count)}</Text></Text></Pressable></View></View>
          <Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>프로필 편집</Text></Pressable>
        </View>
        {coin.visible?<Pressable onPress={()=>openWeb('my-funy-coin.html','FUNY COIN')} style={styles.coinRow}><View style={styles.coinIcon}><Text style={styles.coinIconText}>🪙</Text></View><Text style={styles.coinLabel}>FUNY COIN</Text><Text style={styles.coinValue}>{number(coin.balance)}</Text><Text style={styles.coinChevron}>›</Text></Pressable>:null}
      </View>

      {activeCampaign?<View style={[styles.missionCard,missionOpen&&styles.missionCardOpen]} onTouchStart={e=>{touchStartX.current=e.nativeEvent.pageX}} onTouchEnd={e=>{const delta=e.nativeEvent.pageX-touchStartX.current;if(Math.abs(delta)<48)return;changeMission(delta<0?missionIndex+1:missionIndex-1)}}>
        <Pressable onPress={()=>setMissionOpen(v=>!v)} style={styles.missionSummary}>
          <View style={styles.ringWrap}><Image source={{uri:ringUri(missionPercent)}} style={styles.ring}/><View style={styles.ringTextWrap}><Text style={styles.ringValue}>{activeCampaign.completed_count}/{activeCampaign.total_count}</Text><Text style={styles.ringLabel}>진행</Text></View></View>
          <View style={styles.missionCopy}><Text numberOfLines={1} style={styles.missionTitle}>{activeCampaign.title}</Text><Text numberOfLines={1} style={styles.missionDesc}>{activeCampaign.description||'미션을 완료하고 퍼니코인을 모아보세요'}</Text></View>
          <Text style={[styles.missionToggle,missionOpen&&styles.missionToggleOpen]}>⌄</Text>
        </Pressable>
        {campaigns.length>1?<View style={styles.pager}><Pressable disabled={missionIndex===0} onPress={()=>changeMission(missionIndex-1)} style={[styles.pageArrow,missionIndex===0&&styles.pageDisabled]}><Text style={styles.pageArrowText}>‹</Text></Pressable><View style={styles.dots}>{campaigns.map((_,index)=><Pressable key={index} onPress={()=>changeMission(index)} style={[styles.dot,index===missionIndex&&styles.dotOn]}/>)}</View><Pressable disabled={missionIndex===campaigns.length-1} onPress={()=>changeMission(missionIndex+1)} style={[styles.pageArrow,missionIndex===campaigns.length-1&&styles.pageDisabled]}><Text style={styles.pageArrowText}>›</Text></Pressable></View>:null}
        {missionOpen?<View style={styles.missionList}>{(activeCampaign.missions||[]).map((item,index)=>{const done=item.status==='completed';const isBusy=busy===`mission:${item.id}`;return <View key={item.id} style={[styles.missionRow,index<activeCampaign.missions.length-1&&styles.rowBorder]}><View style={styles.missionItemCopy}><View style={styles.missionItemTitleRow}><Text style={styles.missionItemTitle}>{item.title}</Text>{item.reward_coin>0?<View style={styles.rewardChip}><Text style={styles.rewardChipText}>+{number(item.reward_coin)} FUNY</Text></View>:null}</View><Text style={styles.missionItemSub}>{item.description?`${item.description} · `:''}{Math.min(item.target_count,item.progress_count)}/{item.target_count}</Text></View><Pressable disabled={done||isBusy} onPress={()=>runMission(item)} style={[styles.missionAction,done&&styles.missionActionDone]}><Text style={[styles.missionActionText,done&&styles.missionActionTextDone]}>{done?'완료':isBusy?'확인 중…':item.cta_label||'하러 가기'}</Text></Pressable></View>})}</View>:null}
      </View>:null}

      <MenuSection title={en?'My activity':'내 활동'} rows={activityRows}/>
      <MenuSection title={en?'Rewards & Collection':'리워드 & 컬렉션'} rows={rewardRows}/>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Settings':'설정'}</Text></View><View style={styles.supportCard}><View style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🌐</Text></View><View><Text style={styles.settingLabel}>{en?'Language':'언어'}</Text><Text style={styles.settingSub}>{en?'Change the display language':'서비스 표시 언어를 변경해요'}</Text></View></View><View style={styles.languageToggle}><Pressable onPress={()=>setLanguage('ko')} style={[styles.languageOption,language==='ko'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='ko'&&styles.languageOptionTextOn]}>한국어</Text></Pressable><Pressable onPress={()=>setLanguage('en')} style={[styles.languageOption,language==='en'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='en'&&styles.languageOptionTextOn]}>EN</Text></Pressable></View></View><Pressable onPress={()=>openWeb('my-security.html','계정 보안')} style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🔐</Text></View><View><Text style={styles.settingLabel}>{en?'Account security':'계정 보안'}</Text><Text style={styles.settingSub}>{en?'Manage login and account security':'로그인 및 계정 보안 설정을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable><Pressable onPress={()=>router.push('/my/blocked-users')} style={styles.settingRow}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🚫</Text></View><View><Text style={styles.settingLabel}>{en?'Blocked users':'차단한 사용자'}</Text><Text style={styles.settingSub}>{en?'Manage blocked users in FUNY TALK':'FUNY TALK 차단 목록을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable></View></View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Support':'고객지원'}</Text></View><View style={styles.supportCard}>{WEB_MENU.map(([label,file],i)=><Pressable key={file} onPress={()=>openWeb(file,label)} style={[styles.supportRow,i<WEB_MENU.length-1&&styles.rowBorder]}><Text style={styles.supportLabel}>{label}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>

      <View style={styles.accountActions}><Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?'처리 중…':'로그아웃'}</Text></Pressable><Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?'삭제 중…':'계정 삭제'}</Text></Pressable></View>
      <View style={styles.legalLinks}><Pressable onPress={()=>openWeb('terms.html','이용약관')}><Text style={styles.legalText}>이용약관</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('privacy.html','개인정보처리방침')}><Text style={styles.legalText}>개인정보처리방침</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('community-guidelines.html','커뮤니티 운영정책')}><Text style={styles.legalText}>커뮤니티 운영정책</Text></Pressable></View>
    </ScrollView>
  </SafeAreaView>;
}

type MenuRow={label:string;sub:string;icon:string;prepared?:boolean;onPress:()=>void};
function MenuSection({title,rows}:{title:string;rows:MenuRow[]}){return <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text></View><View style={styles.activityCard}>{rows.map((item,i)=><Pressable key={item.label} onPress={item.onPress} style={[styles.activityRow,i<rows.length-1&&styles.rowBorder]}><View style={styles.activityIcon}><Text style={styles.activityIconText}>{item.icon}</Text></View><View style={styles.activityCopy}><View style={styles.activityTitleRow}><Text style={styles.activityLabel}>{item.label}</Text>{item.prepared?<View style={styles.preparedChip}><Text style={styles.preparedText}>준비중</Text></View>:null}</View><Text style={styles.activitySub}>{item.sub}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},header:{height:UI.headerH,paddingHorizontal:UI.screenPad,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.97)'},headerLogo:{width:30,height:34,marginRight:8},headerTitle:{...T.header,color:C.text},content:{paddingHorizontal:16,paddingTop:18,paddingBottom:40},
  profileCard:{padding:17,borderRadius:22,backgroundColor:'#fff',borderWidth:1,borderColor:'#E7E1EC'},profileTop:{flexDirection:'row',alignItems:'center'},avatar:{width:68,height:68,borderRadius:34,backgroundColor:'#EEEAF2',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DED7E6'},avatarImage:{width:68,height:68,borderRadius:34,backgroundColor:'#EEE'},avatarText:{fontSize:24,fontWeight:'900',color:'#8C8491'},profileCopy:{flex:1,minWidth:0,marginLeft:13},nickname:{fontSize:18,fontWeight:'900',letterSpacing:-.5,color:C.text},joinDate:{marginTop:6,fontSize:10.5,color:C.muted},profileEdit:{height:31,paddingHorizontal:11,borderRadius:16,borderWidth:1,borderColor:'#DDD6E6',alignItems:'center',justifyContent:'center'},profileEditText:{fontSize:10,fontWeight:'900',color:C.textSoft},
  statsRow:{marginTop:8,flexDirection:'row',alignItems:'center'},statLink:{paddingVertical:3},statText:{fontSize:11,fontWeight:'700',color:'#766F7B'},statValue:{fontWeight:'900',color:C.text},statDivider:{width:1,height:11,marginHorizontal:8,backgroundColor:'#DDD7E2'},coinRow:{marginTop:13,minHeight:50,paddingHorizontal:14,borderRadius:14,backgroundColor:'#F5F1FC',borderWidth:1,borderColor:'#ECE5F8',flexDirection:'row',alignItems:'center'},coinIcon:{width:26,height:26,alignItems:'center',justifyContent:'center'},coinIconText:{fontSize:19},coinLabel:{marginLeft:9,fontSize:10.8,fontWeight:'900',color:C.text},coinValue:{marginLeft:'auto',fontSize:17,fontWeight:'900',color:C.text},coinChevron:{marginLeft:7,fontSize:23,color:'#716979'},
  missionCard:{marginTop:14,borderRadius:22,backgroundColor:'#fff',borderWidth:1,borderColor:'#E7E1EC',overflow:'hidden'},missionCardOpen:{},missionSummary:{minHeight:105,padding:15,flexDirection:'row',alignItems:'center'},ringWrap:{width:64,height:64,alignItems:'center',justifyContent:'center'},ring:{position:'absolute',width:64,height:64},ringTextWrap:{alignItems:'center'},ringValue:{fontSize:13,fontWeight:'900',color:C.purpleDark},ringLabel:{marginTop:1,fontSize:8,color:C.muted},missionCopy:{flex:1,minWidth:0,marginLeft:11},missionTitle:{marginTop:4,fontSize:15,fontWeight:'900',letterSpacing:-.35,color:C.text},missionDesc:{marginTop:5,fontSize:10.5,color:C.muted},missionToggle:{width:28,textAlign:'center',fontSize:24,color:'#8E8693'},missionToggleOpen:{transform:[{rotate:'180deg'}]},pager:{paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},pageArrow:{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:'#E8E2ED',alignItems:'center',justifyContent:'center'},pageDisabled:{opacity:.28},pageArrowText:{fontSize:18,color:'#756D7A'},dots:{flexDirection:'row',alignItems:'center',gap:5},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#D6D0DC'},dotOn:{width:17,backgroundColor:C.purpleDark},missionList:{borderTopWidth:1,borderTopColor:'#F0ECF3',paddingHorizontal:14,paddingBottom:12},missionRow:{minHeight:62,flexDirection:'row',alignItems:'center'},missionItemCopy:{flex:1,minWidth:0},missionItemTitleRow:{flexDirection:'row',alignItems:'center',gap:6},missionItemTitle:{flexShrink:1,fontSize:12,fontWeight:'900',color:C.text},rewardChip:{height:19,paddingHorizontal:7,borderRadius:10,backgroundColor:'#FFF4D8',alignItems:'center',justifyContent:'center'},rewardChipText:{fontSize:8.5,fontWeight:'900',color:'#9A6910'},missionItemSub:{marginTop:4,fontSize:9,color:C.muted},missionAction:{minWidth:68,height:32,paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:'#DCD2F1',backgroundColor:'#F8F5FF',alignItems:'center',justifyContent:'center'},missionActionDone:{borderColor:'#E5E1E8',backgroundColor:'#F2F0F3'},missionActionText:{fontSize:9.5,fontWeight:'900',color:C.purpleDark},missionActionTextDone:{color:C.muted},
  section:{marginTop:23},sectionHead:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:3,marginBottom:8},sectionTitle:{fontSize:14.5,lineHeight:18,fontWeight:'800',letterSpacing:-.2,color:C.text},activityCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},activityRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},activityIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},activityIconText:{fontSize:18,color:C.purpleDark},activityCopy:{flex:1,marginLeft:12},activityTitleRow:{flexDirection:'row',alignItems:'center'},activityLabel:{fontSize:14,fontWeight:'900',color:C.text},preparedChip:{height:18,marginLeft:6,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',alignItems:'center',justifyContent:'center'},preparedText:{fontSize:8.5,fontWeight:'900',color:'#745AB5'},activitySub:{marginTop:4,fontSize:10.5,color:C.muted},supportCard:{borderRadius:19,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},supportRow:{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},supportLabel:{fontSize:13.5,fontWeight:'700',color:C.textSoft},settingRow:{minHeight:69,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},settingLead:{flex:1,flexDirection:'row',alignItems:'center',minWidth:0},settingIcon:{width:35,height:35,borderRadius:12,backgroundColor:'#F2EDFB',alignItems:'center',justifyContent:'center',marginRight:11},settingIconText:{fontSize:15},settingLabel:{fontSize:13,fontWeight:'900',color:C.text},settingSub:{marginTop:3,fontSize:9.5,color:C.muted},languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row',alignItems:'center'},languageOption:{height:30,minWidth:52,paddingHorizontal:10,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageOptionText:{fontSize:11,fontWeight:'800',color:C.muted},languageOptionTextOn:{color:'#fff'},rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  legalLinks:{marginTop:22,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:10.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},accountActions:{marginTop:18,alignItems:'center'},logoutButton:{width:'100%',height:54,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},logoutText:{fontSize:13,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:12,fontWeight:'800',color:C.danger}
});
