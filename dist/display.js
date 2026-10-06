'use strict';
(() => {
  const display = window.CookieDisplay;
  const selector = document.querySelector('#theme-mode');
  selector.value = display.mode;
  selector.addEventListener('change', () => display.setMode(selector.value));
  if (!display.kiosk) return;
  const permittedActions = new Set(['close', 'print', 'csv', 'csv-locations']);
  const mutableAttributes = ['data-edit', 'data-assign', 'data-purchase', 'data-delete-request', 'data-handoff', 'data-archive-recipe', 'data-archive-ingredient', 'data-confirm-archive-recipe', 'data-confirm-archive-ingredient', 'data-remove-line', 'data-remove-equivalent', 'data-quantity-step'];
  function browsingControls(root) {
    root.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.type !== 'search' && !['request-search', 'recipe-search', 'shop-only'].includes(el.id)) el.disabled = true;
    });
    root.querySelectorAll('button,a').forEach(el => {
      if ((el.dataset.action && !permittedActions.has(el.dataset.action)) || mutableAttributes.some(a => el.hasAttribute(a)) || (el.type === 'submit' && el.closest('form') && !permittedActions.has(el.dataset.action) && !el.dataset.recipe && !el.dataset.ingredient)) el.hidden = true;
    });
  }
  const originalRender = render;
  render = function() {
    if (view === 'settings') { view = 'overview'; history.replaceState(null, '', location.pathname + location.search + '#overview'); }
    originalRender();
    document.querySelector('#nav [data-go="settings"]')?.remove();
    browsingControls(document.querySelector('#main'));
    document.querySelectorAll('#nav button').forEach(el => el.setAttribute('aria-current', el.classList.contains('active') ? 'page' : 'false'));
  };
  const originalModal = modal;
  modal = function(html) { originalModal(html); browsingControls(document.querySelector('#modal-content')); };
  document.addEventListener('click', e => {
    const el = e.target.closest('button,a');
    if (el && ((el.dataset.action && !permittedActions.has(el.dataset.action)) || mutableAttributes.some(a => el.hasAttribute(a)))) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  render();
})();
