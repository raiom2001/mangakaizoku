/* =====================================================
   MangaWeb — store.js
   State management using sessionStorage
   ===================================================== */

const Store = (() => {
  const KEYS = {
    THEME: 'mw-theme',
    FAVORITES: 'mw-favorites',
    HISTORY: 'mw-history',
    READER_MODE: 'mw-reader-mode',
    PREF_LANG: 'mw-pref-lang',
  };

  const MAX_HISTORY = 50;

  function get(key, fallback = null) {
    try {
      const val = sessionStorage.getItem(key);
      if (val === null) return fallback;
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Store.set failed:', e);
    }
  }

  // ── Theme ────────────────────────────────────────────
  function getTheme() { return get(KEYS.THEME, 'dark'); }
  function setTheme(t) { set(KEYS.THEME, t); }

  // ── Reader Mode ──────────────────────────────────────
  function getReaderMode() { return get(KEYS.READER_MODE, 'horizontal'); }
  function setReaderMode(m) { set(KEYS.READER_MODE, m); }

  // ── Preferred Language ───────────────────────────────
  function getPrefLang() { return get(KEYS.PREF_LANG, 'pt-br'); }
  function setPrefLang(l) { set(KEYS.PREF_LANG, l); }

  // ── Favorites ────────────────────────────────────────
  function getFavorites() { return get(KEYS.FAVORITES, []); }

  function isFavorite(id) {
    return getFavorites().some(f => f.id === id);
  }

  function addFavorite(manga) {
    const favs = getFavorites().filter(f => f.id !== manga.id);
    favs.unshift(manga);
    set(KEYS.FAVORITES, favs);
  }

  function removeFavorite(id) {
    const favs = getFavorites().filter(f => f.id !== id);
    set(KEYS.FAVORITES, favs);
  }

  function toggleFavorite(manga) {
    if (isFavorite(manga.id)) {
      removeFavorite(manga.id);
      return false;
    } else {
      addFavorite(manga);
      return true;
    }
  }

  // ── History ──────────────────────────────────────────
  function getHistory() { return get(KEYS.HISTORY, []); }

  function addHistory(entry) {
    // entry: { mangaId, mangaTitle, chapterId, chapterNum, chapterTitle, coverId, timestamp }
    let hist = getHistory().filter(h => h.chapterId !== entry.chapterId);
    hist.unshift({ ...entry, timestamp: Date.now() });
    if (hist.length > MAX_HISTORY) hist = hist.slice(0, MAX_HISTORY);
    set(KEYS.HISTORY, hist);
  }

  function clearHistory() { set(KEYS.HISTORY, []); }

  return {
    getTheme, setTheme,
    getReaderMode, setReaderMode,
    getPrefLang, setPrefLang,
    getFavorites, isFavorite, addFavorite, removeFavorite, toggleFavorite,
    getHistory, addHistory, clearHistory,
  };
})();
