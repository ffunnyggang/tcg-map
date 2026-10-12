const assert=require('node:assert/strict');require('../live-pin-time-v1.js');
const {bounds,current}=globalThis.FUNY_LIVE_TIME;
const before=Date.parse('2026-10-13T23:59:59+09:00'),after=before+1000;
assert.equal(bounds(before).day,'2026-10-13');assert.equal(bounds(after).day,'2026-10-14');
const row={location_type:'direct',post_type:'report',is_hidden:false,country_code:'KR',latitude:37.5,longitude:127,created_at:'2026-10-13T11:00:00+09:00',expires_at:'2026-10-14T00:00:00+09:00'};
assert(current(row,before));assert(!current(row,after));assert(!current({...row,is_hidden:true},before));assert(!current({...row,latitude:null},before));assert(!current({...row,post_type:'request'},before));assert(!current({...row,created_at:'2026-10-14T01:00:00+09:00'},before));assert(current({...row,country_code:'JP',latitude:35.6,longitude:139.7},before));
console.log('KST rollover, hidden status, invalid/future positions, and JP lifetime checks passed.');
