/* =====================================================
   MangaWeb — api.js
   MangaDex API — chamada direta (CORS nativo para browsers)
   ===================================================== */

const API = (() => {
  const BASE = 'https://api.mangadex.org';
  const IMG_BASE = 'https://uploads.mangadex.org';

  // ── Request helper ───────────────────────────────────
  // Constrói URL manualmente para suportar parâmetros repetidos
  // como includes[], translatedLanguage[], contentRating[] corretamente
  async function request(path, params = {}) {
    const base = BASE + path;
    const parts = [];

    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        // Garante que arrays viram param[]=val1&param[]=val2
        const key = k.endsWith('[]') ? k : `${k}[]`;
        v.forEach(val => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`));
      } else if (v !== undefined && v !== null && v !== '') {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
    });

    const url = parts.length ? `${base}?${parts.join('&')}` : base;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }

  // ── Cover URL ────────────────────────────────────────
  function coverUrl(mangaId, filename, size = 256) {
    if (!filename) return '';
    return `${IMG_BASE}/covers/${mangaId}/${filename}.${size}.jpg`;
  }

  // ── Extrair capa do relationship incluído ─────────────
  // Quando passamos includes[]=cover_art, a MangaDex já retorna
  // os attributes da capa dentro do relationship — sem segunda chamada
  function extractCoverFilename(manga) {
    const rels = manga.relationships || [];
    const cov = rels.find(r => r.type === 'cover_art');
    if (!cov) return null;
    if (cov.attributes && cov.attributes.fileName) return cov.attributes.fileName;
    return null;
  }

  function extractCoverId(manga) {
    const rels = manga.relationships || [];
    const cov = rels.find(r => r.type === 'cover_art');
    return cov ? cov.id : null;
  }

  function extractAuthor(manga) {
    const rels = manga.relationships || [];
    const auth = rels.find(r => r.type === 'author');
    return (auth && auth.attributes && auth.attributes.name) ? auth.attributes.name : '';
  }

  function extractTitle(manga) {
    const t = manga.attributes.title || {};
    const alt = manga.attributes.altTitles || [];
    const fromTitle = t['pt-br'] || t['pt'] || t['en'] || Object.values(t)[0];
    if (fromTitle) return fromTitle;
    for (const altMap of alt) {
      const v = altMap['pt-br'] || altMap['pt'] || altMap['en'];
      if (v) return v;
    }
    return 'Sem título';
  }

  function extractDesc(manga) {
    const d = manga.attributes.description || {};
    return d['pt-br'] || d['pt'] || d['en'] || Object.values(d)[0] || '';
  }

  function extractTags(manga) {
    return (manga.attributes.tags || []).map(tag => {
      const n = tag.attributes.name;
      return n['pt-br'] || n['pt'] || n['en'] || Object.values(n)[0] || '';
    }).filter(Boolean);
  }

  // ── Normalizar manga ──────────────────────────────────
  function normalizeManga(manga) {
    const filename = extractCoverFilename(manga);
    return {
      id: manga.id,
      title: extractTitle(manga),
      author: extractAuthor(manga),
      description: extractDesc(manga),
      tags: extractTags(manga),
      status: manga.attributes.status || '',
      year: manga.attributes.year || null,
      coverId: extractCoverId(manga),
      coverFilename: filename,
      coverUrl: filename ? coverUrl(manga.id, filename, 256) : '',
    };
  }

  // ── Parâmetros padrão ─────────────────────────────────
  const DEFAULT_INCLUDES = ['cover_art', 'author'];
  const DEFAULT_RATINGS  = ['safe', 'suggestive'];

  // ── Lista genérica ────────────────────────────────────
  async function getMangaList(extraParams = {}) {
    const data = await request('/manga', {
      limit: 20,
      includes: DEFAULT_INCLUDES,
      contentRating: DEFAULT_RATINGS,
      ...extraParams,
    });
    return {
      data: (data.data || []).map(normalizeManga),
      total: data.total || 0,
      offset: data.offset || 0,
    };
  }

  function getPopular(limit = 12) {
    return getMangaList({ limit, 'order[followedCount]': 'desc' });
  }

  function getRecentlyUpdated(limit = 12) {
    return getMangaList({ limit, 'order[latestUploadedChapter]': 'desc' });
  }

  function getTopRated(limit = 12) {
    return getMangaList({ limit, 'order[rating]': 'desc' });
  }

  function searchManga(query, offset = 0) {
    return getMangaList({ title: query, limit: 20, offset, 'order[relevance]': 'desc' });
  }

  async function getMangaDetail(id) {
    const data = await request(`/manga/${id}`, {
      includes: ['cover_art', 'author', 'artist'],
    });
    return normalizeManga(data.data);
  }

  // ── Idiomas disponíveis ───────────────────────────────
  async function getAvailableLanguages(mangaId) {
    try {
      const data = await request('/chapter', {
        manga: mangaId,
        limit: 100,
        'order[chapter]': 'asc',
        contentRating: ['safe', 'suggestive', 'erotica', 'pornographic'],
      });
      const langs = [...new Set(
        (data.data || []).map(c => c.attributes.translatedLanguage).filter(Boolean)
      )];
      return langs.length ? langs : ['en'];
    } catch {
      return ['en'];
    }
  }

  // ── Capítulos ─────────────────────────────────────────
  async function getChapters(mangaId, lang = 'pt-br', offset = 0) {
    const data = await request('/chapter', {
      manga: mangaId,
      translatedLanguage: [lang],
      'order[chapter]': 'desc',
      limit: 100,
      offset,
      contentRating: ['safe', 'suggestive', 'erotica', 'pornographic'],
    });
    return {
      data: (data.data || []).map(ch => ({
        id: ch.id,
        chapter: ch.attributes.chapter,
        title: ch.attributes.title || '',
        lang: ch.attributes.translatedLanguage,
        pages: ch.attributes.pages,
        publishAt: ch.attributes.publishAt,
        // Obras de plataformas externas (Manga Plus, etc.) têm externalUrl
        externalUrl: ch.attributes.externalUrl || null,
        isExternal: !!ch.attributes.externalUrl,
      })),
      total: data.total || 0,
    };
  }

  // ── Páginas do capítulo ───────────────────────────────
  async function getChapterPages(chapterId) {
    const data = await request(`/at-home/server/${chapterId}`);
    const { baseUrl, chapter } = data;
    const { hash, data: pages } = chapter;
    return pages.map(p => `${baseUrl}/data/${hash}/${p}`);
  }

  return {
    getMangaList,
    getPopular,
    getRecentlyUpdated,
    getTopRated,
    searchManga,
    getMangaDetail,
    getAvailableLanguages,
    getChapters,
    getChapterPages,
    coverUrl,
    normalizeManga,
  };
})();
