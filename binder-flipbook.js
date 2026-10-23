/* Single-page showcase adapter for StPageFlip 2.0.7. No editor/overview changes. */
window.FUNY_BINDER_FLIPBOOK = {
  mount({host, viewer, pages, index, ratio, onFlip, onState, loadImage}) {
    let book, root, disposed = false, enabled = true, gesture = null;
    let touches = new Set(), resizeTimer, scale = 1;
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
      host.innerHTML = '<div class="binder-book-case"><div class="binder-book-stack" aria-hidden="true"></div><div class="binder-flip-root"></div></div>';
      root = host.querySelector('.binder-flip-root');
      const width = Math.max(120, Math.floor(host.clientWidth / scale - 14));
      book = new St.PageFlip(root, {
        width, height:Math.round(width/ratio), size:'fixed', autoSize:false,
        usePortrait:true, showCover:false, startPage:index, drawShadow:true,
        flippingTime:560, maxShadowOpacity:.24, useMouseEvents:false,
        showPageCorners:false, disableFlipByClick:false
      });
      root.style.width = width+'px';
      root.style.height = Math.round(width/ratio)+'px';
      const nodes = pages.map((html, i) => {
        const node = document.createElement('div');
        node.className = 'binder-flip-page'+(i===0?' binder-flip-cover':'');
        node.dataset.density = i===0?'hard':'soft';
        node.innerHTML = '<div class="binder-flip-face">'+html+'</div>';
        // Decode in advance, including currently hidden leaves.
        node.querySelectorAll('img[data-path]').forEach(img => {
          img.loading='eager';
          loadImage(img.dataset.path).then(url=>{if(!disposed)img.src=url;}).catch(()=>{img.alt='사진을 불러오지 못했어요';});
        });
        return node;
      });
      book.on('flip', e => {index=e.data; onFlip(index);});
      book.on('changeState', e => onState(e.data!=='read'));
      book.loadFromHTML(nodes);
      applyScale();
      onState(false);
    }
    function applyScale(){
      root.style.transformOrigin='top left';root.style.transform=`scale(${scale})`;
      root.parentElement.style.height=(parseFloat(root.style.height)*scale+9)+'px';
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
        disposed=true; clearTimeout(resizeTimer);release();unmount();
        viewer.removeEventListener('pointerdown',down);
        viewer.removeEventListener('pointermove',move);
        viewer.removeEventListener('pointerup',up);
        viewer.removeEventListener('pointercancel',cancelled);
        window.removeEventListener('resize',resized);
      }
    };
  }
};
