'use strict';
// Reuse the app/CMS shell contract; a normal browser keeps its page header.
(()=>{try{if(window.ReactNativeWebView||new URLSearchParams(location.search).get('app')==='1')document.documentElement.classList.add('app-shell');}catch{}})();
