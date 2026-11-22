import {buildPrintSettingsExport,verifyPrivatePrintPng} from './admin-pikachu-print-settings-export.mjs?v=20261122-print-source-preflight1';
import {canAdjustJA16,renderJA16PinnedPlate,renderJA16PinnedAlignment} from './admin-pikachu-ja16-align.mjs?v=20261122-ja16-align1';
import {JA06_EXTRA_ID,isJAPrintAlternative,decodeJAPrintAlternative,canAdjustSubmittedJA,submittedBleedMatrix} from './admin-pikachu-ja-wide.mjs?v=20261122-ja06-extra1';
import { WIDE_IMPORT_WIDTH, WIDE_IMPORT_HEIGHT, wideImportMatrix } from './admin-pikachu-wide-import.mjs?v=20261122-en039-wide1';
import { reviewMobileAlignment } from './card-art-align.mjs?v=20261122-print-fidelity1';
import { prepareMobileLayerSource } from './card-art-layer-flow.mjs?v=20261108-layercache1';
import { textTransparency } from './card-overlay-header.mjs?v=20261108-fulltext1';
import { coversCard, IDENTITY_WIDE, renderManual } from './card-overlay-manual.mjs?v=20261108-cardfit1';
import { composeLayers } from './card-overlay-layers.mjs?v=20261120-footer-exact1';
import { alignWide, WIDE } from './card-overlay-wide.mjs?v=20261107-wide3';
import { anniversarySymbolPlacement, findAnniversarySymbolCenter, PIKACHU_ANNIVERSARY_PLACEMENT, usesCenteredAnniversarySymbol } from './card-overlay-symbol.mjs?v=20261110-center1';
import { defaultArtWindow, windowPresetType } from './card-art-window-presets.mjs?v=20261108-presets1';
import { drawCardOverlay, pixelWindow } from './card-art-geometry.mjs?v=20261107-flow3';
import { cardFilename, LANGUAGES, validWindow } from './card-art-core.mjs?v=20261108-search1';
import { trimmedPrintPreview, printFoil, drawArtWatermark, drawProductionWindow, makePrintSheet, printWindowRect, withProductionCardBleed, PRINT, PRINT_SIDE_MARGIN, PRINT_TOP_MARGIN, ADMIN_PRINT_BLEED, ADMIN_PRINT_TRIM_MARGIN, PRINT_FOOTER_CENTER_Y } from './card-overlay-print.mjs?v=20261120-archive-plate1';
import { makePDF } from './card-overlay-core.mjs?v=20261116-pikachu-a2';
import { makePikachuSheetPDF, PIKACHU_SHEET_IDS } from './admin-pikachu-sheet.mjs?v=20261120-funyframe-sheet';

import { ARCHIVE_BLEED_MM, ARCHIVE_NATIVE_MATRIX, isArchivePlateId, decodeArchivePlate, composeArchiveProduction, renderArchiveAlignment, coversArchiveTrim } from './admin-pikachu-archive-plate.mjs?v=20261120-archive-align1';

import { makeRestoredOverscan } from './admin-pikachu-restored-overscan.mjs?v=20261119-restored5mm';

const $ = id => document.getElementById(id);
const auth = window.FUNY_WEB_AUTH;
const assetPromises = new Map();
const RESTORED_PRINT_BLEED = 5;
const FUNYFRAME_SHEET_SETTINGS = Object.freeze({
  language: 'off', symbol: 'off', border: 'off', shape: 'square', watermark: 'funyframe', mode: 'production',
});
function isRestoredPrintImage(card) {
  return card?.sourceLanguage === 'en' && card.hasPrintImport === true &&
    card.imageOptions?.some(option => option.id === card.illustration?.id && option.kind === 'import') === true;
}
const printBleed = card => isArchivePlateId(card?.illustration?.id, card?.id) ? ARCHIVE_BLEED_MM
  : isRestoredPrintImage(card) && card.illustration.wideImport !== true ? RESTORED_PRINT_BLEED : ADMIN_PRINT_BLEED;
const labels = { ko: '한국어', ja: '일본어', en: '영어' };
const corners = ['round', 'square'];
const symbolLabels = { off: 'OFF', center: '중앙', right: '오른쪽', left: '왼쪽' };
const controls = { language: 'printText', symbol: 'printSymbol', border: 'printBorder', shape: 'printCorner', mode: 'printMode', watermark: 'printWatermark' };
const borders = Array.from($('printBorder').options, option => option.value);
let catalog = [], presets = [], selection = 0, session = null, busy = false, revision = 0, saved = {};
let storageKey = '', archiveKey = '', archiveSaved = {}, jaAlternativeKey = '', jaAlternativeSaved = {}, authMode = 'web', adminRefresh = null;
let funyframeDownloadUrl = null, settingsExportUrl = null;
let pageConfirmedKey = '', pageConfirmed = {}, ordinaryDraftKey = '', ordinaryDrafts = {};
const JA06_REF='m6a-ja-022';
const jaDraftId=(ref,imageId)=>imageId===JA06_EXTRA_ID ? imageId : ref;
// Keep old watermark/placement validation identical; only the new clean
// source has a different raster size and no baked-footer constraint.
const submittedFits=(matrix,plate)=>plate.submittedSpec?.width===800
  ? canAdjustSubmittedJA(matrix,plate.submittedSpec,false) : canAdjustSubmittedJA(matrix);
const VIEW_PX_MM = 8;
const SOURCE_WIDTH_MM = 63, SOURCE_HEIGHT_MM = 88;
const confirmedPageRecord = id => pageConfirmed[id]?.confirmed === true ? pageConfirmed[id] : null;
const watermarkChoices=new Set(['funypin.kr','funyframe','off']);
const showWatermark=current=>!current.archivePlate?.embeddedWatermark&&current.settings.watermark!=='off';

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
const invoke = (action, id, imageId, print_plate_id) => api('/functions/v1/pikachu-print-assets', {
  body: { action, id, imageId, print_plate_id, wide_import_v1: true, ja_alternative_v1: true, ja_submitted_v1: true, ja_submitted_clean_v1: true, ja_submitted_extra_v1: true },
});
function deny(message) {
  clearFunyframeDownload();
  clearSettingsExport();
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
  const done = catalog.filter(card => card.hasIllustration && (confirmedPageRecord(card.id) || saved[card.id]?.confirmed)).length;
  const missing = catalog.filter(card => !card.hasIllustration).length;
  $('printProgress').textContent = `설정 확정 ${done}/${catalog.length} · 일러스트 미확보 ${missing}장`;
  Array.from($('printCard').options).forEach(option => {
    const index = Number(option.value);
    const card = catalog[index];
    const seq = String(index + 1).padStart(2, '0');
    const state = !card.hasIllustration ? ' · 일러스트 미확보' : (confirmedPageRecord(card.id) || saved[card.id]?.confirmed) ? ' · 설정 확정' : '';
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
  const bakedWatermark = !!session?.archivePlate?.embeddedWatermark;
  $('printBakedWatermarkNote').hidden = !bakedWatermark;
  for (const id of Object.values(controls)) $(id).disabled = busy || !session?.illustration || (id === controls.watermark && bakedWatermark);
  const pageApproved=session?.confirmed && !session.needsPageSelection;
  $('printConfirm').disabled = busy || !session?.output || pageApproved || session.wideAlignmentNeedsReview;
  $('printConfirm').textContent = pageApproved ? '설정 확정됨' : '설정 확정';
  $('printPDF').disabled = busy || !session?.output || session.wideAlignmentNeedsReview;
  $('printPikachuSheet').disabled = busy || !catalog.length;
  $('printExportSettings').disabled = busy || !catalog.length;
  $('printPreflightExport').disabled = busy || !catalog.length;
  $('printFunyframeSheet').disabled = busy || !catalog.length;
}
function save({ confirmOnPage = false } = {}) {
  if (session?.wideAlignmentNeedsReview || !session?.illustration) return;
  const id = session.card.id;
  const next = {
    ...session.settings, imageId: session.card.illustration.id, matrix: session.matrix, alignmentKey: session.alignmentKey,
    signature: JSON.stringify([session.alignmentKey, session.settings.language, session.card.texts[session.settings.language]?.id]),
    confirmed: session.confirmed,
  };
  if (!confirmOnPage) {
    // Drafts are available on their own option without replacing approved
    // output or a batch default.
    const records = !session.archivePlate ? ordinaryDrafts : session.archivePlate.jaAlternative ? jaAlternativeSaved : archiveSaved;
    const key = !session.archivePlate ? ordinaryDraftKey : session.archivePlate.jaAlternative ? jaAlternativeKey : archiveKey;
    const draftId=session.archivePlate?.jaAlternative ? jaDraftId(id,next.imageId) : id;
    localStorage.setItem(key, JSON.stringify({...records,[draftId]:next}));
    records[draftId] = next;
    return;
  }
  const previousActive = confirmedPageRecord(id);
  // Preserve the exact previous confirmed option when card 06 gets a new
  // active option. Store both in the same atomic browser write.
  if (id===JA06_REF && previousActive) {
    const {otherOptions, ...prior}=previousActive;
    const records={...otherOptions};
    delete records[next.imageId];
    if (prior.imageId!==next.imageId) records[prior.imageId]=prior;
    next.otherOptions=records;
  }
  const nextPage = JSON.stringify({...pageConfirmed,[id]:next});
  if (session.archivePlate) {
    // For private alternatives a single browser write commits both the
    // selected image and its settings. A2 does not read this record.
    localStorage.setItem(pageConfirmedKey, nextPage);
  } else {
    const previous = saved[id];
    const previousPage = localStorage.getItem(pageConfirmedKey);
    localStorage.setItem(pageConfirmedKey, nextPage);
    try { localStorage.setItem(storageKey, JSON.stringify({...saved,[id]:next})); }
    catch (error) {
      if (previousPage === null) localStorage.removeItem(pageConfirmedKey);
      else localStorage.setItem(pageConfirmedKey, previousPage);
      throw error;
    }
    saved[id] = next;
    if (funyframeDownloadUrl && PIKACHU_SHEET_IDS.includes(id) &&
        (previous?.imageId !== next.imageId || previous?.alignmentKey !== next.alignmentKey ||
         previous?.confirmed !== next.confirmed || JSON.stringify(previous?.matrix) !== JSON.stringify(next.matrix))) {
      clearFunyframeDownload();
      $('printFunyframeStatus').textContent = '확정 상태나 연결 위치가 바뀌었어요. 새 PDF를 준비해 주세요.';
    }
  }
  pageConfirmed[id] = next;
  clearSettingsExport();
  session.needsPageSelection=false;
  progress();
}
function draw() {
  const view = $('printCanvas');
  const guide = $('printWindowGuide');
  guide.style.display = 'none';
  const preview = session && !session.original && session.preview;
  // Both bitmaps use 8 physical pixels/mm and the same CSS pixels/mm. The
  // original is not enlarged to fill the 64×89 preview frame.
  view.width = (preview ? PRINT.width : SOURCE_WIDTH_MM) * VIEW_PX_MM;
  view.height = (preview ? PRINT.height : SOURCE_HEIGHT_MM) * VIEW_PX_MM;
  view.style.width = `${(preview ? 1 : SOURCE_WIDTH_MM / PRINT.width) * 100}%`;
  view.style.marginInline = 'auto';
  const g = view.getContext('2d');
  if (!session) return;
  const {source,output,cut,original,settings} = session;
  const nativeWidth=SOURCE_WIDTH_MM*VIEW_PX_MM, nativeHeight=SOURCE_HEIGHT_MM*VIEW_PX_MM;
  const offset=(view.width-nativeWidth)/2, topOffset=(view.height-nativeHeight)/2;
  guide.setAttribute('viewBox',`${-offset} ${-topOffset} ${view.width} ${view.height}`);
  g.save();
  if (settings.shape==='round') {
    g.beginPath();
    g.roundRect(0,0,view.width,view.height,PRINT.cornerRadius*VIEW_PX_MM);
    g.clip();
  }
  if(preview) g.drawImage(preview,0,0,view.width,view.height);
  else if(!cut || original) g.drawImage(source,0,0,nativeWidth,nativeHeight);
  else drawCardOverlay(g,source,output||source,cut,nativeWidth,nativeHeight,!!output,settings.shape);
  g.save();g.translate(offset,topOffset);
  if (output && cut && !original) {
    if (settings.mode === 'production' && !session.archivePlate && !session.filledWideWindow) drawProductionWindow(g, pixelWindow(cut, nativeWidth, nativeHeight), nativeWidth / 63);
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
    if (!preview && showWatermark(session)) drawArtWatermark(g, 0, 0, nativeWidth, nativeHeight, settings.watermark, PRINT_FOOTER_CENTER_Y-PRINT_TOP_MARGIN*16);
  }
  g.restore();
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
// 017/103 Korean text: copyright-only crop measured in the supplied print proof,
// converted from the 12 px/mm plate into the original 16 px/mm text coordinates.
const PIKACHU_017_KO_FOOTER = Object.freeze({x:302,y:1372,w:386,h:22});
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
  // The archive has its own complete card and any intentional white knockout.
  // A blank source prevents the legacy original-card window from replacing it.
  const layerSource = (current.archivePlate || current.filledWideWindow) ? canvas(1008,1408) : source;
  const background = printing ? canvas(1008,1408)
    : current.archivePlate?.ja16Pinned ? renderJA16PinnedAlignment(current.archivePlate, matrix, canvas)
    : current.archivePlate ? renderArchiveAlignment(current.archivePlate, matrix, canvas) : renderManual(illustration, current.wideImport ? wideImportMatrix(matrix) : matrix, canvas);
  if (!background) throw new Error('일러스트 연결 위치가 올바르지 않아요. 다시 불러와 주세요.');
  return composeLayers(layerSource, background, cut, {
    printing,
    kind: 'ai-text', text, showText: !!text, border: frame?.image, showBorder: !!frame && !printing, footerCenterY: printing ? PRINT_FOOTER_CENTER_Y : PRINT_FOOTER_CENTER_Y-PRINT_TOP_MARGIN*16,
    footerBoundsHint: current.card.id === 'm6a-ja-017' && language === 'ko' ? PIKACHU_017_KO_FOOTER : null,
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
   current.printOutput=printOutput;
   preview=trimmedPrintPreview(productionArtwork({...current,printOutput}),canvas,showWatermark(current),current.settings.watermark,printBleed(current.card),PRINT_FOOTER_CENTER_Y);
  }
  if(current.previewToken!==revisionToken)return;
  current.preview=preview;
  if (current !== session || !output) return;
  current.output = output;
  draw();
}
function validArchiveMatrix(matrix, illustration) {
  return coversArchiveTrim(matrix, illustration.width, illustration.height);
}
function resolveSavedPrintCut(card, name={id:card.id,card_number:card.number,source_language:card.sourceLanguage||'ja',display_name:card.name,art_rect:card.artRect}) {
  const preset=presets.find(p=>p.kind===windowPresetType(name));
  const selected=card.illustration?.cutRect || preset;
  return card.id.startsWith('dogam-ko-') && !card.hasIllustration ? null
    : validWindow(selected) ? {x:selected.x,y:selected.y,w:selected.w,h:selected.h} : defaultArtWindow(name);
}
async function prepareCard(card, previous, {requireSavedAlignment = false, archivePlate = null} = {}) {
  const name = { id: card.id, card_number: card.number, source_language: card.sourceLanguage || 'ja', display_name: card.name, art_rect: card.artRect };
  const cut = resolveSavedPrintCut(card, name);
  const [original, raw] = await Promise.all([
    image(card.original),
    archivePlate?.artwork || (card.illustration ? image(card.illustration.url) : null),
  ]);
  if (Math.abs(original.width / original.height - 63 / 88) > .025) throw new Error('원본 카드 비율을 확인해 주세요.');
  const source = prepareMobileLayerSource(original, canvas);
  const wideImport = !archivePlate && isRestoredPrintImage(card) && card.illustration?.wideImport === true;
  if (wideImport && (raw?.width !== WIDE_IMPORT_WIDTH || raw?.height !== WIDE_IMPORT_HEIGHT)) {
    throw new Error('확장 일러스트 규격이 올바르지 않아요.');
  }
  const filledWideWindow = wideImport && card.illustration.filledWindow === true;
  const illustration = archivePlate || wideImport ? raw : raw ? paddedArtwork(raw) : null;
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
    watermark: archivePlate?.embeddedWatermarkText || (watermarkChoices.has(previous.watermark) ? previous.watermark : 'funypin.kr'),
  };
  const prepared = {
    card, name, source, illustration, cut, settings, symbols, alignmentKey, archivePlate, wideImport, filledWideWindow, textLayers: new Map(),
    hasWideArtwork: raw?.width === WIDE.width && raw?.height === WIDE.height,
    original: false, initial: [...IDENTITY_WIDE], matrix: [...IDENTITY_WIDE],
    confirmed: previous.confirmed === true && previous.signature === signature && previous.language === settings.language && previous.symbol === settings.symbol,
  };
  if (!illustration) return prepared;
  if (archivePlate) {
    if (!validWindow(archivePlate.cutRect)) throw new Error('보관된 2mm 출력판의 창 위치를 확인해 주세요.');
    prepared.initial = [...(archivePlate.nativeMatrix || ARCHIVE_NATIVE_MATRIX)];
    const canRestore = previous.alignmentKey === alignmentKey && validArchiveMatrix(previous.matrix, illustration) && (!archivePlate.ja16Pinned || canAdjustJA16(previous.matrix)) && (!archivePlate.submittedTrim || submittedFits(previous.matrix,archivePlate));
    prepared.matrix = canRestore ? [...previous.matrix] : [...prepared.initial];
    if (!canRestore) prepared.confirmed = false;
    return prepared;
  }
  if (wideImport && previous.alignmentKey === alignmentKey && Array.isArray(previous.matrix) &&
      previous.matrix.length === 6 && previous.matrix.every(Number.isFinite)) {
    prepared.matrix = [...previous.matrix];
    prepared.wideAlignmentNeedsReview = !coversArchiveTrim(wideImportMatrix(previous.matrix), illustration.width, illustration.height);
    if (prepared.wideAlignmentNeedsReview) {
      prepared.confirmed = false;
      if (requireSavedAlignment) throw new Error('확장 일러스트가 기존 배치의 재단 영역을 덮지 못해요. 카드에서 위치를 확인해 주세요.');
    }
    return prepared;
  }
  if (!wideImport && previous.alignmentKey === alignmentKey && Array.isArray(previous.matrix) && previous.matrix.length === 6 &&
      previous.matrix.every(Number.isFinite) && coversCard(previous.matrix, illustration.width, illustration.height)) {
    prepared.matrix = previous.matrix;
    return prepared;
  }
  if (requireSavedAlignment) throw new Error('확정한 일러스트 연결 위치가 변경됐어요. 해당 카드를 다시 확인하고 확정해 주세요.');
  prepared.confirmed = false;
  if (!wideImport && raw.width === WIDE.width) {
    const aligned = await alignWide(source, illustration, cut, canvas, { allowManual: true }).catch(() => null);
    if (aligned?.matrix && coversCard(aligned.matrix, illustration.width, illustration.height)) {
      prepared.initial = prepared.matrix = aligned.matrix;
    }
  }
  return prepared;
}
async function loadCard(index, imageId) {
  const id = catalog[index]?.id;
  const confirmation = confirmedPageRecord(id);
  const activeRecord = imageId === undefined || confirmation?.imageId === imageId ? confirmation : null;
  const otherRecord=id===JA06_REF ? confirmation?.otherOptions?.[imageId] : null;
  const pageRecord=activeRecord || (otherRecord?.confirmed === true && otherRecord.imageId===imageId ? otherRecord : null);
  imageId ??= pageRecord?.imageId ?? saved[id]?.imageId;
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
    const referenceId = catalog[index].id;
    const wantsJA = isJAPrintAlternative(imageId, referenceId);
    const wantsArchive = wantsJA || isArchivePlateId(imageId, referenceId);
    let payload;
    try { payload = await invoke('card', referenceId, wantsArchive ? undefined : imageId); }
    catch (error) {
      if (wantsArchive || !imageId || error.status !== 404) throw error;
      payload = await invoke('card', referenceId);
    }
    const { card } = payload;
    let archivePlate = null, missingConfirmedArtwork = false;
    if (wantsArchive) {
      const option = card.imageOptions?.find(option => option.id === imageId && option.kind === (wantsJA ? 'jaWide' : 'plate2mm'));
      if (!option) {
        if (!pageRecord || !card.illustration) throw new Error('이 카드의 보관된 2mm 출력판을 찾을 수 없어요.');
        missingConfirmedArtwork = true;
      } else {
        const plate = await invoke('card', referenceId, undefined, imageId);
        archivePlate = await (wantsJA ? decodeJAPrintAlternative : decodeArchivePlate)(plate, referenceId, imageId, image, canvas);
        card.illustration = {...option, cutRect:archivePlate.cutRect};
      }
    }
    const kinds = { standard: '기본 저장 이미지', face: '얼굴 가림 + 연결 맞추기 (BETA)', history: '기존 연결 맞추기 저장본' };
    const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' });
    if (card.imageOptions?.length) {
      const needsSelection = !card.illustration;
      $('printImage').replaceChildren(...card.imageOptions.map(option => {
        const date = new Date(option.createdAt);
        const suffix = !['standard','import','plate2mm','jaWide'].includes(option.kind) && Number.isFinite(+date) ? ' · ' + dateFormat.format(date) : '';
        const label = option.kind === 'jaWide' ? option.label : option.kind === 'plate2mm' ? option.label || '보관 출력판 · 2mm 블리드'
          : option.kind === 'import' ? option.label : kinds[option.kind] || '저장 이미지';
        return new Option(label + suffix, option.id);
      }));
      if (needsSelection) {
        const placeholder = new Option('출력용 일러스트를 선택해 주세요', '');
        placeholder.disabled = true;
        $('printImage').prepend(placeholder);
      }
      $('printImage').value = card.illustration?.id || '';
    }
    const previous = pageRecord?.imageId === card.illustration?.id && pageRecord ? pageRecord : archivePlate ? (wantsJA ? jaAlternativeSaved[jaDraftId(card.id,imageId)] : archiveSaved[card.id]) || {
      ...saved[card.id], ...(archivePlate.submittedTrim ? {language:'off',symbol:'off',border:'off',
        ...(!archivePlate.embeddedWatermark ? {watermark:'funyframe'} : {}),
      } : {}), confirmed:false,
    } : ((ordinaryDrafts[card.id]?.imageId === card.illustration?.id && ordinaryDrafts[card.id]) || saved[card.id] || {});
    const prepared = await prepareCard(card, previous, {archivePlate});
    if ((missingConfirmedArtwork || (!pageRecord && (archivePlate || confirmation))) && confirmation?.imageId !== card.illustration?.id) prepared.confirmed = false;
    prepared.needsPageSelection=!!prepared.confirmed && !activeRecord;
    if (ticket !== revision) return;
    const { cut, settings, illustration } = prepared;
    const languages = card.languages;
    $('printSymbol').replaceChildren(...prepared.symbols.map(value => new Option(symbolLabels[value], value)));
    for (const language of languages) $('printText').add(new Option(labels[language] || LANGUAGES[language] || language.toUpperCase(), language));
    for (const [key, id] of Object.entries(controls)) $(id).value = settings[key];
    $('printWindow').textContent = cut ? `일러스트 창 ${cut.w.toFixed(1)} × ${cut.h.toFixed(1)} mm · 완성 64 × 89 mm · 사방 블리드 ${printBleed(card)} mm` : '원본 카드 이미지';
    if (archivePlate?.submittedTrim) $('printWindow').textContent += archivePlate.embeddedWatermark
      ? ' · 첨부 워터마크 유지 · 확대하면 위치 조절 가능'
      : ' · 워터마크 선택 가능 · 확대하면 위치 조절 가능';
    else if (archivePlate?.jaAlternative) $('printWindow').textContent += archivePlate.ja16Pinned ? ' · 흰 창·워터마크 고정 · 일러스트 ±2 mm 범위 조절' : ' · JA 확장 일러스트';
    else if (archivePlate) $('printWindow').textContent += archivePlate.windowKnockout
      ? ' · 창 칼선과 흰 창 위치는 고정' : ' · 보관 출력판 · 창 칼선 위치 고정';
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
    // Opening a card must not replace an approved placement with an
    // automatically realigned or text-fallback preview.
    if (session.wideAlignmentNeedsReview) {
      setStatus('확장 일러스트가 기존 위치의 재단 영역을 모두 덮지 못해요. 기존 저장 위치는 그대로 두었으니 연결 위치를 확인해 주세요.');
    } else if (missingConfirmedArtwork) {
      setStatus('확정한 출력용 일러스트를 지금 선택할 수 없어 기본 일러스트를 표시합니다. 기존 확정은 유지했어요.');
    } else if (previous.confirmed === true && !session.confirmed) {
      setStatus(textError
        ? `${textError} 기존 확정값은 유지했어요.`
        : '미리보기 설정이나 연결 위치가 기존 확정값과 달라요. 확인 후 다시 확정하기 전까지 기존 설정을 유지합니다.');
    } else {
      // Opening a card or switching the dropdown is not confirmation.
      setStatus(textError || (languages.length ? '연결 위치와 출력 설정을 확인해 주세요.' : '확보된 텍스트 레이어가 없어 텍스트를 OFF로 표시합니다.'));
    }
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
function reviewPreparedArtwork(matrix) {
  const current = {...session, matrix};
  // The alignment dialog works in original-card coordinates; use the exact
  // corresponding area of the finished raster, not a second composition.
  const preview = trimmedPrintPreview(productionArtwork(current),canvas,showWatermark(current),current.settings.watermark,printBleed(current.card),PRINT_FOOTER_CENTER_Y);
  const native = canvas(1008,1408);
  native.getContext('2d').drawImage(preview,PRINT_SIDE_MARGIN*16,PRINT_TOP_MARGIN*16,1008,1408,0,0,1008,1408);
  return native;
}
$('printAlign').onclick = () => withCardAction(async () => {
  const {archivePlate, illustration, wideImport} = session;

  const picked = await reviewMobileAlignment({
    source: session.source, image: illustration, cutRect: session.cut, initial: session.initial,
    current: session.matrix, canvas,
    ...(archivePlate?.jaAlternative ? {showPreparedArtwork:true} : {}),
    ...(archivePlate?.ja16Pinned ? {
      renderArtwork: matrix => reviewPreparedArtwork(canAdjustJA16(matrix) ? matrix : session.matrix),
      canApply: canAdjustJA16,
    } : archivePlate ? {
      renderArtwork: matrix => archivePlate.jaAlternative ? reviewPreparedArtwork(matrix) : renderArchiveAlignment(archivePlate, matrix, canvas),
      canApply: matrix => archivePlate.submittedTrim ? submittedFits(matrix,archivePlate) : validArchiveMatrix(matrix, illustration),
    } : wideImport ? {
      renderArtwork: matrix => renderManual(illustration, wideImportMatrix(matrix), canvas),
      canApply: matrix => coversArchiveTrim(wideImportMatrix(matrix), illustration.width, illustration.height),
    } : {}),
  });
  if (!picked) return;
  if (archivePlate?.ja16Pinned && !canAdjustJA16(picked.matrix)) throw new Error('흰 창과 워터마크는 고정돼요. ±2 mm 범위 안에서 조절해 주세요.');
  if (archivePlate?.submittedTrim && !submittedFits(picked.matrix,archivePlate)) throw new Error('일러스트와 워터마크가 재단 영역을 벗어나지 않도록 조절해 주세요.');
  if (wideImport && !coversArchiveTrim(wideImportMatrix(picked.matrix), illustration.width, illustration.height)) throw new Error('재단 영역을 덮도록 일러스트 연결 위치를 확인해 주세요.');
  if (archivePlate && !validArchiveMatrix(picked.matrix, illustration)) throw new Error('일러스트 연결 위치를 확인해 주세요.');
  const previous = session.matrix;
  session.matrix = picked.matrix;
  session.original = false;
  try { await compose(); } catch (error) { session.matrix = previous; throw error; }
  session.wideAlignmentNeedsReview = false;
  session.confirmed = false;
  save();
  setStatus('일러스트 연결 위치를 적용했어요.');
});
for (const [key, id] of Object.entries(controls)) {
  $(id).onchange = e => withCardAction(async () => {
    if (key === 'watermark' && (session.archivePlate?.embeddedWatermark || !watermarkChoices.has(e.target.value))) {
      e.target.value = session.settings.watermark;
      return;
    }
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
  try { save({confirmOnPage:true}); }
  catch { session.confirmed=false; throw new Error('이 브라우저에서 설정을 저장하지 못했어요. 다시 시도해 주세요.'); }
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
    showRoundTrimGuide: !session.archivePlate && !isRestoredPrintImage(session.card), preservePreparedWindow: !!session.archivePlate || session.filledWideWindow, windowGuideInset: 0, trimMargin: ADMIN_PRINT_TRIM_MARGIN, watermark: showWatermark(session), watermarkText: settings.watermark, footerCenterY: PRINT_FOOTER_CENTER_Y, cutoutCard: card, production,
  });
  const pdf = makePDF(await encodePrintImage(sheet), sheet.width, sheet.height, 83, 118,
    production ? { cutContour: printWindowRect(cut) } : undefined);
  const suffix = session.archivePlate ? (production ? '-2MM-PRINT.pdf' : '-2MM.pdf') : (production ? '-PRINT.pdf' : '.pdf');
  const fileName = cardFilename(card).replace(/\.pdf$/, suffix);
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
function clearFunyframeDownload() {
  const link = $('printFunyframeDownload');
  link.hidden = true;
  link.removeAttribute('href');
  if (funyframeDownloadUrl) URL.revokeObjectURL(funyframeDownloadUrl);
  funyframeDownloadUrl = null;
}
function makeFunyframeDownloadReady(pdf) {
  // Report a ready file instead of attempting an automatic click after the
  // preceding asynchronous render has outlived browser user activation.
  const link = $('printFunyframeDownload');
  funyframeDownloadUrl = URL.createObjectURL(pdf);
  link.href = funyframeDownloadUrl;
  link.hidden = false;
}
function clearSettingsExport() {
  const link=$('printSettingsExportDownload');
  link.hidden=true;
  link.removeAttribute('href');
  if(settingsExportUrl) URL.revokeObjectURL(settingsExportUrl);
  settingsExportUrl=null;
  $('printSettingsExportStatus').textContent='';
}
async function resolveExportArtwork(referenceId, {illustrationId,matrix,cutMm}, alternative, preflight=false) {
  if (!catalog.some(card=>card.id===referenceId)) return {status:'unavailable'};
  let result;
  try { result=await invoke('card',referenceId,alternative?undefined:illustrationId); }
  catch(error) { if(error.status===404) return {status:'unavailable'}; throw error; }
  const card=result?.card;
  const option=card?.imageOptions?.find(item=>item.id===illustrationId);
  if (card?.id!==referenceId || !option ||
      (alternative ? option.kind!=='jaWide'||option.referenceId!==referenceId : card.illustration?.id!==illustrationId)) return {status:'unavailable'};
  const cut=alternative?option.cutRect:resolveSavedPrintCut(card);
  if(!cut||Object.keys(cutMm).some(key=>cut[key]!==cutMm[key]))return {status:'invalid'};
  if(alternative){
    const {width,height,embeddedWatermark,windowKnockout}=option;
    const submitted=option.sourceKind==='submitted-trim';
    const extra=illustrationId===JA06_EXTRA_ID;
    const dimensions=extra?[800,1112]:submitted?[506,704]:[1536,2136];
    if(width!==dimensions[0]||height!==dimensions[1]||typeof embeddedWatermark!=='boolean'||typeof windowKnockout!=='boolean'||
      (extra && (!submitted||embeddedWatermark||windowKnockout)))return {status:'invalid'};
    const spec=extra?{width,height,scale:Math.max(1024/width,1424/height)*(1+1e-9)}:undefined;
    if(!coversArchiveTrim(matrix,width,height) ||
       (submitted && !canAdjustSubmittedJA(matrix,spec,!extra)) ||
       (referenceId==='m6a-ja-032' && !canAdjustJA16(matrix)))return {status:'invalid'};
    const rawVerification=preflight?await verifySubmittedExportArtwork(referenceId,illustrationId,width,height):null;
    return {nativeSource:{layout:submitted?'submitted-trim':'ja-wide',width,height,embeddedWatermark,windowKnockout},rawVerification};
  }
  if(!['standard','face','history'].includes(option.kind))return {status:'unavailable'};
  const {width,height,hasGeneratedOverscan}=card.illustration;
  const padded=width===WIDE.cardWidth&&height===WIDE.cardHeight;
  if ((!padded&&(width!==WIDE.width||height!==WIDE.height))||!coversCard(matrix,WIDE.width,WIDE.height))return {status:'invalid'};
  const rawVerification=preflight?await verifyPrivatePrintPng(card.illustration.url,new URL(auth.client.supabaseUrl).origin,width,height)
    .catch(()=>({status:'unavailable'})):null;
  return {nativeSource:{layout:padded?'native-card-padded-to-wide':'wide',width,height,
    matrixWidth:WIDE.width,matrixHeight:WIDE.height,padX:padded?WIDE.padX:0,padY:padded?WIDE.padY:0,
    hasGeneratedOverscan:hasGeneratedOverscan===true},rawVerification};
}
async function verifySubmittedExportArtwork(referenceId,illustrationId,width,height){
  if(![JA06_EXTRA_ID,'ja-wide-print:m6a-ja-028','ja-wide-print:m6a-ja-029'].includes(illustrationId))return {status:'not-in-scope'};
  try{
    const {plate}=await invoke('card',referenceId,undefined,illustrationId);
    if(plate?.id!==illustrationId||plate.referenceId!==referenceId||plate.embeddedWatermark!==false||plate.windowKnockout!==false||
       typeof plate.wideWebp!=='string'||!/^data:image\/webp;base64,UklGR/.test(plate.wideWebp)||plate.wideWebp.length>6000000)return {status:'unavailable'};
    const raw=await image(plate.wideWebp);
    const bytes=Uint8Array.from(atob(plate.wideWebp.slice(23)),char=>char.charCodeAt(0));
    const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    return {status:raw.width===width&&raw.height===height?'matches':'dimension-mismatch',
      mediaType:'image/webp',width:raw.width,height:raw.height,sha256};
  }catch(error){
    if(error.status===401||error.status===403)throw error;
    return {status:'unavailable'};
  }
}
async function prepareSettingsExport(preflight=false) {
  if(busy||!catalog.length) return;
  clearSettingsExport();
  busy=true;
  refreshControls();
  const status=$('printSettingsExportStatus');
  status.textContent='저장된 일러스트와 연결 위치를 확인하고 있어요.';
  try{
    const report=await buildPrintSettingsExport({references:PIKACHU_SHEET_IDS,pageConfirmed,saved,
      isAlternative:isJAPrintAlternative,resolve:(id,values,alternative)=>resolveExportArtwork(id,values,alternative,preflight)});
    const sourceErrors=preflight?report.rows.filter(row=>row.rawVerification?.status!=='matches').map(row=>row.slot):[];
    if(preflight)report.sourcePreflight={allMatched:!sourceErrors.length,checked:report.rows.length-sourceErrors.length,needsReview:sourceErrors};
    const file=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});
    const link=$('printSettingsExportDownload');
    settingsExportUrl=URL.createObjectURL(file);
    link.href=settingsExportUrl;
    link.hidden=false;
    const unverified=report.rows.filter(row=>!['verified','legacy-candidate'].includes(row.status)).map(row=>row.slot);
    const legacySlots=report.rows.filter(row=>row.status==='legacy-candidate').map(row=>row.slot);
    const {exact,legacy}=report.summary;
    status.textContent=`현재 확정 ${exact}개 · 이전 확정 기록 ${legacy}개.`+
      (unverified.length?` 확인 필요: ${unverified.join(', ')}번. 이 번호는 일러스트나 연결 위치를 추정하지 않았어요.`:'')+
      (legacy?` ${legacySlots.join(', ')}번은 이전 확정 기록만 있어 현재 화면에서 다시 확정해 주세요.`:'')+
      (preflight?(sourceErrors.length?` 원본 확인 필요: ${sourceErrors.join(', ')}번.`:' 원본 크기 30개를 확인했어요.'):'');
  }catch(error){
    if(error.status===401||error.status===403)errorMessage(error);
    else status.textContent='저장된 일러스트를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }finally{busy=false;refreshControls();}
}
$('printExportSettings').onclick = () => prepareSettingsExport(false);
$('printPreflightExport').onclick = () => prepareSettingsExport(true);
async function downloadPikachuSheet(funyframe = false) {
  if (busy || !catalog.length) return;
  if (funyframe) clearFunyframeDownload();
  const setBatchStatus = funyframe ? message => { $('printFunyframeStatus').textContent = message; } : setStatus;
  const missing = PIKACHU_SHEET_IDS.flatMap((id, index) => catalog.some(card => card.id === id && card.hasIllustration) ? [] : [index+1]);
  if (missing.length) {
    setBatchStatus(`확장 일러스트를 확인해 주세요. 작업 순서 ${missing.join(', ')}번의 이미지가 미확보 상태입니다.`);
    return;
  }
  if (funyframe) {
    const unconfirmed = PIKACHU_SHEET_IDS.flatMap((id, index) => saved[id]?.confirmed === true && saved[id].imageId ? [] : [index+1]);
    if (unconfirmed.length) {
      setBatchStatus(`퍼니프레임 출력을 위해 작업 순서 ${unconfirmed.join(', ')}번의 일러스트 연결 위치를 확인하고 설정을 확정해 주세요.`);
      return;
    }
  }
  busy = true;
  refreshControls();
  $('printReload').hidden = true;
  let order = 0;
  try {
    const tiles = [];
    for (const id of PIKACHU_SHEET_IDS) {
      order++;
      setBatchStatus(`${funyframe ? '퍼니프레임 ' : ''}피카츄 인쇄용 도안을 준비하고 있어요. ${order}/30`);
      const previous = saved[id] || {};
      // Batch output remains based on its ordinary records, not the editor's
      // active alternative or an unconfirmed draft.
      const {card} = await invoke('card', id, previous.imageId);
      if (!card.illustration || (previous.imageId && card.illustration.id !== previous.imageId)) {
        throw new Error('저장된 출력 이미지를 다시 선택해 주세요.');
      }
      const current = await prepareCard(card, previous, {requireSavedAlignment: funyframe});
      if (funyframe) current.settings = {...FUNYFRAME_SHEET_SETTINGS};
      else if ((previous.language && previous.language !== current.settings.language) ||
          (previous.confirmed && !current.confirmed)) {
        throw new Error('변경된 연결 위치나 저장된 출력 설정을 카드에서 다시 확인해 주세요.');
      }
      if (!funyframe) current.output = await renderCard(current);

      if (current.wideAlignmentNeedsReview) throw new Error('확장 일러스트의 재단 영역을 카드에서 확인해 주세요.');
      current.printOutput = await renderCard(current,true);
      const tile = productionTile(current, {funyframe});
      try {
        tiles.push({jpeg:await encodePrintImage(tile), cut:current.cut, shape:current.settings.shape});
      } finally {
        tile.width = tile.height = 0;
        if (funyframe) {
          current.printOutput.width = current.printOutput.height = 0;
          current.source.width = current.source.height = 0;
        }
      }
    }
    if (funyframe) {
      makeFunyframeDownloadReady(makePikachuSheetPDF(tiles, {funyframe: true}));
      setBatchStatus('30종 PDF가 준비됐어요. 아래 ‘준비된 퍼니프레임 A2 PDF 받기’를 눌러 저장해 주세요.');
    } else {
      downloadPrintPDF(makePikachuSheetPDF(tiles), 'FUNY PIN - PIKACHU 01-30 - A2 PRINT.pdf');
      setStatus('피카츄 30종 인쇄용 PDF를 저장했어요. A2 용지에 실제 크기(100%)로 출력해 주세요.');
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) errorMessage(error);
    else setBatchStatus(`작업 순서 ${order}번에서 출력이 중단됐어요. ${error.message || '잠시 후 다시 시도해 주세요.'}`);
  } finally {
    busy = false;
    refreshControls();
  }
}
$('printPikachuSheet').onclick = () => downloadPikachuSheet();
$('printFunyframeSheet').onclick = () => downloadPikachuSheet(true);
$('printFunyframeDownload').onclick = () => {
  $('printFunyframeStatus').textContent = 'PDF 저장을 요청했어요. A2 용지에 실제 크기(100%)로 출력해 주세요.';
};
function productionArtwork({output, printOutput, printFoil, illustration, matrix, settings, hasWideArtwork, card, archivePlate, wideImport}) {
  if (archivePlate?.submittedTrim) return withProductionCardBleed(printOutput || output, canvas, {
    artwork:archivePlate.bleedArtwork, matrix:submittedBleedMatrix(matrix, archivePlate.submittedSpec || undefined), bleed:ARCHIVE_BLEED_MM, foil:printFoil, shape:settings.shape,
  });
  if (archivePlate?.ja16Pinned) return withProductionCardBleed(printOutput || output, canvas, {
    artwork:renderJA16PinnedPlate(archivePlate,matrix,canvas), matrix:ARCHIVE_NATIVE_MATRIX, bleed:ARCHIVE_BLEED_MM, foil:printFoil, shape:settings.shape,
  });
  if (archivePlate) return composeArchiveProduction(archivePlate, printOutput || output, canvas, {matrix, foil:printFoil, shape:settings.shape});
  if (isRestoredPrintImage(card)) {
    const bleed = printBleed(card);
    if (wideImport) return withProductionCardBleed(printOutput || output, canvas, {
      artwork: illustration, matrix: wideImportMatrix(matrix), foil:printFoil, shape:settings.shape, bleed,
    });
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
function productionTile(current, {funyframe = false} = {}) {
  const {cut} = current;
  const scale = PRINT.scale, bleed = ADMIN_PRINT_BLEED;
  const tile = canvas((PRINT.width+2*bleed)*scale, (PRINT.height+2*bleed)*scale);
  const g = tile.getContext('2d');
  g.drawImage(productionArtwork(current),0,0,tile.width,tile.height);
  if (!funyframe && !current.filledWideWindow) drawProductionWindow(g, {x:(bleed+PRINT_SIDE_MARGIN+cut.x)*scale,y:(bleed+PRINT_TOP_MARGIN+cut.y)*scale,w:cut.w*scale,h:cut.h*scale}, scale);
  if (showWatermark(current)) drawArtWatermark(g,(bleed+PRINT_SIDE_MARGIN)*scale,(bleed+PRINT_TOP_MARGIN)*scale,63*scale,88*scale,current.settings.watermark,PRINT_FOOTER_CENTER_Y);
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
    archiveKey = 'funypin:pikachu-print:archive-2mm:v1:' + adminId;
    const readSaved = key => {
      try {
        const stored = JSON.parse(localStorage.getItem(key));
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
      } catch { return {}; }
    };
    saved = readSaved(storageKey);
    archiveSaved = readSaved(archiveKey);
    pageConfirmedKey = 'funypin:pikachu-print:page-confirmed:v1:' + adminId;
    pageConfirmed = readSaved(pageConfirmedKey);
    ordinaryDraftKey = 'funypin:pikachu-print:ordinary-draft:v1:' + adminId;
    ordinaryDrafts = readSaved(ordinaryDraftKey);
    jaAlternativeKey = 'funypin:pikachu-print:ja-alternative:v1:' + adminId;
    jaAlternativeSaved = readSaved(jaAlternativeKey);
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
