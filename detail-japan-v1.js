/* FUNY PIN Japan shop detail compatibility + Google Places enrichment */
(function(){
  if(typeof detailHTML!=='function'||typeof openDetail!=='function')return;
  const baseDetailHTML=detailHTML;
  const placeCache=new Map();

  function isJapan(s){return String(s&&s.id||'').startsWith('JP-')}
  function escJP(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function googleSection(){return '<section class="section google-place-section" data-google-place-section><h2 class="section-title"><span class="accent-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.5 14.6 9l5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2L9.4 9 12 3.5Z"/></svg></span>Google 매장 정보</h2><div class="google-place-card" data-google-place-content><div class="google-place-loading">Google 정보를 불러오는 중...</div></div></section>'}

  detailHTML=function(s){
    let html=baseDetailHTML(s);
    if(isJapan(s)){
      html=html.replace(/ · ([^<]+?) 도보 (?:undefined|null)?분/g,' · $1').replace(/ 도보 (?:undefined|null)?분/g,'');
      const marker='<div style="height:10px"></div>';
      html=html.includes(marker)?html.replace(marker,googleSection()+marker):html+googleSection();
    }
    return html;
  };

  function waitForPlaces(){
    if(window.google&&google.maps&&google.maps.places)return Promise.resolve();
    return new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{n++;if(window.google&&google.maps&&google.maps.places){clearInterval(t);resolve()}else if(n>50){clearInterval(t);reject(new Error('places unavailable'))}},120)})
  }
  function findPlace(shop){
    if(placeCache.has(shop.id))return placeCache.get(shop.id);
    const p=waitForPlaces().then(()=>new Promise((resolve,reject)=>{
      const host=document.getElementById('google-map')||document.createElement('div');
      const service=new google.maps.places.PlacesService(host);
      const query=[shop.en||shop.name,shop.address,shop.city,'Japan'].filter(Boolean).join(' ');
      service.findPlaceFromQuery({query,fields:['place_id','name','geometry','formatted_address']},(results,status)=>{
        if(status!==google.maps.places.PlacesServiceStatus.OK||!results||!results[0]){reject(new Error('place not found'));return}
        const candidate=results[0];
        service.getDetails({placeId:candidate.place_id,fields:['place_id','name','rating','user_ratings_total','reviews','photos','url']},(place,detailStatus)=>{
          if(detailStatus===google.maps.places.PlacesServiceStatus.OK&&place)resolve(place);else reject(new Error('place details failed'))
        })
      })
    }));
    placeCache.set(shop.id,p);return p
  }
  function stars(rating){const rounded=Math.round(Number(rating)||0);return '<span class="google-stars" aria-label="별점 '+escJP(rating)+'점">'+[1,2,3,4,5].map(i=>'<span class="'+(i<=rounded?'on':'')+'">★</span>').join('')+'</span>'}
  function authorHTML(review){const a=review&&review.author_name?review.author_name:'Google 사용자';const uri=review&&review.author_url;return uri?'<a class="google-review-author" href="'+escJP(uri)+'" target="_blank" rel="noopener">'+escJP(a)+'</a>':'<span class="google-review-author">'+escJP(a)+'</span>'}
  function photoData(photo,idx){let src='';try{src=photo.getUrl({maxWidth:1200,maxHeight:900})}catch(e){}if(!src)return null;return{src,alt:'Google 매장 사진 '+(idx+1),attrs:(photo.html_attributions||[]).join(' ')}}
  function injectGoogleHeroPhotos(shop,photos){
    if(!photos.length||state.current!==shop.id)return;
    const hero=document.querySelector('#detail-view .hero');if(!hero)return;
    const own=(typeof SHOP_GALLERIES!=='undefined'&&SHOP_GALLERIES[shop.id])||[];
    const items=[...own.map((src,i)=>({src,alt:shop.name+' 매장 사진 '+(i+1),attrs:''})),...photos].slice(0,Math.max(5,own.length));
    if(!items.length)return;
    const old=hero.querySelector('.hero-gallery,.hero-placeholder');if(old)old.remove();
    const oldCount=hero.querySelector('.hero-count');if(oldCount)oldCount.remove();
    const gallery=document.createElement('div');gallery.className='hero-gallery';gallery.setAttribute('data-gallery','');
    gallery.innerHTML='<div class="hero-track">'+items.map((item,i)=>'<div class="hero-slide"><img src="'+escJP(item.src)+'" alt="'+escJP(item.alt)+'" '+(i?'loading="lazy"':'')+' decoding="async">'+(item.attrs?'<div class="google-hero-attribution">'+item.attrs+'</div>':'')+'</div>').join('')+'</div><div class="hero-count">'+(typeof icon==='function'?icon('image'):'')+'<span data-gallery-count>1 / '+items.length+'</span></div>';
    const top=hero.querySelector('.hero-top');if(top)top.insertAdjacentElement('afterend',gallery);else hero.prepend(gallery);
    if(typeof bindHeroGallery==='function')bindHeroGallery();
  }
  function renderPlace(shop,place){
    const root=document.querySelector('[data-google-place-content]');if(!root||state.current!==shop.id)return;
    const rating=Number(place.rating)||0,count=Number(place.user_ratings_total)||0,reviews=(place.reviews||[]).slice(0,3);
    const googlePhotos=(place.photos||[]).slice(0,5).map(photoData).filter(Boolean);
    injectGoogleHeroPhotos(shop,googlePhotos);
    const reviewsHTML=reviews.map(r=>'<article class="google-review-item"><div class="google-review-head">'+authorHTML(r)+'<span class="google-review-rating">★ '+escJP(r.rating||'')+'</span></div>'+(r.relative_time_description?'<div class="google-review-time">'+escJP(r.relative_time_description)+'</div>':'')+(r.text?'<p>'+escJP(r.text)+'</p>':'')+'</article>').join('');
    root.innerHTML='<div class="google-rating-row"><div><strong>'+escJP(rating.toFixed(1))+'</strong>'+stars(rating)+'</div><span>Google 평점 · 리뷰 '+count.toLocaleString()+'개</span></div>'+(reviewsHTML?'<div class="google-review-list"><h3>Google 리뷰</h3>'+reviewsHTML+'</div>':'')+(place.url?'<a class="google-place-more" href="'+escJP(place.url)+'" target="_blank" rel="noopener">Google Maps에서 전체 보기</a>':'')+'<p class="google-place-source">Google Maps 제공 정보</p>';
  }
  function loadGooglePlace(shop){if(!isJapan(shop))return;findPlace(shop).then(place=>renderPlace(shop,place)).catch(()=>{const root=document.querySelector('[data-google-place-content]');if(root&&state.current===shop.id)root.innerHTML='<div class="google-place-empty">Google 매장 정보를 불러오지 못했습니다.</div>'})}

  const baseOpenDetail=openDetail;
  openDetail=function(id){baseOpenDetail(id);const shop=SHOPS.find(s=>s.id===id);if(shop&&isJapan(shop))setTimeout(()=>loadGooglePlace(shop),40)};

  function openFromHash(){const m=location.hash.match(/^#\/shop\/((?:KR|JP)-[A-Z]{3}-\d{3})$/);if(!m)return;const shop=SHOPS.find(s=>s.id===m[1]);if(shop)openDetail(shop.id)}
  window.addEventListener('hashchange',openFromHash);
  if(/^#\/shop\/JP-/.test(location.hash))openFromHash();
})();
