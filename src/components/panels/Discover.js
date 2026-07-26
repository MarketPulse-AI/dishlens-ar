/**
 * Discover panel.
 * Reads dish.discover ({origin, chefNotes, facts[], culturalBackground, pairing})
 * and presents it as a set of premium editorial-style sections, reusing the
 * same Card/Badge components as Ingredients rather than one-off markup.
 */
import { renderCard } from '../ui/Card.js';
import { renderBadge } from '../ui/Badge.js';

export function renderDiscover(dish) {
  const { discover } = dish;

  const factsHtml = discover.facts
    .map(fact => `<li class="fact-list__item">${fact}</li>`)
    .join('');

  return `
    <div class="discover">
      <div class="discover__origin">
        ${renderBadge(discover.origin, 'neutral', '\u{1F4CD}')}
      </div>

      <blockquote class="chef-note">
        <span class="chef-note__label">Chef's Notes</span>
        <p class="chef-note__text">${discover.chefNotes}</p>
      </blockquote>

      ${renderCard({
        title: 'Cultural Background',
        bodyHtml: `<p class="discover__prose">${discover.culturalBackground}</p>`,
      })}

      ${renderCard({
        title: 'Interesting Facts',
        bodyHtml: `<ul class="fact-list">${factsHtml}</ul>`,
      })}

      ${discover.pairing ? `
        <div class="pairing-note">
          <span class="pairing-note__label">Pairs well with</span>
          <span class="pairing-note__value">${discover.pairing}</span>
        </div>
      ` : ''}
    </div>
  `;
}
