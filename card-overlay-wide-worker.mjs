import {searchWide} from './card-overlay-wide.mjs?v=20261107-wide1';
self.onmessage=({data})=>{try{self.postMessage({match:searchWide(data.source,data.generated,data.rect)});}catch{self.postMessage({error:'자동 정렬 비교에 실패했어요.'});}};
