const svg=(value:string)=>'data:image/svg+xml;utf8,'+encodeURIComponent(value);

const activeGradient=`<linearGradient id="g" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#B093F4"/><stop offset=".48" stop-color="#8062D8"/><stop offset="1" stop-color="#6749BD"/></linearGradient>`;
const inactiveGradient=`<linearGradient id="g" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#E1E0EE"/><stop offset=".55" stop-color="#C8C7D8"/><stop offset="1" stop-color="#A9A8BE"/></linearGradient>`;

const icon=(body:string,active:boolean)=>svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs>${active?activeGradient:inactiveGradient}</defs>${body}</svg>`);

const homeBody=(fill:string)=>`<path fill="${fill}" d="M7 21.5 24 7l17 14.5v18a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4z"/><path fill="#fff" d="M19 43V28h10v15z"/>`;
const mapBody=(fill:string)=>`<path fill="${fill}" d="M7 8.5 18 5l12 4 11-3.5v31L30 40l-12-4-11 3.5z"/><path fill="#fff" d="M18 5v31M30 9v31" opacity=".9"/><path fill="#fff" d="M24 14c-5 0-8.5 3.4-8.5 8.1 0 5.1 5.1 10.9 8.5 14.1 3.4-3.2 8.5-9 8.5-14.1C32.5 17.4 29 14 24 14Z"/><circle cx="24" cy="22" r="3.1" fill="${fill}"/>`;
const pickBody=(fill:string)=>`<path fill="${fill}" d="m24 5.5 5.5 11.2 12.4 1.8-9 8.8 2.1 12.4L24 34l-11 5.7 2.1-12.4-9-8.8 12.4-1.8z"/>`;
const talkBody=(fill:string)=>`<path fill="${fill}" d="M8 9h32a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H21L10 43V36H8a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4Z"/><circle cx="16" cy="22.5" r="2.2" fill="#fff"/><circle cx="24" cy="22.5" r="2.2" fill="#fff"/><circle cx="32" cy="22.5" r="2.2" fill="#fff"/>`;

const A='#g';
const INACTIVE='#g';

export const visualAssets={
  logo:'https://funypin.kr/assets/logo.png',
  home:icon(homeBody(A),true),
  homeInactive:icon(homeBody(INACTIVE),false),
  map:icon(mapBody(A),true),
  mapInactive:icon(mapBody(INACTIVE),false),
  pick:icon(pickBody(A),true),
  pickInactive:icon(pickBody(INACTIVE),false),
  talk:icon(talkBody(A),true),
  talkInactive:icon(talkBody(INACTIVE),false),
} as const;
