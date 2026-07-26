/**
 * Reusable badge/chip.
 * variant controls color treatment: 'default' | 'allergen' | 'neutral'
 */
export function renderBadge(label, variant = 'default', icon = '') {
  return `
    <span class="badge badge--${variant}">
      ${icon ? `<span class="badge__icon" aria-hidden="true">${icon}</span>` : ''}
      ${label}
    </span>
  `;
}
