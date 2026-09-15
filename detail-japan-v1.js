/* FUNY PIN Japan shop detail compatibility */
(function(){
  if(typeof detailHTML!=='function'||typeof openDetail!=='function')return;
  const baseDetailHTML=detailHTML;
  detailHTML=function(s){
    let html=baseDetailHTML(s);
    if(String(s&&s.id||'').startsWith('JP-')){
      html=html.replace(/ · ([^<]+?) 도보 (?:undefined|null)?분/g,' · $1').replace(/ 도보 (?:undefined|null)?분/g,'');
    }
    return html;
  };
  function openFromHash(){
    const m=location.hash.match(/^#\/shop\/((?:KR|JP)-[A-Z]{3}-\d{3})$/);
    if(!m)return;
    const shop=SHOPS.find(s=>s.id===m[1]);
    if(shop)openDetail(shop.id);
  }
  window.addEventListener('hashchange',openFromHash);
  if(/^#\/shop\/JP-/.test(location.hash))openFromHash();
})();
