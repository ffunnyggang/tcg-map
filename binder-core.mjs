export const LIMIT=3,MAX_PAGES=60;
export const layouts={4:{cols:2,rows:2,ratio:.76},6:{cols:2,rows:3,ratio:.52},9:{cols:3,rows:3,ratio:.76},12:{cols:3,rows:4,ratio:.58}};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const newPage=()=>({id:crypto.randomUUID(),path:null});
export const newDraft=(user_id,pockets,title)=>({user_id,pockets,title:title.trim()||'나의 바인더',description:'',cover:null,pages:Array.from({length:20},newPage)});
export function movePage(pages,id,delta){const next=pages.slice(),i=next.findIndex(p=>p.id===id),j=i+delta;if(i<0||j<0||j>=next.length)return next;[next[i],next[j]]=[next[j],next[i]];return next;}
export function filled(pages){return pages.filter(p=>p.path);}
export function cropGeometry(iw,ih,w,h,zoom,x,y){const scale=Math.max(w/iw,h/ih)*zoom;const dw=iw*scale,dh=ih*scale;return {dw,dh,dx:Math.max(w-dw,Math.min(0,(w-dw)/2+x)),dy:Math.max(h-dh,Math.min(0,(h-dh)/2+y))};}
export function message(e){const m=e?.message||String(e);if(m.includes('BINDER_LIMIT'))return '바인더는 최대 3개까지 만들 수 있어요.';if(m.includes('PHOTO_REQUIRED'))return '본문 사진을 한 장 이상 추가해주세요.';if(m.includes('COMMENT_RATE_LIMIT'))return '잠시 후 댓글을 등록해주세요.';if(m.includes('REVISION_CONFLICT'))return '다른 화면에서 수정했어요. 새로고침 후 다시 확인해주세요.';if(m.includes('PAGE_LIMIT'))return '본문은 최대 60페이지까지 추가할 수 있어요.';if(/fetch|network/i.test(m))return '연결을 확인하고 다시 시도해주세요.';return m;}
