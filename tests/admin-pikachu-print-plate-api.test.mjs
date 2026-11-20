import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const URL_ROOT = 'https://admin.test';
const GUEST = 'test-membership', ADMIN = 'test-administrator', SERVER = 'test-service-role';
const BACKEND = process.env.PIKACHU_PRINT_EDGE_PATH ||
  new URL('../supabase/functions/pikachu-print-assets/index.ts', import.meta.url);
const REF = '30th-en-023', ID = 'print-plate-2mm:' + REF;
const adminUid = '12345678-1234-1234-1234-123456789012';
const expected = Object.freeze({
  reference_id: REF, width_px: 1088, height_px: 1488,
  trim_width_mm: 64, trim_height_mm: 89, bleed_mm: 2,
  window_rect_mm:{x:6.4,y:10.2,w:51.2,h:31.2}, artwork_window_knockout:false,
  source_crop_xywh_px:[320,80,1008,1408], native_offset_xy_px:[40,40],
  source_jpeg_base64:'/9j/aQ==', bleed_ring_webp_base64:'UklGRg==',
});

test('archive payload requires administrator and exact option/card pairing', async () => {
  let handler, hits = [], row = expected;
  const orig = globalThis.fetch;
  globalThis.Deno = {
    env: { get: key => ({SUPABASE_URL:URL_ROOT,SUPABASE_ANON_KEY:'mock-publishable',SUPABASE_SERVICE_ROLE_KEY:SERVER})[key] },
    serve: cb => {handler=cb;},
  };
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const token = new Headers(init.headers).get('authorization');
    hits.push({path, token});
    if (path === '/auth/v1/user') {
      return Response.json({id:adminUid,is_anonymous:false});
    }
    if (path === '/rest/v1/rpc/is_funypin_admin') return Response.json(token === 'Bearer ' + ADMIN);
    if (path === '/rest/v1/rpc/admin_pikachu_print_plate_image') {
      assert.equal(token, 'Bearer ' + SERVER);
      assert.deepEqual(JSON.parse(init.body), {p_reference_id:REF});
      return Response.json(row ? [row] : []);
    }
    assert.fail('Unexpected access to ' + path);
  };
  try {
    await import(BACKEND instanceof URL ? BACKEND.href : pathToFileURL(resolve(BACKEND)).href);
    const post = (token, body) => handler(new Request(URL_ROOT+'/functions/v1/pikachu-print-assets', {
      method:'POST', headers: token ? {authorization:'Bearer '+token} : {}, body:JSON.stringify(body),
    }));
    const request = {action:'card',id:REF,print_plate_id:ID};
    assert.equal((await post(null,request)).status,401);
    assert.equal(hits.length,0);
    assert.equal((await post(GUEST,request)).status,403);
    assert.equal(hits.some(o => o.token === 'Bearer ' + SERVER),false);
    hits=[];
    assert.equal((await post(ADMIN,{...request,print_plate_id:'print-plate-2mm:30th-en-024'})).status,400);
    assert.equal((await post(ADMIN,{...request,imageId:'00000000-0000-0000-0000-000000000000'})).status,400);
    assert.equal(hits.some(o => o.token === 'Bearer ' + SERVER),false);
    const res=await post(ADMIN,request);
    assert.equal(res.status,200);
    assert.match(res.headers.get('cache-control'), /no-store/);
    const payload=await res.json();
    assert.deepEqual(Object.keys(payload),['plate']);
    assert.equal(payload.plate.id,ID);
    assert.equal(payload.plate.bleedMm,2);
    assert.equal(payload.plate.trimWidthMm,64);
    assert.equal(payload.plate.trimHeightMm,89);
    assert.equal(payload.plate.nativeJpeg,'data:image/jpeg;base64,'+expected.source_jpeg_base64);
    assert.equal(payload.plate.bleedRingWebp,'data:image/webp;base64,'+expected.bleed_ring_webp_base64);
    assert.ok(Math.abs(payload.plate.cutRect.x-5.9)<1e-8);
    assert.ok(Math.abs(payload.plate.cutRect.y-9.7)<1e-8);
    row=null;
    assert.equal((await post(ADMIN,request)).status,404);
  } finally {
    delete globalThis.Deno;
    globalThis.fetch=orig;
  }
});
