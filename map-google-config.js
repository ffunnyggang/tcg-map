/* FUNY PIN Google Maps config
 * Google Cloud Console에서 발급한 브라우저 API 키를 아래 문자열에 입력하세요.
 */
window.FUNY_GOOGLE_MAPS_API_KEY='AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw';

/* Admin-only modular extensions. Keep public map behavior unchanged. */
if (/\/admin(?:\.html)?$/.test(location.pathname)) {
  const historyStyle=document.createElement('link');
  historyStyle.rel='stylesheet';
  historyStyle.href='assets/admin/funymon-history.css?v=20260927-2';
  document.head.appendChild(historyStyle);
  const historyScript=document.createElement('script');
  historyScript.src='assets/admin/funymon-history.js?v=20260927-2';
  historyScript.defer=true;
  document.head.appendChild(historyScript);
  const attemptScript=document.createElement('script');
  attemptScript.src='assets/admin/funymon-attempt-history.js?v=20260927-1';
  attemptScript.defer=true;
  document.head.appendChild(attemptScript);
}
