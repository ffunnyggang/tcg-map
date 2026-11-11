/* Login gate for production shop, product and market details. */
(function () {
  const auth = window.FUNY_WEB_AUTH;
  let pending = null;
  let timer;

  function openNativeAccount(url) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_NATIVE', route: '/account' }));
    } else {
      auth.goLogin(url);
    }
  }

  function clear(request) {
    if (pending !== request) return;
    pending = null;
    clearInterval(timer);
    if (request?.loginButton) request.loginButton.hidden = true;
  }

  async function check(request) {
    if (!request || pending !== request || request.checking) return;
    if (!request.isCurrent()) {
      clear(request);
      return;
    }
    request.checking = true;
    try {
      await auth.init();
      const inApp = auth.isAppShell();
      const initialUser = auth.session?.user;
      if (inApp) await auth.refreshNativeSession();
      if (pending !== request || !request.isCurrent()) {
        clear(request);
        return;
      }
      const nativeGuest = inApp && window.__FUNY_APP_CONTEXT?.loggedIn === false;
      if (auth.session?.user && !nativeGuest) {
        clear(request);
        // Reinitialize the data client with the injected token.
        if (inApp && request.reloadWithNativeSession && (request.loginRequested || !initialUser)) {
          if (request.url !== location.href) history.replaceState(history.state, '', request.url);
          location.reload();
        } else {
          request.open();
        }
      } else if (inApp && window.ReactNativeWebView &&
                 typeof window.__FUNY_APP_CONTEXT?.loggedIn !== 'boolean' && !request.waitedForBridge) {
        request.waitedForBridge = true;
        setTimeout(() => { void check(request); }, 750);
      } else if (!request.loginRequested) {
        request.loginRequested = true;
        if (inApp) {
          // The account screen opens over this WebView. Resume after token injection.
          if (request.loginButton) {
            request.loginButton.hidden = false;
            request.loginButton.onclick = () => openNativeAccount(request.url);
          }
          openNativeAccount(request.url);
          timer = setInterval(() => { if (!document.hidden) void check(request); }, 750);
        } else {
          auth.rememberReturn(request.url);
          if (request.url === location.href) location.replace('/login.html');
          else location.assign('/login.html');
        }
      }
    } catch (error) {
      clear(request);
      console.warn('[FUNY DETAIL] Unable to verify session', error);
    } finally {
      request.checking = false;
    }
  }

  window.FUNY_DETAIL_ACCESS = {
    open(url, open, isCurrent = () => true, reloadWithNativeSession = false) {
      const target = new URL(url, location.href).href;
      if (pending?.url === target && pending.isCurrent()) return;
      clear(pending);
      const loginButton = document.querySelector('[data-detail-login]');
      pending = {
        url: target, open, isCurrent, loginButton,
        reloadWithNativeSession: reloadWithNativeSession || !!loginButton
      };
      void check(pending);
    }
  };
  window.addEventListener('focus', () => { if (pending) void check(pending); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pending) void check(pending);
  });
})();
