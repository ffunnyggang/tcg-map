export type NavIconKind='home'|'map'|'pick'|'talk';

export const NAV_ICONS:Record<NavIconKind,{active:number;inactive:number}>=Object.fromEntries((['home','map','pick','talk'] as const).map(kind=>[kind,{active:require(`../assets/nav-icons-v2/${kind}-active.png`),inactive:require(`../assets/nav-icons-v2/${kind}-inactive.png`)}])) as Record<NavIconKind,{active:number;inactive:number}>;
