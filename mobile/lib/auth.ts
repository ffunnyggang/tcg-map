import { supabase } from './supabase';

export async function signUp(email:string,password:string,nickname:string){
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{nickname:nickname.trim()}}});
  if(error)throw error;
  if(data.user&&data.session){
    const {error:e}=await supabase.from('profiles').upsert({user_id:data.user.id,nickname:nickname.trim()||null});
    if(e)throw e;
  }
  return data;
}

export async function signIn(email:string,password:string){
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;
  return data;
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}

export async function deleteAccount(){
  const {error}=await supabase.rpc('delete_my_account');
  if(error)throw error;
  await supabase.auth.signOut({scope:'local'});
}

export async function getProfile(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {user:null,profile:null};
  const {data:profile,error}=await supabase.from('profiles').select('*').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return {user,profile};
}

export async function updateProfile(input:{nickname:string;avatar_url?:string|null}){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  const nickname=input.nickname.trim();
  if(!nickname)throw new Error('닉네임을 입력해주세요.');
  if(nickname.length>20)throw new Error('닉네임은 20자 이내로 입력해주세요.');
  const {data,error}=await supabase.from('profiles').upsert({
    user_id:user.id,
    nickname,
    ...(input.avatar_url!==undefined?{avatar_url:input.avatar_url}:{}),
    updated_at:new Date().toISOString()
  }).select('*').single();
  if(error)throw error;
  return data;
}

export async function uploadProfileAvatar(uri:string,mimeType?:string|null){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  const ext=(mimeType||'image/jpeg').split('/')[1]?.replace('jpeg','jpg')||'jpg';
  const path=`${user.id}/avatar.${ext}`;
  const arrayBuffer=await fetch(uri).then(res=>res.arrayBuffer());
  const {error:uploadError}=await supabase.storage.from('profile-images').upload(path,arrayBuffer,{
    contentType:mimeType||'image/jpeg',
    cacheControl:'3600',
    upsert:true
  });
  if(uploadError)throw uploadError;
  const {data}=supabase.storage.from('profile-images').getPublicUrl(path);
  const url=`${data.publicUrl}?v=${Date.now()}`;
  return url;
}
