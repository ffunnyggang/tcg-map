import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from './supabase';

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple 로그인 토큰을 확인하지 못했습니다.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) {
    throw error;
  }

  if (credential.fullName) {
    const nameParts = [
      credential.fullName.givenName,
      credential.fullName.middleName,
      credential.fullName.familyName,
    ].filter(Boolean);

    const fullName = nameParts.join(' ');

    if (fullName) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: credential.fullName.givenName,
          family_name: credential.fullName.familyName,
        },
      });
    }
  }

  return user;
}