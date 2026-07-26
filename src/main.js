import '@google/model-viewer';
import { initRouter, navigate } from './router/router.js';
import { renderDishPage } from './components/AppShell.js';

const root = document.getElementById('app');

initRouter((route) => {
  if (route.name === 'dish') {
    renderDishPage(root, route.slug);
    return;
  }

  // Root path ("/") and any unmatched path redirect to a default dish
  // rather than showing an empty shell — there's always something to demo.
  navigate('/dish/pizza');
});
