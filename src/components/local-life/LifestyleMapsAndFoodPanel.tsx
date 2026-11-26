import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Camera,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  PlusCircle,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react';
import { LiquidGlassCard } from '../LiquidGlassCard';
import {
  FOOD_SPOTS_DIRECTORY,
  FOOD_SPOT_CATEGORIES,
  type ExpenseCategory,
  type FoodSpotCategory,
  type FoodSpotEntry,
  type LifestyleEntry,
} from '../../data/localLifeData';
import type { SpotGalleryRequest } from '../SpotPictureLibraryDrawer';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

interface AiFoodRecommendation {
  title: string;
  subtitle: string;
  action_tip: string;
  badge: string;
}

interface LifestyleMapsAndFoodPanelProps {
  districtId: string;
  districtName: string;
  lifestyleSpots: LifestyleEntry[];
  activeMapTarget: { name: string; district: string };
  onSelectMapTarget: (target: { name: string; district: string }) => void;
  onOpenSpotGallery: (spot: SpotGalleryRequest) => void;
  onAddToWeekendPlan: (item: {
    title: string;
    location: string;
    estimatedCostInr: number;
    category: ExpenseCategory;
  }) => void;
  onLogExpense: (item: {
    title: string;
    category: ExpenseCategory;
    amountInr: number;
    note?: string;
  }) => void;
}

export const LifestyleMapsAndFoodPanel: React.FC<LifestyleMapsAndFoodPanelProps> = ({
  districtId,
  districtName,
  lifestyleSpots,
  activeMapTarget,
  onSelectMapTarget,
  onOpenSpotGallery,
  onAddToWeekendPlan,
  onLogExpense,
}) => {
  const [foodCategory, setFoodCategory] = useState<FoodSpotCategory>('All Food Spots');
  const [aiFoodLoading, setAiFoodLoading] = useState(false);
  const [aiFoodRecs, setAiFoodRecs] = useState<AiFoodRecommendation[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const filteredFoodSpots = useMemo(() => {
    const byCat = FOOD_SPOTS_DIRECTORY.filter(
      (f) => foodCategory === 'All Food Spots' || f.category === foodCategory
    );
    const exactDistrict = byCat.filter(
      (f) => districtId === 'all' || f.districtId === districtId
    );
    return exactDistrict.length > 0 ? exactDistrict : byCat;
  }, [districtId, foodCategory]);

  const mapQuery = `${activeMapTarget.name}, ${activeMapTarget.district}, Kerala`;
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    mapQuery
  )}`;

  const handleAskGeminiFood = async () => {
    const cacheKey = `food_spots::${districtName}::${foodCategory}`;
    const cached = readAiCache<AiFoodRecommendation[]>(cacheKey);
    if (cached) {
      setAiFoodRecs(cached);
      return;
    }

    setAiFoodLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'food_spots',
          districtName,
          levelOrCategory: foodCategory,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && Array.isArray(data.recommendations)) {
        setAiFoodRecs(data.recommendations);
        writeAiCache(cacheKey, data.recommendations);
      }
    } finally {
      setAiFoodLoading(false);
    }
  };

  const openFoodGallery = (spot: FoodSpotEntry) => {
    onOpenSpotGallery({
      name: spot.wikiQuery || spot.name,
      region: `${spot.town}, ${spot.districtName}, Kerala`,
      subtitle: `${spot.name} · ${spot.town} · ₹${spot.costForTwoInr} for two`,
      description: `${spot.description} Must try: ${spot.mustTryDishes.join(', ')}.`,
      badge: spot.category,
      googleMapsQuery: `${spot.name}, ${spot.town}, ${spot.districtName}, Kerala`,
    });
  };

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Embedded Google Maps Live Explorer */}
      <LiquidGlassCard interactive={false} strong className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Embedded Google Maps Explorer · Live Pin</span>
            </p>
            <h2 className="text-sm sm:text-base font-extrabold text-[#111315] dark:text-white truncate">
              {activeMapTarget.name} — {activeMapTarget.district}
            </h2>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-sm hover:opacity-90 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
            Open Turn-by-Turn Directions
          </a>
        </div>

        <div className="rounded-[22px] overflow-hidden border border-white/75 dark:border-white/15 shadow-inner h-[260px] sm:h-[300px] bg-slate-200 dark:bg-slate-800">
          <iframe
            title={`Google Map of ${activeMapTarget.name}`}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full border-0"
          />
        </div>
      </LiquidGlassCard>

      {/* Food Spots & Culinary Discovery Engine */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              <span>Food Spots &amp; Culinary Discovery Engine</span>
            </p>
            <h3 className="text-lg font-extrabold text-[#111315] dark:text-white">
              Curated Kerala Eateries, Roasteries &amp; Late-Night Streets
            </h3>
          </div>

          <button
            type="button"
            disabled={aiFoodLoading}
            onClick={() => void handleAskGeminiFood()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] disabled:opacity-70 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            {aiFoodLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>✨ Ask Gemini for Food Spots Here</span>
          </button>
        </div>

        {/* 4 Culinary Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {FOOD_SPOT_CATEGORIES.map((cat) => {
            const active = foodCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFoodCategory(cat)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#111315] dark:bg-white text-white dark:text-slate-950 shadow-md'
                    : 'bg-white/65 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* AI Discovered Food Spots */}
        {aiFoodRecs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiFoodRecs.map((rec, idx) => (
              <LiquidGlassCard
                key={`${rec.title}-${idx}`}
                delay={idx * 0.05}
                onClick={() => onSelectMapTarget({ name: rec.title, district: districtName })}
                className="p-4 space-y-1.5 border-[#4F5BD5]/30"
              >
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10px] font-bold">
                  AI Scout · {rec.badge}
                </span>
                <h4 className="text-xs font-extrabold text-[#111315] dark:text-white">
                  {rec.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{rec.subtitle}</p>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {rec.action_tip}
                </p>
              </LiquidGlassCard>
            ))}
          </div>
        )}

        {/* Food Spot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFoodSpots.map((spot, idx) => (
            <LiquidGlassCard
              key={spot.id}
              delay={idx * 0.04}
              onClick={() => onSelectMapTarget({ name: spot.name, district: spot.districtName })}
              className="p-5 flex flex-col justify-between space-y-3.5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10px] font-bold truncate">
                    {spot.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    {spot.rating}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-[#111315] dark:text-white">
                    {spot.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#4F5BD5]" />
                    <span>
                      {spot.town}, {spot.districtName}
                    </span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{spot.timing}</span>
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {spot.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {spot.mustTryDishes.map((dish) => (
                    <span
                      key={dish}
                      className="px-2.5 py-1 rounded-full bg-[#EFECE8]/90 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {dish}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₹{spot.costForTwoInr} for two
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFoodGallery(spot);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Photos
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWeekendPlan({
                        title: spot.name,
                        location: `${spot.town}, ${spot.districtName}`,
                        estimatedCostInr: spot.costForTwoInr,
                        category: 'Food & Cafes',
                      });
                      triggerToast(`Added "${spot.name}" to your Weekend Itinerary!`);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold cursor-pointer"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    + Weekend Plan
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogExpense({
                        title: spot.name,
                        category: 'Food & Cafes',
                        amountInr: spot.costForTwoInr,
                        note: `${spot.town} · ${spot.mustTryDishes[0]}`,
                      });
                      triggerToast(`Logged ₹${spot.costForTwoInr} food expense!`);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-[#EFECE8] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[#111315] dark:text-white text-[11px] font-bold cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    + Log Expense
                  </button>
                </div>
              </div>
            </LiquidGlassCard>
          ))}
        </div>
      </div>

      {/* Heritage, Handloom, Fitness & Turf Spots */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
          Heritage Handloom, Calisthenics Turfs &amp; Local Culture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lifestyleSpots.map((spot, idx) => (
            <LiquidGlassCard
              key={spot.id}
              delay={idx * 0.04}
              onClick={() => onSelectMapTarget({ name: spot.name, district: spot.districtName })}
              className="p-5 flex flex-col justify-between space-y-3.5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10.5px] font-bold">
                    {spot.category}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                    {spot.districtName}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#111315] dark:text-white">
                    {spot.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {spot.neighborhood} · {spot.signatureTag}
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {spot.description}
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {spot.priceRange}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSpotGallery({
                      name: spot.name,
                      region: `${spot.districtName}, Kerala`,
                      subtitle: `${spot.neighborhood} · ${spot.timing}`,
                      description: spot.description,
                      badge: spot.category,
                      googleMapsQuery: `${spot.name}, ${spot.districtName}, Kerala`,
                    });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EFECE8] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[#4F5BD5] dark:text-[#A5B4FC] font-bold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Picture Library
                </button>
              </div>
            </LiquidGlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};
