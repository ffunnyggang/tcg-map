const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const fs=require('fs'),assert=require('assert');
(async()=>{
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'],defaultViewport:{width:420,height:800}});
try{
const page=await browser.newPage();
await page.goto('https://funypin.kr/shops.html?qa=location-width-20261106',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>document.querySelector('#map-location-btn')!==null,{timeout:7000});
const localCss=fs.readFileSync('C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa/map-location-v1.css','utf8');
await page.addStyleTag({content:localCss});
for(const width of [390,420,430,431,480,768,1024]){
 await page.setViewport({width,height:800});
 await new Promise(r=>setTimeout(r,180));
 const d=await page.evaluate(()=>{
  const b=document.querySelector('#map-location-btn'),a=document.querySelector('#map-location-avatar-btn'),c=document.querySelector('.map-location-control'),s=document.querySelector('.map-shop-sheet'),map=document.querySelector('.map-wrap-hero');
  const br=b?.getBoundingClientRect(),ar=a?.getBoundingClientRect(),sr=s?.getBoundingClientRect(),mr=map?.getBoundingClientRect();
  const element=br?document.elementFromPoint(br.x+br.width/2,br.y+br.height/2):null;
  return {width:innerWidth,buttonTop:Math.round(br?.top||-1),buttonBottom:Math.round(br?.bottom||-1),avatarTop:Math.round(ar?.top||-1),sheetTop:Math.round(sr?.top||-1),mapBottom:Math.round(mr?.bottom||-1),overlap:!!(br&&sr&&br.bottom>sr.top),clickable:!!(element&&(b===element||b.contains(element))),cssTop:getComputedStyle(c).top};
 });
 console.log(JSON.stringify(d));
 assert(d.buttonBottom<=d.sheetTop-6, 'location button overlapped sheet at '+width);
 assert(d.avatarTop>=0,'avatar out of viewport at '+width);
 assert(d.clickable,'location button not clickable at '+width);
}
console.log('PASS mobile and wider desktop web map location controls clear of sheet and clickable');
}finally{await browser.close()}
})().catch(e=>{console.error('QA ERROR',e.stack);process.exitCode=1});