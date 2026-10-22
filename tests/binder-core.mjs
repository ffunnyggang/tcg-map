import assert from 'node:assert/strict';
import {newDraft,newPage,movePage,filled,cropGeometry,esc,layouts} from '../binder-core.mjs';
const d=newDraft('owner',9,'  collection  ');assert.equal(d.title,'collection');assert.equal(d.pages.length,10);assert.equal(new Set(d.pages.map(p=>p.id)).size,10);assert.equal(filled(d.pages).length,0);
d.pages[7].path='owner/binder/photo.jpg';const moved=movePage(d.pages,d.pages[7].id,-1);assert.equal(moved[6].path,d.pages[7].path);assert.equal(d.pages[7].path,'owner/binder/photo.jpg');assert.deepEqual(movePage(d.pages,d.pages[0].id,-1),d.pages);assert.equal(filled(moved).length,1);
for(const l of Object.values(layouts))for(const [iw,ih] of [[4000,3000],[1000,4000],[4000,1000]])for(const z of [1,2,3])for(const xy of [-99999,0,99999]){const w=900,h=900/l.ratio,g=cropGeometry(iw,ih,w,h,z,xy,xy);assert(g.dx<=0&&g.dy<=0);assert(g.dx+g.dw>=w-.001&&g.dy+g.dh>=h-.001)}
assert.equal(esc('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');console.log('PASS binder creation, ordering, filtering, bounded image crop, escaping');
