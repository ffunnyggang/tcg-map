import { reviewMobileAlignment } from './card-art-align.mjs?v=20261111-pdf1';
import { prepareMobileLayerSource } from './card-art-layer-flow.mjs?v=20261108-layercache1';
import { textTransparency } from './card-overlay-header.mjs?v=20261108-fulltext1';
import { coversCard, IDENTITY_WIDE, renderManual } from './card-overlay-manual.mjs?v=20261108-cardfit1';
import { composeLayers } from './card-overlay-layers.mjs?v=20261110-center1';
import { alignWide, WIDE } from './card-overlay-wide.mjs?v=20261107-wide3';
import { findAnniversarySymbolCenter, PIKACHU_ANNIVERSARY_PLACEMENT } from './card-overlay-symbol.mjs?v=20261110-center1';
import { defaultArtWindow, windowPresetType } from './card-art-window-presets.mjs?v=20261108-presets1';
import { drawCardOverlay, drawCutGuide } from './card-art-geometry.mjs?v=20261107-flow3';
import { cardFilename, LANGUAGES, validWindow } from './card-art-core.mjs?v=20261108-search1';
import { drawArtWatermark, makePrintSheet, withCardBleed } from './card-overlay-print.mjs?v=20261111-cutout2';
import { makePDF } from './card-overlay-core.mjs?v=20261023-ux3';

const $ = id => document.getElementById(id);
const auth = window.FUNY_WEB_AUTH;
const assetPromises = new Map();
const labels = { ko: '한국어', ja: '일본어', en: '영어' };
const corners = ['round', 'square'];
const symbols = ['off', 'center'];
const controls = { language: 'printText', symbol: 'printSymbol', border: 'printBorder', shape: 'printCorner' };
const borders = Array.from($('printBorder').options, option => option.value);
let catalog = [], presets = [], selection = 0, session = null, busy = false, revision = 0, saved = {};
let storageKey = '', authMode = 'web', adminRefresh = null;

function setStatus(message) { $('printStatus').textContent = message; }
function canvas(width, height) {
  return Object.assign(document.createElement('canvas'), { width, height });
}
async function image(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  return img;
}
function sessionValue(key) {
  try { return sessionStorage.getItem(key) || ''; } catch { return ''; }
}
async function refreshAdmin() {
  const refreshToken = sessionValue('funypin_admin_refresh');
  if (!refreshToken) throw Object.assign(new Error('관리자 세션이 만료되었습니다.'), { status: 401 });
  if (!adminRefresh) {
    adminRefresh = auth.client.auth.refreshSession({ refresh_token: refreshToken }).then(({ data, error }) => {
      if (error || !data.session) throw Object.assign(new Error('관리자 세션이 만료되었습니다.'), { status: 401 });
      sessionStorage.setItem('funypin_admin_token', data.session.access_token);
      sessionStorage.setItem('funypin_admin_refresh', data.session.refresh_token);
      return data.session.access_token;
    }).finally(() => { adminRefresh = null; });
  }
  return adminRefresh;
}
async function api(path, { body, retry = true } = {}) {
  const token = authMode === 'admin' ? sessionValue('funypin_admin_token') : (await auth.getSession())?.access_token;
  if (!token) throw Object.assign(new Error('관리자 로그인이 필요합니다.'), { status: 401 });
  const response = await fetch(auth.client.supabaseUrl + path, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: auth.client.supabaseKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401 && retry && authMode === 'admin') {
    await refreshAdmin();
    return api(path, { body, retry: false });
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(result?.error || '요청을 완료하지 못했어요.'), { status: response.status });
  return result;
}
const invoke = (action, id) => api('/functions/v1/pikachu-print-assets', { body: { action, id } });
function deny(message) {
  revision++;
  session = null;
  catalog = [];
  assetPromises.clear();
  $('printCanvas').getContext('2d').clearRect(0, 0, 504, 704);
  $('printWorkspace').hidden = true;
  $('printLogin').hidden = false;
  $('printReload').hidden = true;
  setStatus(message);
}
function errorMessage(error) {
  if (error.status === 401 || error.status === 403) deny(error.message);
  else {
    setStatus(error.message || '잠시 후 다시 시도해 주세요.');
    $('printReload').hidden = false;
  }
}
function asset(id) {
  if (!assetPromises.has(id)) {
    assetPromises.set(id, api('/functions/v1/card-overlay-generate', { body: { action: 'symbol_asset', assetId: id } })
      .then(async ({ symbol }) => ({ image: await image(symbol.imageUrl), placement: symbol.placement }))
      .catch(error => { assetPromises.delete(id); throw error; }));
  }
  return assetPromises.get(id);
}
function paddedArtwork(img) {
  if (img.width === WIDE.width && img.height === WIDE.height) return img;
  if (img.width !== WIDE.cardWidth || img.height !== WIDE.cardHeight) throw new Error('저장된 일러스트 규격이 올바르지 않아요.');
  const { width, height, padX, padY, cardWidth, cardHeight } = WIDE;
  const out = canvas(width, height);
  const g = out.getContext('2d');
  // Keep older full-card artwork at its stored scale. Extend its edge pixels
  // into the alignment canvas so small moves never introduce a blank border.
  g.drawImage(img, 0, 0, 1, cardHeight, 0, padY, padX, cardHeight);
  g.drawImage(img, cardWidth - 1, 0, 1, cardHeight, padX + cardWidth, padY, padX, cardHeight);
  g.drawImage(img, 0, 0, cardWidth, 1, padX, 0, cardWidth, padY);
  g.drawImage(img, 0, cardHeight - 1, cardWidth, 1, padX, padY + cardHeight, cardWidth, height - padY - cardHeight);
  for (const dx of [0, 1]) for (const dy of [0, 1]) {
    g.drawImage(img, dx * (cardWidth - 1), dy * (cardHeight - 1), 1, 1,
      dx * (padX + cardWidth), dy * (padY + cardHeight), padX, dy ? height - padY - cardHeight : padY);
  }
  g.drawImage(img, padX, padY);
  return out;
}
function progress() {
  const done = catalog.filter(card => card.hasIllustration && saved[card.id]?.confirmed).length;
  const missing = catalog.filter(card => !card.hasIllustration).length;
  $('printProgress').textContent = `설정 확정 ${done}/30 · 일러스트 미확보 ${missing}장`;
  Array.from($('printCard').options).forEach((option, index) => {
    const card = catalog[index];
    const seq = String(index + 1).padStart(2, '0');
    const state = !card.hasIllustration ? ' · 일러스트 미확보' : saved[card.id]?.confirmed ? ' · 설정 확정' : '';
    option.textContent = `${seq} · 피카츄 ${card.number}${state}`;
  });
}
function refreshControls() {
  $('printPrevious').disabled = busy || selection === 0;
  $('printNext').disabled = busy || selection >= catalog.length - 1;
  $('printCard').disabled = busy;
  $('printCompare').disabled = busy || !session?.illustration;
  $('printAlign').disabled = busy || !session?.illustration;
  for (const id of Object.values(controls)) $(id).disabled = busy || !session?.illustration;
  $('printConfirm').disabled = busy || !session?.output || session.confirmed;
  $('printConfirm').textContent = session?.confirmed ? '설정 확정됨' : '설정 확정';
  $('printPDF').disabled = busy || !session?.output;
}
function save() {
  if (!session?.illustration) return;
  saved[session.card.id] = {
    ...session.settings, matrix: session.matrix, alignmentKey: session.alignmentKey,
    signature: JSON.stringify([session.alignmentKey, session.settings.language, session.card.texts[session.settings.language]?.id]),
    confirmed: session.confirmed,
  };
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { setStatus('이 브라우저에서 설정을 저장할 수 없어요.'); }
  progress();
}
function draw() {
  const view = $('printCanvas');
  const g = view.getContext('2d');
  g.clearRect(0, 0, view.width, view.height);
  if (!session) return;
  const { source, output, cut, original, settings } = session;
  drawCardOverlay(g, source, output || source, cut, view.width, view.height, !!output && !original, settings.shape);
  if (output && !original) {
    drawCutGuide(g, cut, view.width, view.height, .3);
    drawArtWatermark(g, 0, 0, view.width, view.height);
  }
  $('printCompare').textContent = original ? '도안 보기' : '원본 보기';
  $('printCompare').setAttribute('aria-pressed', String(original));
}
function textLayer(current, language) {
  if (!current.textLayers.has(language)) {
    const getImage = async () => {
      try { return await image(current.card.texts[language].url); }
      catch {
        const { card } = await invoke('card', current.card.id);
        const layer = card.texts[language];
        if (!layer || layer.id !== current.card.texts[language].id) throw new Error('텍스트 레이어가 변경됐어요. 카드를 다시 불러와 주세요.');
        current.card.texts[language] = layer;
        return image(layer.url);
      }
    };
    current.textLayers.set(language, getImage().then(img => {
      if (img.width !== 1008 || img.height !== 1408) throw new Error('저장된 텍스트 레이어의 크기가 올바르지 않아요.');
      const layer = canvas(img.width, img.height);
      const g = layer.getContext('2d');
      g.drawImage(img, 0, 0);
      if (!textTransparency(g.getImageData(0, 0, img.width, img.height).data, img.width, img.height).valid) {
        throw new Error('저장된 텍스트 레이어의 투명도를 확인해 주세요.');
      }
      return layer;
    }).catch(error => { current.textLayers.delete(language); throw error; }));
  }
  return current.textLayers.get(language);
}
async function compose() {
  const current = session;
  if (!current?.illustration) return;
  const { settings: { language, border, symbol, shape }, source, cut, illustration, matrix } = current;
  const [text, frame, stamp] = await Promise.all([
    language !== 'off' ? textLayer(current, language) : null,
    border !== 'off' ? asset(border) : null,
    symbol !== 'off' ? asset('anniversary-yellow-umbreon-v1') : null,
  ]);
  let placement = null;
  if (stamp) {
    if (current.symbolCenter === undefined) {
      try { current.symbolCenter = findAnniversarySymbolCenter(source, stamp, canvas, { centerOnly: true }); }
      catch { current.symbolCenter = null; }
    }
    placement = current.symbolCenter || PIKACHU_ANNIVERSARY_PLACEMENT;
  }
  if (current !== session) return;
  const merged = composeLayers(source, renderManual(illustration, matrix, canvas), cut, {
    kind: 'ai-text', text, showText: !!text, border: frame?.image, showBorder: !!frame,
    symbol: stamp?.image, showSymbol: !!stamp, symbolSide: symbol, placement, shape,
  }, canvas);
  current.output = merged;
  draw();
}
async function loadCard(index) {
  if (busy || !catalog[index]) return;
  const ticket = ++revision;
  selection = index;
  session = null;
  busy = true;
  $('printCard').value = String(index);
  $('printText').replaceChildren(new Option('OFF', 'off'));
  $('printWindow').textContent = '';
  refreshControls();
  draw();
  $('printReload').hidden = true;
  setStatus('카드와 저장된 레이어를 불러오고 있어요.');
  try {
    const { card } = await invoke('card', catalog[index].id);
    const name = { id: card.id, card_number: card.number, source_language: 'ja', display_name: card.name, art_rect: card.artRect };
    const preset = presets.find(p => p.kind === windowPresetType(name));
    const cut = validWindow(preset) ? { x: preset.x, y: preset.y, w: preset.w, h: preset.h } : defaultArtWindow(name);
    const [original, raw] = await Promise.all([image(card.original), card.illustration ? image(card.illustration.url) : null]);
    if (ticket !== revision) return;
    if (Math.abs(original.width / original.height - 63 / 88) > .025) throw new Error('원본 카드 비율을 확인해 주세요.');
    const source = prepareMobileLayerSource(original, canvas);
    const illustration = raw ? paddedArtwork(raw) : null;
    const alignmentKey = JSON.stringify([card.illustration?.id, cut]);
    const previous = saved[card.id] || {};
    const signature = JSON.stringify([alignmentKey, previous.language, card.texts[previous.language]?.id]);
    const languages = card.languages;
    for (const language of languages) $('printText').add(new Option(labels[language] || LANGUAGES[language] || language.toUpperCase(), language));
    const settings = {
      language: previous.language === 'off' || languages.includes(previous.language)
        ? previous.language : languages.find(code => code === 'ja') || languages[0] || 'off',
      symbol: symbols.includes(previous.symbol) ? previous.symbol : 'off',
      border: borders.includes(previous.border) ? previous.border : 'off',
      shape: corners.includes(previous.shape) ? previous.shape : 'round',
    };
    for (const [key, id] of Object.entries(controls)) $(id).value = settings[key];
    $('printWindow').textContent = `일러스트 창 ${cut.w.toFixed(1)} × ${cut.h.toFixed(1)} mm · 완성 64 × 89 mm`;
    session = {
      card, name, source, illustration, cut, settings, alignmentKey, textLayers: new Map(),
      original: false, initial: [...IDENTITY_WIDE], matrix: [...IDENTITY_WIDE],
      confirmed: previous.confirmed === true && previous.signature === signature && previous.language === settings.language,
    };
    if (!illustration) {
      draw();
      setStatus('저장된 확장 일러스트가 없어요. 확보 후 이 카드의 도안을 만들 수 있습니다.');
      return;
    }
    if (previous.alignmentKey === alignmentKey && Array.isArray(previous.matrix) && previous.matrix.length === 6 &&
        previous.matrix.every(Number.isFinite) && coversCard(previous.matrix, illustration.width, illustration.height)) {
      session.matrix = previous.matrix;
    } else {
      session.confirmed = false;
      if (raw.width === WIDE.width) {
        const aligned = await alignWide(source, illustration, cut, canvas, { allowManual: true }).catch(() => null);
        if (ticket !== revision) return;
        if (aligned?.matrix && coversCard(aligned.matrix, illustration.width, illustration.height)) {
          session.initial = session.matrix = aligned.matrix;
        }
      }
    }
    let textError = '';
    try { await compose(); }
    catch (error) {
      if (error.status === 401 || error.status === 403 || settings.language === 'off') throw error;
      settings.language = 'off';
      session.confirmed = false;
      $('printText').value = 'off';
      textError = error.message;
      await compose();
    }
    save();
    setStatus(textError || (languages.length ? '연결 위치와 출력 설정을 확인해 주세요.' : '확보된 텍스트 레이어가 없어 텍스트를 OFF로 표시합니다.'));
  } catch (error) {
    if (ticket === revision) { session = null; draw(); errorMessage(error); }
  } finally {
    if (ticket === revision) { busy = false; refreshControls(); }
  }
}
async function withCardAction(action) {
  if (busy || !session?.illustration) return;
  busy = true;
  $('printReload').hidden = true;
  refreshControls();
  try { await action(); } catch (error) { errorMessage(error); }
  finally { busy = false; refreshControls(); }
}

$('printReload').onclick = () => catalog.length ? loadCard(selection) : connect();
$('printPrevious').onclick = () => loadCard(selection - 1);
$('printNext').onclick = () => loadCard(selection + 1);
$('printCard').onchange = e => loadCard(Number(e.target.value));
$('printCompare').onclick = () => { if (!busy && session) { session.original = !session.original; draw(); } };
$('printAlign').onclick = () => withCardAction(async () => {
  const picked = await reviewMobileAlignment({
    source: session.source, image: session.illustration, cutRect: session.cut, initial: session.initial,
    current: session.matrix, canvas,
  });
  if (!picked) return;
  const previous = session.matrix;
  session.matrix = picked.matrix;
  session.original = false;
  try { await compose(); } catch (error) { session.matrix = previous; throw error; }
  session.confirmed = false;
  save();
  setStatus('일러스트 연결 위치를 적용했어요.');
});
for (const [key, id] of Object.entries(controls)) {
  $(id).onchange = e => withCardAction(async () => {
    const previous = session.settings[key];
    session.settings[key] = e.target.value;
    try { await compose(); } catch (error) { session.settings[key] = e.target.value = previous; throw error; }
    session.confirmed = false;
    save();
    setStatus('출력 설정을 적용했어요.');
  });
}
$('printConfirm').onclick = () => withCardAction(async () => {
  session.confirmed = true;
  save();
  setStatus('이 카드의 출력 설정을 확정했어요.');
});
$('printPDF').onclick = () => withCardAction(async () => {
  const { output, cut, name, settings } = session;
  const language = settings.language === 'off' ? 'ja' : settings.language;
  const card = { ...name, source_language: language, display_name: { ja: 'ピカチュウ', ko: '피카츄', en: 'Pikachu' }[language] || name.display_name };
  setStatus('A4 출력 도안을 준비하고 있어요.');
  const sheet = makePrintSheet(withCardBleed(output), cut, {
    shape: settings.shape, tolerance: 0, bleed: 2, windowGuideInset: 0, trimMargin: .5, watermark: true, cutoutCard: card,
  });
  const jpeg = await new Promise(resolve => sheet.toBlob(resolve, 'image/jpeg', .98));
  if (!jpeg) throw new Error('출력 도안을 만들지 못했어요.');
  const pdf = makePDF(new Uint8Array(await jpeg.arrayBuffer()), sheet.width, sheet.height, 83, 118);
  const url = URL.createObjectURL(pdf);
  const link = Object.assign(document.createElement('a'), { href: url, download: String(selection + 1).padStart(2, '0') + ' - ' + cardFilename(card) });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  setStatus('A4 PDF 다운로드를 시작했어요. 인쇄 배율은 실제 크기(100%)로 설정해 주세요.');
});
async function connect() {
  try {
    $('printReload').hidden = true;
    $('printLogin').hidden = true;
    await auth.init();
    authMode = sessionValue('funypin_admin_token') ? 'admin' : 'web';
    const { adminId, cards } = await invoke('catalog');
    storageKey = 'funypin:pikachu-print:v1:' + adminId;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      saved = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch { saved = {}; }
    catalog = cards;
    presets = await api('/rest/v1/card_art_window_presets?select=kind,x,y,w,h').catch(() => []);
    $('printCard').replaceChildren(...catalog.map((_, index) => new Option('', index)));
    progress();
    $('printWorkspace').hidden = false;
    await loadCard(0);
  } catch (error) {
    $('printLogin').hidden = false;
    errorMessage(error);
  }
}
connect();
