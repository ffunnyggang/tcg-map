# AOS prebuild QA — 2026-10-19

This branch is intentionally **not a release build**. It is the local/staging layer used before the next closed-test AAB.

## Locked regression scope

- TCG MAP WebView remains mounted across Android tab switches.
- Android MAP early reveal at WebView progress >= 0.35 remains enabled.
- Existing Supabase native authentication and web access-token injection remain unchanged.
- Existing native card-shop detail routing remains the owner of `#/shop/{id}` links.
- iOS keeps the existing native LIVE PIN floating buttons in this Android-first update.

## Updated scope

- Android HOME / MAP / PICK / TALK use web-owned floating controls.
- Android web floating controls receive native safe-bottom and native tab-height CSS variables.
- TALK block action directly closes the current detail and resets the native header state.
- Production `live-pin.html` replaces the old test URL.
- Native MY hub matches the current web-service menu and profile information hierarchy.
- MY web subpages receive native authentication and use one native back header.
- Android image downloads generated inside the WebView are bridged to a native file share/save sheet.
- Coin flip receives Android Web Audio unlock support without changing other WebViews' playback policy.
- Native card-shop FUNY MON event card supports nullable admin-managed `event_url`.
- Native back-button glyph and title spacing are shared through one component.

## Required device QA before any build

1. Android gesture navigation and 3-button navigation.
2. Cold start and HOME → MAP → PICK → TALK repeated navigation.
3. MAP KR/JP, search, filters, list, detail return, location, MARKET overlay, register sheet.
4. TALK post detail, report, block, immediate list return, hardware back.
5. MY profile, FUNY COIN, web subpages, tester-only prepared pages, logout and account deletion.
6. FUNY MON image save/share.
7. Coin flip sound after first user interaction.
8. Native card-shop event card with and without an event URL.

No EAS build should run until this checklist and the GitHub validation workflow are both green.
