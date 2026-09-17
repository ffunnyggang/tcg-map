import fs from 'node:fs/promises';

const CONFIG='data/instagram-shops.json';
const OUTPUT='data/instagram-feed.json';
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36';

const cfg=JSON.parse(await fs.readFile(CONFIG,'utf8'));
let previous={shops:{}};
try{previous=JSON.parse(await fs.readFile(OUTPUT,'utf8'))}catch{}

function decode(s=''){return s.replace(/\\u0026/g,'&').replace(/\\u003d/g,'=').replace(/\\u002f/g,'/').replace(/\\u0025/g,'%').replace(/&amp;/g,'&')}
function uniquePosts(items){const seen=new Set();return items.filter(p=>{const k=p.permalink||p.image;if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,3)}

async function crawl(username){
  const url=`https://www.instagram.com/${encodeURIComponent(username)}/`;
  const r=await fetch(url,{headers:{'user-agent':ua,'accept-language':'ko-KR,ko;q=0.9,en;q=0.8','accept':'text/html,application/xhtml+xml'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const html=await r.text();
  const posts=[];
  const re=/"(?:display_url|thumbnail_src|image_versions2)"\s*:\s*(?:"([^"]+)"|\{[^}]*?"url"\s*:\s*"([^"]+)")/g;
  let m;
  while((m=re.exec(html))&&posts.length<12){const image=decode(m[1]||m[2]);if(image&&/^https?:/.test(image))posts.push({image,permalink:url})}
  const shortcode=[...html.matchAll(/"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/g)].map(x=>x[1]);
  shortcode.forEach((code,i)=>{if(posts[i])posts[i].permalink=`https://www.instagram.com/p/${code}/`});
  return uniquePosts(posts);
}

const out={updatedAt:new Date().toISOString(),source:'temporary-public-instagram-crawl',shops:{}};
for(const [id,shop] of Object.entries(cfg.shops||{})){
  try{
    const posts=await crawl(shop.username);
    if(posts.length)out.shops[id]={username:shop.username,posts};
    else if(previous.shops?.[id]?.posts?.length)out.shops[id]=previous.shops[id];
    console.log(`${id} @${shop.username}: ${posts.length} posts`);
  }catch(e){
    console.warn(`${id} @${shop.username}: ${e.message}`);
    if(previous.shops?.[id]?.posts?.length)out.shops[id]=previous.shops[id];
  }
  await new Promise(r=>setTimeout(r,1200));
}
await fs.writeFile(OUTPUT,JSON.stringify(out,null,2)+'\n');
