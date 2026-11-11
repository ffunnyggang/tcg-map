const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = fs.readFileSync('detail-access.js', 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup(path, { app = false, loggedIn = false, product = false } = {}) {
  const events = [];
  const intervals = new Map();
  let intervalId = 0;
  const loginButton = product ? { hidden: true } : null;
  const location = {
    href: 'https://funypin.kr' + path,
    assign: url => events.push(['assign', url]),
    replace: url => events.push(['replace', url]),
    reload: () => events.push(['reload'])
  };
  const auth = {
    session: loggedIn ? { user: { id: 'member' } } : null,
    init: async () => {},
    isAppShell: () => app,
    refreshNativeSession: async () => {},
    rememberReturn: url => events.push(['return', url])
  };
  const window = { FUNY_WEB_AUTH: auth, addEventListener() {} };
  if (app) {
    window.__FUNY_APP_CONTEXT = { loggedIn };
    window.ReactNativeWebView = {
      postMessage: message => events.push(['native', JSON.parse(message)])
    };
  }
  vm.runInNewContext(code, {
    window, location, URL, console, setTimeout,
    history: { replaceState: (_state, _title, url) => events.push(['route', url]) },
    document: { hidden: false, addEventListener() {}, querySelector: () => loginButton },
    setInterval(callback) { intervals.set(++intervalId, callback); return intervalId; },
    clearInterval(id) { intervals.delete(id); }
  });
  return { gate: window.FUNY_DETAIL_ACCESS, window, auth, events, intervals, loginButton, location };
}

(async () => {
  const routes = [
    '/shops.html?country=JP#/shop/JP-TKY-001',
    '/box-detail.html?id=jp_inferno_x',
    '/graded-card-detail.html?id=example',
    '/market.html#/listing/00000000-0000-0000-0000-000000000000'
  ];
  for (const route of routes) {
    const guest = setup(route);
    guest.gate.open(route, () => assert.fail('Guest detail rendered'));
    await settle();
    assert.deepEqual(guest.events, [
      ['return', 'https://funypin.kr' + route],
      ['replace', '/login.html']
    ]);

    const member = setup(route, { loggedIn: true });
    let opened = false;
    member.gate.open(route, () => { opened = true; });
    await settle();
    assert.equal(opened, true);
    assert.deepEqual(member.events, []);
  }

  const market = setup('/market.html?app=1', { app: true });
  const route = routes[3].replace('#', '?app=1#');
  let opened = 0;
  market.gate.open(route, () => opened++, () => true, true);
  market.gate.open(route, () => opened++, () => true, true);
  await settle();
  assert.equal(opened, 0);
  assert.deepEqual(market.events, [['native', { type: 'OPEN_NATIVE', route: '/account' }]]);
  market.auth.session = { user: { id: 'member' } };
  market.window.__FUNY_APP_CONTEXT.loggedIn = true;
  for (const tick of market.intervals.values()) tick();
  await settle();
  assert.equal(opened, 0);
  assert.deepEqual(market.events.slice(1), [['route', 'https://funypin.kr' + route], ['reload']]);
  assert.equal(market.intervals.size, 0);

  const product = setup(routes[1] + '&app=1&appPlatform=android', { app: true, product: true });
  product.gate.open(product.location.href, () => assert.fail('Product should reload with native session'));
  await settle();
  assert.equal(product.loginButton.hidden, false);
  product.loginButton.onclick();
  assert.equal(product.events.length, 2);
  product.auth.session = { user: { id: 'member' } };
  product.window.__FUNY_APP_CONTEXT.loggedIn = true;
  for (const tick of product.intervals.values()) tick();
  await settle();
  assert.deepEqual(product.events.at(-1), ['reload']);
  assert.equal(product.loginButton.hidden, true);

  const shop = setup('/shops.html?app=1', { app: true });
  let resumed = false;
  shop.gate.open(routes[0], () => { resumed = true; });
  await settle();
  shop.auth.session = { user: { id: 'member' } };
  shop.window.__FUNY_APP_CONTEXT.loggedIn = true;
  for (const tick of shop.intervals.values()) tick();
  await settle();
  assert.equal(resumed, true);

  shop.auth.session = null;
  shop.window.__FUNY_APP_CONTEXT.loggedIn = false;
  let current = true;
  shop.gate.open(routes[0], () => assert.fail('Abandoned detail opened'), () => current);
  await settle();
  current = false;
  for (const tick of shop.intervals.values()) tick();
  await settle();
  assert.equal(shop.intervals.size, 0);
  console.log('PASS detail access: guest redirects, authenticated routes, native login resume and cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });
