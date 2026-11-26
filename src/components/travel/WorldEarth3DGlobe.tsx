import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import countriesTopoJson from 'world-atlas/countries-110m.json';
import {
  AIRLINE_LIVERIES,
  LIVE_AIRSPACE_FLIGHTS,
  getWorldCountryByIso,
  type LiveAirspaceFlight,
  type WorldCountryEntry,
} from '../../data/worldAtlasData';
import { latLonToSpherePoint } from '../../shared/travelSchema';

export const EARTH_GLOBE_RADIUS = 4.2;

export interface GlobeCoordPoint {
  label: string;
  lat: number;
  lon: number;
  code?: string;
}

export interface WorldEarth3DGlobeProps {
  isSoftwareGl: boolean;
  originPoint: GlobeCoordPoint;
  destinationPoint: GlobeCoordPoint | null;
  selectedCountryIso: string | null;
  onSelectCountry: (country: WorldCountryEntry) => void;
  onDiveToKerala: () => void;
  onHoverLabelChange: (label: string | null) => void;
  onSelectLiveFlight: (flight: LiveAirspaceFlight) => void;
}

interface ParsedCountryGeo {
  isoNumeric: string;
  name: string;
  rings: Array<Array<[number, number]>>;
  centroidLat: number;
  centroidLon: number;
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const p = latLonToSpherePoint(lat, lon, radius);
  return new THREE.Vector3(p.x, p.y, p.z);
}

/**
 * Generates a high-resolution photorealistic "Blue Marble" Earth diffuse texture
 * (sapphire/navy bathymetry, deep tropical & temperate forests, golden Sahara/Arabian/Asian deserts,
 * snow-capped Himalayan/polar peaks) plus a matching city night-lights emissive map.
 */
function createBlueMarbleTextures(): {
  dayMap: THREE.CanvasTexture;
  nightMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = width;
  dayCanvas.height = height;
  const dayCtx = dayCanvas.getContext('2d');

  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = width;
  nightCanvas.height = height;
  const nightCtx = nightCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d');

  const lonLatToPx = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * width,
    ((90 - lat) / 180) * height,
  ];

  // Parse topojson polygons for crisp real-world coastline rendering on the Blue Marble canvas
  let features: Array<{
    id?: string | number;
    properties?: { name?: string };
    geometry?: { type: string; coordinates: unknown };
  }> = [];

  try {
    const topo = countriesTopoJson as unknown as Topology<{
      countries: GeometryCollection<{ name?: string }>;
    }>;
    const fc = feature(topo, topo.objects.countries) as unknown as {
      features: typeof features;
    };
    features = fc.features ?? [];
  } catch {
    features = [];
  }

  if (dayCtx && roughCtx) {
    // 1. Deep sapphire / navy ocean bathymetry gradient
    const oceanGrad = dayCtx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#1e3a5f');
    oceanGrad.addColorStop(0.14, '#0c2d5e');
    oceanGrad.addColorStop(0.35, '#07224d');
    oceanGrad.addColorStop(0.5, '#061c42');
    oceanGrad.addColorStop(0.65, '#07224d');
    oceanGrad.addColorStop(0.86, '#0c2d5e');
    oceanGrad.addColorStop(1, '#1e3a5f');
    dayCtx.fillStyle = oceanGrad;
    dayCtx.fillRect(0, 0, width, height);

    // Subtle ocean trench & mid-ocean ridge bathymetry shading
    for (let i = 0; i < 42; i++) {
      const bx = ((i * 211 + 80) % width);
      const by = 140 + ((i * 137 + 50) % (height - 280));
      const br = 80 + (i % 5) * 45;
      const bGrad = dayCtx.createRadialGradient(bx, by, 6, bx, by, br);
      bGrad.addColorStop(0, 'rgba(14, 116, 178, 0.14)');
      bGrad.addColorStop(1, 'rgba(6, 28, 66, 0)');
      dayCtx.fillStyle = bGrad;
      dayCtx.beginPath();
      dayCtx.arc(bx, by, br, 0, Math.PI * 2);
      dayCtx.fill();
    }

    // Ocean is smooth & reflective (low roughness = dark in roughnessMap)
    roughCtx.fillStyle = '#333333';
    roughCtx.fillRect(0, 0, width, height);

    // 2. Render real-world landmass polygons from world-atlas with biome-realistic shading
    const traceRing = (ctx: CanvasRenderingContext2D, ring: Array<[number, number]>) => {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const [x, y] = lonLatToPx(lon, lat);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const [prevLon] = ring[i - 1];
          // Avoid antimeridian horizontal wrap streaks
          if (Math.abs(lon - prevLon) > 180) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.closePath();
    };

    const drawFeatureOn = (
      ctx: CanvasRenderingContext2D,
      geom: { type: string; coordinates: unknown }
    ) => {
      ctx.beginPath();
      if (geom.type === 'Polygon') {
        const rings = geom.coordinates as Array<Array<[number, number]>>;
        for (const ring of rings) traceRing(ctx, ring);
      } else if (geom.type === 'MultiPolygon') {
        const polys = geom.coordinates as Array<Array<Array<[number, number]>>>;
        for (const poly of polys) {
          for (const ring of poly) traceRing(ctx, ring);
        }
      }
    };

    // Draw shallow coastal turquoise shelf glow first
    for (const f of features) {
      if (!f.geometry) continue;
      drawFeatureOn(dayCtx, f.geometry);
      dayCtx.strokeStyle = 'rgba(34, 211, 238, 0.28)';
      dayCtx.lineWidth = 7;
      dayCtx.lineJoin = 'round';
      dayCtx.stroke();
    }

    // Fill land with rich natural satellite vegetation gradient + matte roughness
    for (const f of features) {
      if (!f.geometry) continue;
      const isoNum = String(f.id ?? '').padStart(3, '0');
      const isAntarctica = isoNum === '010';
      const isGreenland = isoNum === '304';

      drawFeatureOn(dayCtx, f.geometry);
      if (isAntarctica || isGreenland) {
        dayCtx.fillStyle = '#e8f1f8';
      } else if (isoNum === '356') {
        // India: lush green monsoon plains & Western Ghats
        dayCtx.fillStyle = '#256c3b';
      } else {
        dayCtx.fillStyle = '#245d38';
      }
      dayCtx.fill();

      // Matte land roughness
      drawFeatureOn(roughCtx, f.geometry);
      roughCtx.fillStyle = '#d4d4d4';
      roughCtx.fill();
    }

    // 3. Clip subsequent natural biome overlays strictly onto land silhouettes
    dayCtx.save();
    dayCtx.beginPath();
    for (const f of features) {
      if (!f.geometry) continue;
      const isoNum = String(f.id ?? '').padStart(3, '0');
      if (isoNum === '010') continue;
      if (f.geometry.type === 'Polygon') {
        const rings = f.geometry.coordinates as Array<Array<[number, number]>>;
        for (const ring of rings) traceRing(dayCtx, ring);
      } else if (f.geometry.type === 'MultiPolygon') {
        const polys = f.geometry.coordinates as Array<Array<Array<[number, number]>>>;
        for (const poly of polys) {
          for (const ring of poly) traceRing(dayCtx, ring);
        }
      }
    }
    dayCtx.clip();

    const paintBiomeBlob = (
      lon: number,
      lat: number,
      rxDeg: number,
      ryDeg: number,
      innerColor: string,
      outerColor: string
    ) => {
      const [cx, cy] = lonLatToPx(lon, lat);
      const rx = (rxDeg / 360) * width;
      const ry = (ryDeg / 180) * height;
      dayCtx.save();
      dayCtx.translate(cx, cy);
      dayCtx.scale(1, ry / Math.max(1, rx));
      const grad = dayCtx.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(1, outerColor);
      dayCtx.fillStyle = grad;
      dayCtx.beginPath();
      dayCtx.arc(0, 0, rx, 0, Math.PI * 2);
      dayCtx.fill();
      dayCtx.restore();
    };

    // Golden Deserts: Sahara, Arabian Peninsula, Thar, Gobi/Central Asia, Australian Outback, US Southwest
    paintBiomeBlob(12, 23, 28, 12, 'rgba(196, 165, 112, 0.92)', 'rgba(196, 165, 112, 0)');
    paintBiomeBlob(46, 23, 13, 10, 'rgba(202, 168, 110, 0.92)', 'rgba(202, 168, 110, 0)');
    paintBiomeBlob(68, 34, 18, 10, 'rgba(176, 148, 100, 0.82)', 'rgba(176, 148, 100, 0)');
    paintBiomeBlob(95, 42, 19, 8, 'rgba(170, 145, 102, 0.78)', 'rgba(170, 145, 102, 0)');
    paintBiomeBlob(132, -24, 16, 9, 'rgba(194, 136, 86, 0.88)', 'rgba(194, 136, 86, 0)');
    paintBiomeBlob(-112, 34, 10, 7, 'rgba(180, 148, 104, 0.72)', 'rgba(180, 148, 104, 0)');

    // Deep Emerald Tropical Rainforests: Amazon, Congo, SE Asia, Western Ghats / Kerala
    paintBiomeBlob(-62, -4, 18, 12, 'rgba(20, 88, 42, 0.9)', 'rgba(20, 88, 42, 0)');
    paintBiomeBlob(20, 0, 14, 10, 'rgba(22, 92, 44, 0.88)', 'rgba(22, 92, 44, 0)');
    paintBiomeBlob(106, 4, 16, 11, 'rgba(22, 102, 50, 0.88)', 'rgba(22, 102, 50, 0)');
    paintBiomeBlob(76.4, 10.6, 5.5, 6.5, 'rgba(16, 138, 68, 0.95)', 'rgba(16, 138, 68, 0)');

    // Snow-Capped Mountain Ranges: Himalayas & Tibetan Plateau, Alps, Rockies, Andes
    paintBiomeBlob(84, 31, 12, 4.5, 'rgba(241, 245, 249, 0.92)', 'rgba(241, 245, 249, 0)');
    paintBiomeBlob(9, 46.5, 4.5, 2.2, 'rgba(241, 245, 249, 0.8)', 'rgba(241, 245, 249, 0)');
    paintBiomeBlob(-114, 52, 8, 9, 'rgba(226, 232, 240, 0.72)', 'rgba(226, 232, 240, 0)');
    paintBiomeBlob(-70, -24, 3.5, 18, 'rgba(226, 232, 240, 0.75)', 'rgba(226, 232, 240, 0)');

    // Northern Boreal Tundra & Arctic Frost
    const northFrost = dayCtx.createLinearGradient(0, 0, 0, height * 0.16);
    northFrost.addColorStop(0, 'rgba(241, 245, 249, 0.95)');
    northFrost.addColorStop(0.65, 'rgba(203, 213, 225, 0.45)');
    northFrost.addColorStop(1, 'rgba(203, 213, 225, 0)');
    dayCtx.fillStyle = northFrost;
    dayCtx.fillRect(0, 0, width, height * 0.16);

    dayCtx.restore();

    // Crisp subtle coastline outline
    for (const f of features) {
      if (!f.geometry) continue;
      drawFeatureOn(dayCtx, f.geometry);
      dayCtx.strokeStyle = 'rgba(203, 232, 216, 0.25)';
      dayCtx.lineWidth = 1.2;
      dayCtx.stroke();
    }
  }

  // 4. Golden City Night-Lights Emissive Texture (major global metro corridors)
  if (nightCtx) {
    nightCtx.fillStyle = '#000000';
    nightCtx.fillRect(0, 0, width, height);

    const cityLights: Array<[number, number, number]> = [
      // India & Kerala
      [76.3, 10.0, 26], [76.9, 8.5, 18], [77.6, 12.9, 26], [80.2, 13.0, 24],
      [72.8, 19.0, 32], [77.2, 28.6, 36], [88.3, 22.5, 28], [78.4, 17.4, 24],
      [73.8, 18.5, 20], [72.5, 23.0, 22], [75.8, 26.9, 18],
      // Middle East
      [55.3, 25.2, 28], [51.5, 25.3, 22], [46.7, 24.7, 22], [39.2, 21.5, 18],
      [31.2, 30.0, 32], [29.0, 41.0, 26], [51.4, 35.7, 24],
      // Europe
      [-0.1, 51.5, 34], [2.3, 48.8, 30], [8.6, 50.1, 28], [4.9, 52.3, 26],
      [12.5, 41.9, 24], [9.2, 45.4, 26], [-3.7, 40.4, 24], [13.4, 52.5, 26],
      [37.6, 55.7, 30], [18.0, 59.3, 18],
      // East & SE Asia
      [139.7, 35.7, 38], [135.5, 34.7, 28], [127.0, 37.5, 30], [121.5, 31.2, 36],
      [116.4, 39.9, 34], [114.1, 22.3, 34], [103.8, 1.3, 26], [100.5, 13.7, 24],
      [106.8, -6.2, 26], [121.0, 14.6, 22],
      // Americas
      [-74.0, 40.7, 38], [-87.6, 41.8, 28], [-118.2, 34.0, 32], [-122.4, 37.7, 26],
      [-95.3, 29.7, 26], [-80.2, 25.7, 24], [-79.4, 43.6, 24], [-99.1, 19.4, 28],
      [-46.6, -23.5, 30], [-58.4, -34.6, 26],
      // Africa & Australia
      [28.0, -26.2, 22], [3.3, 6.5, 22], [36.8, -1.3, 18],
      [151.2, -33.8, 24], [144.9, -37.8, 22],
    ];

    for (const [lon, lat, radius] of cityLights) {
      const [cx, cy] = lonLatToPx(lon, lat);
      const grad = nightCtx.createRadialGradient(cx, cy, 1, cx, cy, radius);
      grad.addColorStop(0, 'rgba(255, 222, 135, 0.95)');
      grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.52)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      nightCtx.fillStyle = grad;
      nightCtx.beginPath();
      nightCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      nightCtx.fill();
    }
  }

  const dayMap = new THREE.CanvasTexture(dayCanvas);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  dayMap.anisotropy = 4;
  dayMap.needsUpdate = true;

  const nightMap = new THREE.CanvasTexture(nightCanvas);
  nightMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.needsUpdate = true;

  return { dayMap, nightMap, roughnessMap };
}

function createVolumetricCloudTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < 120; i++) {
      const cx = (i * 173 + 67) % width;
      const cy = 44 + ((i * 89 + 29) % (height - 88));
      const rx = 26 + (i % 6) * 16;
      const ry = 8 + (i % 4) * 5;
      // Keep South India/Kerala gently clear so beacons stay readable
      if (Math.hypot(cx - 728, cy - 227) < 62) continue;

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.52)');
      grad.addColorStop(0.55, 'rgba(226, 232, 240, 0.22)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Parses world-atlas/countries-110m.json into interactive spherical country border segments.
 */
function parseWorldCountryBorders(): {
  allBordersGeometry: THREE.BufferGeometry;
  countries: ParsedCountryGeo[];
} {
  const countries: ParsedCountryGeo[] = [];
  const linePositions: number[] = [];
  const r = EARTH_GLOBE_RADIUS + 0.018;

  try {
    const topo = countriesTopoJson as unknown as Topology<{
      countries: GeometryCollection<{ name?: string }>;
    }>;
    const fc = feature(topo, topo.objects.countries) as unknown as {
      features: Array<{
        id?: string | number;
        properties?: { name?: string };
        geometry?: { type: string; coordinates: unknown };
      }>;
    };

    for (const f of fc.features ?? []) {
      if (!f.geometry) continue;
      const isoNumeric = String(f.id ?? '').padStart(3, '0');
      const catalog = getWorldCountryByIso(isoNumeric);
      const name = catalog?.name || f.properties?.name || `Region ${isoNumeric}`;
      const rings: Array<Array<[number, number]>> = [];

      if (f.geometry.type === 'Polygon') {
        const polyRings = f.geometry.coordinates as Array<Array<[number, number]>>;
        if (polyRings[0]) rings.push(polyRings[0]);
      } else if (f.geometry.type === 'MultiPolygon') {
        const multiPolys = f.geometry.coordinates as Array<Array<Array<[number, number]>>>;
        for (const poly of multiPolys) {
          if (poly[0]) rings.push(poly[0]);
        }
      }

      let latSum = 0;
      let lonSum = 0;
      let ptCount = 0;

      for (const ring of rings) {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lonA, latA] = ring[i];
          const [lonB, latB] = ring[i + 1];
          latSum += latA;
          lonSum += lonA;
          ptCount++;

          if (Math.abs(lonB - lonA) > 150) continue;
          const pA = latLonToSpherePoint(latA, lonA, r);
          const pB = latLonToSpherePoint(latB, lonB, r);
          linePositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
        }
      }

      if (ptCount > 0) {
        countries.push({
          isoNumeric,
          name,
          rings,
          centroidLat: catalog?.lat ?? latSum / ptCount,
          centroidLon: catalog?.lon ?? lonSum / ptCount,
        });
      }
    }
  } catch {
    // Graceful empty fallback if topojson fails
  }

  const allBordersGeometry = new THREE.BufferGeometry();
  allBordersGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(linePositions, 3)
  );
  return { allBordersGeometry, countries };
}

/**
 * Ray-casting point-in-polygon check on equirectangular (lon, lat) rings to identify clicked/hovered country.
 */
function pointInRing(lon: number, lat: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (Math.abs(xi - xj) > 150) continue;
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function spherePointToLatLon(pt: THREE.Vector3): { lat: number; lon: number } {
  const n = pt.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)));
  // Inverse of latLonToSpherePoint:
  // phi = (90 - lat), theta = (lon + 180)
  // x = -r sin(phi) cos(theta), z = r sin(phi) sin(theta)
  const theta = Math.atan2(n.z, -n.x);
  let lon = THREE.MathUtils.radToDeg(theta) - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/**
 * Builds a spherical great-circle flight arc curve above the Earth's surface.
 */
function buildSphericalFlightCurve(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  arcLift = 0.65,
  segments = 48
): THREE.CatmullRomCurve3 {
  const startN = latLonToVec3(fromLat, fromLon, 1).normalize();
  const endN = latLonToVec3(toLat, toLon, 1).normalize();
  const angle = Math.acos(THREE.MathUtils.clamp(startN.dot(endN), -1, 1));
  const lift = Math.min(1.45, Math.max(0.28, (angle / Math.PI) * arcLift * 2.1));

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let dir: THREE.Vector3;
    if (angle < 0.001) {
      dir = startN.clone();
    } else {
      const sinA = Math.sin(angle);
      const w1 = Math.sin((1 - t) * angle) / sinA;
      const w2 = Math.sin(t * angle) / sinA;
      dir = startN.clone().multiplyScalar(w1).add(endN.clone().multiplyScalar(w2)).normalize();
    }
    const altitude = EARTH_GLOBE_RADIUS + 0.08 + Math.sin(Math.PI * t) * lift;
    points.push(dir.multiplyScalar(altitude));
  }
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Custom GLSL Fresnel blue atmospheric rim glow around the Blue Marble Earth.
 */
function FresnelAtmosphereHalo() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#60a5fa') },
        uRimColor: { value: new THREE.Color('#93c5fd') },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uRimColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 3.2);
          vec3 col = mix(uColor, uRimColor, fresnel);
          gl_FragColor = vec4(col, fresnel * 0.72);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[EARTH_GLOBE_RADIUS + 0.19, 48, 36]} />
    </mesh>
  );
}

/**
 * Animated 3D Airplane flying continuously along a live global great-circle route.
 * Clickable to open its live telemetry HUD & 1-click 3D seat booking!
 */
function AnimatedGlobeAircraft({
  flight,
  index,
  isSoftwareGl,
  onSelectFlight,
  onHoverLabelChange,
}: {
  flight: LiveAirspaceFlight;
  index: number;
  isSoftwareGl: boolean;
  onSelectFlight: (flight: LiveAirspaceFlight) => void;
  onHoverLabelChange: (label: string | null) => void;
}) {
  const aircraftRef = useRef<THREE.Group>(null);
  const livery = AIRLINE_LIVERIES[flight.airlineCode];
  const accentHex = livery?.accentHex ?? '#38bdf8';

  const { curve, trailGeo } = useMemo(() => {
    const c = buildSphericalFlightCurve(
      flight.fromLat,
      flight.fromLon,
      flight.toLat,
      flight.toLon,
      0.72,
      44
    );
    const geo = new THREE.TubeGeometry(c, 44, 0.013, 6, false);
    return { curve: c, trailGeo: geo };
  }, [flight]);

  useEffect(() => {
    return () => trailGeo.dispose();
  }, [trailGeo]);

  useFrame((state) => {
    const g = aircraftRef.current;
    if (!g) return;
    const speed = 0.055 + (index % 3) * 0.012;
    const t = isSoftwareGl
      ? 0.25 + (index * 0.14) % 0.65
      : (state.clock.elapsedTime * speed + index * 0.17) % 1;
    const pos = curve.getPointAt(t);
    const nextPos = curve.getPointAt(Math.min(0.999, t + 0.015));
    const up = pos.clone().normalize();
    g.position.copy(pos);
    g.up.copy(up);
    g.lookAt(nextPos);
  });

  return (
    <group>
      {/* Subtle glowing flight corridor arc */}
      <mesh geometry={trailGeo}>
        <meshBasicMaterial color={accentHex} transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Composite 3D Airplane (fuselage, swept wings, tailfin, glowing wingtip strobe) */}
      <group
        ref={aircraftRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHoverLabelChange(
            `✈ ${flight.flightNumber} · ${flight.airlineName} (${flight.fromIata} → ${flight.toIata}) · Click for HUD`
          );
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHoverLabelChange(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectFlight(flight);
        }}
      >
        {/* Invisible larger hit target for effortless clicking */}
        <mesh>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Fuselage aligned along +Z (lookAt forward axis) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.032, 0.18, 4, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.25} />
        </mesh>
        {/* Swept main wings */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.28, 0.012, 0.065]} />
          <meshStandardMaterial
            color={accentHex}
            emissive={accentHex}
            emissiveIntensity={0.75}
            roughness={0.3}
          />
        </mesh>
        {/* Tail vertical stabilizer */}
        <mesh position={[0, 0.048, -0.095]}>
          <boxGeometry args={[0.014, 0.075, 0.055]} />
          <meshStandardMaterial
            color={accentHex}
            emissive={accentHex}
            emissiveIntensity={0.85}
          />
        </mesh>
        {/* Horizontal tailplane */}
        <mesh position={[0, 0.008, -0.095]}>
          <boxGeometry args={[0.11, 0.01, 0.032]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Highlighted active route arc on the 3D globe from Origin to selected global Destination.
 */
function ActiveGlobeRouteArc({
  origin,
  destination,
  isSoftwareGl,
}: {
  origin: GlobeCoordPoint;
  destination: GlobeCoordPoint;
  isSoftwareGl: boolean;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);

  const { curve, coreGeo, haloGeo } = useMemo(() => {
    const c = buildSphericalFlightCurve(
      origin.lat,
      origin.lon,
      destination.lat,
      destination.lon,
      0.95,
      56
    );
    return {
      curve: c,
      coreGeo: new THREE.TubeGeometry(c, 56, 0.032, 8, false),
      haloGeo: new THREE.TubeGeometry(c, 56, 0.065, 8, false),
    };
  }, [origin.lat, origin.lon, destination.lat, destination.lon]);

  useEffect(() => {
    return () => {
      coreGeo.dispose();
      haloGeo.dispose();
    };
  }, [coreGeo, haloGeo]);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const t = isSoftwareGl ? 0.5 : (state.clock.elapsedTime * 0.34) % 1;
    pulseRef.current.position.copy(curve.getPointAt(t));
  });

  const destPos = useMemo(
    () => latLonToVec3(destination.lat, destination.lon, EARTH_GLOBE_RADIUS + 0.06),
    [destination.lat, destination.lon]
  );

  return (
    <group>
      <mesh geometry={coreGeo}>
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={1.35}
          roughness={0.2}
        />
      </mesh>
      <mesh geometry={haloGeo}>
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Destination Beacon Pin */}
      <mesh position={destPos}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#06b6d4"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Highlights a hovered or selected country's exact 3D spherical border polygon.
 */
function HighlightedCountryOutline({
  country,
  color,
}: {
  country: ParsedCountryGeo;
  color: string;
}) {
  const geo = useMemo(() => {
    const r = EARTH_GLOBE_RADIUS + 0.035;
    const pos: number[] = [];
    for (const ring of country.rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lonA, latA] = ring[i];
        const [lonB, latB] = ring[i + 1];
        if (Math.abs(lonB - lonA) > 150) continue;
        const pA = latLonToSpherePoint(latA, lonA, r);
        const pB = latLonToSpherePoint(latB, lonB, r);
        pos.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [country]);

  useEffect(() => {
    return () => geo.dispose();
  }, [geo]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.98} />
    </lineSegments>
  );
}

function DeepSpaceStarfield() {
  const starGeo = useMemo(() => {
    const count = 650;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = ((i * 73.137) % 1000) / 1000;
      const v = ((i * 191.73) % 1000) / 1000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 26 + (i % 11) * 1.6;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => starGeo.dispose();
  }, [starGeo]);

  return (
    <points geometry={starGeo}>
      <pointsMaterial color="#e0f2fe" size={0.11} transparent opacity={0.85} />
    </points>
  );
}

export function WorldEarth3DGlobe({
  isSoftwareGl,
  originPoint,
  destinationPoint,
  selectedCountryIso,
  onSelectCountry,
  onDiveToKerala,
  onHoverLabelChange,
  onSelectLiveFlight,
}: WorldEarth3DGlobeProps) {
  const { invalidate } = useThree();
  const { dayMap, nightMap, roughnessMap } = useMemo(() => createBlueMarbleTextures(), []);
  const cloudTexture = useMemo(() => createVolumetricCloudTexture(), []);
  const { allBordersGeometry, countries } = useMemo(() => parseWorldCountryBorders(), []);

  const [hoveredCountryIso, setHoveredCountryIso] = useState<string | null>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const keralaPulseRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    return () => {
      dayMap.dispose();
      nightMap.dispose();
      roughnessMap.dispose();
      cloudTexture.dispose();
      allBordersGeometry.dispose();
    };
  }, [dayMap, nightMap, roughnessMap, cloudTexture, allBordersGeometry]);

  const keralaNormal = useMemo(
    () => latLonToVec3(10.2, 76.6, 1).normalize(),
    []
  );
  const keralaBeaconQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), keralaNormal);
    return q;
  }, [keralaNormal]);

  useFrame((state) => {
    if (isSoftwareGl) return;
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
    }
    if (keralaPulseRef.current) {
      const t = (state.clock.elapsedTime * 0.85) % 1;
      const s = 0.75 + t * 2.1;
      keralaPulseRef.current.scale.set(s, s, 1);
      const mat = keralaPulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.9;
    }
  });

  const findCountryAtPoint = (worldPt: THREE.Vector3): ParsedCountryGeo | null => {
    const { lat, lon } = spherePointToLatLon(worldPt);
    for (const c of countries) {
      for (const ring of c.rings) {
        if (pointInRing(lon, lat, ring)) {
          return c;
        }
      }
    }
    return null;
  };

  const hoveredCountryObj = useMemo(
    () => (hoveredCountryIso ? countries.find((c) => c.isoNumeric === hoveredCountryIso) ?? null : null),
    [countries, hoveredCountryIso]
  );

  const selectedCountryObj = useMemo(
    () =>
      selectedCountryIso
        ? countries.find((c) => c.isoNumeric === selectedCountryIso) ?? null
        : null,
    [countries, selectedCountryIso]
  );

  const keralaPos: [number, number, number] = [
    keralaNormal.x * (EARTH_GLOBE_RADIUS + 0.04),
    keralaNormal.y * (EARTH_GLOBE_RADIUS + 0.04),
    keralaNormal.z * (EARTH_GLOBE_RADIUS + 0.04),
  ];

  const isDifferentRoute =
    destinationPoint &&
    (Math.abs(destinationPoint.lat - originPoint.lat) > 0.3 ||
      Math.abs(destinationPoint.lon - originPoint.lon) > 0.3);

  return (
    <group>
      <DeepSpaceStarfield />

      {/* Photorealistic Blue Marble Earth Sphere (Interactive Country Picking) */}
      <mesh
        onPointerMove={(e) => {
          e.stopPropagation();
          const hit = findCountryAtPoint(e.point);
          if (hit) {
            if (hoveredCountryIso !== hit.isoNumeric) {
              setHoveredCountryIso(hit.isoNumeric);
              onHoverLabelChange(`${hit.name} · Click to fly & explore`);
              document.body.style.cursor = 'pointer';
              if (isSoftwareGl) invalidate();
            }
          } else if (hoveredCountryIso !== null) {
            setHoveredCountryIso(null);
            onHoverLabelChange(null);
            document.body.style.cursor = 'auto';
            if (isSoftwareGl) invalidate();
          }
        }}
        onPointerOut={() => {
          setHoveredCountryIso(null);
          onHoverLabelChange(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          const hit = findCountryAtPoint(e.point);
          if (!hit) return;
          const catalog = getWorldCountryByIso(hit.isoNumeric);
          if (catalog) {
            onSelectCountry(catalog);
          }
        }}
      >
        <sphereGeometry
          args={[EARTH_GLOBE_RADIUS, isSoftwareGl ? 48 : 72, isSoftwareGl ? 32 : 52]}
        />
        <meshStandardMaterial
          map={dayMap}
          roughnessMap={roughnessMap}
          roughness={0.85}
          metalness={0.08}
          emissiveMap={nightMap}
          emissive="#fbbf24"
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Crisp 3D Spherical Country Borders from world-atlas/countries-110m.json */}
      <lineSegments geometry={allBordersGeometry}>
        <lineBasicMaterial color="#93c5fd" transparent opacity={0.28} />
      </lineSegments>

      {/* Highlighted Hovered Country Border */}
      {hoveredCountryObj && (
        <HighlightedCountryOutline country={hoveredCountryObj} color="#67e8f9" />
      )}

      {/* Highlighted Selected Country Border */}
      {selectedCountryObj && (
        <HighlightedCountryOutline country={selectedCountryObj} color="#fde047" />
      )}

      {/* Slowly Rotating Volumetric Semi-Transparent Cloud Sphere */}
      <mesh ref={cloudsRef}>
        <sphereGeometry
          args={[EARTH_GLOBE_RADIUS + 0.06, isSoftwareGl ? 36 : 56, isSoftwareGl ? 24 : 36]}
        />
        <meshStandardMaterial
          map={cloudTexture}
          transparent
          opacity={0.74}
          depthWrite={false}
          roughness={0.95}
        />
      </mesh>

      {/* Custom GLSL Fresnel Blue Atmospheric Rim Glow */}
      <FresnelAtmosphereHalo />

      {/* Glowing Golden Home Beacon on India & Kerala (Click to Dive into Regional Terrain) */}
      <group
        position={keralaPos}
        quaternion={keralaBeaconQuat}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHoverLabelChange('India & Kerala Home Hub · Click to Dive into 3D Terrain');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHoverLabelChange(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDiveToKerala();
        }}
      >
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.38, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.14, 24]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <mesh ref={keralaPulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.17, 0.27, 28]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.045, 0.56, 10]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.25} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Active Origin -> Destination Great-Circle Route Trajectory Arc */}
      {isDifferentRoute && destinationPoint && (
        <ActiveGlobeRouteArc
          origin={originPoint}
          destination={destinationPoint}
          isSoftwareGl={isSoftwareGl}
        />
      )}

      {/* Live Global Airspace: 6 Animated 3D Airplanes flying along live corridors */}
      {LIVE_AIRSPACE_FLIGHTS.map((flight, idx) => (
        <AnimatedGlobeAircraft
          key={flight.id}
          flight={flight}
          index={idx}
          isSoftwareGl={isSoftwareGl}
          onSelectFlight={onSelectLiveFlight}
          onHoverLabelChange={onHoverLabelChange}
        />
      ))}
    </group>
  );
}
