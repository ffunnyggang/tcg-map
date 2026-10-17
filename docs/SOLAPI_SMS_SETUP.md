# FUNY PIN · SOLAPI SMS 인증 연결

상태: **코드/Edge Function 준비 완료 · SOLAPI 계정 정보 및 Supabase Auth Hook 활성화 대기**

## 적용 구조

```
FUNY PIN 회원
→ account-verification Edge Function
→ Supabase Auth phone_change OTP 생성
→ Supabase Send SMS Hook
→ send-sms-solapi Edge Function
→ SOLAPI REST API
→ 인증번호 SMS
→ account-verification OTP 확인
→ auth.users.phone_confirmed_at
→ FUNY PIN verification_level = 2
```

## 배포된 Endpoint

- Supabase Project: `funy-pin`
- Send SMS Hook Function: `send-sms-solapi`
- Hook URL: `https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/send-sms-solapi`
- JWT 검증: OFF
- 대신 Supabase Auth Hook의 Standard Webhooks 서명을 반드시 검증함

## 필요한 SOLAPI 준비

1. SOLAPI 개인 계정 가입 및 실명인증
2. FUNY PIN에서 사용할 발신번호 등록
3. 충전/발송 가능 상태 확인
4. API Key / API Secret 발급

API Key와 Secret은 GitHub나 프론트 코드에 넣지 않는다.

## Supabase Edge Function Secrets

`send-sms-solapi`에 아래 Secret을 설정한다.

- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`
- `SEND_SMS_HOOK_SECRETS`

`SOLAPI_SENDER_NUMBER`는 SOLAPI 콘솔에서 사전 등록 완료된 발신번호만 사용한다.

`SEND_SMS_HOOK_SECRETS`는 Supabase Authentication > Hooks의 Send SMS HTTP Hook에서 사용하는 Standard Webhook Secret과 **동일한 값**이어야 한다.

형식:

```
v1,whsec_<base64-secret>
```

Secret은 저장소에 커밋하지 않는다.

## Supabase Authentication 설정

1. Authentication > Providers에서 Phone 인증 사용 가능 상태 확인
2. Authentication > Hooks 이동
3. Send SMS Hook 선택
4. HTTP Endpoint 선택
5. URL:
   `https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/send-sms-solapi`
6. Hook Secret 설정
7. 동일한 Hook Secret을 Edge Function Secret `SEND_SMS_HOOK_SECRETS`에도 입력
8. 실제 테스트 전에 DB 기능 플래그를 ON

```sql
update public.account_verification_settings
set phone_sms_enabled = true,
    sms_provider = 'solapi',
    updated_at = now()
where id = 1;
```

현재 운영 DB 기본값은 `false`이며, SOLAPI 계정/발신번호/API Key/Hook 설정이 모두 끝나기 전까지 사용자 화면에는 **준비 중**으로 노출된다.

## SMS 문구

```
[FUNY PIN] 인증번호: 123456
요청하지 않았다면 무시해주세요.
```

- 단문 SMS 범위 유지
- OTP 외 개인정보 미포함
- 사용자 ID/이메일/매물정보를 SOLAPI 메시지 본문이나 customFields에 전달하지 않음

## 보안

- Hook Endpoint는 JWT를 요구하지 않지만 Standard Webhooks 서명을 검증함
- SOLAPI API 인증은 HMAC-SHA256 사용
- SOLAPI Secret은 Edge Function Secret에만 저장
- Hook에서 OTP/전화번호를 로그에 기록하지 않음
- 성공 로그는 provider / user_id / SOLAPI group/message id만 기록
- FUNY PIN 측 재전송 제한: 60초
- 계정별 발송 요청 제한: 시간당 10회
- 동일 휴대폰 번호 중복 계정 인증 차단
- 진행 중 번호 예약 충돌 차단

## 실발송 QA

### WEB
- [ ] 로그인
- [ ] MY > 계정 보안
- [ ] 010 번호 입력
- [ ] SMS 수신
- [ ] 잘못된 OTP 오류 확인
- [ ] 정상 OTP 확인
- [ ] L1 → L2 전환
- [ ] Admin 회원관리에서 SMS 인증 확인

### iOS WebView
- [ ] 로그인 세션 인식
- [ ] SMS 발송
- [ ] OTP 인증
- [ ] MARKET 매물 등록 진입 가능

### Android WebView
- [ ] 로그인 세션 인식
- [ ] SMS 발송
- [ ] OTP 인증
- [ ] MARKET 매물 등록 진입 가능

## 운영 체크

- [ ] SOLAPI 잔액 부족 오류 확인
- [ ] 미등록 발신번호 오류 확인
- [ ] 60초 재요청 제한
- [ ] 시간당 10회 제한
- [ ] 이미 다른 FUNY PIN 계정에서 인증된 번호 차단
- [ ] 10분 이상 미완료 인증 예약 정리
- [ ] 개인정보처리방침 SOLAPI 위탁 내용 최종 확인
- [ ] `account_verification_settings.phone_sms_enabled = true` 전환
