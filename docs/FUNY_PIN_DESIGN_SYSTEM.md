# FUNY PIN Cross-platform Design System

## Goal
FUNY PIN Web, iOS, and Android should feel like one service. The current web experience is the visual source of truth unless a platform-native constraint requires an exception.

## Principles
1. Same information architecture and content order across Web / iOS / Android.
2. Same component role, visual hierarchy, state, and interaction whenever possible.
3. Platform-specific differences are limited to map SDK, safe-area/system UI, native authentication, and policy-driven behavior.
4. New screens should reuse existing tokens and primitives before introducing new styles.
5. Any intentional cross-platform difference must be documented before implementation.

## Tokens
- Brand purple: `#8062D8`
- Brand purple dark: `#6749BD`
- Brand purple soft: `#F0EBFB`
- Primary text: `#181720`
- Secondary text: `#4D4852`
- Muted text: `#8D8993`
- Border: `#E9E5ED`
- Section divider: `#F4F4F5`
- Surface: `#FFFFFF`
- Header height: `58`
- Horizontal content padding: `14`
- Standard card radius: `13`
- Standard button radius: `12`
- Floating bottom navigation height: `68`

The React Native canonical tokens live in `mobile/lib/theme.ts`.

## Shared Components
The React Native primitives live in `mobile/components/FunyUI.tsx`.

- `SectionDivider`: section separation matching web
- `SectionTitle`: standard section title row
- `Pill`: filters and category chips
- `SurfaceCard`: shared bordered card surface
- `PrimaryButton`: primary action
- `EmptyState`: empty-state presentation

## Global Components
### Header
- White background
- 58px height
- FUNY PIN pin mark + wordmark + `by 깽퐌커플`
- No decorative app-only hero styling
- Optional right-side native action such as MY

### Bottom navigation
- HOME / TCG MAP / PICK / TALK
- Floating rounded navigation matching the web visual language
- Active state uses brand purple and soft purple background
- Respect iOS/Android safe area without changing visual proportions

## Screen Rules
### HOME
- Web HOME structure is canonical.
- Header → hero banner carousel → map entry → section divider → CMS-driven content.
- Hero banner is currently hardcoded on web but must move to shared CMS before launch.

### TCG MAP
- Core service; highest parity requirement.
- Map-first layout.
- Search and filters overlay the map like web.
- Same country/filter/location concepts.
- Same card-shop list hierarchy and event emphasis.
- SDK differences only: Web Naver/Google, Android Google Maps, iOS Apple Maps.

### Shop Detail
- Same information order and hierarchy as web.
- Gallery → shop identity → location/basic info → primary actions → TCG/features → review → related content.
- App-only functions such as favorites may be added without changing the core hierarchy.

### PICK
- Same tabs, spacing, content width, card system, and CMS renderer behavior across channels.

### TALK
- Long-term target is a FUNY PIN native community shared by Web/iOS/Android.
- POKAMO remains a parallel external community until FUNY TALK engagement is sufficient.

### MY
- App/member hub built using the same tokens and card language.
- Target modules: profile photo + nickname, favorites, FUNY MON collection, coupons/entries/wins, activity, badges, account settings.

## Interaction Rules
- Touch targets should be at least 44px when practical.
- Press feedback should not move layout.
- Horizontal carousels snap to one complete item.
- Active pills/tabs use consistent state styling.
- Loading / empty / error / success states must use shared visual language.
- Floating actions may compact on scroll only when the same interaction exists on web or is clearly platform-appropriate.

## Change Process
When adding or changing a shared component:
1. Check the current web pattern first.
2. Update the shared token/component spec.
3. Apply the same behavior to iOS and Android React Native code.
4. QA Web / iOS / Android for visual hierarchy and interaction parity.
5. Document intentional exceptions.
