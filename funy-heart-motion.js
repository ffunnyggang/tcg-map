/* FUNY PIN Sparkle Pop: visual effect only; caller invokes after server success. */
(()=>{'use strict';if(window.FUNY_HEART_MOTION)return;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const style=document.createElement('style');
 style.textContent=[
 '.funy-heart-pop-icon{animation:funy-heart-pop .4s cubic-bezier(.2,.8,.2,1) both;transform-origin:center}',
 '.funy-heart-unpop-icon{animation:funy-heart-unpop .16s ease-out both;transform-origin:center}',
 '@keyframes funy-heart-pop{0%{transform:scale(1)}30%{transform:scale(1.2)}60%{transform:scale(.94)}100%{transform:scale(1)}}',
 '@keyframes funy-heart-unpop{0%{transform:scale(1)}45%{transform:scale(.85)}100%{transform:scale(1)}}',
 '.funy-heart-spark{position:absolute;pointer-events:none;left:50%;top:50%;width:5px;height:5px;margin:-2.5px;border-radius:2px;background:var(--c);opacity:0;transform:rotate(var(--a)) translateY(-10px) scale(.35);animation:funy-heart-spark .4s cubic-bezier(.17,.75,.28,1) both}',
 '@keyframes funy-heart-spark{0%{opacity:0;transform:rotate(var(--a)) translateY(-10px) scale(.35)}20%{opacity:1}65%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(-26px) scale(.4)}}',
 '@media(prefers-reduced-motion:reduce){.funy-heart-pop-icon,.funy-heart-unpop-icon,.funy-heart-spark{animation:none!important}.funy-heart-spark{display:none!important}}'
 ].join('');document.head.appendChild(style);
 function play(button,on){if(!button||reduced())return;if(window.getComputedStyle?.(button).position==='static')button.style.position='relative';const icon=button.querySelector('svg,[data-funy-heart-glyph],#talkLikeIcon,.funy-heart-glyph');if(!icon)return;icon.classList.remove('funy-heart-pop-icon','funy-heart-unpop-icon');void icon.getBoundingClientRect();icon.classList.add(on?'funy-heart-pop-icon':'funy-heart-unpop-icon');button.querySelectorAll('.funy-heart-spark').forEach(x=>x.remove());if(!on)return;const colors=['#8062D8','#E979B7','#C8B3F7','#A58CEC'];for(let i=0;i<8;i++){const spark=document.createElement('span');spark.className='funy-heart-spark';spark.style.setProperty('--a',(i*45)+'deg');spark.style.setProperty('--c',colors[i%4]);button.appendChild(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true})}}
 window.FUNY_HEART_MOTION={play};
})();
