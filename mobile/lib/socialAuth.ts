import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
WebBrowser.maybeCompleteAuthSession();
export type SocialProvider='google'|'kakao';
export const OAUTH_REDIRECT=Linking.createURL('auth/callback',{scheme:'funypin'});
export async function signInSocial(provider:SocialProvider){const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:OAUTH_REDIRECT,skipBrowserRedirect:true}});if(error)throw error;if(!data.url)throw new Error('OAuth URL을 생성하지 못했습니다.');const res=await WebBrowser.openAuthSessionAsync(data.url,OAUTH_REDIRECT);if(res.type!=='success')return false;const parsed=Linking.parse(res.url);const q=parsed.queryParams??{};const code=typeof q.code==='string'?q.code:null;if(code){const {error:e}=await supabase.auth.exchangeCodeForSession(code);if(e)throw e;return true}const access=typeof q.access_token==='string'?q.access_token:null,refresh=typeof q.refresh_token==='string'?q.refresh_token:null;if(access&&refresh){const {error:e}=await supabase.auth.setSession({access_token:access,refresh_token:refresh});if(e)throw e;return true}throw new Error('로그인 콜백에서 인증 정보를 확인하지 못했습니다.');}
