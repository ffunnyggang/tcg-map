import fs from 'node:fs/promises';

const CONFIG = 'data/instagram-shops.json';
const OUTPUT = 'data/instagram-feed.json';
const DATASET_ID = 'gd_l1vikfch901nx3by4';
const API_KEY = process.env.BRIGHTDATA_API_KEY;

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
    /^https?:\/\//i.test(post?.image || '');
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

for (const [shopId, shop] of shops) {
  try {
    console.log(`${shopId} @${shop.username}: requesting Bright Data Profiles`);
    const profile = await requestProfile(shop.url);
    const posts = Array.isArray(profile?.posts)
      ? profile.posts.filter(validRawPost).slice(0, 4).map(post => ({
          image: post.image_url,
          permalink: post.url,
          timestamp: post.datetime || null,
          contentType: post.content_type || null
        }))
      : [];

    if (!posts.length) throw new Error('Bright Data response has no usable profile posts');

    nextShops[shopId] = {
      username: shop.username,
      source: 'brightdata-instagram-profiles',
      posts
    };
    updatedCount++;
    console.log(`${shopId} @${shop.username}: saved ${posts.length} posts in profile-grid order`);
  } catch (error) {
    const prior = previous.shops?.[shopId];
    const priorPosts = Array.isArray(prior?.posts) ? prior.posts.filter(validSavedPost).slice(0, 4) : [];

    if (priorPosts.length) {
      nextShops[shopId] = { ...prior, posts: priorPosts };
      preservedCount++;
      console.warn(`${shopId} @${shop.username}: ${error.message}; preserved ${priorPosts.length} prior valid posts`);
    } else {
      omittedCount++;
      console.warn(`${shopId} @${shop.username}: ${error.message}; omitted from feed`);
    }
  }
}

if (!updatedCount && !preservedCount) {
  throw new Error('No usable Instagram feed data available');
}

const out = {
  updatedAt: new Date().toISOString(),
  source: 'brightdata-instagram-profiles',
  shops: nextShops
};

await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Instagram feed complete: ${updatedCount} refreshed, ${preservedCount} preserved, ${omittedCount} omitted`);
