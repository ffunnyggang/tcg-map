const ART = 'card-fullart-text-layers-v1';
const FACE_ART = 'card-fullart-text-layers-face-v1';
const TEXT = 'card-text-only-v2';
const ids = Array.from({ length: 30 }, (_, i) => 'm6a-ja-' + String(i + 17).padStart(3, '0'));
// Visually verified Korean editions for the same four print artworks.
// These pairings apply to this admin workspace only.
const printKoreanSources: Record<string, string> = {
  'm6a-ja-036': 'm6a-ko-01M1FTK1GHT66NBH2QA18FJJ8Z',
  'm6a-ja-038': 'm6a-ko-01M1FTK3DG7210M7MR4FS7T5TF',
  'm6a-ja-040': 'm6a-ko-01M2FKPQ5YM3T9JW6WGD49W4FQ',
  'm6a-ja-041': 'm6a-ko-01M1FTK4AA6Z5QJ7V44YAQ268X',
};
const uuid = /^[0-9a-f-]{36}$/i;
const refId = /^[a-z0-9-]{1,80}$/i;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const inList = (values: string[]) => 'in.(' + values.map(value => JSON.stringify(value)).join(',') + ')';
const chunks = (values: string[]) => Array.from({ length: Math.ceil(values.length / 30) }, (_, i) => values.slice(i * 30, i * 30 + 30));

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: '지원하지 않는 요청입니다.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply({ error: '서비스 설정을 확인해 주세요.' }, 503);
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return reply({ error: '관리자 로그인이 필요합니다.' }, 401);
  const headers = { apikey: anon, Authorization: auth };
  const serverHeaders = { apikey: service, Authorization: 'Bearer ' + service };
  const request = (path: string, options: RequestInit = {}) =>
    fetch(url + path, { ...options, signal: AbortSignal.timeout(12000) });
  async function rows<T>(table: string, params: Record<string, string>): Promise<T[]> {
    const result: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const query = new URLSearchParams({ ...params, limit: '500', offset: String(offset) });
      const response = await request('/rest/v1/' + table + '?' + query, { headers: serverHeaders });
      if (!response.ok) throw new Error('catalog query failed');
      const page = await response.json() as T[];
      result.push(...page);
      if (page.length < 500) return result;
    }
  }
  async function sign(bucket: string, path: string) {
    const safePath = path.split('/').map(encodeURIComponent).join('/');
    const response = await request('/storage/v1/object/sign/' + bucket + '/' + safePath, {
      method: 'POST', headers: { ...serverHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!response.ok) throw new Error('asset unavailable');
    const { signedURL } = await response.json();
    if (typeof signedURL !== 'string' || !signedURL.startsWith('/object/sign/')) throw new Error('invalid asset url');
    return url + '/storage/v1' + signedURL;
  }
  type Reference = { id: string; card_number: string; display_name: string; source_language: string; art_rect: unknown; image_path: string };
  type Member = { reference_id: string; artwork_key: string; language: string };
  type Asset = { cache_key: string; generation_id: string };
  type Generation = { id: string; user_id: string; raw_path: string; source_reference_id: string; prompt_version: string; width: number; height: number; result_kind: string; created_at: string };
  function valid(g: Generation, kind: string) {
    if (!uuid.test(g.id) || !uuid.test(g.user_id) || g.raw_path !== g.user_id + '/' + g.id + '/provider.png') return false;
    return kind === TEXT
      ? g.prompt_version === TEXT && g.width === 1008 && g.height === 1408
      : g.prompt_version === kind && ((g.width === 1648 && g.height === 2048) ||
        ((kind === ART || g.result_kind === 'prepared') && g.width === 1008 && g.height === 1408));
  }
  try {
    const authUser = await request('/auth/v1/user', { headers });
    if (!authUser.ok) return reply({ error: '관리자 로그인이 필요합니다.' }, authUser.status >= 500 ? 503 : 401);
    const user = await authUser.json();
    if (!uuid.test(user.id) || user.is_anonymous) return reply({ error: '관리자 로그인이 필요합니다.' }, 401);
    const admin = await request('/rest/v1/rpc/is_funypin_admin', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
    });
    if (admin.status >= 500) throw new Error('administrator check unavailable');
    if (!admin.ok || await admin.json() !== true) return reply({ error: '퍼니핀 관리자만 접근할 수 있습니다.' }, 403);
    const body = await req.json().catch(() => null);
    if (body?.action !== 'catalog' && (body?.action !== 'card' || !ids.includes(body.id) || (body.imageId != null && (typeof body.imageId !== 'string' || !uuid.test(body.imageId))))) {
      return reply({ error: '카드 번호를 확인해 주세요.' }, 400);
    }
    const selected = body.action === 'card' ? [body.id] : ids;
    const [refs, anchors] = await Promise.all([
      rows<Reference>('overlay_art_references', { select: 'id,card_number,display_name,source_language,art_rect,image_path', id: inList(selected), order: 'id.asc' }),
      rows<Member>('overlay_artwork_members', { select: 'reference_id,artwork_key,language', reference_id: inList(selected), order: 'reference_id.asc' }),
    ]);
    if (refs.length !== selected.length || anchors.length !== selected.length) throw new Error('incomplete series');
    const groups = [...new Set(anchors.map(m => m.artwork_key))];
    const members = (await rows<Member>('overlay_artwork_members', {
      select: 'reference_id,artwork_key,language', artwork_key: inList(groups), order: 'reference_id.asc',
    })).filter(m => refId.test(m.reference_id) && /^[a-z]{2}$/.test(m.language));
    const memberMap = new Map(members.map(m => [m.reference_id, m]));
    for (const anchor of anchors) {
      const referenceId = printKoreanSources[anchor.reference_id];
      if (referenceId) memberMap.set(referenceId, {
        reference_id: referenceId, artwork_key: anchor.artwork_key, language: 'ko',
      });
    }
    const printMembers = [...memberMap.values()];
    const keys = [...new Set(printMembers.flatMap(m => [ART + ':' + m.artwork_key, TEXT + ':' + m.artwork_key + ':' + m.language]))];
    const [published, generations] = await Promise.all([
      Promise.all(chunks(keys).map(batch => rows<Asset>('overlay_layer_assets', {
        select: 'cache_key,generation_id', cache_key: inList(batch), order: 'cache_key.asc',
      }))).then(lists => lists.flat()),
      rows<Generation>('overlay_generations', {
        select: 'id,user_id,raw_path,source_reference_id,prompt_version,width,height,result_kind,created_at',
        source_reference_id: inList(printMembers.map(m => m.reference_id)),
        prompt_version: inList([ART, FACE_ART, TEXT]), order: 'created_at.desc,id.desc',
      }),
    ]);
    const byId = new Map(generations.map(g => [g.id, g]));
    const publishedIds = new Map(published.map(a => [a.cache_key, a.generation_id]));
    const anchorGroups = new Map(anchors.map(m => [m.reference_id, m.artwork_key]));
    const plans = refs.map(ref => {
      const group = anchorGroups.get(ref.id);
      const forGroup = printMembers.filter(m => m.artwork_key === group);
      function candidates(kind: string, language?: string) {
        const key = kind + ':' + group + (language ? ':' + language : '');
        const matching = generations.filter(g => {
          const m = memberMap.get(g.source_reference_id);
          return m?.artwork_key === group && (!language || m?.language === language) && valid(g, kind);
        });
        const primary = byId.get(publishedIds.get(key) || '');
        const ranked = matching.filter(g => g.id !== primary?.id);
        if (primary && matching.includes(primary)) ranked.unshift(primary);
        return ranked;
      }
      const standard = candidates(ART);
      const face = candidates(FACE_ART).filter(row => row.user_id === user.id);
      const defaults = standard.slice(0, 1).map(row => ({ row, kind: 'standard' }));
      const beta = face.map(row => ({ row, kind: 'face' }));
      // Old builds recorded the same prompt version for all full-text variants.
      const older = standard.slice(1).filter(row => row.user_id === user.id)
        .map(row => ({ row, kind: 'history' }));
      const illustrations = [...defaults, ...beta, ...older];
      const texts = Object.fromEntries([...new Set(forGroup.map(m => m.language))]
        .map(language => [language, candidates(TEXT, language)] as const).filter(([, list]) => list.length));
      return { ref, illustrations, texts };
    });
    const cardInfo = (p: typeof plans[number]) => ({
      id: p.ref.id, number: p.ref.card_number, name: p.ref.display_name, artRect: p.ref.art_rect,
      hasIllustration: p.illustrations.length > 0, languages: Object.keys(p.texts).sort(),
    });
    if (body.action === 'catalog') return reply({ adminId: user.id, cards: plans.map(cardInfo) });
    async function usable(generations: Generation[]) {
      for (const row of generations) {
        try { return { id: row.id, width: row.width, height: row.height, url: await sign('overlay-generated-images', row.raw_path) }; }
        catch { /* Try another verified record of the same artwork and layer. */ }
      }
      if (generations.length) throw new Error('saved layer unavailable');
      return null;
    }
    const plan = plans[0];
    const choice = body.imageId == null ? plan.illustrations[0] : plan.illustrations.find(item => item.row.id === body.imageId);
    if (body.imageId != null && !choice) return reply({ error: '이 카드에서 사용할 수 없는 일러스트입니다.' }, 404);
    const [original, illustration, texts] = await Promise.all([
      sign('overlay-art-references', plan.ref.image_path),
      usable(body.imageId == null ? plan.illustrations.map(item => item.row) : choice ? [choice.row] : []),
      Promise.all(Object.entries(plan.texts).map(async ([language, list]) => [language, await usable(list)])),
    ]);
    const imageOptions = plan.illustrations.map(({ row, kind }) => ({ id: row.id, kind, createdAt: row.created_at }));
    return reply({ card: { ...cardInfo(plan), original, illustration, imageOptions, texts: Object.fromEntries(texts) } });
  } catch (error) {
    console.error('pikachu print assets failed', error instanceof Error ? error.message : 'unknown');
    return reply({ error: '출력용 이미지를 불러오지 못했어요. 다시 시도해 주세요.' }, 503);
  }
});
