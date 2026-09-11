from pathlib import Path
import re

app=Path('app.js')
js=app.read_text(encoding='utf-8')

galleries={
'KR-SEO-001':[f'images/shops/cardnova/detail/cardnova_detail_{i:03d}.jpg' for i in range(1,9)],
'KR-SEO-002':[f'images/shops/rubycard/detail/rubycard_detail_{i:03d}.jpg' for i in range(1,8)],
'KR-SEO-003':[f'images/shops/firstcard/detail/firstcard_detail_{i:03d}.jpg' for i in range(1,6)],
'KR-SEO-004':[f'images/shops/collecton/detail/colleton_detail_{i:03d}.jpg' for i in range(1,9)],
'KR-SEO-005':['images/shops/cardgarden/detail/cardgarden_detail_001.jpg'],
'KR-SEO-006':[f'images/shops/cardtown/detail/cardtown_detail_{i:03d}.jpg' for i in range(1,3)],
'KR-SEO-007':[f'images/shops/moacard/detail/moacard_detail_{i:03d}.jpg' for i in range(1,7)],
'KR-SEO-008':[f'images/shops/cardstory/detail/cardstory_detail_{i:03d}.jpg' for i in range(1,5)],
'KR-SEO-009':[f'images/shops/thecardroom/detail/thecardroom_detail_{i:03d}.jpg' for i in range(1,6)],
'KR-SEO-010':[f'images/shops/goldenarchive/detail/goldenarchive_detail_{i:03d}.jpg' for i in range(1,7)],
'KR-SEO-011':[f'images/shops/goldenmuseum/detail/goldenmuseum_detail_{i:03d}.jpg' for i in range(1,3)],
'KR-SEO-012':[f'images/shops/collectotcg/detail/collectotcg_detail_{i:03d}.jpg' for i in range(1,8)],
'KR-SEO-013':[f'images/shops/cardvault/detail/cardvault_detail_{i:03d}.jpg' for i in range(1,6)],
'KR-SEO-014':[f'images/shops/cardsungji/detail/cardsungji_detail_{i:03d}.jpg' for i in range(1,7)],
'KR-SEO-015':[f'images/shops/redlabel/detail/redlabel_detail_{i:03d}.jpg' for i in range(1,4)],
}

def js_array(items):
    return '['+','.join(repr(x) for x in items)+']'

gallery_data='const SHOP_GALLERIES={'+','.join(repr(k)+':'+js_array(v) for k,v in galleries.items())+'};'
if 'const SHOP_GALLERIES=' in js:
    js=re.sub(r"const SHOP_GALLERIES=\{.*?\};",gallery_data,js,count=1)
else:
    js=js.replace('const SHOP_IMAGES=',gallery_data+'const SHOP_IMAGES=',1)

old='<div class="hero-placeholder">매장 이미지 준비 중</div><div class="hero-count">${icon(\'image\')}<span>1 / 1</span></div>'
if 'function heroGalleryHTML' not in js:
    if old not in js: raise SystemExit('hero placeholder pattern not found')
    js=js.replace(old,'${heroGalleryHTML(s)}',1)
    gallery_fn="""function heroGalleryHTML(s){const imgs=SHOP_GALLERIES[s.id]||[];if(!imgs.length)return `<div class=\"hero-placeholder\">매장 이미지 준비 중</div><div class=\"hero-count\">${icon('image')}<span>1 / 1</span></div>`;return `<div class=\"hero-gallery\" data-gallery><div class=\"hero-track\">${imgs.map((src,i)=>`<div class=\"hero-slide\"><img src=\"${src}\" alt=\"${esc(s.name)} 매장 사진 ${i+1}\" ${i===0?'':'loading=\"lazy\"'} decoding=\"async\"></div>`).join('')}</div>${imgs.length>1?`<button class=\"gallery-nav gallery-prev\" type=\"button\" aria-label=\"이전 사진\">‹</button><button class=\"gallery-nav gallery-next\" type=\"button\" aria-label=\"다음 사진\">›</button>`:''}<div class=\"hero-count\">${icon('image')}<span data-gallery-count>1 / ${imgs.length}</span></div></div>`}function bindHeroGallery(){const g=document.querySelector('[data-gallery]');if(!g)return;const track=g.querySelector('.hero-track'),slides=[...g.querySelectorAll('.hero-slide')],count=g.querySelector('[data-gallery-count]');if(slides.length<2)return;let index=0,startX=0,deltaX=0;const show=i=>{index=(i+slides.length)%slides.length;track.style.transform=`translateX(-${index*100}%)`;if(count)count.textContent=`${index+1} / ${slides.length}`};g.querySelector('.gallery-prev')?.addEventListener('click',()=>show(index-1));g.querySelector('.gallery-next')?.addEventListener('click',()=>show(index+1));g.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;deltaX=0},{passive:true});g.addEventListener('touchmove',e=>{deltaX=e.touches[0].clientX-startX},{passive:true});g.addEventListener('touchend',()=>{if(Math.abs(deltaX)>45)show(index+(deltaX<0?1:-1));startX=0;deltaX=0},{passive:true})} """
    js=js.replace('function detailHTML(s){',gallery_fn+'function detailHTML(s){',1)
if 'bindHeroGallery();' not in js:
    js=js.replace('setTimeout(()=>{bindDetail();loadReviewThumbs()},0)','setTimeout(()=>{bindDetail();bindHeroGallery();loadReviewThumbs()},0)',1)
app.write_text(js,encoding='utf-8')

cssp=Path('style.css')
css=cssp.read_text(encoding='utf-8')
gallery_css='''\n/* Detail hero gallery */\n.hero-gallery{position:absolute;inset:0;overflow:hidden;background:#e9e5de;z-index:0;touch-action:pan-y}\n.hero-track{display:flex;width:100%;height:100%;transition:transform .32s cubic-bezier(.22,.61,.36,1);will-change:transform}\n.hero-slide{flex:0 0 100%;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e9e5de}\n.hero-slide img{width:100%;height:100%;display:block;object-fit:cover;object-position:center}\n.hero-gallery .hero-count{z-index:4;display:flex;align-items:center;gap:4px}\n.hero-gallery .hero-count svg{width:12px;height:12px}\n.gallery-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:34px;height:34px;border:0;border-radius:50%;background:rgba(20,20,20,.38);color:#fff;font-size:26px;line-height:1;display:grid;place-items:center;padding:0;backdrop-filter:blur(4px)}\n.gallery-prev{left:12px}.gallery-next{right:12px}\n.hero:has(.hero-gallery):before{display:none}\n.hero:has(.hero-gallery) .hero-top{z-index:5}\n@media(max-width:560px){.gallery-nav{width:32px;height:32px;font-size:24px}.gallery-prev{left:10px}.gallery-next{right:10px}}\n'''
if '/* Detail hero gallery */' not in css: css+=gallery_css
cssp.write_text(css,encoding='utf-8')
