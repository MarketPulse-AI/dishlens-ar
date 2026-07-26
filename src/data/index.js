import pizza from './pizza.json';
import pasta from './pasta.json';
import tiramisu from './tiramisu.json';

const DISHES = { pizza, pasta, tiramisu };

/**
 * Returns dish data for a given slug, or null if the dish doesn't exist.
 * Centralizing this lookup means adding a new dish later is a two-step
 * change: drop in a JSON file, register it here.
 */
export function getDish(slug) {
  return DISHES[String(slug).toLowerCase()] || null;
}

export function getAllSlugs() {
  return Object.keys(DISHES);
}
