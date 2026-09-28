(()=>{
  // Keep the content-manager page selector aligned with the current HOME/PICK CMS placements.
  // Legacy HOME sections are no longer separate pages in Admin.
  try {
    if (typeof CMS_PLACEMENTS !== 'undefined') {
      delete CMS_PLACEMENTS.home_recommend;
      delete CMS_PLACEMENTS.home_news;
      delete CMS_PLACEMENTS.home_links;
      CMS_PLACEMENTS.home = 'HOME';
    }
  } catch (_) {}

  const STYLE_ID='cms-desktop-preview-layout-v2';
  function apply(){
    if(!document.getElementById(STYLE_ID)){
      const s=document.createElement('style');
      s.id=STYLE_ID;
      s.textContent=`
@media (min-width:900px){
  .cms-builder{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(330px,380px)!important;column-gap:24px!important;row-gap:0!important;align-items:start!important;width:100%!important;max-width:none!important;min-width:0!important}
  .cms-builder-main{grid-column:1!important;grid-row:1!important;min-width:0!important;width:100%!important}
  .cms-phone-wrap{display:block!important;grid-column:2!important;grid-row:1!important;align-self:start!important;position:sticky!important;top:18px!important;min-width:0!important;width:100%!important;margin:0!important}
  .cms-phone{width:100%!important;max-width:380px!important;height:610px!important;margin:0 auto!important;border:9px solid #d5d0d8!important;border-radius:38px!important;background:#fff!important;overflow:hidden!important;box-shadow:0 8px 26px rgba(41,31,50,.1)!important}
  .cms-phone iframe{display:block!important;width:100%!important;height:100%!important;border:0!important;background:#fff!important}
  .cms-phone-label{display:block!important;margin:0 0 8px!important;font-size:10px!important;color:#978f9b!important}
}
@media (max-width:899px){.cms-builder{display:block!important}.cms-phone-wrap{display:none!important}}
`;
      document.head.appendChild(s);
    }
    const builder=document.querySelector('.cms-builder');
    if(!builder)return;
    const main=builder.querySelector('.cms-builder-main');
    const phone=builder.querySelector('.cms-phone-wrap');
    if(main&&phone&&phone.parentElement===builder&&main.nextElementSibling!==phone){builder.insertBefore(phone,main.nextSibling)}
  }
  apply();
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{childList:true,subtree:true});
})();
