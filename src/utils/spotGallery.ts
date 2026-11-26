export interface SpotPhotoItem {
  id: string;
  url: string;
  thumbUrl: string;
  title: string;
  caption: string;
  attribution: string;
  source: 'wikipedia' | 'wikimedia' | 'fallback';
}

const MEMORY_CACHE = new Map<string, SpotPhotoItem[]>();
const LS_PREFIX = 'civictriage_spot_gallery_v1:';

function stripHtml(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsableImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.ogv') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.tif') ||
    lower.endsWith('.tiff') ||
    lower.includes('flag_of_') ||
    lower.includes('locator_map') ||
    lower.includes('coat_of_arms') ||
    lower.includes('logo')
  ) {
    return false;
  }
  return lower.startsWith('https://');
}

function makeCuratedSvgFallback(placeName: string, region: string): SpotPhotoItem[] {
  const palettes = [
    ['#1e3a5f', '#2a9d8f', '#e9c46a', 'Scenic Landmark View'],
    ['#1b4332', '#40916c', '#95d5b2', 'Local Landscape & Heritage'],
    ['#312e81', '#4f5bd5', '#67e8f9', 'Regional Cultural Atmosphere'],
  ] as const;

  return palettes.map(([c1, c2, c3, subtitle], idx) => {
    const safeTitle = placeName.replace(/[<>&"]/g, '');
    const safeRegion = region.replace(/[<>&"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="g${idx}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="55%" stop-color="${c2}" />
          <stop offset="100%" stop-color="${c3}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#g${idx})" />
      <circle cx="960" cy="180" r="190" fill="rgba(255,255,255,0.12)" />
      <path d="M0 540 Q 280 390 560 490 T 1200 440 L 1200 720 L 0 720 Z" fill="rgba(15,23,42,0.26)" />
      <path d="M0 610 Q 340 490 680 570 T 1200 530 L 1200 720 L 0 720 Z" fill="rgba(15,23,42,0.42)" />
      <text x="64" y="560" fill="#ffffff" font-family="system-ui,sans-serif" font-size="44" font-weight="800">${safeTitle}</text>
      <text x="64" y="612" fill="rgba(255,255,255,0.88)" font-family="system-ui,sans-serif" font-size="24" font-weight="500">${safeRegion} · ${subtitle}</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return {
      id: `fallback-${idx}-${placeName}`,
      url: dataUrl,
      thumbUrl: dataUrl,
      title: `${placeName} — ${subtitle}`,
      caption: `${placeName} in ${region}. Live Wikimedia gallery preview unavailable offline.`,
      attribution: 'CivicTriage Visual Card',
      source: 'fallback',
    };
  });
}

export async function fetchSpotGallery(
  placeName: string,
  region: string
): Promise<SpotPhotoItem[]> {
  const cleanPlace = placeName.trim();
  const cleanRegion = region.trim() || 'India';
  const cacheKey = `${cleanPlace.toLowerCase()}::${cleanRegion.toLowerCase()}`;

  const memHit = MEMORY_CACHE.get(cacheKey);
  if (memHit && memHit.length > 0) return memHit;

  try {
    const lsRaw = window.localStorage.getItem(LS_PREFIX + cacheKey);
    if (lsRaw) {
      const parsed = JSON.parse(lsRaw) as SpotPhotoItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore cache errors
  }

  const photos: SpotPhotoItem[] = [];
  const seenUrls = new Set<string>();

  const pushUnique = (item: SpotPhotoItem) => {
    if (!isUsableImageUrl(item.url) || seenUrls.has(item.url)) return;
    seenUrls.add(item.url);
    photos.push(item);
  };

  // 1. Wikipedia REST Summary API (keyless, CORS-enabled)
  const wikiPromises = [
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanPlace)}`,
      { headers: { Accept: 'application/json' } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        `${cleanPlace} ${cleanRegion}`
      )}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ];

  const [wikiSummary, commonsData] = await Promise.all(wikiPromises);

  if (wikiSummary && typeof wikiSummary === 'object') {
    const origUrl = wikiSummary.originalimage?.source as string | undefined;
    const thumbUrl = wikiSummary.thumbnail?.source as string | undefined;
    const chosen = isUsableImageUrl(origUrl) ? origUrl : thumbUrl;
    if (chosen && isUsableImageUrl(chosen)) {
      pushUnique({
        id: `wiki-hero-${cleanPlace}`,
        url: chosen,
        thumbUrl: thumbUrl && isUsableImageUrl(thumbUrl) ? thumbUrl : chosen,
        title: String(wikiSummary.title || cleanPlace),
        caption: String(wikiSummary.extract || `${cleanPlace} — ${cleanRegion}`).slice(0, 220),
        attribution: 'Wikipedia Summary Archive',
        source: 'wikipedia',
      });
    }
  }

  if (commonsData?.query?.pages && typeof commonsData.query.pages === 'object') {
    const pages = Object.values(commonsData.query.pages) as Array<{
      pageid?: number;
      title?: string;
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
        extmetadata?: {
          ImageDescription?: { value?: string };
          Artist?: { value?: string };
          LicenseShortName?: { value?: string };
        };
      }>;
    }>;

    for (const page of pages) {
      if (photos.length >= 6) break;
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const url = info.thumburl || info.url;
      if (!isUsableImageUrl(url)) continue;
      const rawTitle = (page.title || cleanPlace)
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ');
      const desc = stripHtml(info.extmetadata?.ImageDescription?.value);
      const artist = stripHtml(info.extmetadata?.Artist?.value);
      const license = stripHtml(info.extmetadata?.LicenseShortName?.value);
      pushUnique({
        id: `commons-${page.pageid ?? photos.length}`,
        url: url!,
        thumbUrl: info.thumburl || url!,
        title: rawTitle.slice(0, 90),
        caption: (desc || `${cleanPlace} (${cleanRegion}) photograph from Wikimedia Commons.`).slice(0, 220),
        attribution: [artist, license].filter(Boolean).join(' · ') || 'Wikimedia Commons',
        source: 'wikimedia',
      });
    }
  }

  // Secondary broader Wikimedia search if < 3 images matched
  if (photos.length < 3) {
    try {
      const broaderResp = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          `${cleanRegion} landscape tourism architecture`
        )}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`
      );
      if (broaderResp.ok) {
        const broaderJson = await broaderResp.json();
        const pages = Object.values(broaderJson?.query?.pages || {}) as Array<{
          pageid?: number;
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            extmetadata?: {
              ImageDescription?: { value?: string };
              LicenseShortName?: { value?: string };
            };
          }>;
        }>;
        for (const page of pages) {
          if (photos.length >= 5) break;
          const info = page.imageinfo?.[0];
          const url = info?.thumburl || info?.url;
          if (!isUsableImageUrl(url)) continue;
          const cleanTitle = (page.title || cleanRegion)
            .replace(/^File:/i, '')
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/[_-]+/g, ' ');
          pushUnique({
            id: `commons-region-${page.pageid ?? photos.length}`,
            url: url!,
            thumbUrl: info?.thumburl || url!,
            title: cleanTitle.slice(0, 90),
            caption:
              stripHtml(info?.extmetadata?.ImageDescription?.value).slice(0, 200) ||
              `${cleanRegion} regional showcase near ${cleanPlace}.`,
            attribution:
              stripHtml(info?.extmetadata?.LicenseShortName?.value) || 'Wikimedia Commons',
            source: 'wikimedia',
          });
        }
      }
    } catch {
      // ignore secondary network error
    }
  }

  const finalPhotos = photos.length > 0 ? photos.slice(0, 6) : makeCuratedSvgFallback(cleanPlace, cleanRegion);
  MEMORY_CACHE.set(cacheKey, finalPhotos);
  try {
    if (finalPhotos[0]?.source !== 'fallback') {
      window.localStorage.setItem(LS_PREFIX + cacheKey, JSON.stringify(finalPhotos));
    }
  } catch {
    // ignore quota errors
  }
  return finalPhotos;
}
