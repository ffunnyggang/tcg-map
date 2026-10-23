import { useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,Platform,ScrollView,StyleSheet,Switch,Text,View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import MySubHeader from '../../components/MySubHeader';
import { C } from '../../lib/theme';
import { useAppLanguage } from '../../lib/i18n';
import {
  disablePushNotifications,
  enablePushNotifications,
  ensureNotificationPreferences,
  NotificationPreference,
  isPushConfigurationError,
  openSystemNotificationSettings,
  updateNotificationPreference,
} from '../../lib/notifications';

type PrefKey='community_enabled'|'market_enabled'|'rewards_enabled'|'missions_enabled'|'coupons_enabled'|'service_notice_enabled';

const ROWS_KO:{key:PrefKey;title:string;sub:string}[]=[
  {key:'community_enabled',title:'TALK 알림',sub:'내 게시글에 새 댓글이 등록되면 알려드려요.'},
  {key:'market_enabled',title:'TCG 거래 알림',sub:'거래 채팅과 매물 상태 변경을 알려드려요.'},
  {key:'rewards_enabled',title:'리워드 · 배지 알림',sub:'리워드 지급과 새 배지 획득을 알려드려요.'},
  {key:'missions_enabled',title:'미션 알림',sub:'미션 완료와 보상 정보를 알려드려요.'},
  {key:'coupons_enabled',title:'쿠폰 알림',sub:'새 쿠폰이 발급되면 알려드려요.'},
  {key:'service_notice_enabled',title:'운영 공지',sub:'FUNY PIN의 중요한 서비스 소식을 알려드려요.'},
];
const ROWS_EN:{key:PrefKey;title:string;sub:string}[]=[
  {key:'community_enabled',title:'TALK notifications',sub:'Get notified when someone comments on your post.'},
  {key:'market_enabled',title:'TCG Trade notifications',sub:'Get updates about trade activity and listing status.'},
  {key:'rewards_enabled',title:'Rewards · Badges',sub:'Get notified about rewards and newly earned badges.'},
  {key:'missions_enabled',title:'Mission notifications',sub:'Get mission completion and reward updates.'},
  {key:'coupons_enabled',title:'Coupon notifications',sub:'Get notified when a new coupon is issued.'},
  {key:'service_notice_enabled',title:'Service notices',sub:'Receive important FUNY PIN service updates.'},
];

const permissionText=(status:string,en:boolean)=>{
  if(status==='granted')return en?'Allowed':'허용됨';
  if(status==='denied')return en?'Off':'꺼짐';
  return en?'Not requested':'요청 전';
};

export default function NotificationSettingsScreen(){
  const {language}=useAppLanguage();
  const en=language==='en',rows=en?ROWS_EN:ROWS_KO;
  const deviceLabel=Platform.OS==='android'?'Android':'iPhone';
  const [prefs,setPrefs]=useState<NotificationPreference|null>(null);
  const [permission,setPermission]=useState('undetermined');
  const [busy,setBusy]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    const [nextPrefs,nextPermission]=await Promise.all([
      ensureNotificationPreferences(),
      Notifications.getPermissionsAsync(),
    ]);
    setPrefs(nextPrefs);
    setPermission(nextPermission.status);
  },[]);

  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  useEffect(()=>{void refresh();},[refresh]);

  const togglePush=async(value:boolean)=>{
    if(busy)return;
    setBusy('push');
    try{
      if(value){
        const result=await enablePushNotifications();
        setPermission(result.status);
        if(!result.ok){
          Alert.alert(
            en?'Notifications are turned off':'알림 권한이 꺼져 있어요',
            en?'Allow FUNY PIN notifications in your device settings, then try again.':'기기 설정에서 FUNY PIN 알림을 허용한 뒤 다시 시도해주세요.',
            [{text:en?'Cancel':'취소',style:'cancel'},{text:en?'Open Settings':'설정 열기',onPress:()=>void openSystemNotificationSettings()}]
          );
        }
      }else{
        await disablePushNotifications();
      }
      await refresh();
    }catch(e:any){
      const currentPermission=await Notifications.getPermissionsAsync().catch(()=>null);
      if(currentPermission)setPermission(currentPermission.status);
      if(isPushConfigurationError(e)){
        Alert.alert(en?'Push connection is being prepared':'푸시 알림 연결 준비 중',en?'This test app is not connected to the push service yet. Push notifications have not been enabled. You can still view activity in the in-app notification inbox.':'현재 테스트 앱은 푸시 서비스 연결을 준비하고 있어요. 푸시 알림은 아직 켜지지 않았으며, 활동 내역은 앱 안의 알림함에서 확인할 수 있어요.');
      }else{
        Alert.alert(en?'Could not update push notifications':'푸시 알림 설정을 저장하지 못했어요',en?'Check your connection and try again.':'연결 상태를 확인한 뒤 다시 시도해주세요.');
      }
    }finally{setBusy(null)}
  };

  const toggleCategory=async(key:PrefKey,value:boolean)=>{
    if(!prefs||busy)return;
    const previous=prefs;
    setPrefs({...prefs,[key]:value});
    setBusy(key);
    try{
      const updated=await updateNotificationPreference(key,value);
      setPrefs(updated);
    }catch(e:any){
      setPrefs(previous);
      Alert.alert(en?'Could not update notification settings':'알림 설정 실패',String(e?.message||e));
    }finally{setBusy(null)}
  };

  if(!prefs)return <View style={styles.root}><MySubHeader title={en?"Notification settings":"알림 설정"}/><View style={styles.loading}><ActivityIndicator color={C.purple}/></View></View>;

  return <View style={styles.root}>
    <MySubHeader title={en?"Notification settings":"알림 설정"}/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.primaryCard}>
        <View style={styles.primaryCopy}>
          <Text style={styles.primaryTitle}>{en?'Push notifications':'푸시 알림 받기'}</Text>
          <Text style={styles.primarySub}>{en?'Receive important updates even when you are not using the app.':'앱을 사용하지 않을 때도 중요한 소식을 받아볼 수 있어요.'}</Text>
          <Text style={styles.permission}>{en?deviceLabel+' notification permission':deviceLabel+' 알림 권한'} · {permissionText(permission,en)}</Text>
        </View>
        <Switch
          value={prefs.push_enabled}
          disabled={busy==='push'}
          onValueChange={value=>void togglePush(value)}
          trackColor={{false:'#D9D4DC',true:'#C7B7EF'}}
          thumbColor={prefs.push_enabled?C.purpleDark:'#FFFFFF'}
        />
      </View>

      <Text style={styles.sectionTitle}>{en?'Notification types':'알림 유형'}</Text>
      <View style={[styles.list,!prefs.push_enabled&&styles.listDisabled]}>
        {rows.map((row,index)=><View key={row.key} style={[styles.row,index<rows.length-1&&styles.rowBorder]}>
          <View style={styles.copy}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.sub}>{row.sub}</Text>
          </View>
          <Switch
            value={prefs[row.key]}
            disabled={!prefs.push_enabled||busy===row.key}
            onValueChange={value=>void toggleCategory(row.key,value)}
            trackColor={{false:'#D9D4DC',true:'#C7B7EF'}}
            thumbColor={prefs[row.key]?C.purpleDark:'#FFFFFF'}
          />
        </View>)}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{en?'Even if push notifications are off, important activity will still be saved in the in-app notification inbox.':'푸시 알림을 끄더라도 앱 안의 알림함에는 중요한 활동 내역이 계속 저장됩니다.'}</Text>
      </View>
    </ScrollView>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F7F4FC'},
  loading:{flex:1,alignItems:'center',justifyContent:'center'},
  content:{padding:16,paddingBottom:40},
  primaryCard:{padding:17,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#E8E1F2',flexDirection:'row',alignItems:'center'},
  primaryCopy:{flex:1,minWidth:0,paddingRight:14},
  primaryTitle:{fontSize:14,fontWeight:'900',color:C.text},
  primarySub:{marginTop:5,fontSize:10.5,lineHeight:15,color:C.muted},
  permission:{marginTop:9,fontSize:9.5,fontWeight:'800',color:C.purpleDark},
  sectionTitle:{marginTop:24,marginBottom:8,paddingHorizontal:3,fontSize:12,fontWeight:'900',color:'#746C79'},
  list:{borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#EBE6EF',overflow:'hidden'},
  listDisabled:{opacity:.55},
  row:{minHeight:72,paddingHorizontal:15,paddingVertical:12,flexDirection:'row',alignItems:'center'},
  rowBorder:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#E7E2E9'},
  copy:{flex:1,minWidth:0,paddingRight:12},
  title:{fontSize:12.5,fontWeight:'900',color:C.text},
  sub:{marginTop:4,fontSize:9.8,lineHeight:14,color:C.muted},
  infoBox:{marginTop:14,padding:13,borderRadius:14,backgroundColor:'#EFEAF8'},
  infoText:{fontSize:9.8,lineHeight:15,color:'#74658F'},
});
