/* FUNY PIN MY private rollout router */
(async()=>{
  'use strict';
  const A=window.FUNY_WEB_AUTH;
  const root=document.getElementById('root');
  if(!A){if(root)root.innerHTML='<div class="error"><strong>MY를 불러오지 못했어요</strong><span>로그인 모듈을 확인해주세요.</span></div>';return}
  if(A.isAppShell()){location.replace('/');return}
  try{
    await A.init();
    if(!A.session){A.goLogin('/my.html');return}
    let tester=false;
    try{const {data,error}=await A.client.rpc('is_my_feature_tester');if(!error)tester=data===true}catch(_){tester=false}
    if(!tester){location.replace('/my-stable.html');return}
    const script=document.createElement('script');
    script.src='/my-dashboard-v3.js?v=20261019-missions2';
    script.async=false;
    script.onerror=()=>{if(root)root.innerHTML='<div class="error"><strong>MY를 불러오지 못했어요</strong><span>잠시 후 다시 시도해주세요.</span></div>'};
    document.body.appendChild(script);
  }catch(error){
    console.warn('[MY PRIVATE ROUTER]',error);
    location.replace('/my-stable.html');
  }
})();
