import fs from 'node:fs/promises';

const CONFIG = 'data/instagram-shops.json';
const OUTPUT = 'data/instagram-feed.json';
const DATASET_ID = 'gd_l1vikfch901nx3by4';
const TEST_SHOP_ID = process.env.INSTAGRAM_SHOP_ID || 'KR-SEO-005'; // Cardgarden first
const API_KEY = process.env.BRIGHTDATA_API_KEY;

if (!API_KEY) throw new Error('BRIGHTDATA_API_KEY is not configured');

const cfg = JSON.parse(await fs.readFile(CONFIG, 'utf8'));
let previous = { shops: {} };
try { previous = JSON.parse(await fs.readFile(OUTPUT, 'utf8')); } catch {}

const shop = cfg.shops?.[TEST_SHOP_ID];
if (!shop?.url) throw new Error(`Instagram shop config not found: ${TEST_SHOP_ID}`);

function validPost(post) {
  return /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?/i.test(post?.url || '') &&
    /^https?:\/\//i.test(post?.image_url || '');
}

async function fetchProfile(profileUrl) {
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
  const profiles = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [data];
  const profile = profiles.find(item => Array.isArray(item?.posts));
  if (!profile) throw new Error('Bright Data response has no profile posts array');
  return profile;
}

try {
  console.log(`${TEST_SHOP_ID} @${shop.username}: requesting Bright Data Profiles`);
  const profile = await fetchProfile(shop.url);

  // IMPORTANT: preserve Bright Data profile-grid order. Do not sort by datetime;
  // pinned Instagram posts may be older but intentionally appear at the top.
  const posts = profile.posts.filter(validPost).slice(0, 4).map(post => ({
    image: post.image_url,
    permalink: post.url,
    timestamp: post.datetime || null,
    contentType: post.content_type || null
  }));

  if (!posts.length) throw new Error('Bright Data returned no usable Instagram posts');

  const out = {
    ...previous,
    updatedAt: new Date().toISOString(),
    source: 'brightdata-instagram-profiles',
    shops: {
      ...(previous.shops || {}),
      [TEST_SHOP_ID]: {
        username: shop.username,
        source: 'brightdata-instagram-profiles',
        posts
      }
    }
  };

  await fs.writeFile(OUTPUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`${TEST_SHOP_ID} @${shop.username}: saved ${posts.length} posts in profile-grid order`);
} catch (error) {
  // Never overwrite a previously valid feed when Bright Data fails.
  console.error(`${TEST_SHOP_ID} @${shop.username}: ${error.message}`);
  process.exitCode = 1;
}
