# AOS parity local QA — 2026-10-23

## Worktree

- Path: `C:\Users\ALIC\Desktop\tcg-map-aos-parity-20261023`
- Branch: `work/aos-parity-20261023`
- Baseline: `97ffc44f` (latest local native UI, includes Android build 8 lineage and subsequent iOS notification/detail work)
- Compared with fetched `origin/app-mvp` at `0b7c78bc` and current web `origin/main` at `71567d19`.
- No APK/AAB/IPA, store submission, production web deployment, or database mutation performed.

## Feature inventory

| Area | Local source status | Device acceptance |
|---|---|---|
| Notifications inbox, preferences, unread header badge | Included from iOS/native UI baseline | Pending |
| Android startup notification permission | Added channel before permissions, login registration, retry; preserve explicit opt-out | Pending; Firebase configuration required |
| MY rewards / collection | Added active 📔 Binder Shelf, bilingual; ranking/badges remain available | Pending |
| TALK reselection | Added event bus, clear post/edit route params, reset entire feed and scroll through web event; preserve Android stable WebView | Pending |
| Titleless POKAMO in-app page | Existing OPEN_INAPP_PAGE bridge respects showNativeTitle:false, blocks duplicate external navigation | Pending |
| Binder back header / bottom navigation | Standalone native /web screen retained; MY URL uses nativeHeader=1 | Pending |
| Shop detail, header notification button, MY copy improvements | Included from latest native UI baseline | Pending |
| Android map, location bridge, native floating controls / safe area | Existing Android-specific implementation retained | Regression pending |
| TALK, binder guided capture, deferred draft creation, share URL, visit rules, image/CMS/LIVE PIN optimizations | Delivered by current https://funypin.kr pages loaded in WebViews; no bundled duplicate web code | Regression pending |
| Binder detail native header more button | Existing web profile more menu remains; common native binder header integration is a separate earlier app requirement, not implemented by this patch | Not claimed complete |

## Automated checks

- `node node_modules/typescript/bin/tsc --noEmit`: PASS.
- `node scripts/check-aos-parity.cjs`: PASS. Exercises actual transpiled notification functions with isolated mocks: Android channel ordering/coalescing/retry, permission request, preference opt-out, login registration, iOS channel regression. Also tests TALK bus unsubscribe/isolation and extracted WebView refresh effect against TALK/map.
- `node scripts/check-aos-config.cjs`: PASS for development and production package IDs, notification plugin / default channel and permission. Both currently report googleServicesConfigured:false.
- `git diff --check`: PASS.
- `scripts/check-floating-actions.mjs` is historical, build-2/branch-specific: it already fails 9 checks on unmodified 97ffc44f (branch name, unchanged package config and obsolete floating markup/map architecture). Do not interpret it as a clean current release gate. Its unrelated implementation was not rewritten to force green results.
- `node scripts/check-aos-metro.cjs`: run while local Metro is listening on 8083; checks actual Android JS bundle contains new functionality. See completion note below.

## Execution / blockers

Galaxy S22 Ultra (SM-S908N) connected through ADB. Installed development client reports versionName 1.0.0 / versionCode 3. Device remained locked / AOD after launch requests; no screen-interaction acceptance tests were completed. Do not mark final QA passed.

Metro uses isolated copied node_modules; a shared junction caused the initial entry-resolution error, then was replaced with an actual local copy. Original iOS/AOS worktrees and Metro servers on 8081/8082 were preserved.

Android remote push requires a matching Firebase google-services.json and EAS FCM v1 credentials. app.config.js accepts the file through GOOGLE_SERVICES_JSON (local path or EAS file environment variable). No secrets were read, generated, or committed. Current config has no file path; remote credentials were not checked. A development client without expo-notifications / expo-device needs a new native development build before notification device QA; that build was not run under the user's no-build-until-QA instruction.

## Final acceptance checklist (before release build)

1. Unlock Galaxy and connect FUNY PIN DEV to localhost:8083 through ADB reverse. Test logged-out / existing logged-in startup and MY navigation.
2. MY > Binder Shelf opens with back header, no bottom navigation; back returns to prior MY/TALK state. Test create, capture guide, photo crop/rotate, save only after first photo, public snapshot update, share and comments.
3. TALK: select a non-default category and scroll, reselect TALK and confirm 전체 + top + refreshed feed. Open/edit a post via native route params and repeat. Confirm normal detail back preserves feed position.
4. POKAMO: enter from TALK once, confirm native in-app back-only header, no external browser or duplicate page; Android back returns to TALK.
5. Map visit: current location permission allow/deny; search 500m, certify 50m and accuracy <=50m; same shop daily restriction; labels through five zoom-outs, leaders only levels 4–5. Avoid creating live visit/reward records just to test.
6. Notification permission grant/deny/settings, opt-out preserved after login/relaunch, inbox read/unread count, foreground/background/cold-start target navigation. Requires native module and Firebase/FCM setup; verify actual receipt, not only token registration.
7. TALK/CMS/binder images after slow network, background/foreground and back; LIVE PIN freshness and duplicate loads.
8. Only after acceptance, prepare Android native build. No build or deployment is automatic in this branch.

## Completion evidence

- Android Metro manifest + real JS bundle: PASS; HTTP 200, 9,124,126 bytes, 1,440 modules. New TALK event and Android notification channel code found in bundle. This is JavaScript bundling only, not an APK/AAB build.
- Re-ran TypeScript, behavioral tests, both-variant configuration and whitespace checks after final patch: PASS.
- `scripts/start-aos-parity.ps1` starts Metro with APP_VARIANT=development and ADB reverse only; it does not run Gradle, EAS build or submit.
- Local Metro remains on port 8083 for subsequent QA; existing ports 8081/8082 are untouched.
- Pending: unlock device and complete the acceptance checklist above; configure/verify Firebase + FCM and native module compatibility for push. Release build is intentionally not run.

## Stage 2 — development APK requested by user

The user subsequently requested applying this work to the Android test app, authorizing a development APK build/install (release/store build is still excluded).

- EAS development build: `dd0fbeec-0570-4640-9194-f2f66c644af5`.
- Source commit: `5f19f8387b032924254efc86fed6f3b903a7cf30`.
- App package: `kr.funypin.app.dev`; app version `1.0.1`, version code `3`.
- Reuses the existing remote development signing credentials; no credential rotation, app uninstall, or production submission.
- Native prebuild verified POST_NOTIFICATIONS and the default notification channel metadata.
- EAS development environment contains the existing secret map key; no Firebase google-services file variable was found. Desktop/Downloads checks also found no Firebase configuration file.
- Firebase Android client must match `kr.funypin.app.dev`; FCM v1 sending credentials must also be configured/verified in EAS. Remote push receipt is not claimed working merely because the module is installed.
- `scripts/install-aos-test-build.ps1` waits for this exact development build, downloads the APK into ignored `.expo/qa`, performs `adb install -r` only and reconnects Metro on 8083. A failed update never uninstalls the existing app.
- Native prebuild changed the package.json launch scripts; those incidental changes were reverted before archive upload. Generated android/ios folders and local Firebase JSON are ignored by Git.

## Stage 2 outcome

- EAS build FINISHED successfully. APK downloaded to ignored `.expo/qa/funypin-dev-dd0fbeec-0570-4640-9194-f2f66c644af5.apk`.
- `adb install -r`: Success. Existing development application updated without uninstalling or deleting its data.
- Installed package verification: versionName=1.0.1, versionCode=3, POST_NOTIFICATIONS present, granted=false.
- ADB reverse 8083 established and development client launch intent delivered successfully.
- Window focus remained NotificationShade / locked device. Interactive permission prompt and screen acceptance QA remain pending. Permission was not force-granted through ADB.
- Remote push receipt remains BLOCKED on the missing matching Firebase configuration and FCM v1 setup/verification; module installation is not evidence of successful push delivery.
- Production Android package and Play Console distribution were not updated.

## Push settings failure follow-up

- Device UI dump confirmed the actual alert: Default FirebaseApp is not initialized in process kr.funypin.app.dev. This is missing native Firebase configuration, not an identified database preference failure.
- Classified this configuration failure as PUSH_CONFIGURATION_REQUIRED, preserved failure rather than falsely enabling push, replaced raw SDK/guide text with clear push connection preparation guidance and inbox availability.
- Corrected permission copy on Android (was hardcoded iPhone), and refreshes observed OS permission even when push-token registration fails.
- TypeScript / behavior tests passed, including simulated Firebase token failure causing no registration and no push_enabled:true preference write; network errors remain distinct.
- JavaScript changes served through local Metro; no new native build needed for this feedback fix. Device relocked during follow-up, so final on-screen wording acceptance is pending unlock. Actual push delivery still requires the Firebase configuration file and FCM v1 setup.
