import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const url='https://wdttzpbmqavaqfcbaywj.supabase.co';
const key='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';

const CHUNK_SIZE=350;
const META_SUFFIX='__meta';
const chunkKey=(key:string,index:number)=>key+'__chunk_'+index;

const storage={
  async getItem(k:string){
    const meta=await SecureStore.getItemAsync(k+META_SUFFIX).catch(()=>null);
    if(meta){
      try{
        const count=Math.max(0,Number(JSON.parse(meta).count)||0);
        if(count>0){
          const chunks=await Promise.all(Array.from({length:count},(_,i)=>SecureStore.getItemAsync(chunkKey(k,i))));
          if(chunks.every(Boolean))return chunks.join('');
        }
      }catch{}
    }
    return SecureStore.getItemAsync(k);
  },
  async setItem(k:string,v:string){
    const previous=await SecureStore.getItemAsync(k+META_SUFFIX).catch(()=>null);
    let previousCount=0;
    try{previousCount=Math.max(0,Number(JSON.parse(previous||'{}').count)||0);}catch{}
    // Keep every SecureStore value comfortably below the historical iOS ~2048-byte limit.
    // Remove the legacy unchunked value before writing chunks so an old large session cannot trigger warnings.
    await SecureStore.deleteItemAsync(k).catch(()=>{});
    const chunks=[];
    for(let i=0;i<v.length;i+=CHUNK_SIZE)chunks.push(v.slice(i,i+CHUNK_SIZE));
    await Promise.all(chunks.map((chunk,i)=>SecureStore.setItemAsync(chunkKey(k,i),chunk)));
    await SecureStore.setItemAsync(k+META_SUFFIX,JSON.stringify({count:chunks.length}));
    for(let i=chunks.length;i<previousCount;i++)await SecureStore.deleteItemAsync(chunkKey(k,i)).catch(()=>{});
  },
  async removeItem(k:string){
    const meta=await SecureStore.getItemAsync(k+META_SUFFIX).catch(()=>null);
    let count=0;
    try{count=Math.max(0,Number(JSON.parse(meta||'{}').count)||0);}catch{}
    await SecureStore.deleteItemAsync(k).catch(()=>{});
    await SecureStore.deleteItemAsync(k+META_SUFFIX).catch(()=>{});
    for(let i=0;i<count;i++)await SecureStore.deleteItemAsync(chunkKey(k,i)).catch(()=>{});
  }
};

export const supabase=createClient(url,key,{auth:{storage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
