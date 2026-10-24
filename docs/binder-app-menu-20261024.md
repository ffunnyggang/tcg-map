# Binder app header review — 2026-10-24

CMS in-app pages embed same-domain destinations in an iframe. The Android ReactNativeWebView bridge is injected in the main frame only. A binder in that iframe cannot send BINDER_DETAIL_CONTEXT; forwarding only that message would still misroute native menu actions and ACK JavaScript to the parent.

For binder.html only, the CMS gate now replaces its own document with the validated destination, retaining app/platform/version and returnTo. Other CMS pages keep their iframe behavior, and host validation is unchanged. The existing binder WEB_ROUTE → BINDER_DETAIL_CONTEXT protocol then reaches Android build 10's existing native header menu. No Android binary changes are included in this web fix.

Verified artifacts:
- AOS 1.0.1 build 10 source b356c4f6d5976cf9e721c5386a74056d98c958a4 contains isBinderMenu, BINDER_DETAIL_CONTEXT and native binder action dispatch.
- EAS latest completed iOS store-profile build at inspection: 1.0.1 (31), build 5501af7c-89bd-4c2c-97e9-1faa53b91733, source 97ffc44fae848d49d5fb41e74575fbe92d76bf68. Downloaded IPA Payload/FUNYPIN.app/main.jsbundle contains TALK_POST_CONTEXT but neither BINDER_DETAIL_CONTEXT nor funy:native-binder-action, matching its source. This binary cannot display a genuine binder-specific native header menu through a web-only update. It retains the web profile menu fallback. EAS build metadata is not proof of the currently installed or App Store released version.
- Prepared native fix 4352b63f remains in the AOS parity worktree for the next shared iOS/AOS build. No build or submission performed here; dirty iOS worktree untouched.

Validation: tests/binder-app-menu.cjs uses actual pages with isolated DB fixtures and a simulated build-10 bridge contract. Direct and CMS entry, ACK suppression of duplicate web menu, native-action-to-web share, iOS31 fallback, returnTo preservation, unrelated CMS and invalid-host checks. This is not native-device QA; adb devices returned no connected devices.
