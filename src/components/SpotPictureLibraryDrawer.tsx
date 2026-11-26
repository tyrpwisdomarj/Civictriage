import React, { useEffect, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Ticket,
  X,
} from 'lucide-react';
import { LiquidSheetModal } from './LiquidGlassCard';
import { fetchSpotGallery, type SpotPhotoItem } from '../utils/spotGallery';

export interface SpotGalleryRequest {
  name: string;
  region: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  googleMapsQuery?: string;
  stateSlug?: string;
  lat?: number;
  lon?: number;
}

interface SpotPictureLibraryDrawerProps {
  spot: SpotGalleryRequest | null;
  onClose: () => void;
  onFlyTo3DMap?: (spot: SpotGalleryRequest) => void;
  onBookLocalTicket?: (spot: SpotGalleryRequest) => void;
}

export const SpotPictureLibraryDrawer: React.FC<SpotPictureLibraryDrawerProps> = ({
  spot,
  onClose,
  onFlyTo3DMap,
  onBookLocalTicket,
}) => {
  const [photos, setPhotos] = useState<SpotPhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!spot) return;
    let cancelled = false;
    setLoading(true);
    setActiveIndex(0);
    void fetchSpotGallery(spot.name, spot.region).then((items) => {
      if (!cancelled) {
        setPhotos(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [spot]);

  useEffect(() => {
    if (!spot || photos.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spot, photos.length, onClose]);

  const activePhoto = photos[activeIndex] ?? null;

  return (
    <LiquidSheetModal
      open={Boolean(spot)}
      onClose={onClose}
      title={spot ? `${spot.name} Picture Library` : 'Picture Library'}
      maxWidthClass="max-w-4xl"
    >
      {spot && (
        <div className="p-5 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#4F5BD5] dark:text-[#A5B4FC]">
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Wikimedia &amp; Wikipedia Live Picture Library</span>
                {spot.badge && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{spot.badge}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111315] dark:text-white leading-tight">
                {spot.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#4F5BD5] shrink-0" aria-hidden="true" />
                <span>{spot.subtitle || spot.region}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close picture library"
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hero Lightbox Viewer */}
          <div className="relative rounded-[24px] overflow-hidden bg-slate-900 aspect-[16/9] border border-white/60 dark:border-white/15 shadow-lg">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 text-slate-200 bg-slate-900/90">
                <Loader2 className="w-7 h-7 animate-spin text-[#A5B4FC]" />
                <p className="text-xs font-semibold">Fetching real-world Wikimedia photography…</p>
              </div>
            ) : activePhoto ? (
              <>
                <img
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 sm:p-5 text-white">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs sm:text-sm font-bold leading-snug line-clamp-1">
                        {activePhoto.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-white/85 line-clamp-2">
                        {activePhoto.caption}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                      {activeIndex + 1} / {photos.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/65 mt-1.5 truncate">
                    Source: {activePhoto.attribution}
                  </p>
                </div>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex((i) => (i - 1 + photos.length) % photos.length)
                      }
                      aria-label="Previous photograph"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((i) => (i + 1) % photos.length)}
                      aria-label="Next photograph"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : null}
          </div>

          {/* Thumbnail Strip */}
          {!loading && photos.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-24 h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'border-[#4F5BD5] scale-[1.03] shadow-md'
                      : 'border-white/50 dark:border-white/15 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.thumbUrl}
                    alt={photo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {spot.description && (
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {spot.description}
            </p>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-black/8 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {onFlyTo3DMap && (
                <button
                  type="button"
                  onClick={() => {
                    onFlyTo3DMap(spot);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                  <span>Fly to Spot on 3D Map</span>
                </button>
              )}

              {onBookLocalTicket && (
                <button
                  type="button"
                  onClick={() => {
                    onBookLocalTicket(spot);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Book Local Feeder / Ticket</span>
                </button>
              )}
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                spot.googleMapsQuery || `${spot.name}, ${spot.region}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
            </a>
          </div>
        </div>
      )}
    </LiquidSheetModal>
  );
};
