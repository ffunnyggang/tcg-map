import { reviewMobileAlignment } from './card-art-align.mjs?v=20261111-pdf1';
import { prepareMobileLayerSource } from './card-art-layer-flow.mjs?v=20261108-layercache1';
import { textTransparency } from './card-overlay-header.mjs?v=20261108-fulltext1';
import { coversCard, IDENTITY_WIDE, renderManual } from './card-overlay-manual.mjs?v=20261108-cardfit1';
import { composeLayers } from './card-overlay-layers.mjs?v=20261120-border-footer';
import { alignWide, WIDE } from './card-overlay-wide.mjs?v=20261107-wide3';
import { anniversarySymbolPlacement, findAnniversarySymbolCenter, PIKACHU_ANNIVERSARY_PLACEMENT, usesCenteredAnniversarySymbol } from './card-overlay-symbol.mjs?v=20261110-center1';
import { defaultArtWindow, windowPresetType } from './card-art-window-presets.mjs?v=20261108-presets1';
import { drawCardOverlay, pixelWindow } from './card-art-geometry.mjs?v=20261107-flow3';
import { cardFilename, LANGUAGES, validWindow } from './card-art-core.mjs?v=20261108-search1';
import { trimmedPrintPreview, printFoil, drawArtWatermark, drawProductionWindow, makePrintSheet, printWindowRect, withProductionCardBleed, PRINT, PRINT_SIDE_MARGIN, PRINT_TOP_MARGIN, ADMIN_PRINT_BLEED, ADMIN_PRINT_TRIM_MARGIN, PRINT_FOOTER_CENTER_Y } from './card-overlay-print.mjs?v=20261120-border-footer';
import { makePDF } from './card-overlay-core.mjs?v=20261116-pikachu-a2';
import { makePikachuSheetPDF, PIKACHU_SHEET_IDS } from './admin-pikachu-sheet.mjs?v=20261119-print64x89';

import { makeRestoredOverscan } from './admin-pikachu-restored-overscan.mjs?v=20261119-restored5mm';

const $ = id => document.getElementById(id);
const auth = window.FUNY_WEB_AUTH;
const assetPromises = new Map();
const RESTORED_PRINT_BLEED = 5;
function isRestoredPrintImage(card) {
  return card?.sourceLanguage === 'en' && card.hasPrintImport === true &&
    card.imageOptions?.some(option => option.id === card.illustration?.id && option.kind === 'import') === true;
}
const printBleed = card => isRestoredPrintImage(card) ? RESTORED_PRINT_BLEED : ADMIN_PRINT_BLEED;
const labels = { ko: '한국어', ja: '일본어', en: '영어' };
const corners = ['round', 'square'];
const symbolLabels = { off: 'OFF', center: '중앙', right: '오른쪽', left: '왼쪽' };
const controls = { language: 'printText', symbol: 'printSymbol', border: 'printBorder', shape: 'printCorner', mode: 'printMode', watermark: 'printWatermark' };
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
const invoke = (action, id, imageId) => api('/functions/v1/pikachu-print-assets', { body: { action, id, imageId } });
function deny(message) {
  revision++;
  session = null;
  catalog = [];
  assetPromises.clear();
  $('printWindowGuide').style.display = 'none';
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
  $('printProgress').textContent = `설정 확정 ${done}/${catalog.length} · 일러스트 미확보 ${missing}장`;
  Array.from($('printCard').options).forEach(option => {
    const index = Number(option.value);
    const card = catalog[index];
    const seq = String(index + 1).padStart(2, '0');
    const state = !card.hasIllustration ? ' · 일러스트 미확보' : saved[card.id]?.confirmed ? ' · 설정 확정' : '';
    option.textContent = card.hasPrintImport ? `영문 ${card.number} · ${card.name}${state}` : `${seq} · ${card.name} ${card.number}${state}`;
  });
}
function refreshControls() {
  $('printPrevious').disabled = busy || selection === 0;
  $('printNext').disabled = busy || selection >= catalog.length - 1;
  $('printCard').disabled = busy;
  $('printPdfImports').disabled = busy;
  $('printImage').disabled = busy || $('printImage').options.length < 2;
  $('printCompare').disabled = busy || !session?.illustration;
  $('printAlign').disabled = busy || !session?.illustration;
  for (const id of Object.values(controls)) $(id).disabled = busy || !session?.illustration;
  $('printConfirm').disabled = busy || !session?.output || session.confirmed;
  $('printConfirm').textContent = session?.confirmed ? '설정 확정됨' : '설정 확정';
  $('printPDF').disabled = busy || !session?.output;
  $('printPikachuSheet').disabled = busy || !catalog.length;
}
function save() {
  if (!session?.illustration) return;
  saved[session.card.id] = {
    ...session.settings, imageId: session.card.illustration.id, matrix: session.matrix, alignmentKey: session.alignmentKey,
    signature: JSON.stringify([session.alignmentKey, session.settings.language, session.card.texts[session.settings.language]?.id]),
    confirmed: session.confirmed,
  };
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { setStatus('이 브라우저에서 설정을 저장할 수 없어요.'); }
  progress();
}
const footerCenterY = settings => settings.border === 'off' ? null : PRINT_FOOTER_CENTER_Y;
function shouldDrawWatermark(card) {
  const defaultImage = card.imageOptions?.find(option => option.kind === 'standard');
  return !['m6a-ja-021', 'm6a-ja-037'].includes(card.id) || !defaultImage || card.illustration?.id !== defaultImage.id;
}
function draw() {
  const view = $('printCanvas');
  const guide = $('printWindowGuide');
  guide.style.display = 'none';
  const g = view.getContext('2d');
  g.clearRect(0, 0, view.width, view.height);
  if (!session) return;
  const { source, output, cut, original, settings } = session;
  if (!cut) { g.drawImage(source, 0, 0, view.width, view.height); return; }
  const preview=!original && session.preview;
  const nativeHeight=preview?view.height*88/PRINT.height:view.height;
  const nativeWidth=nativeHeight*63/88;
  view.width=preview?Math.round(view.height*PRINT.width/PRINT.height):nativeWidth;
  const offset=(view.width-nativeWidth)/2;
  const topOffset=(view.height-nativeHeight)/2;
  guide.setAttribute('viewBox',`${-offset} ${-topOffset} ${view.width} ${view.height}`);
  if(preview)g.drawImage(preview,0,0,view.width,view.height);
  else drawCardOverlay(g,source,output||source,cut,nativeWidth,view.height,!!output&&!original,settings.shape);
  g.save();g.translate(offset,topOffset);
  if (output && !original) {
    if (settings.mode === 'production') drawProductionWindow(g, pixelWindow(cut, nativeWidth, nativeHeight), nativeWidth / 63);
    else {
      const { x, y, w, h } = pixelWindow(cut, nativeWidth, nativeHeight);
      for (const line of guide.querySelectorAll('rect')) {
        line.setAttribute('x', x);
        line.setAttribute('y', y);
        line.setAttribute('width', w);
        line.setAttribute('height', h);
      }
      guide.style.display = '';
    }
    if (!preview && shouldDrawWatermark(session.card)) drawArtWatermark(g, 0, 0, view.width, view.height, settings.watermark, footerCenterY(settings));
  }
  g.restore();
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
async function renderCard(current, printing=false) {
  if (!current?.illustration) return;
  const { settings: { language, border, symbol, shape }, source, cut, illustration, matrix } = current;
  const centered = symbol === 'center';
  const rightAssetId = 'anniversary-yellow-umbreon-v1';
  const [text, frame, stamp] = await Promise.all([
    language !== 'off' ? textLayer(current, language) : null,
    border !== 'off' ? asset(border) : null,
    symbol !== 'off' ? asset(symbol === 'left' ? 'anniversary-yellow-left-v1' : rightAssetId) : null,
  ]);
  let placement = null;
  if (stamp) {
    if (current.symbolCenter === undefined) {
      try {
        const referenceStamp = symbol === 'left' ? await asset(rightAssetId) : stamp;
        current.symbolCenter = findAnniversarySymbolCenter(source, referenceStamp, canvas, { centerOnly: centered });
      }
      catch { current.symbolCenter = null; }
    }
    placement = centered ? current.symbolCenter || PIKACHU_ANNIVERSARY_PLACEMENT : anniversarySymbolPlacement(stamp, current.symbolCenter);
  }
  if(printing)current.printFoil=frame ? await printFoil(border) : null;
  return composeLayers(source, printing ? canvas(1008,1408) : renderManual(illustration, matrix, canvas), cut, {
    printing,
    kind: 'ai-text', text, showText: !!text, border: frame?.image, showBorder: !!frame && !printing, footerCenterY: frame ? footerCenterY(current.settings) : null,
    symbol: stamp?.image, showSymbol: !!stamp, symbolSide: symbol, placement, shape,
  }, canvas);
}
async function compose() {
  const current = session;
  if(!current)return;
  const revisionToken=current.previewToken=Symbol();
  const output = await renderCard(current);
  let preview=null;
  if(output){
   const printOutput=await renderCard(current,true);
   preview=trimmedPrintPreview(productionArtwork({...current,printOutput}),canvas,shouldDrawWatermark(current.card),current.settings.watermark,printBleed(current.card),footerCenterY(current.settings));
  }
  if(current.previewToken!==revisionToken)return;
  current.preview=preview;
  if (current !== session || !output) return;
  current.output = output;
  draw();
}
async function prepareCard(card, previous) {
  const name = { id: card.id, card_number: card.number, source_language: card.sourceLanguage || 'ja', display_name: card.name, art_rect: card.artRect };
  const preset = presets.find(p => p.kind === windowPresetType(name));
  const selectedWindow = card.illustration?.cutRect || preset;
  const cut = card.id.startsWith('dogam-ko-') && !card.hasIllustration ? null : validWindow(selectedWindow) ? { x: selectedWindow.x, y: selectedWindow.y, w: selectedWindow.w, h: selectedWindow.h } : defaultArtWindow(name);
  const [original, raw] = await Promise.all([image(card.original), card.illustration ? image(card.illustration.url) : null]);
  if (Math.abs(original.width / original.height - 63 / 88) > .025) throw new Error('원본 카드 비율을 확인해 주세요.');
  const source = prepareMobileLayerSource(original, canvas);
  const illustration = raw ? paddedArtwork(raw) : null;
  const alignmentKey = JSON.stringify([card.illustration?.id, cut]);
  const centeredSymbol = usesCenteredAnniversarySymbol(name);
  const symbols = centeredSymbol ? ['off', 'center'] : ['off', 'right', 'left'];
  const savedSymbol = previous.symbol === 'center' && !centeredSymbol ? 'right' : previous.symbol;
  const signature = JSON.stringify([alignmentKey, previous.language, card.texts[previous.language]?.id]);
  const languages = card.languages;
  const settings = {
    language: previous.language === 'off' || languages.includes(previous.language)
      ? previous.language : languages.find(code => code === 'ja') || languages[0] || 'off',
    symbol: symbols.includes(savedSymbol) ? savedSymbol : 'off',
    border: borders.includes(previous.border) ? previous.border : 'off',
    shape: corners.includes(previous.shape) ? previous.shape : 'round',
    mode: previous.mode === 'production' ? 'production' : 'event',
    watermark: previous.watermark === 'funyframe' ? 'funyframe' : 'funypin.kr',
  };
  const prepared = {
    card, name, source, illustration, cut, settings, symbols, alignmentKey, textLayers: new Map(),
    hasWideArtwork: raw?.width === WIDE.width && raw?.height === WIDE.height,
    original: false, initial: [...IDENTITY_WIDE], matrix: [...IDENTITY_WIDE],
    confirmed: previous.confirmed === true && previous.signature === signature && previous.language === settings.language && previous.symbol === settings.symbol,
  };
  if (!illustration) return prepared;
  if (previous.alignmentKey === alignmentKey && Array.isArray(previous.matrix) && previous.matrix.length === 6 &&
      previous.matrix.every(Number.isFinite) && coversCard(previous.matrix, illustration.width, illustration.height)) {
    prepared.matrix = previous.matrix;
    return prepared;
  }
  prepared.confirmed = false;
  if (raw.width === WIDE.width) {
    const aligned = await alignWide(source, illustration, cut, canvas, { allowManual: true }).catch(() => null);
    if (aligned?.matrix && coversCard(aligned.matrix, illustration.width, illustration.height)) {
      prepared.initial = prepared.matrix = aligned.matrix;
    }
  }
  return prepared;
}
async function loadCard(index, imageId = saved[catalog[index]?.id]?.imageId) {
  if (busy || !catalog[index]) return;
  const ticket = ++revision;
  selection = index;
  session = null;
  busy = true;
  $('printCard').value = String(index);
  $('printImage').replaceChildren(new Option('일러스트 미확보', ''));
  $('printText').replaceChildren(new Option('OFF', 'off'));
  $('printWindow').textContent = '';
  refreshControls();
  draw();
  $('printReload').hidden = true;
  setStatus('카드와 저장된 레이어를 불러오고 있어요.');
  try {
    let payload;
    try { payload = await invoke('card', catalog[index].id, imageId); }
    catch (error) {
      if (!imageId || error.status !== 404) throw error;
      payload = await invoke('card', catalog[index].id);
    }
    const { card } = payload;
    const kinds = { standard: '기본 저장 이미지', face: '얼굴 가림 + 연결 맞추기 (BETA)', history: '기존 연결 맞추기 저장본' };
    const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' });
    if (card.imageOptions?.length) {
      const needsSelection = !card.illustration;
      $('printImage').replaceChildren(...card.imageOptions.map(option => {
        const date = new Date(option.createdAt);
        const suffix = !['standard','import'].includes(option.kind) && Number.isFinite(+date) ? ' · ' + dateFormat.format(date) : '';
        return new Option((option.kind === 'import' ? option.label : kinds[option.kind] || '저장 이미지') + suffix, option.id);
      }));
      if (needsSelection) {
        const placeholder = new Option('출력용 일러스트를 선택해 주세요', '');
        placeholder.disabled = true;
        $('printImage').prepend(placeholder);
      }
      $('printImage').value = card.illustration?.id || '';
    }
    const previous = saved[card.id] || {};
    const prepared = await prepareCard(card, previous);
    if (ticket !== revision) return;
    const { cut, settings, illustration } = prepared;
    const languages = card.languages;
    $('printSymbol').replaceChildren(...prepared.symbols.map(value => new Option(symbolLabels[value], value)));
    for (const language of languages) $('printText').add(new Option(labels[language] || LANGUAGES[language] || language.toUpperCase(), language));
    for (const [key, id] of Object.entries(controls)) $(id).value = settings[key];
    $('printWindow').textContent = cut ? `일러스트 창 ${cut.w.toFixed(1)} × ${cut.h.toFixed(1)} mm · 완성 64 × 89 mm · 사방 블리드 ${printBleed(card)} mm` : '원본 카드 이미지';
    session = prepared;
    if (!illustration) {
      draw();
      setStatus(card.imageOptions?.length ? '출력용 일러스트를 선택해 주세요.' : '저장된 확장 일러스트가 없어요. 확보 후 이 카드의 도안을 만들 수 있습니다.');
      return;
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
$('printPdfImports').onclick = () => loadCard(catalog.findIndex(card => card.hasPrintImport));
$('printImage').onchange = e => loadCard(selection, e.target.value);
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
    try {
      if (key === 'mode') draw();
      else await compose();
    } catch (error) { session.settings[key] = e.target.value = previous; throw error; }
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
  const { cut, name, settings } = session;
  const language = settings.language === 'off' ? name.source_language : settings.language;
  const card = { ...name, source_language: language, display_name: /^m6a-ja-0(?:1[7-9]|[23][0-9]|4[0-6])$/.test(name.id) ? ({ ja: 'ピカチュウ', ko: '피카츄', en: 'Pikachu' }[language] || name.display_name) : name.display_name };
  const production = settings.mode === 'production';
  setStatus('A4 출력 도안을 준비하고 있어요.');
  session.printOutput = await renderCard(session,true);
  const sheet = makePrintSheet(productionArtwork(session), cut, {
    shape: settings.shape, tolerance: 0, bleed: printBleed(session.card),
    showRoundTrimGuide: !isRestoredPrintImage(session.card), windowGuideInset: 0, trimMargin: ADMIN_PRINT_TRIM_MARGIN, watermark: shouldDrawWatermark(session.card), watermarkText: settings.watermark, footerCenterY: footerCenterY(settings), cutoutCard: card, production,
  });
  const pdf = makePDF(await encodePrintImage(sheet), sheet.width, sheet.height, 83, 118,
    production ? { cutContour: printWindowRect(cut) } : undefined);
  const fileName = cardFilename(card).replace(/\.pdf$/, production ? '-PRINT.pdf' : '.pdf');
  downloadPrintPDF(pdf, String(selection + 1).padStart(2, '0') + ' - ' + fileName);
  setStatus('A4 PDF 다운로드를 시작했어요. 인쇄 배율은 실제 크기(100%)로 설정해 주세요.');
});
async function encodePrintImage(surface) {
  const jpeg = await new Promise(resolve => surface.toBlob(resolve, 'image/jpeg', .98));
  if (!jpeg) throw new Error('출력 도안을 만들지 못했어요.');
  return new Uint8Array(await jpeg.arrayBuffer());
}
function downloadPrintPDF(pdf, fileName) {
  const url = URL.createObjectURL(pdf);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('printPikachuSheet').onclick = async () => {
  if (busy || !catalog.length) return;
  const missing = PIKACHU_SHEET_IDS.flatMap((id, index) => catalog.some(card => card.id === id && card.hasIllustration) ? [] : [index+1]);
  if (missing.length) {
    setStatus(`확장 일러스트를 확인해 주세요. 작업 순서 ${missing.join(', ')}번의 이미지가 미확보 상태입니다.`);
    return;
  }
  busy = true;
  refreshControls();
  $('printReload').hidden = true;
  let order = 0;
  try {
    const tiles = [];
    for (const id of PIKACHU_SHEET_IDS) {
      order++;
      setStatus(`피카츄 인쇄용 도안을 준비하고 있어요. ${order}/30`);
      const previous = saved[id] || {};
      let current = session?.card.id === id && session.output ? session : null;
      if (!current) {
        const {card} = await invoke('card', id, previous.imageId);
        if (!card.illustration || (previous.imageId && card.illustration.id !== previous.imageId)) {
          throw new Error('저장된 출력 이미지를 다시 선택해 주세요.');
        }
        current = await prepareCard(card, previous);
        if ((previous.language && previous.language !== current.settings.language) ||
            (previous.confirmed && !current.confirmed)) {
          throw new Error('변경된 연결 위치나 저장된 출력 설정을 카드에서 다시 확인해 주세요.');
        }
        current.output = await renderCard(current);
      }
      current.printOutput = await renderCard(current,true);
      const tile = productionTile(current);
      tiles.push({jpeg:await encodePrintImage(tile), cut:current.cut, shape:current.settings.shape});
      tile.width = tile.height = 0;
    }
    downloadPrintPDF(makePikachuSheetPDF(tiles), 'FUNY PIN - PIKACHU 01-30 - A2 PRINT.pdf');
    setStatus('피카츄 30종 인쇄용 PDF를 저장했어요. A2 용지에 실제 크기(100%)로 출력해 주세요.');
  } catch (error) {
    if (error.status === 401 || error.status === 403) errorMessage(error);
    else setStatus(`작업 순서 ${order}번에서 출력이 중단됐어요. ${error.message || '잠시 후 다시 시도해 주세요.'}`);
  } finally {
    busy = false;
    refreshControls();
  }
};
function productionArtwork({output, printOutput, printFoil, illustration, matrix, settings, hasWideArtwork, card}) {
  if (isRestoredPrintImage(card)) {
    const bleed = RESTORED_PRINT_BLEED;
    // Legacy artwork is registered at 16 px/mm; the existing trim adds 0.5 mm
    // around its 63 × 88 mm footprint. The extended plate includes both margins.
    const inset = (bleed + PRINT_SIDE_MARGIN) * 16;
    const top = (bleed + PRINT_TOP_MARGIN) * 16;
    const native = renderManual(illustration, matrix, canvas);
    const artwork = makeRestoredOverscan(native, canvas, inset, top);
    return withProductionCardBleed(printOutput||output, canvas, {
      artwork, matrix:[1,0,0,1,-inset,-top], foil:printFoil, shape:settings.shape, bleed,
    });
  }
  const artwork = hasWideArtwork && card?.illustration?.hasGeneratedOverscan === true ? illustration : null;
  const fallbackArtwork = artwork ? null : renderManual(illustration, matrix, canvas);
  return withProductionCardBleed(printOutput||output, canvas, {artwork, matrix, fallbackArtwork, foil:printFoil,shape:settings.shape, bleed: ADMIN_PRINT_BLEED});
}
function productionTile(current) {
  const {cut, card} = current;
  const scale = PRINT.scale, bleed = ADMIN_PRINT_BLEED;
  const tile = canvas((PRINT.width+2*bleed)*scale, (PRINT.height+2*bleed)*scale);
  const g = tile.getContext('2d');
  g.drawImage(productionArtwork(current),0,0,tile.width,tile.height);
  drawProductionWindow(g, {x:(bleed+PRINT_SIDE_MARGIN+cut.x)*scale,y:(bleed+PRINT_TOP_MARGIN+cut.y)*scale,w:cut.w*scale,h:cut.h*scale}, scale);
  if (shouldDrawWatermark(card)) drawArtWatermark(g,(bleed+PRINT_SIDE_MARGIN)*scale,(bleed+PRINT_TOP_MARGIN)*scale,63*scale,88*scale,current.settings.watermark,footerCenterY(current.settings));
  return tile;
}
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
    const pdfCards = cards.filter(card => card.hasPrintImport).sort((a, b) => a.number.localeCompare(b.number));
    catalog = [...cards.filter(card => !card.hasPrintImport), ...pdfCards];
    presets = await api('/rest/v1/card_art_window_presets?select=kind,x,y,w,h').catch(() => []);
    const options = catalog.map((_, index) => new Option('', index));
    if (pdfCards.length) {
      const pdfGroup = document.createElement('optgroup');
      pdfGroup.label = 'PDF 복원본 · 영문';
      pdfGroup.append(...options.splice(-pdfCards.length));
      options.push(pdfGroup);
    }
    $('printCard').replaceChildren(...options);
    $('printPdfImports').hidden = !pdfCards.length;
    $('printPdfImports').textContent = `PDF 복원본 ${pdfCards.length}종 보기`;
    progress();
    $('printWorkspace').hidden = false;
    const openPdfImports = new URLSearchParams(location.search).get('art') === 'pdf' && pdfCards.length;
    await loadCard(openPdfImports ? catalog.length - pdfCards.length : 0);
  } catch (error) {
    $('printLogin').hidden = false;
    errorMessage(error);
  }
}
connect();


