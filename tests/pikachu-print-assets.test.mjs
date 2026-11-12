import assert from 'node:assert/strict';
import test from 'node:test';

const artworkVersion = 'card-fullart-text-layers-v1';
const faceVersion = 'card-fullart-text-layers-face-v1';
const textVersion = 'card-text-only-v2';
const card = 'm6a-ja-017';
const other = 'm6a-ko-017';
const english = '30th-en-023';
const user = 'd6800641-c49d-4038-8505-01631e9b930c';
const originalFetch = globalThis.fetch;
let handler;
globalThis.Deno = {
  serve(fn) { handler = fn; },
  env: { get: name => ({ SUPABASE_URL: 'https://project.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[name] },
};
await import('../supabase/functions/pikachu-print-assets/index.ts');
const req = (body, auth = true) => new Request('https://project.test/functions/v1/pikachu-print-assets', {
  method: 'POST', headers: auth ? { Authorization: 'Bearer test-user' } : {}, body: JSON.stringify(body),
});
const generation = (n, id, version, width, height) => {
  const guid = String(n).padStart(8, '0') + '-28e6-4d32-8119-2423c6c8c453';
  return { id: guid, user_id: user, source_reference_id: id, prompt_version: version, width, height, raw_path: user + '/' + guid + '/provider.png' };
};
const refs = Array.from({ length: 30 }, (_, i) => {
  const num = String(i + 17).padStart(3, '0');
  return { id: 'm6a-ja-' + num, card_number: num, display_name: 'ピカチュウ', image_path: num + '.png' };
});
const members = refs.map(({ id }) => ({ reference_id: id, artwork_key: id, language: 'ja' }))
  .concat({ reference_id: other, artwork_key: card, language: 'ko' }, { reference_id: english, artwork_key: card, language: 'en' });
const wide = generation(1, card, artworkVersion, 1648, 2048);
const legacy = generation(2, other, artworkVersion, 1008, 1408);
const jpText = generation(3, card, textVersion, 1008, 1408);
const koText = generation(4, other, textVersion, 1008, 1408);
const wrongEnglish = generation(5, english, textVersion, 500, 600);
const ownBeta = { ...generation(6, other, faceVersion, 1008, 1408), result_kind: 'prepared' };
const another = '37beed53-e18a-4d94-b328-bcf1650e8b21';
const privateBeta = { ...generation(7, card, faceVersion, 1648, 2048), user_id: another };
privateBeta.raw_path = another + '/' + privateBeta.id + '/provider.png';
const korean036 = 'm6a-ko-01M1FTK1GHT66NBH2QA18FJJ8Z';
const newArt = generation(8, korean036, artworkVersion, 1008, 1408);
const newText = generation(9, korean036, textVersion, 1008, 1408);
function mock(admin = true) {
  const calls = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    calls.push(url.pathname);
    if (url.pathname === '/auth/v1/user') {
      assert.equal(options.headers.Authorization, 'Bearer test-user');
      return Response.json({ id: user });
    }
    if (url.pathname === '/rest/v1/rpc/is_funypin_admin') {
      assert.equal(options.headers.Authorization, 'Bearer test-user');
      return Response.json(admin);
    }
    assert.equal(options.headers.Authorization, 'Bearer service');
    if (url.pathname.includes('/overlay_art_references')) {
      return Response.json(refs.filter(r => url.searchParams.get('id').includes(r.id)));
    }
    if (url.pathname.includes('/overlay_artwork_members')) {
      const param = url.searchParams.get('reference_id');
      return Response.json(param ? members.filter(m => param.includes(m.reference_id)) : members.filter(m => url.searchParams.get('artwork_key').includes(m.artwork_key)));
    }
    if (url.pathname.includes('/overlay_layer_assets')) {
      return Response.json(url.searchParams.get('cache_key').includes(artworkVersion + ':' + card)
        ? [{ cache_key: artworkVersion + ':' + card, generation_id: legacy.id }] : []);
    }
    if (url.pathname.includes('/overlay_generations')) {
      const sources = url.searchParams.get('source_reference_id');
      return Response.json([wide, legacy, jpText, koText, wrongEnglish, ownBeta, privateBeta, newArt, newText]
        .filter(row => sources.includes(row.source_reference_id)));
    }
    if (url.pathname.includes('/object/sign/')) {
      return Response.json({ signedURL: url.pathname.replace('/storage/v1', '') + '?token=test' });
    }
    throw new Error(url.pathname);
  };
  return calls;
}
test.after(() => { globalThis.fetch = originalFetch; });
test('only a verified admin can read the series or receive signed URLs', async () => {
  const calls = mock(false);
  assert.equal((await handler(req({ action: 'catalog' }, false))).status, 401);
  assert.equal((await handler(req({ action: 'card', id: card }))).status, 403);
  assert.deepEqual(calls, ['/auth/v1/user', '/rest/v1/rpc/is_funypin_admin']);
});
test('catalog orders exactly 30 cards and includes only acquired valid language layers', async () => {
  const calls = mock();
  const response = await handler(req({ action: 'catalog' }));
  assert.equal(response.status, 200);
  const { cards } = await response.json();
  assert.equal(cards.length, 30);
  assert.equal(cards[0].number, '017');
  assert.equal(cards[29].number, '046');
  assert.deepEqual(cards[0].languages, ['ja', 'ko']);
  assert.equal(cards[0].hasIllustration, true);
  assert.equal(cards[1].hasIllustration, false);
  assert.ok(!calls.some(p => p.includes('/object/sign')));
});
test('per-card response signs only that artwork and prefers its published legacy image', async () => {
  const calls = mock();
  assert.equal((await handler(req({ action: 'card', id: 'm6a-ja-016' }))).status, 400);
  const response = await handler(req({ action: 'card', id: card }));
  assert.equal(response.status, 200);
  const payload = (await response.json()).card;
  assert.equal(payload.illustration.id, legacy.id);
  assert.equal(payload.illustration.width, 1008);
  assert.deepEqual(Object.keys(payload.texts).sort(), ['ja', 'ko']);
  assert.equal(calls.filter(p => p.includes('/object/sign')).length, 4);
});

test('own beta artwork remains selectable after the card-size prepared image is saved', async () => {
  const calls = mock();
  const response = await handler(req({ action: 'card', id: card, imageId: ownBeta.id }));
  assert.equal(response.status, 200);
  const payload = (await response.json()).card;
  assert.equal(payload.illustration.id, ownBeta.id);
  assert.deepEqual(payload.imageOptions.map(({ id, kind }) => [id, kind]), [
    [legacy.id, 'standard'], [ownBeta.id, 'face'], [wide.id, 'history'],
  ]);
  assert.ok(calls.some(path => path.endsWith('/' + ownBeta.id + '/provider.png')));
  assert.equal((await handler(req({ action: 'card', id: card, imageId: privateBeta.id }))).status, 404);
});

test('a print-only Korean source supplies the matching Japanese card and its Korean text', async () => {
  const calls = mock();
  const response = await handler(req({ action: 'card', id: 'm6a-ja-036' }));
  assert.equal(response.status, 200);
  const payload = (await response.json()).card;
  assert.equal(payload.illustration.id, newArt.id);
  assert.equal(payload.texts.ko.id, newText.id);
  assert.deepEqual(payload.languages, ['ko']);
  assert.ok(calls.includes('/storage/v1/object/sign/overlay-art-references/036.png'));
  const other = await handler(req({ action: 'card', id: 'm6a-ja-035', imageId: newArt.id }));
  assert.equal(other.status, 404);
});
