(function(){'use strict';
if(window.FUNY_MY_FEATURE_GATE)return;
async function ensure(A,root){
  if(!A)throw new Error('AUTH_NOT_READY');
  await A.init();
  if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return false}
  const {data,error}=await A.client.rpc('is_my_feature_tester');
  if(error||data!==true){
    const target=root||document.getElementById('root')||document.querySelector('.test-main');
    if(target)target.innerHTML='<div class="error"><strong>준비중인 기능입니다</strong>현재는 사전 테스트 계정에서만 이용할 수 있습니다.</div>';
    return false;
  }
  return true;
}
window.FUNY_MY_FEATURE_GATE={ensure};
})();
