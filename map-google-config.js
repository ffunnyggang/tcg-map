/* FUNY PIN Google Maps config
 * Google Cloud Console에서 발급한 브라우저 API 키를 아래 문자열에 입력하세요.
 * 예: window.FUNY_GOOGLE_MAPS_API_KEY='AIza...';
 */
window.FUNY_GOOGLE_MAPS_API_KEY='AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw';

/* Existing admin.html stays intact; community moderation is loaded only on admin. */
if(/\/admin\.html$/.test(location.pathname)&&!document.querySelector('script[data-funy-admin-community]')){
  const s=document.createElement('script');
  s.src='admin-community-v1.js?v=20261002-01';
  s.async=false;
  s.dataset.funyAdminCommunity='1';
  document.head.appendChild(s);
}
