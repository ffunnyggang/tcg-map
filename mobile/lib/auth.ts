import { supabase } from './supabase';
export async function signUp(email:string,password:string,nickname:string){const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;if(data.user&&data.session){const {error:e}=await supabase.from('profiles').upsert({user_id:data.user.id,nickname:nickname.trim()||null});if(e)throw e}return data}
export async function signIn(email:string,password:string){const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;return data}
export async function signOut(){const {error}=await supabase.auth.signOut();if(error)throw error}
export async function getProfile(){const {data:{user}}=await supabase.auth.getUser();if(!user)return {user:null,profile:null};const {data:profile,error}=await supabase.from('profiles').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;return {user,profile}}
