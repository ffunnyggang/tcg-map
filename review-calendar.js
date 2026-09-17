/* FUNY PIN review schedule · Google Calendar */
(function(){
  const GOOGLE_CALENDAR_API_KEY='PASTE_YOUR_API_KEY_HERE';
  const CALENDAR_ID='32475a73be5a7c48db3c46d180e659e870c8ca823b7d62071f3586387c91b4ca@group.calendar.google.com';
  const API_KEY_PLACEHOLDER='PASTE_YOUR_API_KEY_HERE';

  function start(){
    if(!/(^|\/)reviews\.html$/.test(location.pathname||''))return;
    if(!GOOGLE_CALENDAR_API_KEY||GOOGLE_CALENDAR_API_KEY===API_KEY_PLACEHOLDER)return;
    const waitForSchedule=setInterval(()=>{
      const list=document.querySelector('.review-schedule-list');
      if(!list)return;
      clearInterval(waitForSchedule);
      loadEvents(list);
    },100);
    setTimeout(()=>clearInterval(waitForSchedule),5000);
  }

  async function loadEvents(list){
    const params=new URLSearchParams({
      key:GOOGLE_CALENDAR_API_KEY,
      singleEvents:'true',
      orderBy:'startTime',
      timeMin:new Date().toISOString(),
      maxResults:'3'
    });
    const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`;
    try{
      const response=await fetch(url);
      if(!response.ok)throw new Error('calendar request failed');
      const data=await response.json();
      renderEvents(list,Array.isArray(data.items)?data.items:[]);
    }catch(error){
      console.error('FUNY PIN calendar: 일정을 불러오지 못했습니다.');
    }
  }

  function renderEvents(list,events){
    list.replaceChildren();
    if(!events.length){
      const empty=document.createElement('p');
      empty.className='review-schedule-meta';
      empty.textContent='예정된 일정이 없습니다.';
      list.appendChild(empty);
      return;
    }
    events.forEach(event=>list.appendChild(createEventCard(event)));
  }

  function createEventCard(event){
    const article=document.createElement('article');
    article.className='review-schedule-card';

    const dateBox=document.createElement('div');
    dateBox.className='review-schedule-date';
    const month=document.createElement('span');
    month.className='review-schedule-month';
    const day=document.createElement('strong');
    day.className='review-schedule-day';
    const dateParts=getDateParts(event.start||{});
    month.textContent=dateParts.month;
    day.textContent=dateParts.day;
    dateBox.append(month,day);

    const info=document.createElement('div');
    info.className='review-schedule-info';
    const name=document.createElement('h3');
    name.className='review-schedule-name';
    name.textContent=event.summary||'제목 없는 일정';
    const meta=document.createElement('p');
    meta.className='review-schedule-meta';
    meta.textContent=getMeta(event);
    info.append(name,meta);

    const arrow=document.createElement('span');
    arrow.className='review-schedule-arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent='›';
    article.append(dateBox,info,arrow);
    return article;
  }

  function getDateParts(start){
    let date;
    if(start.date){
      const [year,month,day]=start.date.split('-').map(Number);
      date=new Date(year,month-1,day);
    }else{
      date=new Date(start.dateTime);
    }
    if(Number.isNaN(date.getTime()))return{month:'—',day:'—'};
    return{
      month:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'Asia/Seoul'}).format(date).toUpperCase(),
      day:new Intl.DateTimeFormat('en-US',{day:'2-digit',timeZone:'Asia/Seoul'}).format(date)
    };
  }

  function getMeta(event){
    const parts=[];
    if(event.location)parts.push(event.location);
    if(event.start&&event.start.dateTime){
      const date=new Date(event.start.dateTime);
      if(!Number.isNaN(date.getTime()))parts.push(new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(date));
    }else if(event.start&&event.start.date){
      parts.push('종일');
    }
    return parts.join(' · ')||'일정 정보';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
