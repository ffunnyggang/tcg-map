import { supabase } from './supabase';

export const FUNYMON_DEFS=[
  {id:'ponanyang',no:'01',name:'포냐냥',type:'노말',tier:'COMMON',stars:1,asset:'https://funypin.kr/assets/funymon/01-ponanyang.png'},
  {id:'bubblelong',no:'02',name:'버블롱',type:'물',tier:'COMMON',stars:1,asset:'https://funypin.kr/assets/funymon/02-bubblelong.png'},
  {id:'hatring',no:'03',name:'하트링',type:'페어리',tier:'UNCOMMON',stars:2,asset:'https://funypin.kr/assets/funymon/03-hatring.png'},
  {id:'bulgi',no:'04',name:'불기',type:'불',tier:'UNCOMMON',stars:2,asset:'https://funypin.kr/assets/funymon/04-bulgi.png'},
  {id:'namumong',no:'05',name:'나무몽',type:'풀',tier:'UNCOMMON',stars:2,asset:'https://funypin.kr/assets/funymon/05-namumong.png'},
  {id:'ggomagureum',no:'06',name:'꼬마구름',type:'비행',tier:'RARE',stars:3,asset:'https://funypin.kr/assets/funymon/06-ggomagureum.png'},
  {id:'bawidong',no:'07',name:'바위동',type:'바위',tier:'RARE',stars:3,asset:'https://funypin.kr/assets/funymon/07-bawidong.png'},
  {id:'grimjamong',no:'08',name:'그림자몽',type:'고스트',tier:'SUPER RARE',stars:4,asset:'https://funypin.kr/assets/funymon/08-grimjamong.png'},
  {id:'beonjjeogi',no:'09',name:'번쩍이',type:'전기',tier:'SUPER RARE',stars:4,asset:'https://funypin.kr/assets/funymon/09-beonjjeogi.png'},
  {id:'neon',no:'10',name:'네온',type:'코스믹',tier:'LEGENDARY',stars:5,asset:'https://funypin.kr/assets/funymon/10-neon.png'}
] as const;

export type FunyMonDef=typeof FUNYMON_DEFS[number];

export async function getMyFunyMonIds(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return new Set<string>();
  const {data,error}=await supabase.from('funy_mon_catches').select('monster_id,result').eq('user_id',user.id).in('result',['caught','winner']);
  if(error)throw error;
  return new Set((data??[]).map(x=>String(x.monster_id)));
}

export type MyEntry={
  id:string;
  title:string;
  description:string|null;
  code:string|null;
  status:string;
  created_at:string;
  source_type:string;
};

export async function getMyEntries(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [] as MyEntry[];
  const {data,error}=await supabase.from('user_entries').select('id,title,description,code,status,created_at,source_type').eq('user_id',user.id).order('created_at',{ascending:false});
  if(error)throw error;
  return (data??[]) as MyEntry[];
}

export type MyCoupon={
  id:string;
  title:string;
  description:string|null;
  code:string|null;
  status:string;
  issued_at:string;
  expires_at:string|null;
  source_type:string;
  shop_name:string|null;
};

export async function getMyCoupons(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [] as MyCoupon[];
  const {data,error}=await supabase.from('user_coupons').select('id,title,description,code,status,issued_at,expires_at,source_type,shop_name').eq('user_id',user.id).order('issued_at',{ascending:false});
  if(error)throw error;
  return (data??[]) as MyCoupon[];
}
