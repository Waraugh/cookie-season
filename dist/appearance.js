(() => {
  const params = new URLSearchParams(location.search);
  const kiosk = params.get('kiosk') === '1';
  const media = matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem('cookie-season-theme'); } catch {}
  let mode = params.get('theme') || saved || (kiosk ? 'dark' : 'system');
  if (!['light', 'dark', 'system'].includes(mode)) mode = 'system';
  function apply() {
    const dark = mode === 'dark' || (mode === 'system' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('kiosk', kiosk);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151c19' : '#234637';
  }
  window.CookieDisplay = {kiosk, get mode() { return mode; }, setMode(value) {
    if (!['light', 'dark', 'system'].includes(value)) return;
    mode = value;
    try { localStorage.setItem('cookie-season-theme', value); } catch {}
    apply();
  }};
  media.addEventListener('change', apply);
  apply();
})();
