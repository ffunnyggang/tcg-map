from pathlib import Path

app=Path('app.js')
js=app.read_text(encoding='utf-8')

gallery_data="const SHOP_GALLERIES={'KR-SEO-001':['images/shops/cardnova/detail/IMG_8687.jpeg','images/shops/cardnova/detail/IMG_8685.jpeg','images/shops/cardnova/detail/IMG_8686.jpeg','images/shops/cardnova/detail/IMG_8688.jpeg','images/shops/cardnova/detail/IMG_8689.jpeg','images/shops/cardnova/detail/IMG_8690.jpeg','images/shops/cardnova/detail/IMG_8691.jpeg','images/shops/cardnova/detail/IMG_8692.jpeg']};"
if 'const SHOP_GALLERIES=' not in js:
    js=js.replace('const SHOP_IMAGES=',gallery_data+'const SHOP_IMAGES=',1)

old='<div class="hero-placeholder">매장 이미지 준비 중</div><div class="hero-count">${icon(\'image\')}<span>1 / 1</span></div>'
if old not in js:
    raise SystemExit('hero placeholder pattern not found')
js=js.replace(old,'${heroGalleryHTML(s)}',1)

gallery_fn="""function heroGalleryHTML(s){const imgs=SHOP_GALLERIES[s.id]||[];if(!imgs.length)return `<div class=\"hero-placeholder\">매장 이미지 준비 중</div><div class=\"hero-count\">${icon('image')}<span>1 / 1</span></div>`;return `<div class=\"hero-gallery\" data-gallery><div class=\"hero-track\">${imgs.map((src,i)=>`<div class=\"hero-slide\"><img src=\"${src}\" alt=\"${esc(s.name)} 매장 사진 ${i+1}\" ${i===0?'':'loading=\"lazy\"'} decoding=\"async\"></div>`).join('')}</div>${imgs.length>1?`<button class=\"gallery-nav gallery-prev\" type=\"button\" aria-label=\"이전 사진\">‹</button><button class=\"gallery-nav gallery-next\" type=\"button\" aria-label=\"다음 사진\">›</button>`:''}<div class=\"hero-count\">${icon('image')}<span data-gallery-count>1 / ${imgs.length}</span></div></div>`}function bindHeroGallery(){const g=document.querySelector('[data-gallery]');if(!g)return;const track=g.querySelector('.hero-track'),slides=[...g.querySelectorAll('.hero-slide')],count=g.querySelector('[data-gallery-count]');if(slides.length<2)return;let index=0,startX=0,deltaX=0;const show=i=>{index=(i+slides.length)%slides.length;track.style.transform=`translateX(-${index*100}%)`;if(count)count.textContent=`${index+1} / ${slides.length}`};g.querySelector('.gallery-prev')?.addEventListener('click',()=>show(index-1));g.querySelector('.gallery-next')?.addEventListener('click',()=>show(index+1));g.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;deltaX=0},{passive:true});g.addEventListener('touchmove',e=>{deltaX=e.touches[0].clientX-startX},{passive:true});g.addEventListener('touchend',()=>{if(Math.abs(deltaX)>45)show(index+(deltaX<0?1:-1));startX=0;deltaX=0},{passive:true})} """
if 'function heroGalleryHTML' not in js:
    js=js.replace('function detailHTML(s){',gallery_fn+'function detailHTML(s){',1)

old_bind='setTimeout(()=>{bindDetail();loadReviewThumbs()},0)'
if old_bind not in js:
    raise SystemExit('detail bind pattern not found')
js=js.replace(old_bind,'setTimeout(()=>{bindDetail();bindHeroGallery();loadReviewThumbs()},0)',1)
app.write_text(js,encoding='utf-8')

cssp=Path('style.css')
css=cssp.read_text(encoding='utf-8')
gallery_css='''\n/* Detail hero gallery */\n.hero-gallery{position:absolute;inset:0;overflow:hidden;background:#e9e5de;z-index:0;touch-action:pan-y}\n.hero-track{display:flex;width:100%;height:100%;transition:transform .32s cubic-bezier(.22,.61,.36,1);will-change:transform}\n.hero-slide{flex:0 0 100%;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e9e5de}\n.hero-slide img{width:100%;height:100%;display:block;object-fit:cover;object-position:center}\n.hero-gallery .hero-count{z-index:4;display:flex;align-items:center;gap:4px}\n.hero-gallery .hero-count svg{width:12px;height:12px}\n.gallery-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:34px;height:34px;border:0;border-radius:50%;background:rgba(20,20,20,.38);color:#fff;font-size:26px;line-height:1;display:grid;place-items:center;padding:0;backdrop-filter:blur(4px)}\n.gallery-prev{left:12px}.gallery-next{right:12px}\n.hero:has(.hero-gallery):before{display:none}\n.hero:has(.hero-gallery) .hero-top{z-index:5}\n@media(max-width:560px){.gallery-nav{width:32px;height:32px;font-size:24px}.gallery-prev{left:10px}.gallery-next{right:10px}}\n'''
if '/* Detail hero gallery */' not in css:
    css+=gallery_css
cssp.write_text(css,encoding='utf-8')
