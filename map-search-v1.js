/* FUNY PIN map search: shop name / area / active filter tags */
(function(){
  const input=document.getElementById('map-shop-search');
  const clear=document.getElementById('map-shop-search-clear');
  if(!input||typeof SHOPS==='undefined'||typeof matches!=='function')return;

  const baseMatches=matches;
  const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();

  function searchableText(s){
    const filterLabels=(typeof FILTERS!=='undefined'?FILTERS:[])
      .filter(f=>{try{return f.test(s)}catch(e){return false}})
      .map(f=>f.label);
    const featureLabels=(typeof FEATURE_LABELS!=='undefined'?Object.entries(FEATURE_LABELS):[])
      .filter(([key])=>s.f&&s.f[key]===true)
      .map(([,label])=>label);
    const tcgLabels=[s.tcg&&s.tcg.pokemon?'포켓몬':'',s.tcg&&s.tcg.onePiece?'원피스':'',s.tcg&&s.tcg.dragonBall?'드래곤볼':''];
    return normalize([
      s.name,s.en,s.city,s.area,s.address,s.station,
      ...filterLabels,...featureLabels,...tcgLabels
    ].filter(Boolean).join(' '));
  }

  matches=function(s){
    if(!baseMatches(s))return false;
    const q=normalize(input.value);
    return !q||searchableText(s).includes(q);
  };

  function applySearch(){
    const hasValue=input.value.trim().length>0;
    if(clear)clear.hidden=!hasValue;
    try{if(activeInfoWindow)activeInfoWindow.close()}catch(e){}
    try{renderList()}catch(e){}
    try{syncMapMarkers()}catch(e){}
  }

  input.addEventListener('input',applySearch);
  input.addEventListener('search',applySearch);
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&input.value){
      input.value='';
      applySearch();
      input.blur();
    }
  });

  if(clear){
    clear.addEventListener('click',()=>{
      input.value='';
      applySearch();
      input.focus();
    });
  }
})();
