/* GR TV v3 advanced features: health checks, playlists, import/export, language and system theme. */
(() => {
  'use strict';

  const STORAGE = {
    language: 'gr_tv_language',
    theme: 'gr_tv_theme',
    playlist: 'gr_tv_playlist'
  };

  const translations = {
    el: {
      controls: 'Εργαλεία', health: 'Έλεγχος streams', export: 'Εξαγωγή αγαπημένων', import: 'Εισαγωγή αγαπημένων',
      playlist: 'Δημιουργία playlist', language: 'English', system: 'Θέμα συστήματος', ready: 'Έτοιμο', checking: 'Έλεγχος…',
      online: 'Διαθέσιμο', offline: 'Μη διαθέσιμο', timeout: 'Χρονικό όριο', imported: 'Τα αγαπημένα εισήχθησαν.',
      exported: 'Το αρχείο αγαπημένων δημιουργήθηκε.', playlistSaved: 'Η playlist δημιουργήθηκε.',
      playlistHelp: 'Αντέγραψε το περιεχόμενο σε αρχείο .m3u.', noFavorites: 'Δεν υπάρχουν αγαπημένα κανάλια.'
    },
    en: {
      controls: 'Tools', health: 'Check streams', export: 'Export favorites', import: 'Import favorites',
      playlist: 'Create playlist', language: 'Ελληνικά', system: 'System theme', ready: 'Ready', checking: 'Checking…',
      online: 'Available', offline: 'Unavailable', timeout: 'Timeout', imported: 'Favorites imported.',
      exported: 'Favorites file created.', playlistSaved: 'Playlist created.',
      playlistHelp: 'Copy the content to a .m3u file.', noFavorites: 'No favorite channels.'
    }
  };

  let language = localStorage.getItem(STORAGE.language) || 'el';
  const t = key => (translations[language] && translations[language][key]) || translations.el[key] || key;

  function safeJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch { return fallback; }
  }

  function channels() {
    return typeof window.grtvGetChannels === 'function' ? window.grtvGetChannels() : [];
  }

  function addToolbar() {
    const target = document.getElementById('categoryFilters');
    if (!target || document.getElementById('advancedTools')) return;
    const wrap = document.createElement('div');
    wrap.id = 'advancedTools';
    wrap.className = 'mb-4 flex flex-wrap items-center gap-2';
    wrap.innerHTML = `
      <button id="healthBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">${t('health')}</button>
      <button id="exportBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">${t('export')}</button>
      <button id="importBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">${t('import')}</button>
      <button id="playlistBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">${t('playlist')}</button>
      <button id="languageBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">${t('language')}</button>
      <button id="systemThemeBtn" class="px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">${t('system')}</button>
      <span id="advancedStatus" class="text-xs text-slate-500 dark:text-slate-400" role="status">${t('ready')}</span>
      <input id="favoritesImport" type="file" accept="application/json,.json" class="hidden">
    `;
    target.insertAdjacentElement('afterend', wrap);
    document.getElementById('healthBtn').addEventListener('click', checkAllStreams);
    document.getElementById('exportBtn').addEventListener('click', exportFavorites);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('favoritesImport').click());
    document.getElementById('favoritesImport').addEventListener('change', importFavorites);
    document.getElementById('playlistBtn').addEventListener('click', createPlaylist);
    document.getElementById('languageBtn').addEventListener('click', toggleLanguage);
    document.getElementById('systemThemeBtn').addEventListener('click', useSystemTheme);
  }

  function setStatus(text) {
    const el = document.getElementById('advancedStatus');
    if (el) el.textContent = text;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportFavorites() {
    const favoriteIds = safeJson('gr_tv_favs', []);
    download('grtv-favorites.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), favoriteIds }, null, 2), 'application/json');
    setStatus(t('exported'));
  }

  async function importFavorites(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ids = Array.isArray(data) ? data : data.favoriteIds;
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('Invalid favorites');
      localStorage.setItem('gr_tv_favs', JSON.stringify([...new Set(ids)]));
      window.renderChannels?.();
      setStatus(t('imported'));
    } catch { setStatus(language === 'el' ? 'Μη έγκυρο αρχείο.' : 'Invalid file.'); }
    event.target.value = '';
  }

  function createPlaylist() {
    const favIds = new Set(safeJson('gr_tv_favs', []));
    const list = channels().filter(ch => favIds.has(ch.id));
    if (!list.length) { setStatus(t('noFavorites')); return; }
    const lines = ['#EXTM3U'];
    list.forEach(ch => lines.push(`#EXTINF:-1 tvg-id="${escapeAttr(ch.id)}" tvg-name="${escapeAttr(ch.name)}",${ch.name}\n${ch.url}`));
    localStorage.setItem(STORAGE.playlist, lines.join('\n'));
    download('grtv-favorites.m3u', lines.join('\n'), 'audio/x-mpegurl');
    setStatus(t('playlistSaved'));
  }

  function escapeAttr(value) { return String(value || '').replace(/["&<>]/g, c => ({'"':'&quot;','&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  async function checkStream(ch) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(ch.url, { method: 'HEAD', mode: 'cors', cache: 'no-store', signal: controller.signal });
      return response.ok ? 'online' : 'offline';
    } catch (error) { return error.name === 'AbortError' ? 'timeout' : 'offline'; }
    finally { clearTimeout(timeout); }
  }

  async function checkAllStreams() {
    const list = channels();
    setStatus(`${t('checking')} 0/${list.length}`);
    for (let i = 0; i < list.length; i += 1) {
      const result = await checkStream(list[i]);
      const card = [...document.querySelectorAll('#channelsGrid [onclick]')].find(el => (el.getAttribute('onclick') || '').includes(`'${list[i].id}'`));
      if (card) {
        let badge = card.querySelector('.health-badge');
        if (!badge) { badge = document.createElement('span'); badge.className = 'health-badge absolute bottom-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded'; card.querySelector('.relative')?.appendChild(badge); }
        badge.textContent = result === 'online' ? t('online') : result === 'timeout' ? t('timeout') : t('offline');
        badge.className = `health-badge absolute bottom-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded ${result === 'online' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`;
      }
      setStatus(`${t('checking')} ${i + 1}/${list.length}`);
    }
    setStatus(language === 'el' ? 'Ο έλεγχος ολοκληρώθηκε.' : 'Check completed.');
  }

  function toggleLanguage() {
    language = language === 'el' ? 'en' : 'el';
    localStorage.setItem(STORAGE.language, language);
    addToolbar();
    document.getElementById('healthBtn').textContent = t('health');
    document.getElementById('exportBtn').textContent = t('export');
    document.getElementById('importBtn').textContent = t('import');
    document.getElementById('playlistBtn').textContent = t('playlist');
    document.getElementById('languageBtn').textContent = t('language');
    document.getElementById('systemThemeBtn').textContent = t('system');
    setStatus(t('ready'));
  }

  function useSystemTheme() {
    localStorage.setItem(STORAGE.theme, 'system');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    setStatus(t('system'));
  }

  document.addEventListener('DOMContentLoaded', () => { addToolbar(); });
})();
