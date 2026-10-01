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

const NICKNAME_RE=/^[가-힣A-Za-z0-9]{2,12}$/;

export function validateNickname(value:string){
  const nickname=value.trim();
  if(!nickname)return '닉네임을 입력해주세요.';
  if(nickname.length<2||nickname.length>12)return '닉네임은 2~12자로 입력해주세요.';
  if(!NICKNAME_RE.test(nickname))return '닉네임은 한글, 영문, 숫자만 사용할 수 있어요.';
  return null;
}

export function nicknameNextChangeAt(changedAt?:string|null){
  if(!changedAt)return null;
  const t=new Date(changedAt).getTime();
  if(!Number.isFinite(t))return null;
  const next=t+30*24*60*60*1000;
  return next>Date.now()?new Date(next):null;
}

export async function updateProfile(input:{nickname:string;avatar_url?:string|null}){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  const nickname=input.nickname.trim();
  const nicknameError=validateNickname(nickname);
  if(nicknameError)throw new Error(nicknameError);
  const {data,error}=await supabase.from('profiles').upsert({
    user_id:user.id,
    nickname,
    ...(input.avatar_url!==undefined?{avatar_url:input.avatar_url}:{}),
    updated_at:new Date().toISOString()
  }).select('*').single();
  if(error){
    if(error.code==='23505')throw new Error('이미 사용 중인 닉네임이에요.');
    if(error.code==='23514')throw new Error('닉네임은 한글, 영문, 숫자만 사용할 수 있어요.');
    if(error.code==='P0001'&&String(error.message||'').includes('NICKNAME_CHANGE_COOLDOWN'))throw new Error('닉네임은 변경 후 30일 동안 다시 변경할 수 없어요.');
    throw error;
  }
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
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeProfileAvatar(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('LOGIN_REQUIRED');
  const {data:files,error:listError}=await supabase.storage.from('profile-images').list(user.id,{limit:20});
  if(listError)throw listError;
  const paths=(files||[]).filter(x=>String(x.name||'').startsWith('avatar.')).map(x=>`${user.id}/${x.name}`);
  if(paths.length){
    const {error:removeError}=await supabase.storage.from('profile-images').remove(paths);
    if(removeError)throw removeError;
  }
  const {error}=await supabase.from('profiles').upsert({user_id:user.id,avatar_url:null,updated_at:new Date().toISOString()});
  if(error)throw error;
}
