import { AppState,Platform } from 'react-native';
import { useCallback,useEffect,useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

export type FloatingSurface='home'|'map'|'pick'|'talk';
export type FloatingMode='native'|'web'|'off';
export type FloatingActionKey='live_pin'|'map_actions'|'external_link';
export type NativeFloatingCommand={id:number;action:'open_market'|'open_market_register'};

export type FloatingActionSetting={
  platform:'android';
  surface:FloatingSurface;
  mode:FloatingMode;
  label:string;
  actionKey:FloatingActionKey;
  targetUrl:string|null;
  isActive:boolean;
  updatedAt:string|null;
};

type Snapshot=Record<FloatingSurface,FloatingActionSetting>;
type Listener=(snapshot:Snapshot)=>void;

const CACHE_KEY='funypin_floating_actions_v1';
const REFRESH_INTERVAL_MS=60_000;

const createDefault=(surface:FloatingSurface,label:string,actionKey:FloatingActionKey,targetUrl:string|null=null):FloatingActionSetting=>({
  platform:'android',surface,mode:'native',label,actionKey,targetUrl,isActive:true,updatedAt:null,
});

export const DEFAULT_FLOATING_ACTIONS:Snapshot={
  home:createDefault('home','LIVE PIN','live_pin'),
  map:createDefault('map','제보 · 매물 등록','map_actions'),
  pick:createDefault('pick','LIVE PIN','live_pin'),
  talk:createDefault('talk','POKAMO에 글쓰기','external_link','https://cafe.daangn.com/pokamo-pokesm-1'),
};

let snapshot:Snapshot={...DEFAULT_FLOATING_ACTIONS};
let cacheLoaded=false;
let cachePromise:Promise<Snapshot>|null=null;
let lastRemoteLoad=0;
let inFlight:Promise<Snapshot>|null=null;
const listeners=new Set<Listener>();

const emit=()=>listeners.forEach(listener=>{try{listener(snapshot);}catch{}});

const isSurface=(value:unknown):value is FloatingSurface=>['home','map','pick','talk'].includes(String(value));
const isMode=(value:unknown):value is FloatingMode=>['native','web','off'].includes(String(value));
const isActionKey=(value:unknown):value is FloatingActionKey=>['live_pin','map_actions','external_link'].includes(String(value));

const normalizeSetting=(row:any):FloatingActionSetting|null=>{
  if(!isSurface(row?.surface))return null;
  const surface:FloatingSurface=row.surface;
  const fallback=DEFAULT_FLOATING_ACTIONS[surface];
  return {
    platform:'android',
    surface,
    mode:isMode(row.mode)?row.mode:fallback.mode,
    label:String(row.label_ko||row.label||fallback.label).trim()||fallback.label,
    actionKey:isActionKey(row.action_key||row.actionKey)?(row.action_key||row.actionKey):fallback.actionKey,
    targetUrl:(row.target_url||row.targetUrl)?String(row.target_url||row.targetUrl):fallback.targetUrl,
    isActive:(row.is_active??row.isActive)!==false,
    updatedAt:(row.updated_at||row.updatedAt)?String(row.updated_at||row.updatedAt):null,
  };
};

const mergeRows=(rows:any[]):Snapshot=>{
  const next:Snapshot={...DEFAULT_FLOATING_ACTIONS};
  for(const row of rows||[]){
    const normalized=normalizeSetting(row);
    if(!normalized)continue;
    next[normalized.surface]={...normalized,mode:normalized.isActive?normalized.mode:'off'};
  }
  return next;
};

const readCache=async()=>{
  if(cacheLoaded)return snapshot;
  if(cachePromise)return cachePromise;
  cachePromise=(async()=>{
    try{
      const raw=await SecureStore.getItemAsync(CACHE_KEY);
      if(raw){
        const parsed=JSON.parse(raw);
        snapshot=mergeRows(Object.values(parsed||{}));
        emit();
      }
    }catch{}finally{
      cacheLoaded=true;
      cachePromise=null;
    }
    return snapshot;
  })();
  return cachePromise;
};

const writeCache=async(next:Snapshot)=>{
  try{await SecureStore.setItemAsync(CACHE_KEY,JSON.stringify(next));}catch{}
};

export const getFloatingActionSnapshot=()=>snapshot;

export const subscribeFloatingActions=(listener:Listener)=>{
  listeners.add(listener);
  listener(snapshot);
  return()=>{listeners.delete(listener);};
};

export const refreshFloatingActions=async(force=false):Promise<Snapshot>=>{
  await readCache();
  if(Platform.OS!=='android')return snapshot;
  const now=Date.now();
  if(!force&&now-lastRemoteLoad<REFRESH_INTERVAL_MS)return snapshot;
  if(inFlight)return inFlight;
  inFlight=(async()=>{
    try{
      const {data,error}=await supabase
        .from('app_floating_actions')
        .select('platform,surface,mode,label_ko,action_key,target_url,is_active,updated_at')
        .eq('platform','android')
        .order('sort_order',{ascending:true});
      if(error)throw error;
      snapshot=mergeRows(data||[]);
      lastRemoteLoad=Date.now();
      await writeCache(snapshot);
      emit();
    }catch(error:any){
      lastRemoteLoad=Date.now();
      if(__DEV__&&!['42P01','PGRST205'].includes(String(error?.code||'')))console.warn('[FUNY FLOATING] remote config fallback',error?.message||error);
    }finally{
      inFlight=null;
    }
    return snapshot;
  })();
  return inFlight;
};

export const useFloatingAction=(surface:FloatingSurface)=>{
  const [setting,setSetting]=useState<FloatingActionSetting>(()=>snapshot[surface]);
  const [ready,setReady]=useState(Platform.OS!=='android');

  useEffect(()=>{
    let mounted=true;
    const unsubscribe=subscribeFloatingActions(next=>{if(mounted)setSetting(next[surface]);});
    readCache().then(next=>{if(mounted){setSetting(next[surface]);setReady(true);}}).catch(()=>{if(mounted)setReady(true);});
    refreshFloatingActions(false).catch(()=>{});
    const appState=AppState.addEventListener('change',state=>{
      if(state==='active')refreshFloatingActions(false).catch(()=>{});
    });
    const interval=setInterval(()=>refreshFloatingActions(false).catch(()=>{}),REFRESH_INTERVAL_MS);
    return()=>{mounted=false;unsubscribe();appState.remove();clearInterval(interval);};
  },[surface]);

  const refresh=useCallback(()=>refreshFloatingActions(true),[]);
  return {setting,ready,refresh};
};
