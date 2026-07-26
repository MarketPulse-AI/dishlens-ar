/**
 * AR Preview panel.
 *
 * Renders a real <model-viewer> for the dish's glb (registered globally in
 * main.js via `import '@google/model-viewer'`). Camera controls, auto-rotate,
 * and pinch-zoom come from model-viewer's own attributes -- no custom touch
 * handling needed.
 *
 * "View in AR" is the panel's primary call-to-action: a full-width button
 * below the stage, always present (so the layout never shifts), whose label
 * and enabled state change once model-viewer resolves AR support. This
 * replaces the earlier show/hide-via-inline-style approach with CSS class
 * toggling, so state changes can be transitioned smoothly instead of
 * snapping.
 */

export function renderARPreview(dish) {
  const { model } = dish;

  return `
    <div class="ar-preview">
      <div class="ar-preview__stage is-loading" id="ar-stage">
        <div class="ar-preview__skeleton" aria-hidden="true">
          <div class="skeleton-shimmer"></div>
        </div>

        <model-viewer
          id="ar-model-viewer"
          src="${model.src}"
          ${model.iosSrc ? `ios-src="${model.iosSrc}"` : ''}
          poster="${model.poster}"
          alt="Interactive 3D model of ${dish.name}"
          aria-label="Interactive 3D model of ${dish.name}. Drag to rotate, pinch to zoom."
          camera-controls
          touch-action="pan-y"
          auto-rotate
          auto-rotate-delay="1200"
          rotation-per-second="16deg"
          camera-orbit="45deg 75deg 2.5m"
          field-of-view="45deg"
          scale="${model.scale || '1 1 1'}"
          interaction-prompt="auto"
          shadow-intensity="1.1"
          shadow-softness="0.8"
          exposure="1"
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="fixed"
          ar-placement="floor"
          loading="eager"
          reveal="auto"
          class="ar-preview__viewer"
        ></model-viewer>

        <div class="ar-preview__error" id="ar-error" hidden>
          <p>This dish's 3D model couldn't load. Ingredients, Preparation, and Discover still work below.</p>
        </div>
      </div>

      <div class="ar-preview__cta-row">
        <button
          id="ar-view-button"
          class="btn btn--primary btn--full"
          type="button"
          disabled
          aria-describedby="ar-status-note"
        >
          <span class="btn__icon" aria-hidden="true">&#9737;</span>
          <span id="ar-view-button-label">Checking AR availability&hellip;</span>
        </button>
        <p id="ar-status-note" class="ar-preview__note" aria-live="polite">
          Drag to rotate &middot; pinch to zoom
        </p>
      </div>
    </div>
  `;
}

/**
 * Must be called after renderARPreview()'s HTML has been inserted into the
 * DOM -- model-viewer is a custom element and its JS API (canActivateAR,
 * activateAR(), events) only exists on the live element instance.
 */
export function mountARPreview(container) {
  const stage = container.querySelector('#ar-stage');
  const mv = container.querySelector('#ar-model-viewer');
  const arButton = container.querySelector('#ar-view-button');
  const arButtonLabel = container.querySelector('#ar-view-button-label');
  const statusNote = container.querySelector('#ar-status-note');
  const errorBox = container.querySelector('#ar-error');
  if (!mv) return;

  arButton.addEventListener('click', async (e) => {
    e.preventDefault();
    if (arButton.disabled) return;
    try {
      await mv.activateAR();
    } catch (err) {
      // Most commonly a denied camera permission, or the OS AR viewer
      // failing to launch. Fail visibly and specifically rather than
      // silently doing nothing -- a judge tapping this button needs to
      // know why nothing happened.
      statusNote.textContent = 'AR couldn\u2019t start -- check that camera access is allowed for this site, then try again.';
    }
  });

  const setARAvailable = (available) => {
    arButton.disabled = !available;
    arButton.classList.toggle('btn--disabled', !available);
    arButtonLabel.textContent = available ? 'View in AR' : 'AR not available on this device';
    statusNote.textContent = available
      ? 'Place it on your table, then walk around it'
      : "You can still rotate and zoom the model above -- it just won't place in your room.";
  };

  const revealModel = () => {
    stage.classList.remove('is-loading');
  };

  const showLoadError = () => {
    revealModel();
    errorBox.hidden = false;
    arButton.disabled = true;
    arButton.classList.add('btn--disabled');
    arButtonLabel.textContent = 'Model unavailable';
    statusNote.textContent = '';
  };

  // canActivateAR is resolved asynchronously after the model loads and
  // model-viewer checks WebXR / Scene Viewer / Quick Look support, so we
  // check again shortly after 'load' rather than assuming it's ready
  // immediately when the event fires.
  mv.addEventListener('load', () => {
    revealModel();
    setARAvailable(mv.canActivateAR);
    setTimeout(() => setARAvailable(mv.canActivateAR), 800);
  });

  // Fires if the glb/usdz itself fails to fetch or parse (bad URL, host
  // down, CORS, malformed file). Without this the skeleton would spin
  // forever with no explanation -- exactly the kind of silent failure
  // that's fatal in front of judges.
  mv.addEventListener('error', showLoadError);

  // ar-status covers cases where support or session state changes after
  // activation attempts (e.g. a failed session falling back to non-AR
  // view, or the OS AR viewer reporting it couldn't present).
  mv.addEventListener('ar-status', (event) => {
    if (event.detail?.status === 'failed') {
      statusNote.textContent = 'AR session couldn\u2019t start on this device. You can still explore the 3D model above.';
      return;
    }
    setARAvailable(mv.canActivateAR);
  });

  // Safety net: if neither 'load' nor 'error' fires within a reasonable
  // window (e.g. a stalled network request), don't leave the skeleton
  // spinning indefinitely during a live demo.
  setTimeout(() => {
    if (stage.classList.contains('is-loading')) showLoadError();
  }, 8000);
}
