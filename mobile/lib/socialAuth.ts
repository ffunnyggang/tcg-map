import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'kakao';

export const OAUTH_REDIRECT = Linking.createURL('auth/callback', {
  scheme: 'funypin',
});

function getFragmentParams(url: string) {
  const hashIndex = url.indexOf('#');

  if (hashIndex === -1) {
    return new URLSearchParams();
  }

  return new URLSearchParams(url.slice(hashIndex + 1));
}

export async function signInSocial(provider: SocialProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) {
    throw new Error('OAuth URL을 생성하지 못했습니다.');
  }

  const res = await WebBrowser.openAuthSessionAsync(
    data.url,
    OAUTH_REDIRECT
  );

  if (res.type !== 'success') {
    return false;
  }

  // PKCE/code 방식
  const parsed = Linking.parse(res.url);
  const query = parsed.queryParams ?? {};

  const code =
    typeof query.code === 'string'
      ? query.code
      : null;

  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    return true;
  }

  // Supabase implicit/fragment 방식
  const fragment = getFragmentParams(res.url);

  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error: sessionError } =
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

    if (sessionError) {
      throw sessionError;
    }

    return true;
  }

  const oauthError =
    fragment.get('error_description') ||
    fragment.get('error');

  if (oauthError) {
    throw new Error(oauthError);
  }

  throw new Error(
    '로그인 콜백에서 인증 정보를 확인하지 못했습니다.'
  );
}