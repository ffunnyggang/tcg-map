/* Single-page showcase adapter for StPageFlip 2.0.7. No editor/overview changes. */
window.FUNY_BINDER_FLIPBOOK = {
  mount({host, viewer, pages, index, ratio, onFlip, onState, loadImage, onMat}) {
    let book, root, disposed = false, enabled = true, gesture = null;
    let touches = new Set(), resizeTimer, scale = 1;
    const mats = new Map(), sampled = new Set();
    let matPaths = new Set(), imageQueue;
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const point = e => {
      const rect = book.getUI().getDistElement().getBoundingClientRect();
      return {x:e.clientX-rect.left, y:e.clientY-rect.top};
    };
    function release() {
      if (gesture && viewer.hasPointerCapture?.(gesture.id)) viewer.releasePointerCapture(gesture.id);
      gesture = null;
    }
    function unmount() {
      if (!book) return;
      book.destroy();
      book = null;
    }
    function build() {
      unmount();
      host.innerHTML = '<div class="binder-book-case"><div class="binder-flip-root"></div></div>';
      root = host.querySelector('.binder-flip-root');
      const width = Math.max(120, Math.floor(host.clientWidth / scale - 2));
      book = new St.PageFlip(root, {
        width, height:Math.round(width/ratio), size:'fixed', autoSize:false,
        usePortrait:true, showCover:false, startPage:index, drawShadow:true,
        flippingTime:560, maxShadowOpacity:.18, useMouseEvents:false,
        showPageCorners:false, disableFlipByClick:false
      });
      root.style.width = width+'px';
      root.style.height = Math.round(width/ratio)+'px';
      const nodes = pages.map((html, i) => {
        const node = document.createElement('div');
        node.className = 'binder-flip-page'+(i===0?' binder-flip-cover':'');
        node.dataset.density = i===0?'hard':'soft';
        node.innerHTML = '<div class="binder-flip-face">'+(i===0?html:'<div class="binder-photo-mat">'+html+'</div>')+'</div>';
        return node;
      });
      matPaths=new Set(nodes.flatMap(node=>[...node.querySelectorAll('.binder-photo-mat img[data-path]')].map(img=>img.dataset.path)));
      applyMat();
      book.on('flip', e => {index=e.data;host.classList.toggle('binder-on-cover',index===0); imageQueue?.prioritize(index); onFlip(index);});
      book.on('changeState', e => onState(e.data!=='read'));
      book.loadFromHTML(nodes);
      imageQueue=preloadPages(nodes);
      applyScale();
      onState(false);
    }
    function preloadPages(nodes){
      let stopped=false,active=0,timer,current=index;
      const tasks=nodes.flatMap((node,page)=>[...node.querySelectorAll('img[data-path]')].map(img=>({page,img})));
      const rank=page=>page===current?0:page===current+1?1:page===current-1?2:3+Math.abs(page-current);
      function launch(task){
        active++;
        const img=task.img;img.loading='eager';
        loadImage(img.dataset.path).then(url=>{
          if(stopped||disposed)return;
          delete img.dataset.imageError;
          img.onload=()=>{if(!stopped&&!disposed&&img.closest('.binder-photo-mat'))paintMat(img);};
          img.onerror=()=>{if(stopped||disposed)return;img.dataset.imageError='1';sampled.add(img.dataset.path);applyMat();};
          img.src=url;
          if(img.complete&&img.naturalWidth)img.onload();
        }).catch(()=>{
          if(stopped||disposed)return;
          img.dataset.imageError='1';img.alt='사진을 불러오지 못했어요';
          sampled.add(img.dataset.path);applyMat();
        }).finally(()=>{active--;pump();});
      }
      function pump(){
        clearTimeout(timer);
        if(stopped||disposed)return;
        tasks.sort((a,b)=>rank(a.page)-rank(b.page));
        // Current/next/previous pages get two slots; distant pages use only one,
        // leaving a slot free if the reader turns before background work completes.
        while(active<2&&tasks.length&&rank(tasks[0].page)<3)launch(tasks.shift());
        if(active===0&&tasks.length)timer=setTimeout(()=>{
          if(stopped||disposed)return;
          tasks.sort((a,b)=>rank(a.page)-rank(b.page));
          launch(tasks.shift());
        },120);
      }
      pump();
      return {prioritize(page){current=page;pump();},cancel(){stopped=true;clearTimeout(timer);tasks.length=0;}};
    }
    function paintMat(img){
      const key=img.dataset.path;
      if(sampled.has(key)){applyMat();return;}
      sampled.add(key);
      const color=window.FUNY_BINDER_MAT?.sample(img);if(color)mats.set(key,color);
      applyMat();
    }
    function applyMat(){
      // One shared color for every page: equal-weight average of each photo's darkest quartile.
      if([...matPaths].some(path=>!sampled.has(path)))return;
      const colors=[...matPaths].map(path=>mats.get(path)).filter(Boolean);
      if(!colors.length)return;
      const color=window.FUNY_BINDER_MAT?.average(colors);if(!color)return;
      host.style.setProperty('--binder-mat-color',color);onMat?.(color);
    }
    function applyScale(){
      root.style.transformOrigin='top left';root.style.transform=`scale(${scale})`;
      root.parentElement.style.height=(parseFloat(root.style.height)*scale+2)+'px';
    }
    function cancel() {
      if (!gesture && book.getState()==='read') return;
      release();
      // A cancelled gesture must never finish turning a page (e.g. pinch or vertical scroll).
      build();
    }
    function down(e) {
      touches.add(e.pointerId);
      if (touches.size>1) {cancel(); return;}
      if (!enabled || reduced() || e.button>0 || book.getState()!=='read') return;
      const rect = root.getBoundingClientRect();
      if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) return;
      gesture={id:e.pointerId, x:e.clientX, y:e.clientY, start:point(e), dragging:false};
    }
    function move(e) {
      if(!enabled || !gesture || gesture.id!==e.pointerId || touches.size!==1) return;
      const dx=e.clientX-gesture.x, dy=e.clientY-gesture.y;
      if(!gesture.dragging) {
        if(Math.abs(dy)>10 && Math.abs(dy)>Math.abs(dx)) {release(); return;}
        if(Math.abs(dx)<10 || Math.abs(dx)<Math.abs(dy)*1.3) return;
        if((dx<0 && index===pages.length-1)||(dx>0 && index===0)) {release(); return;}
        gesture.dragging=true;
        // Begin at the relevant outer edge so dragging anywhere on a photo feels consistent.
        const rect=root.getBoundingClientRect();
        gesture.edge=dx<0?rect.width-2:2;
        book.startUserTouch({x:gesture.edge,y:gesture.start.y});
        // Lock direction at the edge before a fast swipe crosses the midpoint.
        book.userMove({x:gesture.edge+(dx<0?-8:8),y:gesture.start.y},true);
        viewer.setPointerCapture?.(e.pointerId);
      }
      if(e.cancelable)e.preventDefault();
      // Portrait mode represents a two-page curl in one visible page.
      // Map half a visible page of travel to the engine's completion threshold.
      book.userMove({x:gesture.edge+dx*2,y:point(e).y},true);
    }
    function up(e) {
      touches.delete(e.pointerId);
      if(!gesture || gesture.id!==e.pointerId)return;
      if(gesture.dragging)book.userStop(point(e));
      release();
    }
    function cancelled(e) {touches.delete(e.pointerId); cancel();}
    function resized() {
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{if(!disposed){release();build();}},120);
    }
    viewer.addEventListener('pointerdown',down);
    viewer.addEventListener('pointermove',move,{passive:false});
    viewer.addEventListener('pointerup',up);
    viewer.addEventListener('pointercancel',cancelled);
    window.addEventListener('resize',resized);
    build();
    return {
      turn(delta) {
        if(!enabled || gesture || book.getState()!=='read')return;
        if(index+delta<0 || index+delta>=pages.length)return;
        if(reduced())book.turnToPage(index+delta);
        else if(delta>0)book.flipNext('bottom');
        else book.flipPrev('bottom');
      },
      setEnabled(value) {if(enabled===value)return;enabled=value;if(!enabled)cancel();host.classList.toggle('binder-book-zoomed',!enabled);},
      setZoom(value) {scale=value;applyScale();},
      cancel,
      destroy() {
        disposed=true; mats.clear();sampled.clear(); clearTimeout(resizeTimer);release();unmount();
        viewer.removeEventListener('pointerdown',down);
        viewer.removeEventListener('pointermove',move);
        viewer.removeEventListener('pointerup',up);
        viewer.removeEventListener('pointercancel',cancelled);
        window.removeEventListener('resize',resized);
      }
    };
  }
};
