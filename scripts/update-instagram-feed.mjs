import fs from 'node:fs/promises';

const CONFIG='data/instagram-shops.json';
const OUTPUT='data/instagram-feed.json';
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152 Safari/537.36';

const cfg=JSON.parse(await fs.readFile(CONFIG,'utf8'));
let previous={shops:{}};
try{previous=JSON.parse(await fs.readFile(OUTPUT,'utf8'))}catch{}

function decode(s=''){
  return s.replace(/\\u0026/g,'&').replace(/\\u003d/g,'=').replace(/\\u002f/g,'/').replace(/\\u0025/g,'%').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&#x2F;/g,'/');
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

function parseViewer(html,username){
  const posts=[];
  const imageUrls=[];
  const addImage=(raw)=>{
    const image=decode(raw||'');
    if(!/^https?:\/\//.test(image))return;
    if(/avatar|profile|logo|favicon/i.test(image))return;
    if(!imageUrls.includes(image))imageUrls.push(image);
  };
  for(const m of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi))addImage(m[1]);
  for(const m of html.matchAll(/"(?:image|thumbnailUrl|display_url|thumbnail_src)"\s*:\s*"([^"]+)"/gi))addImage(m[1]);

  const links=[];
  for(const m of html.matchAll(/href=["']([^"']+)["']/gi)){
    const href=decode(m[1]);
    if(/instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+/i.test(href))links.push(href.startsWith('http')?href:`https://www.instagram.com${href}`);
  }
  for(let i=0;i<Math.min(imageUrls.length,12);i++){
    posts.push({image:imageUrls[i],permalink:links[i]||`https://www.instagram.com/${username}/`});
  }
  return uniquePosts(posts);
}

async function crawl(username){
  const profileUrl=`https://www.instagram.com/${encodeURIComponent(username)}/`;
  try{
    const html=await getText(profileUrl);
    const posts=parseInstagram(html,profileUrl);
    if(posts.length)return {posts,source:'instagram-public'};
  }catch(e){
    console.warn(`  Instagram direct: ${e.message}`);
  }

  // Temporary fallback until Meta Graph API is connected.
  // Pictame is a public Instagram viewer; only public thumbnails/permalinks are consumed.
  const viewerUrl=`https://pictame.com/en/instagram/${encodeURIComponent(username)}`;
  const html=await getText(viewerUrl);
  const posts=parseViewer(html,username);
  if(!posts.length)throw new Error('viewer returned no usable posts');
  return {posts,source:'pictame-public-viewer'};
}

const out={updatedAt:new Date().toISOString(),source:'temporary-public-instagram-fallback',shops:{}};
for(const [id,shop] of Object.entries(cfg.shops||{})){
  try{
    const result=await crawl(shop.username);
    if(result.posts.length)out.shops[id]={username:shop.username,source:result.source,posts:result.posts};
    else if(previous.shops?.[id]?.posts?.length)out.shops[id]=previous.shops[id];
    console.log(`${id} @${shop.username}: ${result.posts.length} posts via ${result.source}`);
  }catch(e){
    console.warn(`${id} @${shop.username}: ${e.message}`);
    if(previous.shops?.[id]?.posts?.length)out.shops[id]=previous.shops[id];
  }
  await new Promise(r=>setTimeout(r,1500));
}
await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+'\n');
