/* FUNY PIN · Google Calendar event markers (non-shop locations) */
(function(){
  const API_KEY='AIzaSyBFdEvEvlFJNfiV1shZnHyi_h_I47EKYao';
  const CALENDAR_ID='32475a73be5a7c48db3c46d180e659e870c8ca823b7d62071f3586387c91b4ca@group.calendar.google.com';
  const markers=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function eventStart(e){return new Date(e.start?.dateTime||((e.start?.date||'')+'T00:00:00+09:00'))}
  function eventEnd(e){if(e.end?.date){const d=new Date(e.end.date+'T00:00:00+09:00');d.setDate(d.getDate()-1);d.setHours(23,59,59,999);return d}return new Date(e.end?.dateTime||e.start?.dateTime||Date.now())}
  function schedule(e){const s=eventStart(e),en=eventEnd(e),fmt=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short'});return fmt.format(s)+(s.toDateString()===en.toDateString()?'':' ~ '+fmt.format(en))}
  function isKnownShopLocation(location){const q=(location||'').replace(/\s/g,'').toLowerCase();if(!q||typeof SHOPS==='undefined')return false;return SHOPS.some(s=>{const vals=[s.name,s.address,s.area].filter(Boolean);return vals.some(v=>{const x=String(v).replace(/\s/g,'').toLowerCase();return x.length>=3&&(q.includes(x)||x.includes(q))})})}
  function geocode(address){return new Promise(resolve=>{if(!window.naver?.maps?.Service)return resolve(null);naver.maps.Service.geocode({query:address},(status,res)=>{if(status!==naver.maps.Service.Status.OK||!res?.v2?.addresses?.length)return resolve(null);const a=res.v2.addresses[0];resolve({lat:+a.y,lng:+a.x})})})}
  function icon(){return {content:'<div class="funy-event-pin" aria-label="일정 위치"><span>📅</span></div>',anchor:new naver.maps.Point(20,44)}}
  function addStyle(){if(document.getElementById('funy-event-marker-style'))return;const s=document.createElement('style');s.id='funy-event-marker-style';s.textContent='.funy-event-pin{position:relative;width:40px;height:44px;display:flex;align-items:flex-start;justify-content:center;padding-top:7px;box-sizing:border-box;font-size:18px;filter:drop-shadow(0 3px 5px rgba(43,34,55,.18))}.funy-event-pin:before{content:"";position:absolute;left:5px;top:1px;width:30px;height:30px;border-radius:50% 50% 50% 8px;background:#fff;border:2px solid #8062d8;transform:rotate(-45deg);box-sizing:border-box}.funy-event-pin span{position:relative;z-index:1;font-size:15px}.funy-event-popup{width:220px;padding:13px 14px;border:1px solid #e9e4ee;border-radius:15px;background:#fff;box-shadow:0 8px 24px rgba(42,33,52,.14);font-family:"Pretendard Variable",Pretendard,sans-serif}.funy-event-popup b{display:block;margin-bottom:7px;font-size:13px;color:#2c2730}.funy-event-popup p{margin:3px 0;color:#817a86;font-size:10.5px;line-height:1.45}.funy-event-popup .tag{color:#7656d1;font-weight:800}';document.head.appendChild(s)}
  async function load(){
    if(!window.naver?.maps||typeof naverMap==='undefined'||!naverMap)return;
    const now=new Date(),end=new Date(now);end.setMonth(end.getMonth()+13);
    const p=new URLSearchParams({key:API_KEY,singleEvents:'true',orderBy:'startTime',timeMin:now.toISOString(),timeMax:end.toISOString(),maxResults:'100'});
    try{
      const res=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(CALENDAR_ID)+'/events?'+p);
      if(!res.ok)return;
      const data=await res.json(),events=(data.items||[]).filter(e=>e.location&&eventEnd(e)>=now&&!isKnownShopLocation(e.location));
      for(const e of events){
        const pos=await geocode(e.location);if(!pos)continue;
        const marker=new naver.maps.Marker({map:naverMap,position:new naver.maps.LatLng(pos.lat,pos.lng),icon:icon(),zIndex:150});
        const html='<div class="funy-event-popup"><b>'+esc(e.summary||'TCG 일정')+'</b><p class="tag">📅 '+esc(schedule(e))+'</p><p>📍 '+esc(e.location)+'</p></div>';
        const iw=new naver.maps.InfoWindow({content:html,borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-10)});
        naver.maps.Event.addListener(marker,'click',()=>{try{if(window.activeInfoWindow)window.activeInfoWindow.close()}catch(_){}iw.open(naverMap,marker);try{window.activeInfoWindow=iw}catch(_){}});
        markers.push(marker)
      }
    }catch(e){console.warn('FUNY PIN calendar map markers unavailable',e)}
  }
  addStyle();let tries=0,t=setInterval(()=>{tries++;if(window.naver?.maps?.Service&&typeof naverMap!=='undefined'&&naverMap){clearInterval(t);load()}else if(tries>60)clearInterval(t)},250);
})();