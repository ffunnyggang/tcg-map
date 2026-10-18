(function(){'use strict';
if(window.FUNY_MY_TEST_GATE)return;
async function ensure(A,root){
  if(!A)throw new Error('AUTH_NOT_READY');
  await A.init();
  if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return false}
  const {data,error}=await A.client.rpc('is_my_feature_tester');
  if(error||data!==true){
    const target=root||document.getElementById('root')||document.querySelector('.test-main');
    if(target)target.innerHTML='<div class="error"><strong>비공개 테스트 화면입니다</strong>현재 계정은 MY 신규 기능 테스트 대상이 아닙니다.</div>';
    return false;
  }
  return true;
}
window.FUNY_MY_TEST_GATE={ensure};
})();