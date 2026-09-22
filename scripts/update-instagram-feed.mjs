import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const CONFIG = 'data/instagram-shops.json';
const OUTPUT = 'data/instagram-feed.json';
const DATASET_ID = 'gd_l1vikfch901nx3by4';
const API_KEY = process.env.BRIGHTDATA_API_KEY;
const CACHE_ROOT = 'images/instagram';
const CONCURRENCY = 5;

if (!API_KEY) throw new Error('BRIGHTDATA_API_KEY is not configured');

const cfg = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
let previous = { shops: {} };
try { previous = JSON.parse(await fs.readFile(OUTPUT, 'utf8')); } catch {}

const shops = Object.entries(cfg.shops || {}).filter(([, shop]) => shop?.url);
if (!shops.length) throw new Error('No Instagram shops configured');

function validRawPost(post) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?/i.test(post?.url || '') &&
    /^https?:\/\//i.test(post?.image_url || '');
}

function validSavedPost(post) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?/i.test(post?.permalink || '') &&
    typeof post?.image === 'string' && (post.image.startsWith(`${CACHE_ROOT}/`) || /^https?:\/\//i.test(post.image));
}

function postKey(permalink) {
  const m = permalink.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/i);
  return m?.[1] || crypto.createHash('sha1').update(permalink).digest('hex').slice(0, 16);
}

function extFromContentType(type) {
  if (/png/i.test(type || '')) return '.png';
  if (/webp/i.test(type || '')) return '.webp';
  return '.jpg';
}

async function cacheImage(shopId, post, priorPost) {
  if (priorPost?.image?.startsWith(`${CACHE_ROOT}/`)) {
    try { await fs.access(priorPost.image); return priorPost.image; } catch {}
  }
  const response = await fetch(post.image_url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
  const ext = extFromContentType(response.headers.get('content-type'));
  const dir = path.join(CACHE_ROOT, shopId);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${postKey(post.url)}${ext}`);
  await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

async function pruneCache(shopId, keepPaths) {
  const dir = path.join(CACHE_ROOT, shopId);
  let names;
  try { names = await fs.readdir(dir); } catch { return; }
  const keep = new Set(keepPaths.map(p => path.basename(p)));
  await Promise.all(names.filter(n => !keep.has(n)).map(n => fs.rm(path.join(dir, n), { force: true })));
}

function findProfile(data) {
  const candidates = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [data];
  return candidates.find(item => Array.isArray(item?.posts)) || null;
}

async function requestProfile(profileUrl) {
  const endpoint = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${encodeURIComponent(DATASET_ID)}&notify=false&include_errors=true`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: [{ url: profileUrl }], limit_per_input: null })
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Bright Data HTTP ${response.status}: ${text.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Bright Data returned invalid JSON'); }
  return findProfile(data);
}

const nextShops = {};
let updatedCount = 0;
let preservedCount = 0;
let omittedCount = 0;

async function processShop([shopId, shop]) {
  try {
    console.log(`${shopId} @${shop.username}: requesting Bright Data Profiles`);
    const profile = await requestProfile(shop.url);
    const rawPosts = Array.isArray(profile?.posts) ? profile.posts.filter(validRawPost).slice(0, 4) : [];
    if (!rawPosts.length) throw new Error('Bright Data response has no usable profile posts');

    const prior = previous.shops?.[shopId];
    const priorByPermalink = new Map((prior?.posts || []).map(p => [p.permalink, p]));
    const posts = [];
    for (const post of rawPosts) {
      const image = await cacheImage(shopId, post, priorByPermalink.get(post.url));
      posts.push({
        image,
        permalink: post.url,
        timestamp: post.datetime || null,
        contentType: post.content_type || null
      });
    }

    await pruneCache(shopId, posts.map(p => p.image));
    nextShops[shopId] = { username: shop.username, source: 'brightdata-instagram-profiles', posts };
    updatedCount++;
    console.log(`${shopId} @${shop.username}: cached ${posts.length} posts`);
  } catch (error) {
    const prior = previous.shops?.[shopId];
    const priorPosts = Array.isArray(prior?.posts) ? prior.posts.filter(validSavedPost).slice(0, 4) : [];
    if (priorPosts.length) {
      nextShops[shopId] = { ...prior, posts: priorPosts };
      preservedCount++;
      console.warn(`${shopId} @${shop.username}: ${error.message}; preserved ${priorPosts.length} prior posts`);
    } else {
      omittedCount++;
      console.warn(`${shopId} @${shop.username}: ${error.message}; omitted from feed`);
    }
  }
}

for (let i = 0; i < shops.length; i += CONCURRENCY) {
  await Promise.all(shops.slice(i, i + CONCURRENCY).map(processShop));
}

if (!updatedCount && !preservedCount) throw new Error('No usable Instagram feed data available');

const out = {
  updatedAt: new Date().toISOString(),
  source: 'brightdata-instagram-profiles',
  shops: nextShops
};

await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Instagram feed complete: ${updatedCount} refreshed, ${preservedCount} preserved, ${omittedCount} omitted`);
