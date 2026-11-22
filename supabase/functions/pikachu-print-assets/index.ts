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
const printImageOverrides = new Map([
]);
// Browsers that saved the former 037 default should reload the current shared asset.
const former021Defaults = new Set(['5a844365-f291-4960-88ba-61df7de3dda0', '62cc0999-af15-4949-8b6d-0fea08f088d2']);
const former037Defaults = new Set(['e316d975-d8ae-415c-ab7c-480d8091571b', 'df5c3e8b-ec06-4da0-8cbc-57f00d957d93']);
const uuid = /^[0-9a-f-]{36}$/i;
const refId = /^[a-z0-9-]{1,80}$/i;
const plateReference = /^30th-en-0(2[3-9]|[34][0-9]|5[0-4])$/;
const printPlateId = (referenceId: string) => 'print-plate-2mm:' + referenceId;
const isJAAlternative = (id: unknown) => id === 'm6a-ja-032' || id === 'm6a-ja-033';
const jaAlternativeId = (id: string) => 'ja-wide-print:' + id;
const jaAlternativeOption = (id: string) => {
  const is16 = id === 'm6a-ja-032';
  return {
    id:jaAlternativeId(id), referenceId:id, kind:'jaWide',
    label:is16 ? '16번 · JA 확장 일러스트 · 흰 창 · 2mm' : '17번 · JA 확장 일러스트 · 2mm',
    width:1536,height:2136,trimWidthMm:64,trimHeightMm:89,bleedMm:2,
    embeddedWatermark:is16,windowKnockout:is16,
    cutRect:{x:5.9,y:9.7,w:51.2,h:31.2},
  };
};
type PlateMetadata = {
  reference_id: string; width_px: number; height_px: number;
  trim_width_mm: number; trim_height_mm: number; bleed_mm: number;
  window_rect_mm: {x: number; y: number; w: number; h: number} | null;
  artwork_window_knockout: boolean;
};
type PlateImage = PlateMetadata & {
  source_crop_xywh_px: number[];
  native_offset_xy_px: number[];
  source_jpeg_base64: string;
  bleed_ring_webp_base64: string;
};
function plateOption(row: PlateMetadata, referenceId: string) {
  const window = row.window_rect_mm;
  if (row.reference_id !== referenceId || row.width_px !== 1088 || row.height_px !== 1488 ||
      row.trim_width_mm !== 64 || row.trim_height_mm !== 89 || row.bleed_mm !== 2 ||
      typeof row.artwork_window_knockout !== 'boolean' ||
      !window || typeof window !== 'object' || Array.isArray(window) ||
      ![window.x,window.y,window.w,window.h].every(Number.isFinite) ||
      window.x < .5 || window.y < .5 || window.w <= 0 || window.h <= 0 ||
      window.x + window.w > 63.5 || window.y + window.h > 88.5) {
    throw new Error('invalid print plate geometry');
  }
  // Archive coordinates are trim-relative; print tools use the 63×88 mm
  // native image origin, inset 0.5 mm from the trim on each edge.
  const cutRect = { x: window.x-.5, y: window.y-.5, w: window.w, h: window.h };
  return {
    id: printPlateId(referenceId), kind: 'plate2mm', label: '2mm 블리드 · EN ' + referenceId.slice(-3),
    width: row.width_px, height: row.height_px, trimWidthMm: row.trim_width_mm,
    trimHeightMm: row.trim_height_mm, bleedMm: row.bleed_mm,
    windowKnockout: row.artwork_window_knockout, cutRect,
  };
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'private, no-store',
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
  async function readPlate<T>(mode: 'metadata' | 'image', referenceId: string): Promise<T | null> {
    const response = await request('/rest/v1/rpc/admin_pikachu_print_plate_' + mode, {
      method: 'POST', headers: { ...serverHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_reference_id: referenceId }),
    });
    if (!response.ok) throw new Error('print plate lookup failed');
    const result = await response.json() as T[];
    if (!Array.isArray(result) || result.length > 1 ||
        (result.length === 1 && (!result[0] || typeof result[0] !== 'object' || Array.isArray(result[0])))) {
      throw new Error('invalid print plate lookup');
    }
    return result[0] ?? null;
  }
  async function readJAAlternative(id: string, wantImage: boolean) {
    const response=await request('/rest/v1/rpc/admin_pikachu_ja_wide_v1',{
      method:'POST', headers:{...serverHeaders,'Content-Type':'application/json'},
      body:JSON.stringify({p_reference_id:id,p_image:wantImage}),
    });
    if(!response.ok)throw new Error('JA print lookup failed');
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length>1||rows.some(row=>!row||row.reference_id!==id))throw new Error('invalid JA print lookup');
    return rows[0]??null;
  }
  type Reference = { id: string; card_number: string; display_name: string; source_language: string; art_rect: unknown; image_path: string };
  type Member = { reference_id: string; artwork_key: string; language: string };
  type Asset = { cache_key: string; generation_id: string };
  type PrintImport = { id: string; reference_id: string; label: string; created_at: string };
  type Generation = { id: string; user_id: string; raw_path: string; image_path: string; source_reference_id: string; prompt_version: string; width: number; height: number; result_kind: string; created_at: string; model: string; request_id: string | null };
  function preparedPrintPath(row: Generation) {
    const path = row.user_id + '/' + row.id + '/prepared.png';
    return row.result_kind === 'prepared' && row.width === 1008 && row.height === 1408 && row.image_path === path
      ? path : null;
  }
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
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        (body.action !== 'catalog' && (body.action !== 'card' || typeof body.id !== 'string' ||
         !refId.test(body.id) || (body.imageId != null && (typeof body.imageId !== 'string' || !uuid.test(body.imageId)))))) {
      return reply({ error: '카드 번호를 확인해 주세요.' }, 400);
    }
    if (typeof body.print_plate_id === 'string' && body.print_plate_id.startsWith('ja-wide-print:')) {
      if (body.ja_alternative_v1 !== true || body.action !== 'card' || body.imageId != null ||
          !isJAAlternative(body.id) || body.print_plate_id !== jaAlternativeId(body.id)) {
        return reply({ error:'이 카드의 확장 일러스트를 확인해 주세요.' },400);
      }
      const row=await readJAAlternative(body.id,true);
      if(!row)return reply({error:'이 카드에 저장된 확장 일러스트가 없어요.'},404);
      if(typeof row.image_webp_base64!=='string'||!row.image_webp_base64.startsWith('UklGR'))throw new Error('invalid JA artwork');
      return reply({plate:{...jaAlternativeOption(body.id),wideWebp:'data:image/webp;base64,'+row.image_webp_base64}});
    }
    if (body.print_plate_id != null) {
      if (body.action !== 'card' || body.imageId != null || !plateReference.test(body.id) || body.print_plate_id !== printPlateId(body.id)) {
        return reply({ error: '이 카드에서 사용할 수 없는 2mm 출력 도안입니다.' }, 400);
      }
      const row = await readPlate<PlateImage>('image', body.id);
      if (!row) return reply({ error: '저장된 2mm 출력 도안이 없어요.' }, 404);
      const option = plateOption(row, body.id);
      const crop = row.source_crop_xywh_px;
      const offset = row.native_offset_xy_px;
      if (!Array.isArray(crop) || crop.length !== 4 || crop[2] !== 1008 || crop[3] !== 1408 ||
          !((crop[0] === 0 && crop[1] === 0) || (crop[0] === 320 && crop[1] === 80)) ||
          !Array.isArray(offset) || offset.length !== 2 || offset[0] !== 40 || offset[1] !== 40 ||
          !row.source_jpeg_base64?.startsWith('/9j/') || !row.bleed_ring_webp_base64?.startsWith('UklGR')) {
        throw new Error('invalid print plate assets');
      }
      return reply({ plate: {
        ...option, referenceId: row.reference_id, cropXYWH: crop, nativeOffsetXY: offset,
        nativeJpeg: 'data:image/jpeg;base64,' + row.source_jpeg_base64,
        bleedRingWebp: 'data:image/webp;base64,' + row.bleed_ring_webp_base64,
      } });
    }
    const [inventory, printImports, plate] = await Promise.all([
      rows<Asset>('overlay_layer_assets', {
        select: 'cache_key,generation_id', prompt_version: inList([ART, TEXT]), order: 'cache_key.asc',
      }),
      rows<PrintImport>('overlay_admin_print_imports', {
        select: 'id,reference_id,label,created_at', active: 'eq.true', order: 'created_at.desc,id.asc',
        ...(body.action === 'card' ? { reference_id: 'eq.' + body.id } : {}),
      }),
      body.action === 'card' && plateReference.test(body.id)
        ? readPlate<PlateMetadata>('metadata', body.id).then(row => row ? plateOption(row, body.id) : null)
          // A plate lookup must not block the pre-existing 5 mm workflow.
          .catch(() => { console.warn('print plate metadata unavailable'); return null; })
        : null,
    ]);
    const sharedIds = [...new Set(inventory.map(asset => asset.cache_key.split(':')[1]).filter(id => refId.test(id || '')))].sort();
    const privateId = /^dogam-ko-[0-9A-HJKMNP-TV-Z]{26}$/;
    const privateCards = body.action === 'catalog' || privateId.test(body.id)
      ? await rows<Reference & { set_code: string }>('overlay_admin_card_references', {
          select: 'id,card_number,display_name,source_language,image_path,set_code',
          display_name: 'in.(이브이,"이브이 ex","이브이 GX","이브이 V","이브이&잠만보 GX","찬란한 이브이",메타몽)',
          ...(body.action === 'card' ? { id: 'eq.' + body.id } : {}),
          order: 'display_name.asc,set_code.asc,card_number.asc,id.asc',
        })
      : [];
    const privateInfo = (ref: typeof privateCards[number]) => ({
      id: ref.id, number: ref.card_number, name: ref.display_name + ' (' + ref.set_code + ')',
      sourceLanguage: ref.source_language, artRect: null, hasIllustration: false, languages: [],
    });
    if (body.action === 'card' && privateId.test(body.id)) {
      const ref = privateCards[0];
      if (!ref) return reply({ error: '카드 번호를 확인해 주세요.' }, 400);
      if (body.imageId != null) return reply({ error: '이 카드에서 사용할 수 없는 일러스트입니다.' }, 404);
      const original = await sign('overlay-admin-card-references', ref.image_path);
      return reply({ card: { ...privateInfo(ref), original, illustration: null, imageOptions: [], texts: {} } });
    }
    // Keep all collected 30th-series Ditto editions selectable before artwork is generated.
    const dittoReferences = ['m6a-ja-093', 'm6a-ko-01M2FH6D0Y1QM3ECGDT937VSJE',
      '30th-en-115', 'm6a-ko-01M2FSF4ZD32P00YGBCVWCP1GK'];
    const selectable = [...new Set([...ids, ...sharedIds, ...dittoReferences, ...printImports.map(row => row.reference_id), ...(plate ? [body.id] : [])])];
    if (body.action === 'card' && !selectable.includes(body.id)) return reply({ error: '카드 번호를 확인해 주세요.' }, 400);
    const selected = body.action === 'card' ? [body.id] : selectable;
    const [referenceRows, anchors] = await Promise.all([
      rows<Reference>('overlay_art_references', { select: 'id,card_number,display_name,source_language,art_rect,image_path', id: inList(selected), order: 'id.asc' }),
      rows<Member>('overlay_artwork_members', { select: 'reference_id,artwork_key,language', reference_id: inList(selected), order: 'reference_id.asc' }),
    ]);
    const references = new Map(referenceRows.map(ref => [ref.id, ref]));
    const refs = selected.flatMap(id => references.get(id) ? [references.get(id)!] : []);
    if (refs.length !== selected.length || anchors.length !== selected.length) throw new Error('incomplete series');
    const groups = [...new Set(anchors.map(m => m.artwork_key))];
    const members = (await rows<Member>('overlay_artwork_members', {
      select: 'reference_id,artwork_key,language', artwork_key: inList(groups), order: 'reference_id.asc',
    })).filter(m => refId.test(m.reference_id) && /^[a-z]{2}$/.test(m.language));
    const memberMap = new Map(members.map(m => [m.reference_id, m]));
    const printMembers = [...memberMap.values()];
    const referenceIds = [...new Set([...printMembers.map(m => m.reference_id), ...selected.flatMap(id => printKoreanSources[id] ? [printKoreanSources[id]] : [])])];
    const generations = (await Promise.all(chunks(referenceIds).map(batch =>
      rows<Generation>('overlay_generations', {
        select: 'id,user_id,raw_path,image_path,source_reference_id,prompt_version,width,height,result_kind,created_at,model,request_id',
        source_reference_id: inList(batch), prompt_version: inList([ART, FACE_ART, TEXT]), order: 'created_at.desc,id.desc',
      })
    ))).flat().sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    const published = inventory;
    const byId = new Map(generations.map(g => [g.id, g]));
    const publishedIds = new Map(published.map(a => [a.cache_key, a.generation_id]));
    const anchorGroups = new Map(anchors.map(m => [m.reference_id, m.artwork_key]));
    const plans = refs.map(ref => {
      const group = anchorGroups.get(ref.id);
      const alias = printKoreanSources[ref.id];
      const forGroup = printMembers.filter(m => m.artwork_key === group);
      const languages = new Set(forGroup.map(m => m.language));
      if (alias) languages.add('ko');
      function candidates(kind: string, language?: string) {
        const key = kind + ':' + group + (language ? ':' + language : '');
        const matching = generations.filter(g => {
          const m = memberMap.get(g.source_reference_id);
          return ((m?.artwork_key === group && (!language || m.language === language)) ||
            (g.source_reference_id === alias && (!language || language === 'ko'))) && valid(g, kind);
        });
        const aliasKey = alias && (!language || language === 'ko') ? kind + ':' + alias + (language ? ':ko' : '') : '';
        const primary = byId.get(publishedIds.get(key) || publishedIds.get(aliasKey) || '');
        const ranked = matching.filter(g => g.id !== primary?.id);
        if (primary && matching.includes(primary)) ranked.unshift(primary);
        return ranked;
      }
      const standard = candidates(ART);
      const overrideId = printImageOverrides.get(ref.id);
      const overrideIndex = standard.findIndex(row => row.id === overrideId && preparedPrintPath(row) !== null);
      if (overrideIndex > 0) standard.unshift(...standard.splice(overrideIndex, 1));
      const face = candidates(FACE_ART).filter(row => row.user_id === user.id);
      const defaults = standard.slice(0, 1).map(row => ({ row, kind: 'standard' }));
      const beta = face.map(row => ({ row, kind: 'face' }));
      // Old builds recorded the same prompt version for all full-text variants.
      const older = standard.slice(1).filter(row => row.user_id === user.id &&
        (ref.id !== 'm6a-ja-037' || !former037Defaults.has(row.id)) &&
        (ref.id !== 'm6a-ja-021' || !former021Defaults.has(row.id)))
        .map(row => ({ row, kind: 'history' }));
      const illustrations = [...defaults, ...beta, ...older];
      const texts = Object.fromEntries([...languages]
        .map(language => [language, candidates(TEXT, language)] as const).filter(([, list]) => list.length));
      const imports = printImports.filter(row => row.reference_id === ref.id);
      return { ref, illustrations, texts, imports };
    });
    const cardInfo = (p: typeof plans[number]) => ({
      id: p.ref.id, number: p.ref.card_number, name: p.ref.display_name, sourceLanguage: p.ref.source_language, artRect: p.ref.art_rect,
      hasIllustration: p.illustrations.length > 0 || p.imports.length > 0 || !!plate,
      hasPrintImport: p.imports.length > 0, languages: Object.keys(p.texts).sort(),
    });
    if (body.action === 'catalog') return reply({ adminId: user.id, cards: [...plans.map(cardInfo), ...privateCards.map(privateInfo)] });
    async function usable(generations: Generation[], overrideId?: string) {
      for (const row of generations) {
        const path = row.id === overrideId ? preparedPrintPath(row) : row.raw_path;
        if (!path) continue;
        try { return { id: row.id, width: row.width, height: row.height, hasGeneratedOverscan: path===row.raw_path && [ART, FACE_ART].includes(row.prompt_version) && /^gpt-image(?:-|$)/.test(row.model||'') && !!row.request_id, url: await sign('overlay-generated-images', path) }; }
        catch { /* Try another verified record of the same artwork and layer. */ }
      }
      if (generations.length) throw new Error('saved layer unavailable');
      return null;
    }
    const plan = plans[0];
    const requestedImageId = ((plan.ref.id === 'm6a-ja-037' && former037Defaults.has(body.imageId)) ||
      (plan.ref.id === 'm6a-ja-021' && former021Defaults.has(body.imageId)))
      ? undefined : body.imageId;
    const choice = requestedImageId == null ? plan.illustrations[0] : plan.illustrations.find(item => item.row.id === requestedImageId);
    const imported = plan.imports.find(item => item.id === requestedImageId);
    if (requestedImageId != null && !choice && !imported) return reply({ error: '이 카드에서 사용할 수 없는 일러스트입니다.' }, 404);
    async function importedArtwork(id: string) {
      // Only the already-authorized selection is eligible; the old UUID/label and
      // cut geometry remain authoritative. Cached clients keep receiving old JPEG.
      if (body.wide_import_v1 === true && plan.ref.id === '30th-en-039') {
        const response = await request('/rest/v1/rpc/admin_pikachu_wide_import_v1', {
          method:'POST', headers:{...serverHeaders,'Content-Type':'application/json'},
          body:JSON.stringify({p_import_id:id,p_reference_id:plan.ref.id}),
        });
        if (!response.ok) throw new Error('wide import lookup failed');
        const wide = await response.json();
        if (!Array.isArray(wide) || wide.length > 1) throw new Error('invalid wide import lookup');
        if (wide.length) {
          const asset = wide[0];
          if (!asset || typeof asset !== 'object' || Array.isArray(asset) ||
              typeof asset.image_webp_base64 !== 'string' || !asset.image_webp_base64.startsWith('UklGR') ||
              typeof asset.filled_window !== 'boolean') throw new Error('invalid wide import payload');
          const [legacy] = await rows<{cut_rect:unknown}>('overlay_admin_print_imports', {
            select:'cut_rect', id:'eq.'+id, reference_id:'eq.'+plan.ref.id, active:'eq.true',
          });
          if (!legacy?.cut_rect) throw new Error('legacy import cut geometry missing');
          return {id,width:1536,height:2136,cutRect:legacy.cut_rect,url:'data:image/webp;base64,'+asset.image_webp_base64,
            wideImport:true,filledWindow:asset.filled_window};
        }
      }
      const [row] = await rows<{ image_base64: string; cut_rect: unknown }>('overlay_admin_print_imports', {
        select: 'image_base64,cut_rect', id: 'eq.' + id, reference_id: 'eq.' + plan.ref.id, active: 'eq.true',
      });
      if (!row?.image_base64) throw new Error('imported artwork unavailable');
      return { id, width: 1008, height: 1408, cutRect: row.cut_rect, url: 'data:image/jpeg;base64,' + row.image_base64 };
    }
    const [original, illustration, texts] = await Promise.all([
      sign('overlay-art-references', plan.ref.image_path),
      imported ? importedArtwork(imported.id) : usable(requestedImageId == null ? plan.illustrations.map(item => item.row) : choice ? [choice.row] : [], printImageOverrides.get(plan.ref.id)),
      Promise.all(Object.entries(plan.texts).map(async ([language, list]) => [language, await usable(list)])),
    ]);
    let jaOption=null;
    if(body.ja_alternative_v1===true && isJAAlternative(plan.ref.id)) {
      // Compatible stale clients and unrelated options remain available even
      // when the optional private metadata look-up is unavailable.
      try { if(await readJAAlternative(plan.ref.id,false))jaOption=jaAlternativeOption(plan.ref.id); }
      catch { console.warn('JA print option metadata unavailable'); }
    }
    const imageOptions = [
      ...plan.illustrations.map(({ row, kind }) => ({ id: row.id, kind, createdAt: row.created_at })),
      ...plan.imports.map(({ id, label, created_at }) => ({ id, label, kind: 'import', createdAt: created_at })),
      ...(plate ? [plate] : []),
      ...(jaOption ? [jaOption] : []),
    ];
    return reply({ card: { ...cardInfo(plan), original, illustration, imageOptions, texts: Object.fromEntries(texts) } });
  } catch (error) {
    console.error('pikachu print assets failed', error instanceof Error ? error.message : 'unknown');
    return reply({ error: '출력용 이미지를 불러오지 못했어요. 다시 시도해 주세요.' }, 503);
  }
});
