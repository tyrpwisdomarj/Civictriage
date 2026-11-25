import { useState } from 'react';
import {
  FEATURED_BIODIVERSITY_BADGE_IDS,
  INTERSTATE_GATEWAYS,
  KERALA_DISTRICTS,
  getRegionById,
} from '../../data/keralaMapData';
import type { MapRegionNode } from '../../shared/travelSchema';
import type { CorridorHazardItem } from '../../shared/corridorHazardMatcher';
import type { ExplorerViewMode } from './Kerala3DMapScene';

interface Kerala2DFallbackMapProps {
  viewMode: ExplorerViewMode;
  originId: string;
  destinationId: string | null;
  showBiodiversity: boolean;
  districtHazardsMap?: Record<string, CorridorHazardItem[]>;
  onDiveToKerala: () => void;
  onSelectDestination: (region: MapRegionNode) => void;
  fallbackNotice?: string | null;
  onRetry3D?: () => void;
}

const MAP_SCALE = 48;
const OFFSET_X = 220;
const OFFSET_Y = 395;

function toSvg(x: number, y: number): [number, number] {
  return [OFFSET_X + x * MAP_SCALE, OFFSET_Y + y * MAP_SCALE];
}

export function Kerala2DFallbackMap({
  viewMode,
  originId,
  destinationId,
  showBiodiversity,
  districtHazardsMap,
  onDiveToKerala,
  onSelectDestination,
  fallbackNotice,
  onRetry3D,
}: Kerala2DFallbackMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<MapRegionNode | null>(null);

  const originNode = getRegionById(originId);
  const destNode = destinationId ? getRegionById(destinationId) : undefined;

  let arcPath: string | null = null;
  if (originNode && destNode && originNode.id !== destNode.id) {
    const [ox, oy] = toSvg(originNode.centroid.x, originNode.centroid.y);
    const [dx, dy] = toSvg(destNode.centroid.x, destNode.centroid.y);
    const mx = (ox + dx) / 2;
    const my = (oy + dy) / 2;
    const dist = Math.hypot(dx - ox, dy - oy);
    const nx = -(dy - oy) / (dist || 1);
    const ny = (dx - ox) / (dist || 1);
    const bend = Math.min(85, Math.max(28, dist * 0.24));
    const cx = mx + nx * bend;
    const cy = my + ny * bend;
    arcPath = `M ${ox} ${oy} Q ${cx} ${cy} ${dx} ${dy}`;
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-sky-200 via-sky-100 to-cyan-100 flex flex-col overflow-hidden select-none">
      {fallbackNotice && (
        <div className="mx-4 mt-20 z-10 px-3.5 py-2 rounded-xl bg-white/95 border border-amber-300 text-xs text-amber-900 shadow-sm flex items-center justify-between gap-3">
          <span>{fallbackNotice}</span>
          {onRetry3D && (
            <button
              type="button"
              onClick={onRetry3D}
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold cursor-pointer shrink-0"
            >
              Retry 3D
            </button>
          )}
        </div>
      )}

      {viewMode === 'globe' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 bg-gradient-to-b from-sky-900 via-blue-900 to-sky-950">
          <div className="relative w-56 h-56 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-emerald-500 border-4 border-sky-200/70 shadow-[0_0_60px_rgba(56,189,248,0.45)] flex items-center justify-center">
            <div className="absolute top-2 w-24 h-6 rounded-full bg-white/85 blur-[1px]" />
            <div className="absolute bottom-2 w-24 h-6 rounded-full bg-white/85 blur-[1px]" />
            <button
              type="button"
              onClick={onDiveToKerala}
              className="relative z-10 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 border border-amber-100 text-slate-950 text-xs font-bold shadow-lg cursor-pointer transition-colors"
            >
              India · Kerala Beacon
            </button>
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-base font-bold text-white">Whole Earth 2D View</h2>
            <p className="text-xs text-sky-100 leading-relaxed">
              Dive into all 14 Kerala districts and 6 South Indian inter-state gateways with
              multi-modal routing, biodiversity overlays, and 3D seat booking.
            </p>
            <button
              type="button"
              onClick={onDiveToKerala}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white text-xs font-semibold shadow-md cursor-pointer"
            >
              Dive into Kerala &amp; South India
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative flex items-center justify-center p-4 pt-16 pb-20">
          <svg
            viewBox="0 0 540 760"
            role="img"
            aria-label="Interactive 2D Kerala districts and inter-state gateway map"
            className="w-full h-full max-h-[680px] max-w-[560px]"
          >
            <defs>
              <linearGradient id="oceanBg2d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="routeGrad2d" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="540" height="760" fill="url(#oceanBg2d)" rx="20" />

            {KERALA_DISTRICTS.map((district) => {
              const pts = (district.polygon ?? [])
                .map(([px, py]) => {
                  const [sx, sy] = toSvg(px, py);
                  return `${sx.toFixed(1)},${sy.toFixed(1)}`;
                })
                .join(' ');
              const isOrigin = district.id === originId;
              const isDest = district.id === destinationId;
              const isHover = hoveredRegion?.id === district.id;
              const [cx, cy] = toSvg(district.centroid.x, district.centroid.y);

              const fill = isOrigin
                ? '#059669'
                : isDest
                  ? '#0284c7'
                  : isHover
                    ? '#4ade80'
                    : '#22c55e';
              const stroke = isOrigin
                ? '#fde047'
                : isDest
                  ? '#ffffff'
                  : isHover
                    ? '#fef08a'
                    : '#dcfce7';

              return (
                <g
                  key={district.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${district.name} district`}
                  onClick={() => onSelectDestination(district)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDestination(district);
                    }
                  }}
                  onMouseEnter={() => setHoveredRegion(district)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  className="cursor-pointer outline-none"
                >
                  <polygon
                    points={pts}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isHover || isOrigin || isDest ? 2.4 : 1.2}
                    className="transition-colors duration-150"
                  />
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight={700}
                    className="pointer-events-none select-none"
                  >
                    {district.name.length > 12 ? district.code : district.name}
                  </text>
                  {showBiodiversity && FEATURED_BIODIVERSITY_BADGE_IDS.has(district.id) && (
                    <circle
                      cx={cx + 18}
                      cy={cy - 10}
                      r={3.5}
                      fill="#fde047"
                      stroke="#065f46"
                      strokeWidth="1"
                      className="pointer-events-none"
                    />
                  )}
                  {(districtHazardsMap?.[district.id]?.length ?? 0) > 0 && (
                    <g className="pointer-events-none">
                      <circle
                        cx={cx - 16}
                        cy={cy - 12}
                        r={8}
                        fill={
                          districtHazardsMap?.[district.id]?.some((h) => h.isCritical)
                            ? '#ef4444'
                            : '#f59e0b'
                        }
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx - 16}
                        y={cy - 9}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight={900}
                      >
                        !
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {INTERSTATE_GATEWAYS.map((hub) => {
              const [hx, hy] = toSvg(hub.centroid.x, hub.centroid.y);
              const isDest = hub.id === destinationId;
              const isHover = hoveredRegion?.id === hub.id;
              return (
                <g
                  key={hub.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${hub.name} inter-state gateway`}
                  onClick={() => onSelectDestination(hub)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDestination(hub);
                    }
                  }}
                  onMouseEnter={() => setHoveredRegion(hub)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  className="cursor-pointer outline-none"
                >
                  <circle
                    cx={hx}
                    cy={hy}
                    r={isHover || isDest ? 17 : 13}
                    fill={isDest ? '#0284c7' : '#ffffff'}
                    stroke={isDest ? '#fde047' : '#f97316'}
                    strokeWidth={isHover || isDest ? 2.5 : 1.8}
                  />
                  <circle cx={hx} cy={hy} r={5} fill="#f97316" />
                  <text
                    x={hx}
                    y={hy + 26}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="10"
                    fontWeight={700}
                    className="pointer-events-none"
                  >
                    {hub.name}
                  </text>
                </g>
              );
            })}

            {originNode && (() => {
              const [ox, oy] = toSvg(originNode.centroid.x, originNode.centroid.y);
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={ox}
                    cy={oy}
                    r={12}
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="2.2"
                  />
                  <circle cx={ox} cy={oy} r={5.5} fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              );
            })()}

            {arcPath && (
              <path
                d={arcPath}
                fill="none"
                stroke="url(#routeGrad2d)"
                strokeWidth="3.5"
                strokeDasharray="7 5"
                strokeLinecap="round"
                className="pointer-events-none"
              />
            )}
          </svg>

          {hoveredRegion && (
            <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-white/95 border border-sky-300 text-xs text-slate-900 shadow-lg">
              <span className="font-bold">{hoveredRegion.name}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span className="text-sky-700 font-mono text-[11px] font-semibold">{hoveredRegion.code}</span>
              <span className="ml-2 text-emerald-700 font-medium">{hoveredRegion.biodiversity.badgeText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
