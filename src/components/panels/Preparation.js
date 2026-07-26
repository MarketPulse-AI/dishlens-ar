/**
 * Preparation panel.
 * Reads dish.preparation (ordered {step, title, description}) and renders
 * a vertical timeline. Numbered markers are used deliberately here --
 * unlike Ingredients (an unordered set), preparation steps are a real
 * sequence, so the number carries information the reader needs.
 */
export function renderPreparation(dish) {
  const items = dish.preparation
    .map((p, i) => `
      <li class="timeline__item" style="--stagger: ${i}">
        <div class="timeline__marker">${p.step}</div>
        <div class="timeline__content">
          <h3 class="timeline__title">${p.title}</h3>
          <p class="timeline__desc">${p.description}</p>
        </div>
      </li>
    `)
    .join('');

  return `
    <div class="preparation">
      <p class="preparation__intro">How ${dish.name} is made, start to finish.</p>
      <ol class="timeline">
        ${items}
      </ol>
    </div>
  `;
}
