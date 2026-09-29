import { supabase } from './supabase';

export type CmsPlacement = 'home' | 'pick_information' | 'pick_schedule' | 'pick_creator' | 'pick_review';

export type CmsBlock = Record<string, any> & { id: string; placement: CmsPlacement; block_type: string };
export type CmsBlockItem = Record<string, any> & { id: string; block_id: string };

export type CmsResolvedItem = CmsBlockItem & {
  content?: Record<string, any> | null;
  shop?: Record<string, any> | null;
};

export type CmsResolvedBlock = CmsBlock & { items: CmsResolvedItem[] };

export async function getCmsPlacement(placement: CmsPlacement): Promise<CmsResolvedBlock[]> {
  const { data: blocks, error: blockError } = await supabase
    .from('cms_blocks')
    .select('*')
    .eq('placement', placement)
    .eq('status', 'published')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (blockError) throw blockError;
  if (!blocks?.length) return [];

  const blockIds = blocks.map((block: any) => block.id);
  const { data: items, error: itemError } = await supabase
    .from('cms_block_items')
    .select('*')
    .in('block_id', blockIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (itemError) throw itemError;

  const contentIds = [...new Set((items || []).filter((x: any) => x.item_type !== 'shop' && x.content_id).map((x: any) => x.content_id))];
  const shopIds = [...new Set((items || []).filter((x: any) => x.item_type === 'shop' && x.shop_id).map((x: any) => x.shop_id))];

  const [contentResult, shopResult, imageResult] = await Promise.all([
    contentIds.length ? supabase.from('cms_contents').select('*').in('id', contentIds) : Promise.resolve({ data: [], error: null } as any),
    shopIds.length ? supabase.from('shops').select('*').in('id', shopIds) : Promise.resolve({ data: [], error: null } as any),
    shopIds.length ? supabase.from('shop_images').select('*').in('shop_id', shopIds).eq('is_active', true).order('sort_order', { ascending: true }) : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (contentResult.error) throw contentResult.error;
  if (shopResult.error) throw shopResult.error;
  if (imageResult.error) throw imageResult.error;

  const contentMap = new Map((contentResult.data || []).map((x: any) => [x.id, x]));
  const shopMap = new Map((shopResult.data || []).map((x: any) => [x.id, { ...x }]));

  for (const image of imageResult.data || []) {
    const shop: any = shopMap.get(image.shop_id);
    if (!shop) continue;
    const src = image.storage_path || image.source_path;
    if (image.image_type === 'thumbnail' && !shop.image_url) shop.image_url = src;
    if (image.image_type === 'gallery' && !shop.image_url) shop.image_url = src;
  }

  const itemsByBlock = new Map<string, CmsResolvedItem[]>();
  for (const item of items || []) {
    const resolved: CmsResolvedItem = {
      ...item,
      content: item.item_type === 'shop' ? null : contentMap.get(item.content_id) || null,
      shop: item.item_type === 'shop' ? shopMap.get(item.shop_id) || null : null,
    };
    const list = itemsByBlock.get(item.block_id) || [];
    list.push(resolved);
    itemsByBlock.set(item.block_id, list);
  }

  return blocks.map((block: any) => ({ ...block, items: itemsByBlock.get(block.id) || [] })) as CmsResolvedBlock[];
}
