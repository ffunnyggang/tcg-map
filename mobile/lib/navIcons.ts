export type NavIconKind='home'|'map'|'pick'|'talk';

export const NAV_ICONS:Record<NavIconKind,{active:number;inactive:number}>= {
  home:{active:require('../assets/nav-icons-v2/home-active.png'),inactive:require('../assets/nav-icons-v2/home-inactive.png')},
  map:{active:require('../assets/nav-icons-v2/map-active.png'),inactive:require('../assets/nav-icons-v2/map-inactive.png')},
  pick:{active:require('../assets/nav-icons-v2/pick-active.png'),inactive:require('../assets/nav-icons-v2/pick-inactive.png')},
  talk:{active:require('../assets/nav-icons-v2/talk-active.png'),inactive:require('../assets/nav-icons-v2/talk-inactive.png')}
};
