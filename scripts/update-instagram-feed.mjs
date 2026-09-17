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

function validPost(post) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?/i.test(post?.url || '') &&
    /^https?:\/\//i.test(post?.image_url || '');
}

function normalizeProfileUrl(value = '') {
  try {
    const url = new URL(value);
    return url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  } catch {
    return String(value).replace(/^@/, '').replace(/^\/+|\/+$/g, '').toLowerCase();
  }
}

function responseItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data ? [data] : [];
}

function profileKey(profile) {
  return normalizeProfileUrl(
    profile?.url || profile?.profile_url || profile?.input?.url ||
    profile?.username || profile?.account || profile?.user_name || ''
  );
}

async function requestProfiles(profileUrls) {
  const endpoint = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${encodeURIComponent(DATASET_ID)}&notify=false&include_errors=true`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: profileUrls.map(url => ({ url })), limit_per_input: null })
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Bright Data HTTP ${response.status}: ${text.slice(0, 300)}`);
  try { return responseItems(JSON.parse(text)); }
  catch { throw new Error('Bright Data returned invalid JSON'); }
}

function mapProfiles(items) {
  const mapped = new Map();
  for (const profile of items) {
    if (!Array.isArray(profile?.posts)) continue;
    const key = profileKey(profile);
    if (key) mapped.set(key, profile);
    const username = normalizeProfileUrl(profile?.username || profile?.account || profile?.user_name || '');
    if (username) mapped.set(username, profile);
  }
  return mapped;
}

async function fetchAllProfiles() {
  const urls = shops.map(([, shop]) => shop.url);
  let profiles = mapProfiles(await requestProfiles(urls));
  const missing = shops.filter(([, shop]) => !profiles.get(normalizeProfileUrl(shop.url)) && !profiles.get(normalizeProfileUrl(shop.username)));

  if (missing.length) {
    console.warn(`${missing.length} profile(s) missing posts payload; retrying those once`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const retryProfiles = mapProfiles(await requestProfiles(missing.map(([, shop]) => shop.url)));
    profiles = new Map([...profiles, ...retryProfiles]);
  }
  return profiles;
}

const profiles = await fetchAllProfiles();
const nextShops = {};
let updatedCount = 0;
let preservedCount = 0;

for (const [shopId, shop] of shops) {
  const profile = profiles.get(normalizeProfileUrl(shop.url)) || profiles.get(normalizeProfileUrl(shop.username));
  const posts = Array.isArray(profile?.posts)
    ? profile.posts.filter(validPost).slice(0, 4).map(post => ({
        image: post.image_url,
        permalink: post.url,
        timestamp: post.datetime || null,
        contentType: post.content_type || null
      }))
    : [];

  if (posts.length) {
    nextShops[shopId] = { username: shop.username, source: 'brightdata-instagram-profiles', posts };
    updatedCount++;
    console.log(`${shopId} @${shop.username}: saved ${posts.length} posts in profile-grid order`);
    continue;
  }

  const prior = previous.shops?.[shopId];
  const priorPosts = Array.isArray(prior?.posts)
    ? prior.posts.filter(post => /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\//i.test(post?.permalink || '') && /^https?:\/\//i.test(post?.image || '')).slice(0, 4)
    : [];

  if (priorPosts.length) {
    nextShops[shopId] = { ...prior, posts: priorPosts };
    preservedCount++;
    console.warn(`${shopId} @${shop.username}: no fresh usable posts; preserved ${priorPosts.length} prior valid posts`);
  } else {
    console.warn(`${shopId} @${shop.username}: no usable posts; omitted from feed`);
  }
}

if (!updatedCount) throw new Error('Bright Data returned no usable Instagram profiles');

const out = {
  updatedAt: new Date().toISOString(),
  source: 'brightdata-instagram-profiles',
  shops: nextShops
};
await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Instagram feed complete: ${updatedCount} refreshed, ${preservedCount} preserved, ${shops.length - updatedCount - preservedCount} omitted`);
