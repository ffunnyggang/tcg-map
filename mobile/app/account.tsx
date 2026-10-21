import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { ActivityIndicator,Alert,Image,Platform,Pressable,RefreshControl,ScrollView,StatusBar,StyleSheet,Text,View } from 'react-native';
import { SafeAreaView,useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect,useLocalSearchParams,useRouter } from 'expo-router';
import { deleteAccount,getProfile,signOut } from '../lib/auth';
import { C,T,UI } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { visualAssets } from '../lib/visualAssets';
import { useAppLanguage } from '../lib/i18n';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadNotificationCount,subscribeNotificationChanges } from '../lib/notifications';

const WEB_MENU=[
  ['공지사항','Notices','notice.html'],['자주 묻는 질문','FAQ','faq.html'],['온라인 문의','Support','support.html'],['서비스 만족도 조사','Service Survey','feedback.html'],['매장 등록 · 정보 수정 요청','Add / Update Shop','shop-request.html'],['광고 · 제휴 문의','Advertising & Partnerships','partner.html'],
] as const;

type MissionItem={id:string;mission_type:string;title:string;description?:string|null;target_count:number;reward_coin:number;cta_type:'checkin'|'route'|'web'|'none';cta_label?:string|null;cta_target?:string|null;progress_count:number;status:'in_progress'|'completed';completed_at?:string|null;rewarded_at?:string|null};
type MissionCampaign={id:string;title:string;description?:string|null;period_type:'daily'|'weekly'|'monthly';completed_count:number;total_count:number;missions:MissionItem[]};
type Dashboard={ok:boolean;is_tester?:boolean;profile?:{nickname?:string|null;avatar_url?:string|null;created_at?:string|null};activity?:{post_count?:number;listing_count?:number;favorite_count?:number;shop_favorite_count?:number;market_favorite_count?:number};funy_coin?:{visible?:boolean;balance?:number;url?:string};mission_features?:{visible?:boolean;reward_enabled?:boolean;release_locked?:boolean};mission_campaigns?:MissionCampaign[]};

const formatJoinDate=(value?:string|null,en=false)=>{if(!value)return '-';const d=new Date(value);if(Number.isNaN(d.getTime()))return '-';return d.toLocaleDateString(en?'en-US':'ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'');};
const defaultNickname=(user:any,en=false)=>user?`${en?'FUNY Member':'FUNY회원'}${String(user.id||'').replace(/-/g,'').slice(-4).toUpperCase()}`:(en?'FUNY PIN Member':'FUNY PIN 회원');
const number=(value?:number|null,en=false)=>Number(value||0).toLocaleString(en?'en-US':'ko-KR');
const MISSION_EN:Record<string,{title:(n:number)=>string;description:string;cta:string}>={
  daily_checkin:{title:n=>n>1?`Check in ${n} times`:'Check in',description:"Complete today's check-in.",cta:'Check in'},
  profile_complete:{title:()=> 'Complete your profile',description:'Set your nickname and profile image.',cta:'Edit profile'},
  community_post_create:{title:n=>n>1?`Create ${n} posts`:'Create a post',description:'Create a post in FUNY TALK.',cta:'Create post'},
  community_post_like:{title:n=>n>1?`Like ${n} posts`:'Like a post',description:'Like a post you enjoy in FUNY TALK.',cta:'Browse posts'},
  community_comment_create:{title:n=>n>1?`Write ${n} comments`:'Write a comment',description:'Leave a comment on a FUNY TALK post.',cta:'Write comment'},
  market_listing_create:{title:n=>n>1?`Add ${n} listings`:'Add a listing',description:'Add a TCG trade listing.',cta:'Add listing'},
  shop_favorite_add:{title:n=>n>1?`Favorite ${n} shops`:'Favorite a shop',description:'Save a card shop you like.',cta:'Browse shops'},
  market_favorite_add:{title:n=>n>1?`Save ${n} listings`:'Save a listing',description:'Save a TCG trade listing you like.',cta:'Browse listings'},
  shop_visit_checkin:{title:n=>n>1?`Verify ${n} shop visits`:'Verify a shop visit',description:'Complete a visit check-in at a nearby card shop.',cta:'Verify visit'},
  funymon_capture:{title:n=>n>1?`Catch FUNY MON ${n} times`:'Catch FUNY MON',description:'Catch FUNY MON on TCG MAP.',cta:'Open map'},
  event_entry:{title:n=>n>1?`Join ${n} events`:'Join an event',description:'Join an available FUNY PIN event.',cta:'View entries'},
};
const RING_SEGMENTS=180;
function ProgressRing({percent,label}:{percent:number;label:string}){
  const value=Math.max(0,Math.min(100,percent));
  const active=Math.round(RING_SEGMENTS*value/100);
  return <View style={styles.ringWrap}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.ringTrack}/>
      {Array.from({length:active},(_,i)=>{const angle=(-Math.PI/2)+(Math.PI*2*i/RING_SEGMENTS),r=20,size=7;return <View key={i} style={[styles.ringDot,{left:24+r*Math.cos(angle)-size/2,top:24+r*Math.sin(angle)-size/2}]}/>})}
    </View>
    <Text style={styles.ringValue}>{label}</Text>
  </View>;
}
function MissionToggle({open}:{open:boolean}){
  return <View style={[styles.missionToggle,open&&styles.missionToggleOpen]}><View style={styles.toggleChevron}/></View>;
}

export default function Account(){
  const router=useRouter();
  const {language,setLanguage}=useAppLanguage();
  const en=language==='en';
  const webMenu=WEB_MENU.map(([ko,enLabel,file])=>[en?enLabel:ko,file] as const);
  const missionCopy=(item:MissionItem)=>{
    if(!en)return{title:item.title,description:item.description||'',cta:item.cta_label||''};
    const def=MISSION_EN[item.mission_type],n=Math.max(1,Number(item.target_count||1));
    return def?{title:def.title(n),description:def.description,cta:def.cta}:{title:/[가-힣]/.test(item.title)?'Mission':item.title,description:/[가-힣]/.test(item.description||'')?'Complete this mission to earn rewards.':(item.description||''),cta:/[가-힣]/.test(item.cta_label||'')?'In progress':(item.cta_label||'In progress')};
  };
  const campaignCopy=(campaign:MissionCampaign|null)=>{
    if(!campaign)return{title:'',description:''};
    if(!en)return{title:campaign.title,description:campaign.description||'미션을 완료하고 퍼니코인을 모아보세요'};
    const titleMap:Record<string,string>={'오늘의 미션이 도착했어요!':"Today's Missions",'이번 주 미션':'Weekly Missions','10월 미션':'October Missions'};
    const descMap:Record<string,string>={'미션을 완료하고 퍼니코인을 모아보세요':'Complete missions and collect FUNY COIN.','10월 동안 FUNY PIN 활동을 완성해보세요':'Complete FUNY PIN activities throughout October.','이번 주 활동을 채우고 추가 보상을 받아보세요':"Complete this week's activities and earn bonus rewards."};
    const period=campaign.period_type==='weekly'?'Weekly Missions':campaign.period_type==='monthly'?'Monthly Missions':"Today's Missions";
    return{title:titleMap[campaign.title]||(/[가-힣]/.test(campaign.title)?period:campaign.title),description:descMap[campaign.description||'']||(/[가-힣]/.test(campaign.description||'')?'Complete missions and collect FUNY COIN.':(campaign.description||'Complete missions and collect FUNY COIN.'))};
  };
  const insets=useSafeAreaInsets();
  const params=useLocalSearchParams<{refresh?:string}>();
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[user,setUser]=useState<any>(null),[profile,setProfile]=useState<any>(null),[dashboard,setDashboard]=useState<Dashboard|null>(null),[busy,setBusy]=useState<string|null>(null),[missionIndex,setMissionIndex]=useState(0),[missionOpen,setMissionOpen]=useState(false),[unreadNotifications,setUnreadNotifications]=useState(0);
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
  const refreshUnread=useCallback(async()=>{
    if(!user?.id){setUnreadNotifications(0);return;}
    try{setUnreadNotifications(await getUnreadNotificationCount(user.id));}catch{}
  },[user?.id]);
  useFocusEffect(useCallback(()=>{void refreshUnread();},[refreshUnread]));
  useEffect(()=>{if(!user?.id)return;void refreshUnread();return subscribeNotificationChanges(user.id,()=>{void refreshUnread()});},[refreshUnread,user?.id]);

  const runLogout=async()=>{setBusy('out');try{await signOut();router.replace('/(tabs)' as any);}catch(e:any){Alert.alert(en?'Could not log out':'로그아웃 실패',String(e?.message||e));}finally{setBusy(null);}};
  const logout=()=>{if(busy)return;Alert.alert(en?'Log out of FUNY PIN?':'로그아웃할까요?',en?'Your saved favorites and activity will remain in your account.':'로그아웃해도 저장된 관심 매장과 활동 내역은 계정에 유지돼요.',[{text:en?'Cancel':'취소',style:'cancel'},{text:en?'Log out':'로그아웃',style:'destructive',onPress:runLogout}]);};
  const removeAccount=()=>Alert.alert(en?'Delete your account?':'계정을 삭제할까요?',en?'Your account, profile, favorites, and other account-linked information will be deleted. This cannot be undone.':'계정과 프로필, 관심 매장 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',[{text:en?'Cancel':'취소',style:'cancel'},{text:en?'Delete account':'계정 삭제',style:'destructive',onPress:async()=>{setBusy('delete');try{await deleteAccount();setUser(null);setProfile(null);Alert.alert(en?'Account deleted':'계정 삭제 완료',en?'Your FUNY PIN account has been deleted.':'FUNY PIN 계정이 삭제되었습니다.');router.replace('/(tabs)' as any);}catch(e:any){Alert.alert(en?'Could not delete account':'계정 삭제 실패',String(e?.message||e));}finally{setBusy(null);}}}]);
  const openWeb=(target:string,title:string)=>{const url=/^https?:\/\//i.test(target)?target:`https://funypin.kr/${target.replace(/^\//,'')}`;router.push({pathname:'/web',params:{url:encodeURIComponent(url),title}});};
  const openPrepared=(target:string,title:string)=>{if(dashboard?.is_tester)openWeb(target,title);else Alert.alert(en?'Coming soon':'준비중',en?'This feature is coming soon.':'준비중인 기능입니다.');};

  useEffect(()=>{if(!loading&&!user)router.replace({pathname:'/login',params:{next:'account'}} as any);},[loading,user,router]);

  const campaigns=dashboard?.mission_features?.visible?(dashboard?.mission_campaigns||[]):[];
  const activeCampaign=campaigns[missionIndex]||null;
  const activity=dashboard?.activity||{};
  const coin=dashboard?.funy_coin||{};
  const currentProfile=dashboard?.profile||profile||{};
  const generatedNickname=defaultNickname(user,en);
  const socialProvider=['google','apple','kakao'].includes(String(user?.app_metadata?.provider||'').toLowerCase());
  const storedNickname=String(currentProfile?.nickname||profile?.nickname||'').trim();
  const nickname=socialProvider&&!profile?.nickname_changed_at?generatedNickname:(storedNickname||generatedNickname);
  const avatar=currentProfile?.avatar_url||profile?.avatar_url||null;
  const joinDate=currentProfile?.created_at||profile?.created_at||user?.created_at||null;
  const initials=String(nickname).trim().slice(0,1).toUpperCase();
  const missionPercent=activeCampaign?.total_count?Math.round(activeCampaign.completed_count/activeCampaign.total_count*100):0;
  const activeCampaignText=campaignCopy(activeCampaign);

  const changeMission=(next:number)=>{if(!campaigns.length)return;setMissionIndex(Math.max(0,Math.min(campaigns.length-1,next)));setMissionOpen(false);};
  const runMission=async(item:MissionItem)=>{
    if(item.status==='completed'||busy)return;
    if(item.cta_type==='checkin'){
      setBusy(`mission:${item.id}`);
      try{const {data,error}=await supabase.rpc('mission_checkin');if(error)throw error;if(data?.ok===false)throw new Error(data?.error||'mission_failed');await refresh();Alert.alert(en?'Mission updated':'미션 반영 완료',Number(data?.rewarded_coin||0)>0?(en?`You received ${number(data.rewarded_coin,en)} FUNY COIN.`:`퍼니코인 ${number(data.rewarded_coin,en)}개를 받았어요.`):(en?'Mission progress has been updated.':'미션 진행 상태를 갱신했어요.'));}catch(e:any){Alert.alert(en?'Could not update mission':'미션 반영 실패',String(e?.message||e));}finally{setBusy(null)}
      return;
    }
    const target=String(item.cta_target||'').trim();
    if(!target){Alert.alert(en?'No destination available':'이동할 화면 없음',en?'This mission does not have a destination yet.':'관리자가 이동할 화면을 아직 설정하지 않았어요.');return}
    try{
      const u=new URL(/^https?:\/\//i.test(target)?target:`https://funypin.kr/${target.replace(/^\//,'')}`);
      if(/\/talk\.html$/i.test(u.pathname)){router.replace('/(tabs)/talk' as any);return;}
    }catch{}
    openWeb(target,missionCopy(item).title);
  };

  const activityRows=useMemo(()=>[
    {label:en?'Post management':'게시글 관리',sub:en?'Manage posts, comments, and liked posts':'작성 게시글 · 댓글 · 좋아요한 게시물',icon:'💬',onPress:()=>openWeb('my-community.html',en?'Post management':'게시글 관리')},
    {label:en?'Trade listings':'거래 매물 관리',sub:en?'Manage active and inactive listings':'판매중 · 비노출/종료 매물 관리',icon:'🃏',onPress:()=>openWeb('my-market.html',en?'Trade listings':'거래 매물 관리')},
    {label:en?'Favorites':'관심 목록',sub:en?'Manage saved card shops and listings':'관심 카드샵과 저장한 항목 확인',icon:'💜',onPress:()=>router.push('/my/favorites')},
  ],[router,en]);
  const rewardRows=useMemo(()=>[
    {label:en?'Ranking':'랭킹',sub:en?'Check-in, shop-visit, and FUNY MON rankings':'출석 · 카드샵 방문 · 퍼니몬 포획 랭킹',icon:'🏆',onPress:()=>openWeb('ranking.html',en?'Ranking':'랭킹')},
    {label:en?'Badges':'배지',sub:en?'Collect badges earned from missions and activities':'미션과 활동으로 획득한 배지 컬렉션',icon:'🎖️',onPress:()=>openWeb('my-badges.html',en?'Badges':'배지')},
    {label:en?'FUNY MON Collection':'퍼니몬 도감',sub:en?'See your captured FUNY MON collection':'포획한 퍼니몬 컬렉션',icon:'👾',onPress:()=>router.push('/my/funymon')},
    {label:en?'Events':'이벤트',sub:en?'Browse ongoing and past events':'진행 중·종료된 이벤트를 확인하세요',icon:'🎉',onPress:()=>openWeb('my-events.html',en?'Events':'이벤트')},
    {label:en?'Entries':'응모 내역',sub:en?'View events and entries you joined':'참여한 이벤트와 응모 내역',icon:'🎟️',onPress:()=>router.push('/my/entries')},
    {label:en?'Coupons':'쿠폰함',sub:en?'Check your issued coupons':'발급받은 쿠폰을 확인하세요',icon:'🎫',onPress:()=>router.push('/my/coupons')},
  ],[router,dashboard?.is_tester,en]);

  if(loading||!user)return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.purple}/></SafeAreaView>;

  return <SafeAreaView edges={['top']} style={styles.root}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false}/>
    <View pointerEvents="none" style={[styles.statusBarBg,{height:insets.top}]}/>
    <View style={styles.header}><Image source={{uri:visualAssets.logo}} resizeMode="contain" style={styles.headerLogo as any}/><Text allowFontScaling={false} style={styles.headerTitle}>MY</Text><Pressable onPress={()=>router.push('/my/notifications' as any)} hitSlop={8} style={styles.notificationButton}><Ionicons name="notifications-outline" size={22} color={C.text}/>{unreadNotifications>0?<View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unreadNotifications>99?'99+':String(unreadNotifications)}</Text></View>:null}</Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="always" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>refresh(true)} tintColor={C.purple}/>} contentContainerStyle={[styles.content,{paddingBottom:Math.max(112,insets.bottom+92)}]}>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          {avatar?<Image source={{uri:avatar}} style={styles.avatarImage as any}/>:<View style={styles.avatar}><Ionicons name="person" size={28} color="#85818A"/></View>}
          <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.nickname}>{nickname}</Text><Text style={styles.joinDate}>{en?'Joined':'가입일'} {formatJoinDate(joinDate,en)}</Text><View style={styles.statsRow}><Pressable onPress={()=>openWeb('my-community.html',en?'Post management':'게시글 관리')} style={styles.statLink}><Text style={styles.statText}>{en?'Posts':'게시글'} <Text style={styles.statValue}>{number(activity.post_count,en)}</Text></Text></Pressable><View style={styles.statDivider}/><Pressable onPress={()=>openWeb('my-market.html',en?'Trade listings':'거래 매물 관리')} style={styles.statLink}><Text style={styles.statText}>{en?'Listings':'매물'} <Text style={styles.statValue}>{number(activity.listing_count,en)}</Text></Text></Pressable><View style={styles.statDivider}/><Pressable onPress={()=>router.push('/my/favorites')} style={styles.statLink}><Text style={styles.statText}>{en?'Favorites':'관심'} <Text style={styles.statValue}>{number(activity.favorite_count,en)}</Text></Text></Pressable></View></View>
          <Pressable onPress={()=>router.push('/my/profile-edit')} style={styles.profileEdit}><Text style={styles.profileEditText}>{en?'Edit profile':'프로필 편집'}</Text></Pressable>
        </View>
        {coin.visible?<Pressable onPress={()=>openWeb('my-funy-coin.html','FUNY COIN')} style={styles.coinRow}><View style={styles.coinIcon}><Text style={styles.coinIconText}>🪙</Text></View><Text style={styles.coinLabel}>FUNY COIN</Text><Text style={styles.coinValue}>{number(coin.balance,en)} <Text style={styles.coinUnit}>C</Text></Text><Text style={styles.coinChevron}>›</Text></Pressable>:null}
      </View>

      {activeCampaign?<View style={[styles.missionCard,missionOpen&&styles.missionCardOpen]} onTouchStart={e=>{touchStartX.current=e.nativeEvent.pageX}} onTouchEnd={e=>{const delta=e.nativeEvent.pageX-touchStartX.current;if(Math.abs(delta)<48)return;changeMission(delta<0?missionIndex+1:missionIndex-1)}}>
        <Pressable onPress={()=>setMissionOpen(v=>!v)} style={styles.missionSummary}>
          <ProgressRing percent={missionPercent} label={`${activeCampaign.completed_count}/${activeCampaign.total_count}`}/>
          <View style={styles.missionCopy}><Text numberOfLines={1} style={styles.missionTitle}>{activeCampaignText.title}</Text><Text numberOfLines={1} style={styles.missionDesc}>{activeCampaignText.description}</Text></View>
          <MissionToggle open={missionOpen}/>
        </Pressable>
        {!missionOpen&&campaigns.length>1?<View style={styles.pager}><View style={styles.dots}>{campaigns.map((_,index)=><Pressable key={index} onPress={()=>changeMission(index)} style={[styles.dot,index===missionIndex&&styles.dotOn]}/>)}</View></View>:null}
        {missionOpen?<View style={styles.missionList}>{(activeCampaign.missions||[]).map((item,index)=>{const done=item.status==='completed';const isBusy=busy===`mission:${item.id}`,copy=missionCopy(item);return <View key={item.id} style={[styles.missionRow,index<activeCampaign.missions.length-1&&styles.rowBorder]}><View style={styles.missionItemCopy}><View style={styles.missionItemTitleRow}><Text style={styles.missionItemTitle}>{copy.title}</Text>{item.reward_coin>0?<View style={styles.rewardChip}><Text style={styles.rewardChipText}>+{number(item.reward_coin,en)} C</Text></View>:null}</View><Text style={styles.missionItemSub}>{copy.description?`${copy.description} · `:''}{Math.min(item.target_count,item.progress_count)}/{item.target_count}</Text></View><Pressable disabled={done||isBusy} onPress={()=>runMission(item)} style={[styles.missionAction,done&&styles.missionActionDone]}><Text style={[styles.missionActionText,done&&styles.missionActionTextDone]}>{done?(en?'Complete':'완료'):isBusy?(en?'Checking…':'확인 중…'):(copy.cta||(en?'In progress':'진행 중'))}</Text></Pressable></View>})}</View>:null}
      </View>:null}

      <MenuSection title={en?'My activity':'내 활동'} rows={activityRows}/>
      <MenuSection title={en?'Rewards & Collection':'리워드 & 컬렉션'} rows={rewardRows}/>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Settings':'설정'}</Text></View><View style={styles.supportCard}><View style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🌐</Text></View><View><Text style={styles.settingLabel}>{en?'Language':'언어'}</Text><Text style={styles.settingSub}>{en?'Change the display language':'서비스 표시 언어를 변경해요'}</Text></View></View><View style={styles.languageToggle}><Pressable onPress={()=>setLanguage('ko')} style={[styles.languageOption,language==='ko'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='ko'&&styles.languageOptionTextOn]}>한국어</Text></Pressable><Pressable onPress={()=>setLanguage('en')} style={[styles.languageOption,language==='en'&&styles.languageOptionOn]}><Text style={[styles.languageOptionText,language==='en'&&styles.languageOptionTextOn]}>EN</Text></Pressable></View></View><Pressable onPress={()=>router.push('/my/notification-settings' as any)} style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🔔</Text></View><View><Text style={styles.settingLabel}>{en?'Notifications':'알림 설정'}</Text><Text style={styles.settingSub}>{en?'Manage push notifications':'푸시 및 알림 유형을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable><Pressable onPress={()=>openWeb('my-security.html',en?'Account security':'계정 보안')} style={[styles.settingRow,styles.rowBorder]}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🔐</Text></View><View><Text style={styles.settingLabel}>{en?'Account security':'계정 보안'}</Text><Text style={styles.settingSub}>{en?'Manage login and account security':'로그인 및 계정 보안 설정을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable><Pressable onPress={()=>router.push('/my/blocked-users')} style={styles.settingRow}><View style={styles.settingLead}><View style={styles.settingIcon}><Text style={styles.settingIconText}>🚫</Text></View><View><Text style={styles.settingLabel}>{en?'Blocked users':'차단한 사용자'}</Text><Text style={styles.settingSub}>{en?'Manage blocked users in FUNY TALK':'FUNY TALK 차단 목록을 관리해요'}</Text></View></View><Text style={styles.chevron}>›</Text></Pressable></View></View>

      <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{en?'Support':'고객지원'}</Text></View><View style={styles.supportCard}>{webMenu.map(([label,file],i)=><Pressable key={file} onPress={()=>openWeb(file,label)} style={[styles.supportRow,i<webMenu.length-1&&styles.rowBorder]}><Text style={styles.supportLabel}>{label}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>

      <View style={styles.accountActions}><Pressable onPress={logout} disabled={!!busy} style={styles.logoutButton}><Text style={styles.logoutText}>{busy==='out'?(en?'Signing out…':'처리 중…'):(en?'Log out':'로그아웃')}</Text></Pressable><Pressable onPress={removeAccount} disabled={!!busy} style={styles.deleteButton}><Text style={styles.deleteLabel}>{busy==='delete'?(en?'Deleting…':'삭제 중…'):(en?'Delete account':'계정 삭제')}</Text></Pressable></View>
      <View style={styles.legalLinks}><Pressable onPress={()=>openWeb('terms.html',en?'Terms of Service':'이용약관')}><Text style={styles.legalText}>{en?'Terms of Service':'이용약관'}</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('privacy.html',en?'Privacy Policy':'개인정보처리방침')}><Text style={styles.legalText}>{en?'Privacy Policy':'개인정보처리방침'}</Text></Pressable><Text style={styles.legalDivider}>·</Text><Pressable onPress={()=>openWeb('community-guidelines.html',en?'Community Guidelines':'커뮤니티 운영정책')}><Text style={styles.legalText}>{en?'Community Guidelines':'커뮤니티 운영정책'}</Text></Pressable></View>
    </ScrollView>
  </SafeAreaView>;
}

type MenuRow={label:string;sub:string;icon:string;prepared?:boolean;onPress:()=>void};
function MenuSection({title,rows}:{title:string;rows:MenuRow[]}){return <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text></View><View style={styles.activityCard}>{rows.map((item,i)=><Pressable key={item.label} onPress={item.onPress} style={[styles.activityRow,i<rows.length-1&&styles.rowBorder]}><View style={styles.activityIcon}><Text style={styles.activityIconText}>{item.icon}</Text></View><View style={styles.activityCopy}><View style={styles.activityTitleRow}><Text style={styles.activityLabel}>{item.label}</Text>{item.prepared?<View style={styles.preparedChip}><Text style={styles.preparedText}>준비중</Text></View>:null}</View><Text style={styles.activitySub}>{item.sub}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}</View></View>}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},statusBarBg:{position:'absolute',left:0,right:0,top:0,backgroundColor:'#fff',zIndex:100000,elevation:100000},loading:{flex:1,justifyContent:'center',backgroundColor:'#F7F4FC'},header:{height:UI.headerH,paddingHorizontal:UI.screenPad,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,.97)'},headerLogo:{width:30,height:34,marginRight:8},headerTitle:{...T.header,color:C.text},notificationButton:{marginLeft:'auto',width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},notificationBadge:{position:'absolute',right:4,top:1,minWidth:16,height:16,paddingHorizontal:4,borderRadius:8,backgroundColor:'#6E4CC5',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#fff'},notificationBadgeText:{fontSize:8,lineHeight:10,fontWeight:'900',color:'#fff'},content:{paddingHorizontal:16,paddingTop:18,paddingBottom:40},
  profileCard:{padding:17,borderRadius:23,backgroundColor:'#fff',borderWidth:1,borderColor:'#EBE6EF',shadowColor:'#543E76',shadowOpacity:.05,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:1},profileTop:{flexDirection:'row',alignItems:'flex-start'},avatar:{width:68,height:68,borderRadius:34,backgroundColor:'#ECEBED',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DDDADD',overflow:'hidden'},avatarImage:{width:68,height:68,borderRadius:34,backgroundColor:'#ECEBED'},profileCopy:{flex:1,minWidth:0,marginLeft:13},nickname:{fontSize:18,lineHeight:22,fontWeight:'900',letterSpacing:-.72,color:C.text},joinDate:{marginTop:5,fontSize:10.2,fontWeight:'600',color:'#9B939F'},profileEdit:{height:31,paddingHorizontal:11,borderRadius:16,borderWidth:1,borderColor:'#DDD6E6',alignItems:'center',justifyContent:'center'},profileEditText:{fontSize:10,fontWeight:'900',color:C.textSoft},
  statsRow:{marginTop:8,flexDirection:'row',alignItems:'center'},statLink:{paddingVertical:3},statText:{fontSize:10.7,fontWeight:'700',color:'#625B67'},statValue:{fontWeight:'900',color:'#2E2932'},statDivider:{width:1,height:11,marginHorizontal:8,backgroundColor:'#DDD7E2'},coinRow:{marginTop:13,minHeight:50,paddingHorizontal:14,borderRadius:14,backgroundColor:'#F5F1FC',borderWidth:1,borderColor:'#ECE5F8',flexDirection:'row',alignItems:'center'},coinIcon:{width:26,height:26,alignItems:'center',justifyContent:'center'},coinIconText:{fontSize:19},coinLabel:{marginLeft:9,fontSize:10.8,fontWeight:'900',color:C.text},coinValue:{marginLeft:'auto',fontSize:17,fontWeight:'900',letterSpacing:-.5,color:C.text},coinUnit:{fontSize:13,fontWeight:'800'},coinChevron:{marginLeft:6,fontSize:20,lineHeight:20,color:'#8C8491'},
  missionCard:{marginTop:12,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#EBE6EF',overflow:'hidden',shadowColor:'#543E76',shadowOpacity:.04,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:1},missionCardOpen:{},missionSummary:{minHeight:82,paddingHorizontal:13,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:9},ringWrap:{width:48,height:48,alignItems:'center',justifyContent:'center',position:'relative'},ringTrack:{position:'absolute',left:0,top:0,width:48,height:48,borderRadius:24,borderWidth:7,borderColor:'#ECE8F1'},ringDot:{position:'absolute',width:7,height:7,borderRadius:3.5,backgroundColor:'#7657D6'},ringValue:{fontSize:11.5,fontWeight:'900',letterSpacing:-.3,color:'#5D3EB6'},missionCopy:{flex:1,minWidth:0,marginLeft:0},missionTitle:{fontSize:13.5,fontWeight:'900',letterSpacing:-.35,color:C.text},missionDesc:{marginTop:4,fontSize:10.5,lineHeight:15,color:'#96909B'},missionToggle:{position:'relative',width:22,height:22,alignItems:'center',justifyContent:'center'},missionToggleOpen:{transform:[{rotate:'180deg'}]},toggleChevron:{width:10,height:10,borderRightWidth:2,borderBottomWidth:2,borderColor:'#938B98',transform:[{translateY:-1.2},{rotate:'45deg'}]},pager:{height:20,paddingTop:6,paddingBottom:0,flexDirection:'row',alignItems:'center',justifyContent:'center'},dots:{flexDirection:'row',alignItems:'center',gap:6},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#D8D3DF'},dotOn:{width:16,backgroundColor:'#8062D8'},missionList:{borderTopWidth:1,borderTopColor:'#F0ECF3',paddingHorizontal:14,paddingTop:4,paddingBottom:12},missionRow:{minHeight:62,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10},missionItemCopy:{flex:1,minWidth:0},missionItemTitleRow:{flexDirection:'row',alignItems:'center',gap:6},missionItemTitle:{flexShrink:1,fontSize:13.5,lineHeight:19,fontWeight:'850' as any,color:C.text},rewardChip:{height:19,paddingHorizontal:7,borderRadius:10,backgroundColor:'#FFF4D8',alignItems:'center',justifyContent:'center'},rewardChipText:{fontSize:8.5,fontWeight:'900',color:'#9A6910'},missionItemSub:{marginTop:4,fontSize:10.5,lineHeight:15,color:'#9B939F'},missionAction:{minWidth:68,height:32,paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:'#DCD2F1',backgroundColor:'#F8F5FF',alignItems:'center',justifyContent:'center'},missionActionDone:{borderColor:'#E5E1E8',backgroundColor:'#F2F0F3'},missionActionText:{fontSize:9.5,fontWeight:'900',color:C.purpleDark},missionActionTextDone:{color:C.muted},
  section:{marginTop:24},sectionHead:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:3,marginBottom:8},sectionTitle:{fontSize:14,lineHeight:18,fontWeight:'900',letterSpacing:-.2,color:C.text},activityCard:{borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},activityRow:{minHeight:69,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},activityIcon:{width:41,height:41,borderRadius:14,backgroundColor:'#F0EBF9',alignItems:'center',justifyContent:'center'},activityIconText:{fontSize:18,color:C.purpleDark},activityCopy:{flex:1,minWidth:0,marginLeft:12},activityTitleRow:{flexDirection:'row',alignItems:'center'},activityLabel:{fontSize:13,fontWeight:'900',color:C.text},preparedChip:{height:18,marginLeft:6,paddingHorizontal:7,borderRadius:9,backgroundColor:'#F0ECF8',alignItems:'center',justifyContent:'center'},preparedText:{fontSize:8,fontWeight:'900',color:'#745AB5'},activitySub:{marginTop:4,fontSize:9.5,color:C.muted},supportCard:{borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,overflow:'hidden'},supportRow:{minHeight:54,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},supportLabel:{fontSize:12.5,fontWeight:'700',color:C.textSoft},settingRow:{minHeight:69,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},settingLead:{flex:1,flexDirection:'row',alignItems:'center',minWidth:0},settingIcon:{width:35,height:35,borderRadius:12,backgroundColor:'#F2EDFB',alignItems:'center',justifyContent:'center',marginRight:11},settingIconText:{fontSize:15},settingLabel:{fontSize:13,fontWeight:'900',color:C.text},settingSub:{marginTop:3,fontSize:9.5,color:C.muted},languageToggle:{height:34,padding:2,borderRadius:17,backgroundColor:'#F1EDF6',flexDirection:'row',alignItems:'center'},languageOption:{height:29,minWidth:48,paddingHorizontal:9,borderRadius:15,alignItems:'center',justifyContent:'center'},languageOptionOn:{backgroundColor:C.purpleDark},languageOptionText:{fontSize:10,fontWeight:'800',color:C.muted},languageOptionTextOn:{color:'#fff'},rowBorder:{borderBottomWidth:1,borderBottomColor:C.divider},chevron:{fontSize:21,color:'#B0A9B5'},
  legalLinks:{marginTop:20,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7,flexWrap:'wrap'},legalText:{fontSize:9.5,fontWeight:'700',color:C.muted},legalDivider:{fontSize:10,color:'#C5BDC9'},accountActions:{marginTop:20,alignItems:'center'},logoutButton:{width:'100%',height:52,borderRadius:16,backgroundColor:C.purpleDark,alignItems:'center',justifyContent:'center'},logoutText:{fontSize:12,fontWeight:'900',color:'#fff'},deleteButton:{marginTop:8,minHeight:34,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},deleteLabel:{fontSize:11,fontWeight:'850' as any,color:C.danger}
});
