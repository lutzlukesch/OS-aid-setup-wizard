// Small DOM helpers. Data from flow.json only ever reaches the page through
// textContent, href and Option(), never through innerHTML.

export const $ = (id) => document.getElementById(id);

export function setText(id, text) {
  $(id).textContent = text ?? '';
}

export function cloneTemplate(id) {
  return $(id).content.firstElementChild.cloneNode(true);
}

/** Sets the text of every [data-field=key] inside root. */
export function fillFields(root, fields) {
  for (const [key, value] of Object.entries(fields)) {
    root.querySelector(`[data-field="${key}"]`).textContent = value ?? '';
  }
}

/** Marks the radio whose data-value matches as checked, with a roving tabindex. */
export function syncRadioGroup(group, value) {
  for (const radio of group.querySelectorAll('[role="radio"]')) {
    const checked = radio.dataset.value === value;
    radio.setAttribute('aria-checked', String(checked));
    radio.tabIndex = checked ? 0 : -1;
  }
}

/**
 * Rebuilds the children of container only when sourceKey changes, so
 * re-rendering on every selection keeps the same nodes (and keyboard focus).
 */
export function renderOnce(container, sourceKey, build) {
  if (container.dataset.source === sourceKey) return;
  container.dataset.source = sourceKey;
  container.replaceChildren(...build());
}
