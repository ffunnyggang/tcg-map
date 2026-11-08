export const NOTICE_VERSION='20261107-v1';
export const LANGUAGES={ko:'한국어',ja:'日本語',en:'English'};
export const validWindow=r=>!!r&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.w>=5&&r.h>=5&&r.x+r.w<=63.001&&r.y+r.h<=88.001;
export function insetWindow(r){if(!validWindow(r))throw Error('일러스트 창 정보가 준비되지 않았어요.');const v={x:r.x+.2,y:r.y+.2,w:r.w-.4,h:r.h-.4};for(const k of ['x','y','w','h'])v[k]=Math.round(v[k]*10)/10;if(!validWindow(v))throw Error('일러스트 창 크기를 확인해 주세요.');return v;}
export function nudgeWindow(r,mode,direction){const v={...r},n=.1;if(mode==='size'){if(direction==='left')v.w-=n;if(direction==='right')v.w+=n;if(direction==='up')v.h+=n;if(direction==='down')v.h-=n;}else{if(direction==='left')v.x-=n;if(direction==='right')v.x+=n;if(direction==='up')v.y-=n;if(direction==='down')v.y+=n;}for(const k of ['x','y','w','h'])v[k]=Math.round(v[k]*10)/10;return validWindow(v)?v:{...r};}
const clean=s=>String(s??'').normalize('NFKC').toLocaleLowerCase().replace(/\s/g,'');
export function pageCards(rows,language,query,page=0){const q=clean(query),numeric=/^\d+(?:\/\d+)?$/.test(q)?Number(q.split('/')[0]):null;const list=rows.filter(r=>r.source_language===language&&(!q||(numeric!==null?Number(r.card_number)===numeric:clean(r.display_name+' '+r.card_number).includes(q)))).sort((a,b)=>String(a.card_number).localeCompare(String(b.card_number),'ko',{numeric:true})||a.id.localeCompare(b.id));const pages=Math.max(1,Math.ceil(list.length/12)),current=Math.max(0,Math.min(page,pages-1));return {rows:list.slice(current*12,current*12+12),total:list.length,pages,page:current};}
export function cardFilename(card){return ('FUNY PIN - AI EXTENDED ART_'+card.display_name+'-'+card.card_number+'-'+card.source_language+'.pdf').normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ');}


const ART_NAME_ALIASES=[['피카츄','ピカチュウ','Pikachu']];
export function searchArtCards(rows,language,query,page=0){
 const q=clean(query);if(!q)return {rows:[],total:0,pages:1,page:0};
 const numeric=/^\d+(?:\/\d+)?$/.test(q)?Number(q.split('/')[0]):null;
 const aliases=ART_NAME_ALIASES.find(names=>names.some(name=>clean(name)===q));
 const terms=aliases?aliases.map(clean):[q];
 const matches=rows.filter(r=>(language==='all'||r.source_language===language)&&(numeric!==null?Number(r.card_number)===numeric:terms.some(term=>clean(r.display_name+' '+r.card_number).includes(term)))).sort((a,b)=>String(a.card_number).localeCompare(String(b.card_number),'ko',{numeric:true})||a.source_language.localeCompare(b.source_language)||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(matches.length/12)),current=Math.max(0,Math.min(page,pages-1));return {rows:matches.slice(current*12,current*12+12),total:matches.length,pages,page:current};
}
