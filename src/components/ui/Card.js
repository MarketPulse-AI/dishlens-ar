/**
 * Reusable card shell. `bodyHtml` is trusted markup built by the caller
 * (this app has no user-generated content, so no sanitization step here).
 */
export function renderCard({ title, subtitle = '', bodyHtml = '' }) {
  return `
    <article class="card">
      <div class="card__header">
        <h3 class="card__title">${title}</h3>
        ${subtitle ? `<span class="card__subtitle">${subtitle}</span>` : ''}
      </div>
      ${bodyHtml ? `<div class="card__body">${bodyHtml}</div>` : ''}
    </article>
  `;
}
