import { getDish, getAllSlugs } from '../data/index.js';
import { renderARPreview, mountARPreview } from './panels/ARPreview.js';
import { renderIngredients } from './panels/Ingredients.js';
import { renderPreparation } from './panels/Preparation.js';
import { renderDiscover } from './panels/Discover.js';

const PANEL_RENDERERS = {
  ar: renderARPreview,
  ingredients: renderIngredients,
  preparation: renderPreparation,
  discover: renderDiscover,
};

const TABS = [
  { id: 'ar', label: 'AR Preview' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'preparation', label: 'Preparation' },
  { id: 'discover', label: 'Discover' },
];

let activeTab = 'ar';

/**
 * Renders the full app for a given dish slug into `root`.
 * Full re-render on every tab change -- straightforward at this scale
 * (four static panels, no shared mutable state between them beyond the
 * dish object itself). AR Preview is the one panel with a post-insert
 * mount step, since <model-viewer>'s JS API only exists on the live
 * element instance -- see mountARPreview().
 */
export function renderDishPage(root, slug) {
  const dish = getDish(slug);

  if (!dish) {
    root.innerHTML = renderNotFound(slug);
    return;
  }

  root.innerHTML = `
    <header class="app-header">
      <div class="app-header__eyebrow">DishLens AR</div>
      <h1 class="app-header__title">${dish.name}</h1>
      <p class="app-header__tagline">${dish.tagline}</p>
    </header>

    <nav class="tab-bar" role="tablist" aria-label="Dish sections">
      ${TABS.map(tab => `
        <button
          class="tab-bar__tab ${tab.id === activeTab ? 'is-active' : ''}"
          role="tab"
          id="tab-${tab.id}"
          aria-selected="${tab.id === activeTab}"
          aria-controls="panel-root"
          tabindex="${tab.id === activeTab ? '0' : '-1'}"
          data-tab="${tab.id}"
        >
          ${tab.label}
        </button>
      `).join('')}
    </nav>

    <main
      class="panel is-entering"
      id="panel-root"
      role="tabpanel"
      aria-labelledby="tab-${activeTab}"
      tabindex="0"
    >
      ${PANEL_RENDERERS[activeTab](dish)}
    </main>
  `;

  const tabButtons = Array.from(root.querySelectorAll('.tab-bar__tab'));

  const activateTab = (tabId) => {
    if (tabId === activeTab) return;
    activeTab = tabId;
    renderDishPage(root, slug);
    // Move focus to the newly active tab so keyboard users don't lose place.
    root.querySelector(`#tab-${tabId}`)?.focus();
  };

  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));

    // Arrow-key navigation between tabs, per WAI-ARIA tab pattern.
    btn.addEventListener('keydown', (e) => {
      const isNext = e.key === 'ArrowRight';
      const isPrev = e.key === 'ArrowLeft';
      if (!isNext && !isPrev) return;
      e.preventDefault();
      const nextIndex = isNext
        ? (index + 1) % tabButtons.length
        : (index - 1 + tabButtons.length) % tabButtons.length;
      activateTab(tabButtons[nextIndex].dataset.tab);
    });
  });

  // AR Preview needs a post-insert mount step to attach model-viewer's
  // JS API (canActivateAR, activateAR(), events) -- other panels are
  // static markup with nothing to wire up.
  if (activeTab === 'ar') {
    mountARPreview(document.getElementById('panel-root'));
  }
}

function renderNotFound(slug) {
  const links = getAllSlugs()
    .map(s => `<a href="/dish/${s}" data-link>${s}</a>`)
    .join(' &middot; ');
  return `
    <div class="not-found">
      <h1>Dish "${slug}" not found</h1>
      <p>Try: ${links}</p>
    </div>
  `;
}
