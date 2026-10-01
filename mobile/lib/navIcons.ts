export type NavIconKind='home'|'map'|'pick'|'talk';

export const NAV_ICONS:Record<NavIconKind,{active:number;inactive:number}>={
  home:{
    active:require('../assets/nav-icons/home-active.png'),
    inactive:require('../assets/nav-icons/home-inactive.png')
  },
  map:{
    active:require('../assets/nav-icons/map-active.png'),
    inactive:require('../assets/nav-icons/map-inactive.png')
  },
  pick:{
    active:require('../assets/nav-icons/pick-active.png'),
    inactive:require('../assets/nav-icons/pick-inactive.png')
  },
  talk:{
    active:require('../assets/nav-icons/talk-active.png'),
    inactive:require('../assets/nav-icons/talk-inactive.png')
  }
};