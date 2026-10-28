(()=>{'use strict';
const css=document.createElement('style');
css.textContent='.cms-crop-stage.cms-instagram-embed-preview{isolation:isolate}.cms-instagram-embed-preview .cms-instagram-embed-window{position:absolute;inset:0;overflow:hidden;z-index:1;background:#f4f2f5;pointer-events:none}.cms-instagram-embed-preview .cms-instagram-embed-window iframe{position:absolute;left:0;top:-50px;width:540px;height:760px;border:0;transform:scale(var(--ig-scale,.297));transform-origin:top left;pointer-events:none}.cms-instagram-embed-preview .cms-image-remove{z-index:4}.cms-instagram-embed-preview .cms-embed-caption{position:absolute;left:4px;bottom:4px;z-index:2;padding:3px 5px;font-size:8px;background:#ffffffd9;color:#51456c;border-radius:4px;pointer-events:none}.cms-crop-stage.card.cms-instagram-embed-preview .cms-instagram-embed-window iframe{top:-50px}';
document.head.appendChild(css);
const valid=url=>{try{const u=new URL(url);if(u.protocol!=='https:'||!['www.instagram.com','instagram.com'].includes(u.hostname))return null;const m=u.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);return m?'https://www.instagram.com/'+m[1]+'/'+m[2]+'/embed/':null}catch{return null}};
let pending=false;
function paint(){pending=false;const editor=document.getElementById('cmsEditor');if(!editor)return;const stage=editor.querySelector('#cmsCropStage'),urlInput=editor.querySelector('#cmsBlockUrl');if(!stage||!urlInput)return;
const src=valid(urlInput.value);const existing=stage.querySelector('.cms-instagram-embed-window');
if(!src||!stage.querySelector('img')||stage.classList.contains('simple')){existing?.remove();stage.querySelector('.cms-embed-caption')?.remove();stage.classList.remove('cms-instagram-embed-preview');return}
if(existing?.dataset.src===src)return;
existing?.remove();stage.querySelector('.cms-embed-caption')?.remove();stage.classList.add('cms-instagram-embed-preview');
const win=document.createElement('div');win.className='cms-instagram-embed-window';win.dataset.src=src;
const iframe=document.createElement('iframe');iframe.title='Instagram 임베드 미리보기';iframe.src=src;iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.setAttribute('aria-hidden','true');win.appendChild(iframe);
const scale=Math.min(1,Math.max(0.20,stage.clientWidth/540));win.style.setProperty('--ig-scale',String(scale));
stage.prepend(win);const note=document.createElement('span');note.className='cms-embed-caption';note.textContent='임베드 미리보기';stage.append(note);
}
const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(paint)});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('input',e=>{if(e.target?.id==='cmsBlockUrl'){if(!pending){pending=true;requestAnimationFrame(paint)}}});
})();