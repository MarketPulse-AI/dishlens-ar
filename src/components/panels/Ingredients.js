/**
 * Ingredients panel.
 * Reads dish.ingredients (name, amount, allergens[]) from the dish JSON
 * and renders one reusable Card per ingredient, with allergen Badges.
 * No local state, no fetch -- data is already loaded and passed in by
 * AppShell, so this is a pure render function.
 */
import { renderCard } from '../ui/Card.js';
import { renderBadge } from '../ui/Badge.js';

const ALLERGEN_ICON = {
  gluten: '\u{1F33E}',
  dairy: '\u{1F9C0}',
  egg: '\u{1F95A}',
  nuts: '\u{1F95C}',
  shellfish: '\u{1F990}',
  soy: '\u{1F330}',
};

function renderAllergenBadges(allergens) {
  if (!allergens || allergens.length === 0) {
    return renderBadge('No listed allergens', 'neutral');
  }
  return allergens
    .map(a => renderBadge(a, 'allergen', ALLERGEN_ICON[a] || ''))
    .join('');
}

function renderIngredientCard(ingredient) {
  return renderCard({
    title: ingredient.name,
    subtitle: ingredient.amount,
    bodyHtml: `<div class="badge-row">${renderAllergenBadges(ingredient.allergens)}</div>`,
  });
}

export function renderIngredients(dish) {
  const cards = dish.ingredients.map(renderIngredientCard).join('');

  return `
    <div class="ingredients">
      <p class="ingredients__count">${dish.ingredients.length} ingredients</p>
      <div class="card-grid">
        ${cards}
      </div>
    </div>
  `;
}
