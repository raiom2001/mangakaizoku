/* =====================================================
   MangaWeb — router.js
   Hash-based SPA router
   ===================================================== */

const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function define(pattern, handler) {
    routes[pattern] = handler;
  }

  function parse(hash) {
    const path = (hash || '#/').replace(/^#/, '') || '/';
    for (const pattern of Object.keys(routes)) {
      const regexStr = pattern.replace(/:[^/]+/g, '([^/]+)');
      const regex = new RegExp(`^${regexStr}$`);
      const paramNames = (pattern.match(/:([^/]+)/g) || []).map(s => s.slice(1));
      const match = path.match(regex);
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        return { handler: routes[pattern], params };
      }
    }
    return null;
  }

  function navigate(hash) {
    location.hash = hash;
  }

  function dispatch() {
    const hash = location.hash || '#/';
    const result = parse(hash);
    if (result) {
      currentRoute = hash;
      result.handler(result.params);
    } else {
      // 404 fallback
      const app = document.getElementById('app');
      if (app) app.innerHTML = UI.emptyState('🔍', 'Página não encontrada', 'Volte para o início.');
    }
  }

  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  function getCurrentRoute() { return currentRoute; }

  return { define, navigate, dispatch, init, getCurrentRoute };
})();
