import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';

import { deleteAccount, getProfile, signOut } from '../lib/auth';
import { signInSocial } from '../lib/socialAuth';
import { signInWithApple } from '../lib/appleAuth';

export default function Account() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const x = await getProfile();
      setUser(x.user);
      setProfile(x.profile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const social = async (provider: 'google' | 'kakao') => {
    setBusy(provider);

    try {
      const ok = await signInSocial(provider);

      if (ok) {
        await refresh();
      }
    } catch (e: any) {
      Alert.alert('로그인 실패', String(e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  const apple = async () => {
    setBusy('apple');

    try {
      await signInWithApple();
      await refresh();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          'Apple 로그인 실패',
          String(e?.message || e)
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    setBusy('out');

    try {
      await signOut();
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const removeAccount = () => {
    Alert.alert(
      '계정을 삭제할까요?',
      '계정과 프로필, 즐겨찾기 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '계정 삭제',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await deleteAccount();
              setUser(null);
              setProfile(null);
              Alert.alert('계정 삭제 완료', 'FUNY PIN 계정이 삭제되었습니다.');
            } catch (e: any) {
              Alert.alert('계정 삭제 실패', String(e?.message || e));
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: '#fff',
      }}
    >
      <View style={{ padding: 20 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 28 }}>‹</Text>
        </Pressable>

        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            marginTop: 14,
          }}
        >
          MY FUNY PIN
        </Text>

        {user ? (
          <>
            <Text
              style={{
                marginTop: 20,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              {profile?.nickname ||
                user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                'FUNY PIN 회원'}
            </Text>

            <Text style={{ marginTop: 5 }}>
              {user.email || '소셜 로그인 계정'}
            </Text>

            <Pressable
              onPress={logout}
              disabled={!!busy}
              style={{
                marginTop: 24,
                padding: 14,
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 12,
              }}
            >
              <Text>
                {busy === 'out' ? '처리 중…' : '로그아웃'}
              </Text>
            </Pressable>

            <Pressable
              onPress={removeAccount}
              disabled={!!busy}
              style={{
                marginTop: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#f1c7c7',
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  color: '#c62828',
                  fontWeight: '700',
                }}
              >
                {busy === 'delete' ? '삭제 중…' : '계정 삭제'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text
              style={{
                marginTop: 14,
                lineHeight: 21,
              }}
            >
              별도 회원가입 없이 사용 중인 계정으로 FUNY PIN을 시작하세요.
            </Text>

            {Platform.OS === 'ios' ? (
              <View
                style={{
                  marginTop: 26,
                  opacity: busy ? 0.6 : 1,
                }}
                pointerEvents={busy ? 'none' : 'auto'}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={12}
                  style={{
                    width: '100%',
                    height: 52,
                  }}
                  onPress={apple}
                />
              </View>
            ) : (
              <>
                <Pressable
                  disabled={!!busy}
                  onPress={() => social('kakao')}
                  style={{
                    marginTop: 26,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: '#FEE500',
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: '800',
                    }}
                  >
                    카카오로 시작하기
                  </Text>
                </Pressable>

                <Pressable
                  disabled={!!busy}
                  onPress={() => social('google')}
                  style={{
                    marginTop: 10,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#ddd',
                    backgroundColor: '#fff',
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: '700',
                    }}
                  >
                    Google로 계속하기
                  </Text>
                </Pressable>

                <Pressable
                  disabled
                  style={{
                    marginTop: 10,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: '#03C75A',
                    opacity: 0.45,
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: '800',
                      color: '#fff',
                    }}
                  >
                    네이버로 시작하기 · 준비 중
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
