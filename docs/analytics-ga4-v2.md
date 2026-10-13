# FUNY PIN GA4 setup — 2026-10-13

Property: FUNY PIN / 554874760. Web measurement ID: G-3ZERNC71PH.

Status: WEB implementation complete; GA Admin configuration below is pending.
No native SDK or app binary change is included. Native shop detail, MY and authentication screens remain outside this tracking scope.

## Key events to register

Use "once per event" counting. Count successful completions, not button clicks.

| Event | Meaning |
| --- | --- |
| funymon_catch_success | Successful server-confirmed catch |
| live_pin_submit | Successful live report or reply registration |
| live_pin_request_submit | Successful information request registration |
| talk_post_create | Successful TALK post registration |
| shop_request_submit | Successful shop registration/change request |
| partner_submit | Successful advertising/partnership inquiry |
| support_submit | Successful support inquiry |
| feedback_submit | Successful satisfaction response |

Do not mark page views, list renders, data-source events or every click as key events.
New key event designation does not backfill earlier data. Inspect existing key event settings before adding these, preserving unrelated valid designations.

## Event-scoped custom dimensions

Inspect existing definitions and reuse matching parameters instead of duplicating them.

| Display name | Event parameter |
| --- | --- |
| Client surface | client_surface |
| App platform | app_platform |
| App version | app_version |
| App build | app_build |
| Login state | login_state |
| Screen type | screen_type |
| Shop ID | shop_id |
| Sort type | sort_type |
| Map layer | layer_name |
| Layer enabled | enabled |
| Location type | location_type |
| Report type | report_type |
| Request type | request_type |
| Monster ID | monster_id |
| Reward type | reward_type |
| Link mode | link_mode |
| Banner placement | banner_placement |
| Filter name | filter_name |

Avoid high-cardinality free text such as search queries, authored content, full URLs or contact details as new custom dimensions. Do not treat unknown login/platform values as logged-out users or iOS users.

## Reporting definition

1. Audience: GA standard active users, sessions and page_view. Do not add funy_page_view and funy_route_view to page_view counts.
2. WEB vs app WebView: client_surface=web for WEB; client_surface in tab/page/app_webview for app WebView. app_platform distinguishes ios/android when supplied; unknown remains unknown. Operating system alone does not identify an installed app.
3. MAP funnel: shop_list_click or map_popup_click -> shop_detail_view -> shop_directions_click/shop_phone_click. App native shop_detail_view is not collected; label this funnel WEB only.
4. MAP actions: map_search, country_change, map_filter_click, shop_sort_click, map_my_location_click, map_layer_toggle. Group layer toggles by layer_name and enabled.
5. Community/completions: the key events above, plus talk_comment_create, talk_post_like, live_pin_reaction.
6. Tools: coin_flip_view, coin_flip_start, coin_flip_result, coin_flip_reset, coin_flip_sound_toggle, oripa_calculator_change. No implicit "conversion" for editing calculator inputs.
7. Diagnostics: shop_list_render and shop_data_source in a separate report. Exclude them from human action totals; they are not page views.

## Validation

- node tests/analytics-v2.test.cjs checks bootstrap, context, current selectors, resulting layer state, app touch/click deduplication, scroll exclusion, repeat detail visits and inline script syntax.
- Deployment checks must verify the served common tracker and its references on all twelve entry pages.
- After GA Admin setup, use DebugView/Realtime for one action per scenario and verify standard reports after processing. No production form submissions or catches should be created solely for automated testing.
- App native touch capture order needs a real iOS/Android smoke check; automated tests cover the handler contract, not installed WebView timing.
- No claim of historical backfill or of complete native app coverage should be made.
