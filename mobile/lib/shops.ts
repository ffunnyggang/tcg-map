import { supabase } from './supabase';
export type ShopImage={id:string;type?:string;image_type?:string;source_path:string|null;storage_path:string|null;alt_text:string|null;sort_order:number;is_primary:boolean};
export type ShopContent={content_id:string;shop_id:string;title:string;url:string;platform:string|null;content_type:string|null;published_at:string|null;cover_image_url:string|null;status:string|null};
export type ShopReview={review_id:string;shop_id:string;product_score:number|null;single_score:number|null;graded_score:number|null;box_score:number|null;oripa_score:number|null;price_score:number|null;scale_score:number|null;mood_score:number|null;access_score:number|null;staff_score:number|null;one_line_review:string|null;visit_review:string|null;key_products:string|null;event_note:string|null;stock_note:string|null;photo_url:string|null};
export type FunyMonEvent={id:string;shop_id:string|null;title:string;starts_at:string;ends_at:string;is_force_paused:boolean;is_archived:boolean;target_type:string|null;schedule_event_id:string|null;target_latitude:number|null;target_longitude:number|null;target_name_snapshot:string|null;target_location_snapshot:string|null};
export type AppShop={id:string;name:string;name_en:string|null;country_code:'KR'|'JP';city:string|null;area:string|null;address:string;phone:string|null;website_url:string|null;instagram_url:string|null;instagram_feed_enabled?:boolean|null;naver_map_url:string|null;google_map_url:string|null;nearest_station:string|null;walk_minutes:number|null;parking_status:string|null;hours_display:string|null;closed_display:string|null;latitude:number;longitude:number;event_highlight_enabled?:boolean|null;event_start_at?:string|null;event_end_at?:string|null;verified_at?:string|null;tcg:Record<string,{status:boolean|null;detail:string|null}>;features:Record<string,{value:boolean|null;detail:string|null}>;images:ShopImage[]};
export const shopImageUrl=(x?:string|null)=>!x?'':/^https?:\/\//i.test(x)?x:`https://funypin.kr/${x.replace(/^\//,'')}`;
export async function getShops(){const {data,error}=await supabase.from('v_app_shops').select('*').order('id');if(error)throw error;return(data??[]) as AppShop[]}
export async function getShop(id:string){const {data,error}=await supabase.from('v_app_shops').select('*').eq('id',id).single();if(error)throw error;return data as AppShop}
export async function getShopContents(id:string){const {data,error}=await supabase.from('shop_contents').select('*').eq('shop_id',id).eq('status','공개').order('published_at',{ascending:false});if(error)throw error;return(data??[]) as ShopContent[]}
export async function getShopReview(id:string){const {data,error}=await supabase.from('shop_reviews').select('*').eq('shop_id',id).maybeSingle();if(error)throw error;return data as ShopReview|null}
export async function getActiveFunyMonEvents(){const now=new Date().toISOString();const {data,error}=await supabase.from('funy_mon_events').select('id,shop_id,title,starts_at,ends_at,is_force_paused,is_archived,target_type,schedule_event_id,target_latitude,target_longitude,target_name_snapshot,target_location_snapshot').eq('is_archived',false).eq('is_force_paused',false).lte('starts_at',now).gte('ends_at',now);if(error)throw error;return(data??[]) as FunyMonEvent[]}
export async function getFavoriteIds(){const {data:{user}}=await supabase.auth.getUser();if(!user)return new Set<string>();const {data,error}=await supabase.from('shop_favorites').select('shop_id').eq('user_id',user.id);if(error)throw error;return new Set((data??[]).map(x=>x.shop_id))}
export async function toggleFavorite(shopId:string,on:boolean){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('LOGIN_REQUIRED');if(on){const {error}=await supabase.from('shop_favorites').upsert({user_id:user.id,shop_id:shopId},{onConflict:'user_id,shop_id'});if(error)throw error}else{const {error}=await supabase.from('shop_favorites').delete().eq('user_id',user.id).eq('shop_id',shopId);if(error)throw error}}

export async function getFavoriteShops(){
  const ids=Array.from(await getFavoriteIds());
  if(!ids.length)return [] as AppShop[];
  const {data,error}=await supabase.from('v_app_shops').select('*').in('id',ids).order('name');
  if(error)throw error;
  const order=new Map(ids.map((id,i)=>[id,i]));
  return ((data??[]) as AppShop[]).sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
}
