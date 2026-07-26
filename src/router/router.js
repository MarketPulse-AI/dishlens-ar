/**
 * Minimal client-side router for a single dynamic route shape: /dish/:slug
 *
 * Kept intentionally small — this app has one real route pattern, so a full
 * routing library would be overhead. If routes grow beyond /dish/:slug,
 * revisit this decision.
 */

const DISH_ROUTE = /^\/dish\/([a-z0-9-]+)\/?$/i;

let onRouteChange = () => {};

function parseRoute(pathname) {
  const match = pathname.match(DISH_ROUTE);
  if (match) {
    return { name: 'dish', slug: match[1] };
  }
  return { name: 'not-found', slug: null };
}

function handleNavigation() {
  const route = parseRoute(window.location.pathname);
  onRouteChange(route);
}

export function initRouter(callback) {
  onRouteChange = callback;

  // Intercept in-app link clicks so we do full SPA navigation, not page reloads.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });

  window.addEventListener('popstate', handleNavigation);
  handleNavigation();
}

export function navigate(path) {
  if (path === window.location.pathname) return;
  window.history.pushState({}, '', path);
  handleNavigation();
}
