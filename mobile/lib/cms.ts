import { supabase } from './supabase';

export type CmsPlacement = 'home' | 'pick_information' | 'pick_schedule' | 'pick_creator' | 'pick_review';
export type CmsBlock = Record<string, any> & { id:string; placement:CmsPlacement; block_type:string; style?:string; autoplay_seconds?:number };
export type CmsBlockItem = Record<string, any> & { id:string; block_id:string };
export type CmsResolvedItem = CmsBlockItem & { content?:Record<string,any>|null; shop?:Record<string,any>|null };
export type CmsResolvedBlock = CmsBlock & { items:CmsResolvedItem[] };

const ROOT='https://funypin.kr/';
export function cmsAssetUrl(value?:string|null){if(!value)return '';if(/^https?:\/\//i.test(value))return value;return ROOT+value.replace(/^\//,'')}
export function cmsItemSource(item:CmsResolvedItem){return item.shop||item.content||item}
export function cmsItemTitle(item:CmsResolvedItem){const x:any=cmsItemSource(item);return x?.title||x?.name||''}
export function cmsItemImage(item:CmsResolvedItem){const x:any=cmsItemSource(item);return cmsAssetUrl(x?.home_image_url||x?.image_url||x?.auto_image_url||x?.thumbnail_url||'')}
export function cmsItemUrl(item:CmsResolvedItem){const x:any=cmsItemSource(item);if(item.shop?.id)return `/shop/${item.shop.id}`;return x?.target_url||''}
export function cmsItemLinkMode(item:CmsResolvedItem){const x:any=cmsItemSource(item);return String(x?.link_mode||'internal').toLowerCase()}
export function cmsAbsoluteUrl(value?:string|null){if(!value)return '';if(/^https?:\/\//i.test(value))return value;return ROOT+String(value).replace(/^\//,'')}

export async function getCmsPlacement(placement:CmsPlacement):Promise<CmsResolvedBlock[]>{
  const now=new Date().toISOString();
  const {data:blocks,error:blockError}=await supabase.from('cms_blocks').select('*').eq('placement',placement).eq('status','published').eq('is_active',true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order('sort_order',{ascending:true});
  if(blockError)throw blockError;if(!blocks?.length)return [];
  const ids=blocks.map((b:any)=>b.id);
  const {data:items,error:itemError}=await supabase.from('cms_block_items').select('*').in('block_id',ids).eq('is_active',true).order('sort_order',{ascending:true});
  if(itemError)throw itemError;
  const contentIds=[...new Set((items||[]).filter((x:any)=>x.item_type!=='shop'&&x.content_id).map((x:any)=>x.content_id))];
  const shopIds=[...new Set((items||[]).filter((x:any)=>x.item_type==='shop'&&x.shop_id).map((x:any)=>x.shop_id))];
  const [cr,sr,ir]=await Promise.all([
    contentIds.length?supabase.from('cms_contents').select('*').in('id',contentIds):Promise.resolve({data:[],error:null} as any),
    shopIds.length?supabase.from('shops').select('*').in('id',shopIds):Promise.resolve({data:[],error:null} as any),
    shopIds.length?supabase.from('shop_images').select('*').in('shop_id',shopIds).eq('is_active',true).order('sort_order',{ascending:true}):Promise.resolve({data:[],error:null} as any),
  ]);
  if(cr.error)throw cr.error;if(sr.error)throw sr.error;if(ir.error)throw ir.error;
  const cm=new Map((cr.data||[]).map((x:any)=>[x.id,x]));const sm=new Map((sr.data||[]).map((x:any)=>[x.id,{...x}]));
  for(const image of ir.data||[]){
    const shop:any=sm.get(image.shop_id);if(!shop)continue;
    const src=cmsAssetUrl(image.storage_path||image.source_path);if(!src)continue;
    if(image.image_type==='thumbnail'&&!shop.image_url)shop.image_url=src;
    else if(image.image_type==='gallery'&&!shop.image_url)shop.image_url=src;
    if(placement==='home'&&image.image_type==='gallery'&&!shop.home_image_url)shop.home_image_url=src;
  }
  const by=new Map<string,CmsResolvedItem[]>();for(const item of items||[]){const r:CmsResolvedItem={...item,content:item.item_type==='shop'?null:cm.get(item.content_id)||null,shop:item.item_type==='shop'?sm.get(item.shop_id)||null:null};const list=by.get(item.block_id)||[];list.push(r);by.set(item.block_id,list)}
  return blocks.map((b:any)=>({...b,items:by.get(b.id)||[]})) as CmsResolvedBlock[];
}
