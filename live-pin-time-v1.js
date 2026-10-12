/* Shared KST lifetime rules for the LIVE PIN feed and temporary MAP markers. */
(function(root){
 'use strict';
 function bounds(now=Date.now()){const day=new Date(now+9*3600000).toISOString().slice(0,10),start=Date.parse(day+'T00:00:00+09:00');return{start,end:start+86400000,day}}
 function current(r,now=Date.now()){const b=bounds(now),created=Date.parse(r.created_at),expiry=Date.parse(r.expires_at);return !r.is_hidden&&r.location_type==='direct'&&r.post_type==='report'&&created>=b.start&&created<=now&&created<b.end&&(!Number.isFinite(expiry)||expiry>now)&&Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&(r.country_code==='KR'||r.country_code==='JP')}
 root.FUNY_LIVE_TIME={bounds,current};
})(typeof window==='undefined'?globalThis:window);
