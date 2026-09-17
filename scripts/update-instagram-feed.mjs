import fs from 'node:fs/promises';

const CONFIG='data/instagram-shops.json';
const OUTPUT='data/instagram-feed.json';
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152 Safari/537.36';

const cfg=JSON.parse(await fs.readFile(CONFIG,'utf8'));
let previous={shops:{}};
try{previous=JSON.parse(await fs.readFile(OUTPUT,'utf8'))}catch{}

function decode(s=''){
  return s.replace(/\\u0026/g,'&').replace(/\\u003d/g,'=').replace(/\\u002f/g,'/').replace(/\\u0025/g,'%').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&#x2F;/g,'/').replace(/&quot;/g,'"');
}
function abs(base,raw=''){
  const v=decode(raw);
  try{return new URL(v,base).href}catch{return v}
}
function uniquePosts(items){
  const seen=new Set();
  return items.filter(p=>{
    const k=p.permalink||p.image;
    if(!k||!p.image||seen.has(k))return false;
    seen.add(k);
    return true;
  }).slice(0,3);
}
async function getText(url){
  const r=await fetch(url,{headers:{'user-agent':ua,'accept-language':'ko-KR,ko;q=0.9,en;q=0.8','accept':'text/html,application/xhtml+xml'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function parseInstagram(html,profileUrl){
  const posts=[];
  const re=/"(?:display_url|thumbnail_src|image_versions2)"\s*:\s*(?:"([^"]+)"|\{[^}]*?"url"\s*:\s*"([^"]+)")/g;
  let m;
  while((m=re.exec(html))&&posts.length<12){
    const image=decode(m[1]||m[2]);
    if(image&&/^https?:/.test(image))posts.push({image,permalink:profileUrl});
  }
  const shortcode=[...html.matchAll(/"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/g)].map(x=>x[1]);
  shortcode.forEach((code,i)=>{if(posts[i])posts[i].permalink=`https://www.instagram.com/p/${code}/`});
  return uniquePosts(posts);
}

function extractViewerCards(html,viewerUrl,username){
  const cards=[];
  for(const m of html.matchAll(/<a\b([^>]*href=["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi)){
    const attrs=m[1],body=m[2];
    const hm=attrs.match(/href=["']([^"']+)["']/i);
    const im=body.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/i);
    if(!hm||!im)continue;
    const href=abs(viewerUrl,hm[1]);
    const image=abs(viewerUrl,im[1]);
    if(!/^https?:\/\//.test(image)||/avatar|profile|logo|favicon|icon/i.test(image))continue;
    const code=(href.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/i)||href.match(/\/(?:p|reel|post|media)\/([A-Za-z0-9_-]+)/i))?.[1];
    const looksPost=!!code||/post|media|reel/i.test(href);
    if(!looksPost)continue;
    cards.push({image,permalink:code?`https://www.instagram.com/p/${code}/`:`https://www.instagram.com/${username}/`});
  }
  return uniquePosts(cards);
}

function parseViewer(html,viewerUrl,username){
  const cardPosts=extractViewerCards(html,viewerUrl,username);
  if(cardPosts.length>=3)return cardPosts;

  const serialized=[];
  for(const m of html.matchAll(/\{[^{}]{0,3500}?(?:shortcode|code)["']?\s*:\s*["']([A-Za-z0-9_-]+)["'][^{}]{0,3500}?\}/gi)){
    const chunk=m[0],code=m[1];
    const im=chunk.match(/(?:display_url|thumbnail_url|thumbnailUrl|image_url|image)["']?\s*:\s*["']([^"']+)["']/i);
    if(im)serialized.push({image:abs(viewerUrl,im[1]),permalink:`https://www.instagram.com/p/${code}/`});
  }
  const merged=uniquePosts([...cardPosts,...serialized]);
  if(merged.length>=3)return merged;

  const images=[];
  const add=(raw)=>{
    const image=abs(viewerUrl,raw||'');
    if(!/^https?:\/\//.test(image)||/avatar|profile|logo|favicon|icon/i.test(image))return;
    if(!images.includes(image))images.push(image);
  };
  for(const m of html.matchAll(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi))add(m[1]);
  for(const m of html.matchAll(/"(?:image|thumbnailUrl|thumbnail_url|display_url|thumbnail_src|image_url)"\s*:\s*"([^"]+)"/gi))add(m[1]);
  return uniquePosts([...merged,...images.map(image=>({image,permalink:`https://www.instagram.com/${username}/`}))]);
}

async function crawl(username){
  const profileUrl=`https://www.instagram.com/${encodeURIComponent(username)}/`;
  try{
    const html=await getText(profileUrl);
    const posts=parseInstagram(html,profileUrl);
    if(posts.length>=3)return {posts,source:'instagram-public'};
  }catch(e){console.warn(`  Instagram direct: ${e.message}`)}

  // Temporary no-auth viewers. Stop as soon as a source yields the requested top 3.
  // This layer will be removed when the Meta Graph API is connected.
  const viewers=[
    {source:'picuki-site',url:`https://picuki.site/profile/${encodeURIComponent(username)}`},
    {source:'picuki-site',url:`https://picuki.site/instagram-profile-viewer/${encodeURIComponent(username)}`},
    {source:'thepicuki',url:`https://thepicuki.com/profile/${encodeURIComponent(username)}`},
    {source:'pictame',url:`https://pictame.com/en/instagram/${encodeURIComponent(username)}`},
    {source:'pictame',url:`https://pictame.com/en/profile/${encodeURIComponent(username)}`},
    {source:'pictame',url:`https://pictame.com/user/${encodeURIComponent(username)}`}
  ];
  let best=[];
  let bestSource='';
  for(const viewer of viewers){
    try{
      const html=await getText(viewer.url);
      const posts=parseViewer(html,viewer.url,username);
      if(posts.length>best.length){best=posts;bestSource=viewer.source}
      console.log(`  Viewer ${viewer.source}: ${posts.length} posts`);
      if(best.length>=3)break;
    }catch(e){console.warn(`  Viewer ${viewer.source} ${viewer.url}: ${e.message}`)}
  }
  if(!best.length)throw new Error('all viewers returned no usable posts');
  return {posts:best,source:`${bestSource}-public-viewer`};
}

const out={updatedAt:new Date().toISOString(),source:'temporary-public-instagram-fallback',shops:{}};
for(const [id,shop] of Object.entries(cfg.shops||{})){
  try{
    const result=await crawl(shop.username);
    const old=previous.shops?.[id];
    if(old?.posts?.length>result.posts.length)out.shops[id]=old;
    else out.shops[id]={username:shop.username,source:result.source,posts:result.posts};
    console.log(`${id} @${shop.username}: ${result.posts.length} posts via ${result.source}`);
  }catch(e){
    console.warn(`${id} @${shop.username}: ${e.message}`);
    if(previous.shops?.[id]?.posts?.length)out.shops[id]=previous.shops[id];
  }
  await new Promise(r=>setTimeout(r,1200));
}
await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+'\n');
