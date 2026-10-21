import { Linking,Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,
    shouldShowList:true,
    shouldPlaySound:true,
    shouldSetBadge:true,
  }),
});

export type NotificationPreference={
  user_id:string;
  push_enabled:boolean;
  community_enabled:boolean;
  market_enabled:boolean;
  rewards_enabled:boolean;
  missions_enabled:boolean;
  coupons_enabled:boolean;
  service_notice_enabled:boolean;
  shop_live_pin_enabled:boolean;
  shop_event_enabled:boolean;
  updated_at?:string;
};

export type FunyNotification={
  id:string;
  user_id:string;
  type:string;
  category:'community'|'market'|'rewards'|'missions'|'coupons'|'service'|'shop';
  title:string;
  body:string;
  route?:string|null;
  url?:string|null;
  data?:Record<string,unknown>|null;
  source_type?:string|null;
  source_id?:string|null;
  read_at?:string|null;
  created_at:string;
};

const defaultPrefs=(userId:string):NotificationPreference=>({
  user_id:userId,
  push_enabled:false,
  community_enabled:true,
  market_enabled:true,
  rewards_enabled:true,
  missions_enabled:true,
  coupons_enabled:true,
  service_notice_enabled:true,
  shop_live_pin_enabled:false,
  shop_event_enabled:false,
});

const appVariant=String(Constants.expoConfig?.extra?.appVariant||'production')==='development'?'development':'production';
const projectId=String(Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId||'');

export async function getNotificationPreferences(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const {data,error}=await supabase.from('notification_preferences').select('*').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return (data||defaultPrefs(user.id)) as NotificationPreference;
}

export async function ensureNotificationPreferences(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  const defaults=defaultPrefs(user.id);
  const {error}=await supabase.from('notification_preferences').upsert(defaults,{onConflict:'user_id',ignoreDuplicates:true});
  if(error)throw error;
  return getNotificationPreferences();
}

async function savePreferencePatch(patch:Partial<NotificationPreference>){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  await ensureNotificationPreferences();
  const {data,error}=await supabase
    .from('notification_preferences')
    .update({...patch,updated_at:new Date().toISOString()})
    .eq('user_id',user.id)
    .select('*')
    .single();
  if(error)throw error;
  return data as NotificationPreference;
}

async function registerGrantedPushToken(permissionStatus='granted'){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  if(!Device.isDevice)throw new Error('PHYSICAL_DEVICE_REQUIRED');
  if(!projectId)throw new Error('EAS_PROJECT_ID_MISSING');

  const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
  const {error}=await supabase.rpc('register_push_device',{
    p_expo_push_token:token,
    p_platform:Platform.OS,
    p_app_variant:appVariant,
    p_device_name:Device.modelName||Device.deviceName||null,
    p_app_version:Constants.expoConfig?.version||Constants.nativeAppVersion||null,
    p_build_version:Constants.nativeBuildVersion||null,
    p_permission_status:permissionStatus,
  });
  if(error)throw error;
  return token;
}

export async function enablePushNotifications(){
  await ensureNotificationPreferences();
  let permission=await Notifications.getPermissionsAsync();
  if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
  if(permission.status!=='granted'){
    await savePreferencePatch({push_enabled:false});
    return {ok:false as const,status:permission.status};
  }
  const token=await registerGrantedPushToken(permission.status);
  await savePreferencePatch({push_enabled:true});
  return {ok:true as const,status:permission.status,token};
}

export async function disablePushNotifications(){
  await savePreferencePatch({push_enabled:false});
  try{await supabase.rpc('deactivate_my_push_devices');}catch{}
}

export async function syncPushTokenIfEnabled(){
  const prefs=await getNotificationPreferences().catch(()=>null);
  if(!prefs?.push_enabled)return false;
  const permission=await Notifications.getPermissionsAsync().catch(()=>null);
  if(permission?.status!=='granted')return false;
  await registerGrantedPushToken(permission.status);
  return true;
}

export async function deactivatePushDevices(){
  try{await supabase.rpc('deactivate_my_push_devices');}catch{}
}

export async function deactivateCurrentPushDevice(){
  try{
    const permission=await Notifications.getPermissionsAsync();
    if(permission.status!=='granted'||!projectId)return;
    const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
    if(token)await supabase.rpc('deactivate_push_device',{p_expo_push_token:token});
  }catch{}
}

export async function updateNotificationPreference(
  key:'community_enabled'|'market_enabled'|'rewards_enabled'|'missions_enabled'|'coupons_enabled'|'service_notice_enabled',
  value:boolean
){
  return savePreferencePatch({[key]:value} as Partial<NotificationPreference>);
}

export async function getUnreadNotificationCount(userId?:string|null){
  let uid=userId||null;
  if(!uid){
    const {data:{user}}=await supabase.auth.getUser();
    uid=user?.id||null;
  }
  if(!uid)return 0;
  const {count,error}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',uid).is('read_at',null);
  if(error)throw error;
  const value=Number(count||0);
  await Notifications.setBadgeCountAsync(value).catch(()=>{});
  return value;
}

export function subscribeNotificationChanges(userId:string,onChange:()=>void){
  const channel=supabase
    .channel('my-notifications-'+userId)
    .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},()=>onChange())
    .subscribe();
  return ()=>{void supabase.removeChannel(channel)};
}

export async function markNotificationRead(id:string){
  const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);
  if(error)throw error;
}

export async function markAllNotificationsRead(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);
  if(error)throw error;
  await Notifications.setBadgeCountAsync(0).catch(()=>{});
}

export async function fetchNotifications(unreadOnly=false){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [] as FunyNotification[];
  let query=supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
  if(unreadOnly)query=query.is('read_at',null);
  const {data,error}=await query;
  if(error)throw error;
  return (data||[]) as FunyNotification[];
}

type RouterLike={push:(href:any)=>void;replace?:(href:any)=>void};

export function openNotificationTarget(router:RouterLike,data:any){
  const route=typeof data?.route==='string'?data.route.trim():'';
  const url=typeof data?.url==='string'?data.url.trim():'';
  if(route){
    router.push(route as any);
    return;
  }
  if(url){
    router.push({pathname:'/web',params:{url:encodeURIComponent(url),title:''}} as any);
    return;
  }
  router.push('/my/notifications' as any);
}

export function addNotificationResponseListener(router:RouterLike){
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
    const data=response.notification.request.content.data||{};
    const notificationId=typeof data.notificationId==='string'?data.notificationId:'';
    if(notificationId)void markNotificationRead(notificationId).catch(()=>{});
    openNotificationTarget(router,data);
  });
  return ()=>sub.remove();
}

export async function handleInitialNotificationResponse(router:RouterLike){
  const response=await Notifications.getLastNotificationResponseAsync().catch(()=>null);
  if(!response)return;
  const data=response.notification.request.content.data||{};
  const notificationId=typeof data.notificationId==='string'?data.notificationId:'';
  if(notificationId)await markNotificationRead(notificationId).catch(()=>{});
  openNotificationTarget(router,data);
  await Notifications.clearLastNotificationResponseAsync().catch(()=>{});
}

export async function openSystemNotificationSettings(){
  await Linking.openSettings();
}
