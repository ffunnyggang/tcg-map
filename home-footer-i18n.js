/* HOME footer i18n: translate presentation labels only; retain URLs and legal identifiers. */
(()=>{'use strict';
 const footer=document.getElementById('homeFooter');if(!footer)return;
 let en=false;try{en=(window.FUNY_I18N?.getLang?.()||localStorage.getItem('funy-pin-lang'))==='en'}catch(_){}
 if(!en)return;
 const set=(selector,value)=>{const el=footer.querySelector(selector);if(el)el.textContent=value};
 const aria=(selector,value)=>{const el=footer.querySelector(selector);if(el)el.setAttribute('aria-label',value)};
 aria('#homeFooter','FUNY PIN Service Information');
 footer.setAttribute('aria-label','FUNY PIN Service Information');
 set('.home-footer-tagline','Connecting card shops with the joy of collecting.');
 aria('.home-footer-socials','Official social channels');
 aria('.home-footer-instagram','FUNY PIN Official Instagram');
 aria('.home-footer-kakao','FUNY PIN KakaoTalk Open Chat');
 aria('.home-footer-support','Customer Support');
 const links=footer.querySelectorAll('.home-footer-support a');
 [['Contact Support','Online inquiry'],['Partnerships & Advertising','Advertising and partnership inquiries'],['Add / Update a Shop','Request a new shop or update shop information']].forEach(([label,description],i)=>{const el=links[i];if(el){el.textContent=label;el.setAttribute('aria-label',description)}});
 aria('.home-footer-policies','Service Policies');
 const policies=footer.querySelectorAll('.home-footer-policies a');
 [['Terms of Service','Terms of Service'],['Privacy Policy','Privacy Policy']].forEach(([label,description],i)=>{const el=policies[i];if(el){el.textContent=label;el.setAttribute('aria-label',description)}});
 const summary=footer.querySelector('.home-footer-business summary');
 if(summary){const first=[...summary.childNodes].find(n=>n.nodeType===3);if(first)first.nodeValue='Business Information ';else summary.prepend(document.createTextNode('Business Information '))}
 const names=['Business Name','Representative','Business Registration No.','Business Address'];
 footer.querySelectorAll('.home-footer-business dt').forEach((el,i)=>{if(names[i])el.textContent=names[i]});
 const values=footer.querySelectorAll('.home-footer-business dd');
 if(values[0])values[0].textContent='FUNY PIN';
 /* Keep the registered representative and original legal address unchanged. */
 if(footer.querySelector('.home-footer-notice'))footer.querySelector('.home-footer-notice').innerHTML='Shop and product information may differ from actual details.<br>Check with the shop or seller before visiting or purchasing.';
})();
