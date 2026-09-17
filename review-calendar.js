/* FUNY PIN review schedule · Google Calendar */
(function(){
  const GOOGLE_CALENDAR_API_KEY='PASTE_YOUR_API_KEY_HERE';
  const CALENDAR_ID='32475a73be5a7c48db3c46d180e659e870c8ca823b7d62071f3586387c91b4ca@group.calendar.google.com';

  function start(){
    if(!/(^|\/)reviews\.html$/.test(location.pathname||''))return;
    if(!GOOGLE_CALENDAR_API_KEY)return;
    const waitForSchedule=setInterval(()=>{
      const list=document.querySelector('.review-schedule-list');
      if(!list)return;
      clearInterval(waitForSchedule);
      loadEvents(list);
    },100);
    setTimeout(()=>clearInterval(waitForSchedule),5000);
  }

  async function loadEvents(list){
    const params=new URLSearchParams({key:GOOGLE_CALENDAR_API_KEY,singleEvents:'true',orderBy:'startTime',timeMin:new Date().toISOString(),maxResults:'3'});
    const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;
    try{
      const response=await fetch(url);
      if(!response.ok)throw new Error('calendar request failed');
      const data=await response.json();
      renderEvents(list,Array.isArray(data.items)?data.items:[]);
    }catch(error){console.error('FUNY PIN calendar: 일정을 불러오지 못했습니다.');}
  }

  function renderEvents(list,events){
    list.replaceChildren();
    if(!events.length){const empty=document.createElement('p');empty.className='review-schedule-meta';empty.textContent='예정된 일정이 없습니다.';list.appendChild(empty);return;}
    events.forEach(event=>list.appendChild(createEventCard(event)));
  }

  function createEventCard(event){
    const url=getDescriptionUrl(event.description||'');
    const card=url?document.createElement('a'):document.createElement('article');
    card.className='review-schedule-card';
    if(url){card.href=url;card.target='_blank';card.rel='noopener noreferrer';card.style.textDecoration='none';}

    const dday=document.createElement('div');
    dday.className='review-schedule-date';
    const ddayText=document.createElement('strong');
    ddayText.className='review-schedule-day';
    ddayText.textContent=getDday(event.start||{});
    dday.appendChild(ddayText);

    const info=document.createElement('div');info.className='review-schedule-info';
    const name=document.createElement('h3');name.className='review-schedule-name';name.textContent=event.summary||'제목 없는 일정';
    const meta=document.createElement('p');meta.className='review-schedule-meta';meta.textContent=getMeta(event);
    info.append(name,meta);
    card.append(dday,info);

    if(url){const arrow=document.createElement('span');arrow.className='review-schedule-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';card.appendChild(arrow);}
    return card;
  }

  function getEventDate(start){
    if(start.date){const [y,m,d]=start.date.split('-').map(Number);return new Date(y,m-1,d);}
    return new Date(start.dateTime);
  }

  function getDday(start){
    const eventDate=getEventDate(start);if(Number.isNaN(eventDate.getTime()))return 'D-?';
    const now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const target=new Date(eventDate.getFullYear(),eventDate.getMonth(),eventDate.getDate());
    const diff=Math.round((target-today)/86400000);
    return diff<=0?'D-DAY':`D-${diff}`;
  }

  function getMeta(event){
    const start=event.start||{};const date=getEventDate(start);const parts=[];
    if(!Number.isNaN(date.getTime())){
      const dateText=new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(date);
      if(start.dateTime){
        const timeText=new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(date);
        parts.push(`${dateText} ${timeText}`);
      }else parts.push(`${dateText} 종일`);
    }
    if(event.location)parts.push(event.location);
    return parts.join(' │ ')||'일정 정보';
  }

  function getDescriptionUrl(description){
    const match=description.match(/https?:\/\/[^\s<>"']+/i);
    if(!match)return '';
    try{const url=new URL(match[0]);return /^https?:$/.test(url.protocol)?url.href:'';}catch(e){return '';}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
