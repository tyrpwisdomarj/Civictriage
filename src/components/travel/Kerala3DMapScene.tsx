import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  ALL_MAP_REGIONS,
  FEATURED_BIODIVERSITY_BADGE_IDS,
  INTERSTATE_GATEWAYS,
  KERALA_DISTRICTS,
  getRegionById,
} from '../../data/keralaMapData';
import {
  computeArcPoints,
  latLonToSpherePoint,
  type MapRegionNode,
} from '../../shared/travelSchema';
import type { CorridorHazardItem } from '../../shared/corridorHazardMatcher';
import type { LiveAirspaceFlight, WorldCountryEntry } from '../../data/worldAtlasData';
import {
  WorldEarth3DGlobe,
  type GlobeCoordPoint,
} from './WorldEarth3DGlobe';
import { IndiaTopographicReliefScene } from './IndiaTopographicReliefScene';
import type { IndiaStateSpec } from '../../data/indiaStatesData';

export type ExplorerViewMode = 'globe' | 'india' | 'state' | 'terrain';

export interface RegionalLiveVehicle {
  id: string;
  channel: 'irctc' | 'ksrtc';
  serviceCode: string;
  name: string;
  vehicleModel: string;
  from: string;
  to: string;
  speedLabel: string;
  fareInr: number;
  accentHex: string;
}

export interface Kerala3DMapSceneProps {
  viewMode: ExplorerViewMode;
  originId: string;
  destinationId: string | null;
  selectedIndiaStateId?: string;
  showBiodiversity: boolean;
  resetSignal: number;
  isSoftwareGl: boolean;
  districtHazardsMap?: Record<string, CorridorHazardItem[]>;
  globeOriginPoint: GlobeCoordPoint;
  globeDestinationPoint: GlobeCoordPoint | null;
  globeFocusCoord: { lat: number; lon: number; token: number } | null;
  selectedCountryIso: string | null;
  onSelectWorldCountry: (country: WorldCountryEntry) => void;
  onSelectIndiaState?: (state: IndiaStateSpec) => void;
  onSelectIndiaDistrict?: (districtName: string, state: IndiaStateSpec) => void;
  onSelectLiveFlight: (flight: LiveAirspaceFlight) => void;
  onSelectRegionalVehicle: (vehicle: RegionalLiveVehicle) => void;
  onDiveToKerala: () => void;
  onSelectDestination: (region: MapRegionNode) => void;
  onContextLost: () => void;
}

const GLOBE_RADIUS = 4.2;
const INDIA_KERALA_LAT = 10.2;
const INDIA_KERALA_LON = 76.6;

const KERALA_GLOBE_PT = latLonToSpherePoint(
  INDIA_KERALA_LAT,
  INDIA_KERALA_LON,
  GLOBE_RADIUS
);
const KERALA_GLOBE_NORMAL = new THREE.Vector3(
  KERALA_GLOBE_PT.x,
  KERALA_GLOBE_PT.y,
  KERALA_GLOBE_PT.z
).normalize();

const DEFAULT_GLOBE_CAMERA_POS = KERALA_GLOBE_NORMAL.clone()
  .multiplyScalar(15.8)
  .add(new THREE.Vector3(-1.2, 1.5, 0.85));
const DEFAULT_GLOBE_TARGET = new THREE.Vector3(0, 0, 0);

const DEFAULT_TERRAIN_CAMERA_POS = new THREE.Vector3(-2.8, 12.6, 13.8);
const DEFAULT_TERRAIN_TARGET = new THREE.Vector3(0.4, 0.2, -0.5);
const DEFAULT_INDIA_CAMERA_POS = new THREE.Vector3(0.4, 13.8, 11.4);
const DEFAULT_INDIA_TARGET = new THREE.Vector3(0, 0.2, 0);
const DEFAULT_STATE_CAMERA_POS = new THREE.Vector3(0.8, 10.6, 8.8);
const DEFAULT_STATE_TARGET = new THREE.Vector3(0, 0.3, 0);

interface ProjectedPinTarget {
  key: string;
  worldX: number;
  worldY: number;
  worldZ: number;
}

// Vibrant meadow & emerald grass palette per Kerala district
const LUSH_DISTRICT_GRASS: Record<string, string> = {
  kasaragod: '#22c55e',
  kannur: '#16a34a',
  wayanad: '#15803d',
  kozhikode: '#22c55e',
  malappuram: '#10b981',
  palakkad: '#4ade80',
  thrissur: '#16a34a',
  ernakulam: '#10b981',
  idukki: '#15803d',
  kottayam: '#22c55e',
  alappuzha: '#34d399',
  pathanamthitta: '#16a34a',
  kollam: '#22c55e',
  thiruvananthapuram: '#10b981',
};

const MOUNTAIN_DISTRICTS = new Set(['idukki', 'wayanad', 'pathanamthitta']);
const PALM_DISTRICTS = new Set([
  'kasaragod',
  'kannur',
  'kozhikode',
  'alappuzha',
  'ernakulam',
  'kottayam',
  'kollam',
  'thiruvananthapuram',
  'thrissur',
  'malappuram',
]);

/**
 * Generates a lush, vibrant Living Earth equirectangular CanvasTexture with
 * ocean blue seas, emerald green continents, polar ice caps, and highlighted India/Kerala.
 */
function createLivingEarthTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Vibrant sunlit ocean blue gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#38bdf8');
    oceanGrad.addColorStop(0.18, '#0284c7');
    oceanGrad.addColorStop(0.5, '#0369a1');
    oceanGrad.addColorStop(0.82, '#0284c7');
    oceanGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    const lonLatToPx = (lon: number, lat: number): [number, number] => [
      ((lon + 180) / 360) * width,
      ((90 - lat) / 180) * height,
    ];

    // Subtle shimmering ocean currents / graticule
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 20) {
      const [x] = lonLatToPx(lon, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 20) {
      const [, y] = lonLatToPx(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const drawContinent = (
      coords: Array<[number, number]>,
      fill: string,
      stroke: string,
      lineW = 2.2
    ) => {
      ctx.save();
      // Shallow turquoise coastal halo
      ctx.beginPath();
      coords.forEach(([lon, lat], i) => {
        const [x, y] = lonLatToPx(lon, lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = lineW + 6;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      ctx.stroke();
      ctx.restore();
    };

    const lushGreen = '#22c55e';
    const forestGreen = '#16a34a';
    const meadowGreen = '#4ade80';
    const warmSavanna = '#84cc16';
    const coastStroke = '#bbf7d0';

    // Africa
    drawContinent(
      [
        [-17, 15], [-6, 36], [10, 37], [32, 31], [43, 12], [51, 11],
        [40, -11], [35, -24], [20, -35], [14, -22], [9, 4], [-8, 5],
      ],
      warmSavanna,
      coastStroke
    );
    // Central African rainforest belt
    drawContinent(
      [
        [-8, 9], [16, 10], [34, 4], [28, -10], [12, -8], [5, 4],
      ],
      forestGreen,
      'rgba(187,247,208,0.2)',
      1
    );

    // Europe
    drawContinent(
      [
        [-9, 37], [-9, 43], [-2, 48], [6, 53], [14, 58], [28, 70],
        [42, 66], [42, 47], [28, 41], [15, 38], [3, 42],
      ],
      lushGreen,
      coastStroke
    );

    // Arabia & Middle East
    drawContinent(
      [
        [34, 31], [48, 30], [59, 22], [53, 15], [44, 13], [35, 27],
      ],
      '#a3e635',
      '#dcfce7'
    );

    // Eurasia / Asia
    drawContinent(
      [
        [42, 66], [70, 72], [110, 73], [142, 62], [140, 44], [128, 36],
        [120, 24], [108, 16], [102, 4], [98, 16], [89, 22], [80, 28],
        [68, 24], [58, 25], [48, 30], [42, 47],
      ],
      forestGreen,
      coastStroke
    );

    // Southeast Asia islands (Sumatra, Borneo, Java)
    drawContinent(
      [[95, 5], [105, -5], [103, -7], [94, 2]],
      lushGreen,
      coastStroke,
      1.4
    );
    drawContinent(
      [[109, 2], [118, 6], [118, -3], [110, -3]],
      lushGreen,
      coastStroke,
      1.4
    );

    // Australia
    drawContinent(
      [
        [114, -22], [129, -14], [143, -12], [153, -27], [147, -38],
        [131, -32], [115, -34],
      ],
      warmSavanna,
      coastStroke
    );

    // North America
    drawContinent(
      [
        [-164, 64], [-130, 70], [-82, 62], [-60, 46], [-78, 25],
        [-97, 19], [-112, 26], [-125, 48], [-145, 60],
      ],
      lushGreen,
      coastStroke
    );

    // Greenland (icy emerald-white)
    drawContinent(
      [[-52, 60], [-42, 82], [-18, 80], [-25, 66], [-44, 60]],
      '#e0f2fe',
      '#ffffff',
      1.5
    );

    // South America
    drawContinent(
      [
        [-78, 9], [-60, 8], [-35, -6], [-40, -23], [-58, -38],
        [-68, -54], [-74, -42], [-72, -18], [-81, -4],
      ],
      forestGreen,
      coastStroke
    );

    // Sri Lanka
    drawContinent(
      [
        [79.8, 9.6], [81.6, 7.6], [80.6, 5.9], [79.8, 7.2],
      ],
      meadowGreen,
      '#fef08a',
      1.5
    );

    // Highlighted Indian Subcontinent in vibrant emerald
    drawContinent(
      [
        [68.5, 23.5], [73.5, 32.5], [78.5, 35.2], [82.0, 28.5],
        [88.5, 27.0], [95.0, 28.0], [93.5, 22.5], [88.5, 21.8],
        [85.2, 19.4], [80.4, 13.0], [77.6, 8.1], [74.8, 12.9],
        [72.8, 19.1], [70.2, 22.2],
      ],
      '#10b981',
      '#fde047',
      2.6
    );

    // Highlighted Kerala Coastal Strip in radiant gold-emerald
    drawContinent(
      [
        [74.9, 12.7], [76.2, 11.7], [77.2, 10.1], [77.5, 8.3],
        [76.8, 8.4], [76.1, 10.2], [75.3, 11.8],
      ],
      '#4ade80',
      '#fbbf24',
      2.8
    );

    // Polar Ice Caps (North & South Poles)
    const northIce = ctx.createLinearGradient(0, 0, 0, height * 0.14);
    northIce.addColorStop(0, '#ffffff');
    northIce.addColorStop(0.65, '#f0f9ff');
    northIce.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = northIce;
    ctx.fillRect(0, 0, width, height * 0.14);

    const southIce = ctx.createLinearGradient(0, height * 0.85, 0, height);
    southIce.addColorStop(0, 'rgba(240, 249, 255, 0)');
    southIce.addColorStop(0.35, '#f0f9ff');
    southIce.addColorStop(1, '#ffffff');
    ctx.fillStyle = southIce;
    ctx.fillRect(0, height * 0.85, width, height * 0.15);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft translucent white swirling cloud cover CanvasTexture for the Earth globe.
 */
function createCloudLayerTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    // Deterministic soft cloud puffs & trade-wind bands
    for (let i = 0; i < 65; i++) {
      const cx = ((i * 97 + 43) % width);
      const cy = 26 + ((i * 59 + 19) % (height - 52));
      const rx = 20 + (i % 5) * 11;
      const ry = 6 + (i % 4) * 3.5;

      // Leave a clean viewing window over South India / Kerala (~76E, 10N -> x~364, y~114)
      if (Math.hypot(cx - 364, cy - 114) < 38) continue;

      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
      grad.addColorStop(0.6, 'rgba(241, 245, 249, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function StudioEnvironment({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    if (isSoftwareGl) return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const renderTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = renderTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    return () => {
      scene.environment = null;
      renderTarget.dispose();
    };
  }, [gl, scene, isSoftwareGl]);

  return null;
}

function StarfieldBackdrop() {
  const starGeo = useMemo(() => {
    const count = 380;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = ((i * 73.137) % 1000) / 1000;
      const v = ((i * 191.73) % 1000) / 1000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 24 + (i % 9) * 1.4;
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
      <pointsMaterial color="#e0f2fe" size={0.12} transparent opacity={0.78} />
    </points>
  );
}

function OrbitalGlobeView({
  isSoftwareGl,
  onDiveToKerala,
  onHoverIndia,
}: {
  isSoftwareGl: boolean;
  onDiveToKerala: () => void;
  onHoverIndia: (hovered: boolean) => void;
}) {
  const earthTexture = useMemo(() => createLivingEarthTexture(), []);
  const cloudTexture = useMemo(() => createCloudLayerTexture(), []);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    return () => {
      earthTexture.dispose();
      cloudTexture.dispose();
    };
  }, [earthTexture, cloudTexture]);

  const beaconQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), KERALA_GLOBE_NORMAL);
    return q;
  }, []);

  useFrame((state) => {
    if (isSoftwareGl) return;
    const t = (state.clock.elapsedTime * 0.85) % 1;
    if (pulseRingRef.current) {
      const s = 0.75 + t * 2.1;
      pulseRingRef.current.scale.set(s, s, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.9;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.018;
    }
  });

  const beaconPos: [number, number, number] = [
    KERALA_GLOBE_NORMAL.x * (GLOBE_RADIUS + 0.05),
    KERALA_GLOBE_NORMAL.y * (GLOBE_RADIUS + 0.05),
    KERALA_GLOBE_NORMAL.z * (GLOBE_RADIUS + 0.05),
  ];

  return (
    <group>
      <StarfieldBackdrop />

      {/* Vibrant Living Green & Blue Earth Sphere with Polar Ice Caps */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, isSoftwareGl ? 40 : 64, isSoftwareGl ? 28 : 48]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.58}
          metalness={0.08}
          emissive="#0c4a6e"
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* Soft White Swirling Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.065, isSoftwareGl ? 32 : 48, isSoftwareGl ? 20 : 32]} />
        <meshStandardMaterial
          map={cloudTexture}
          transparent
          opacity={0.75}
          depthWrite={false}
          roughness={0.9}
        />
      </mesh>

      {/* Soft White-Sky Atmospheric Glow Halo */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.34, 40, 32]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing Golden Beacon over India & Kerala (Clickable to Dive) */}
      <group
        position={beaconPos}
        quaternion={beaconQuat}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHoverIndia(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHoverIndia(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDiveToKerala();
        }}
      >
        {/* Generous invisible hit sphere covering India peninsula */}
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.96, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Golden core disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>

        {/* Pulsing golden shockwave ring */}
        <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <ringGeometry args={[0.22, 0.34, 32]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.88} />
        </mesh>

        {/* Vertical golden spire */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.025, 0.055, 0.72, 12]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.25}
          />
        </mesh>

        {/* Radiant golden crown orb */}
        <mesh position={[0, 0.76, 0]}>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#f59e0b"
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Shimmering coastal ocean plane & Kerala backwater channels for the sunlit diorama.
 */
function ShimmeringCoastalWaters({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const waveRingRef = useRef<THREE.Group>(null);

  const shoalRings = useMemo(() => {
    const radii = [4.9, 8.2, 12.0];
    return radii.map((r) => new THREE.RingGeometry(r - 0.06, r + 0.06, 96));
  }, []);

  const backwaterCurveGeo = useMemo(() => {
    // Winding turquoise backwater channel hugging Vembanad / Alappuzha / Kochi coast
    const pts = [
      new THREE.Vector3(-1.35, 0.03, 0.8),
      new THREE.Vector3(-1.12, 0.03, 1.9),
      new THREE.Vector3(-0.78, 0.03, 3.05),
      new THREE.Vector3(-0.35, 0.03, 4.15),
      new THREE.Vector3(0.05, 0.03, 5.1),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 32, 0.09, 6, false);
  }, []);

  useEffect(() => {
    return () => {
      shoalRings.forEach((g) => g.dispose());
      backwaterCurveGeo.dispose();
    };
  }, [shoalRings, backwaterCurveGeo]);

  useFrame((state) => {
    if (isSoftwareGl || !waveRingRef.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.012;
    waveRingRef.current.scale.set(s, 1, s);
  });

  return (
    <group position={[0, -0.02, -0.35]}>
      {/* Main shimmering ocean blue water plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[68, 68]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#0284c7"
          emissiveIntensity={0.18}
          roughness={0.28}
          metalness={0.14}
        />
      </mesh>

      {/* Soft turquoise coastal shelf surrounding Kerala */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.008, 0.2]}>
        <circleGeometry args={[7.8, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} />
      </mesh>

      {/* Subtle sunlit water ripple rings */}
      <group ref={waveRingRef}>
        {shoalRings.map((geo, idx) => (
          <mesh
            key={idx}
            geometry={geo}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0.1, 0.016, 0.2]}
          >
            <meshBasicMaterial
              color="#bae6fd"
              transparent
              opacity={idx === 0 ? 0.34 : 0.2}
            />
          </mesh>
        ))}
      </group>

      {/* Shimmering Backwater Canal Ribbon along Kerala coast */}
      <mesh geometry={backwaterCurveGeo} scale={[1, 0.25, 1]}>
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={0.45}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * Miniature 3D House with cream wall and terracotta/coral sloped roof.
 */
function MiniatureHouse({
  position,
  roofColor = '#ea580c',
  scale = 1,
  rotationY = 0,
}: {
  position: [number, number, number];
  roofColor?: string;
  scale?: number;
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Cream cottage walls */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.13, 0.12, 0.11]} />
        <meshStandardMaterial color="#fffbeb" roughness={0.7} />
      </mesh>
      {/* Terracotta pitched roof */}
      <mesh position={[0, 0.155, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.115, 0.09, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.55} />
      </mesh>
    </group>
  );
}

/**
 * Stylized low-poly Coconut Palm tree for coastal Kerala districts.
 */
function CoconutPalm({
  position,
  scale = 1,
  lean = 0.16,
}: {
  position: [number, number, number];
  scale?: number;
  lean?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0.02, 0.16, 0]} rotation={[0, 0, -lean]}>
        <cylinderGeometry args={[0.016, 0.028, 0.32, 6]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} />
      </mesh>
      {/* Radiating palm fronds */}
      {[0, 1.25, 2.5, 3.75, 5.0].map((angle, i) => (
        <mesh
          key={i}
          position={[
            0.04 + Math.cos(angle) * 0.08,
            0.31,
            Math.sin(angle) * 0.08,
          ]}
          rotation={[0.35 * Math.sin(angle), angle, -0.4]}
        >
          <boxGeometry args={[0.16, 0.018, 0.05]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#16a34a' : '#22c55e'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Stylized low-poly tropical / Western Ghats pine-canopy tree.
 */
function ForestTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.018, 0.028, 0.14, 6]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.12, 0.22, 7]} />
        <meshStandardMaterial color="#15803d" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <coneGeometry args={[0.085, 0.18, 7]} />
        <meshStandardMaterial color="#22c55e" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Elevated jagged 3D Mountain Peaks with snow/mist-tipped ridges for Western Ghats & Ooty.
 */
function MountainPeakCluster({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Main peak */}
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.32, 0.64, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.82} />
      </mesh>
      {/* Snow/mist-tipped ridge cap */}
      <mesh position={[0, 0.54, 0]}>
        <coneGeometry args={[0.125, 0.23, 6]} />
        <meshStandardMaterial color="#f8fafc" emissive="#e0f2fe" emissiveIntensity={0.25} roughness={0.4} />
      </mesh>

      {/* Secondary eastern shoulder peak */}
      <mesh position={[0.24, 0.22, 0.1]}>
        <coneGeometry args={[0.23, 0.44, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.82} />
      </mesh>
      <mesh position={[0.24, 0.37, 0.1]}>
        <coneGeometry args={[0.09, 0.16, 6]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.45} />
      </mesh>

      {/* Foothill ridge */}
      <mesh position={[-0.2, 0.16, -0.1]}>
        <coneGeometry args={[0.19, 0.32, 5]} />
        <meshStandardMaterial color="#166534" roughness={0.78} />
      </mesh>
    </group>
  );
}

/**
 * Stylized miniature regional fauna markers (Elephant / Hornbill / Nilgiri Tahr)
 */
function FaunaDioramaMarkers() {
  const wayanad = getRegionById('wayanad');
  const idukki = getRegionById('idukki');
  const pta = getRegionById('pathanamthitta');

  return (
    <group>
      {/* Stylized low-poly Asian Elephant in Wayanad */}
      {wayanad && (
        <group
          position={[wayanad.centroid.x - 0.18, wayanad.elevation + 0.06, wayanad.centroid.y + 0.14]}
          rotation={[0, 0.5, 0]}
        >
          <mesh position={[0, 0.09, 0]}>
            <boxGeometry args={[0.14, 0.1, 0.1]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          <mesh position={[0.09, 0.12, 0]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          {/* Ivory tusks */}
          <mesh position={[0.14, 0.09, 0.025]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.012, 0.06, 5]} />
            <meshStandardMaterial color="#fef9c3" />
          </mesh>
          <mesh position={[0.14, 0.09, -0.025]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.012, 0.06, 5]} />
            <meshStandardMaterial color="#fef9c3" />
          </mesh>
        </group>
      )}

      {/* Stylized Nilgiri Tahr silhouette near Idukki mountain ridge */}
      {idukki && (
        <group
          position={[idukki.centroid.x - 0.18, idukki.elevation + 0.06, idukki.centroid.y + 0.25]}
        >
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.11, 0.08, 0.06]} />
            <meshStandardMaterial color="#78350f" roughness={0.75} />
          </mesh>
          <mesh position={[0.06, 0.13, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#92400e" roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* Stylized Great Hornbill golden perch in Pathanamthitta */}
      {pta && (
        <group
          position={[pta.centroid.x + 0.34, pta.elevation + 0.38, pta.centroid.y - 0.16]}
        >
          <mesh>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.06, 0.01, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.025, 0.09, 6]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Populates the lush 3D Kerala terrain diorama with miniature 3D forests, palms,
 * snow/mist-tipped Western Ghats mountains, and terracotta-roofed houses/towns.
 */
function LushDioramaProps({ showBiodiversity }: { showBiodiversity: boolean }) {
  const ooty = getRegionById('ooty');

  return (
    <group>
      {KERALA_DISTRICTS.map((district, idx) => {
        const cx = district.centroid.x;
        const cy = district.centroid.y;
        const topY = district.elevation + 0.04;
        const hasMountain = MOUNTAIN_DISTRICTS.has(district.id);
        const hasPalm = PALM_DISTRICTS.has(district.id);
        const roofPalette = ['#ea580c', '#dc2626', '#f59e0b', '#e11d48'];

        return (
          <group key={`diorama-${district.id}`}>
            {/* Cute miniature terracotta-roofed town houses in each district */}
            <MiniatureHouse
              position={[cx - 0.15, topY, cy + 0.08]}
              roofColor={roofPalette[idx % roofPalette.length]}
              scale={0.95}
              rotationY={(idx * 0.7) % Math.PI}
            />
            <MiniatureHouse
              position={[cx - 0.01, topY, cy + 0.18]}
              roofColor={roofPalette[(idx + 1) % roofPalette.length]}
              scale={0.78}
              rotationY={(idx * 1.1) % Math.PI}
            />

            {/* Western Ghats 3D snow/mist-tipped mountain peaks */}
            {hasMountain && (
              <MountainPeakCluster
                position={[cx + 0.24, topY, cy - 0.08]}
                scale={district.id === 'idukki' ? 1.15 : 0.92}
              />
            )}

            {/* Coastal Coconut Palms & Western Ghats Forest Clusters */}
            {hasPalm ? (
              <>
                <CoconutPalm position={[cx - 0.28, topY, cy - 0.12]} scale={0.95} lean={0.2} />
                {showBiodiversity && (
                  <CoconutPalm position={[cx + 0.18, topY, cy - 0.16]} scale={0.82} lean={-0.18} />
                )}
              </>
            ) : (
              <>
                <ForestTree position={[cx - 0.24, topY, cy - 0.16]} scale={1.05} />
                <ForestTree position={[cx + 0.06, topY, cy - 0.24]} scale={0.88} />
              </>
            )}

            {showBiodiversity && (
              <ForestTree position={[cx + 0.22, topY, cy + 0.14]} scale={0.82} />
            )}
          </group>
        );
      })}

      {/* Extra Nilgiri mountain peak cluster at Ooty gateway */}
      {ooty && (
        <MountainPeakCluster
          position={[ooty.centroid.x + 0.36, 0.22, ooty.centroid.y - 0.2]}
          scale={0.95}
        />
      )}

      {showBiodiversity && <FaunaDioramaMarkers />}
    </group>
  );
}

interface DistrictExtrusionProps {
  district: MapRegionNode;
  isOrigin: boolean;
  isDestination: boolean;
  isHovered: boolean;
  isSoftwareGl: boolean;
  onHover: (region: MapRegionNode | null) => void;
  onSelect: (region: MapRegionNode) => void;
}

function DistrictExtrusion({
  district,
  isOrigin,
  isDestination,
  isHovered,
  isSoftwareGl,
  onHover,
  onSelect,
}: DistrictExtrusionProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  const { extrudeGeometry, edgesGeometry } = useMemo(() => {
    const shape = new THREE.Shape();
    const pts = district.polygon ?? [];
    if (pts.length > 0) {
      shape.moveTo(pts[0][0], -pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], -pts[i][1]);
      }
      shape.closePath();
    }

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: district.elevation,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.032,
      bevelSegments: isSoftwareGl ? 1 : 2,
      curveSegments: isSoftwareGl ? 3 : 6,
    });
    extrude.computeVertexNormals();

    const edges = new THREE.EdgesGeometry(extrude, 26);
    return { extrudeGeometry: extrude, edgesGeometry: edges };
  }, [district.polygon, district.elevation, isSoftwareGl]);

  useEffect(() => {
    return () => {
      extrudeGeometry.dispose();
      edgesGeometry.dispose();
    };
  }, [extrudeGeometry, edgesGeometry]);

  const targetLift = isHovered ? 0.28 : isDestination ? 0.18 : isOrigin ? 0.1 : 0;

  useEffect(() => {
    invalidate();
  }, [targetLift, invalidate]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const clampedDelta = Math.min(delta, 0.05);
    if (Math.abs(g.position.y - targetLift) > 0.002) {
      g.position.y = THREE.MathUtils.damp(g.position.y, targetLift, 10, clampedDelta);
      if (isSoftwareGl) invalidate();
    } else if (g.position.y !== targetLift) {
      g.position.y = targetLift;
    }
  });

  const meadowBase = LUSH_DISTRICT_GRASS[district.id] ?? '#22c55e';
  const baseColor = isOrigin
    ? '#059669'
    : isDestination
      ? '#0284c7'
      : isHovered
        ? '#34d399'
        : meadowBase;

  const emissiveColor = isOrigin
    ? '#10b981'
    : isDestination
      ? '#0ea5e9'
      : isHovered
        ? '#4ade80'
        : '#14532d';

  const emissiveIntensity = isHovered ? 0.35 : isOrigin || isDestination ? 0.28 : 0.08;

  const borderColor = isHovered
    ? '#fef08a'
    : isOrigin
      ? '#fde047'
      : isDestination
        ? '#bae6fd'
        : '#dcfce7';

  return (
    <group ref={groupRef}>
      <mesh
        geometry={extrudeGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow={!isSoftwareGl}
        receiveShadow={!isSoftwareGl}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(district);
          invalidate();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHover(null);
          invalidate();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(district);
          invalidate();
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.62}
          metalness={0.05}
        />
      </mesh>

      <lineSegments geometry={edgesGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <lineBasicMaterial
          color={borderColor}
          transparent
          opacity={isHovered || isOrigin || isDestination ? 0.95 : 0.55}
        />
      </lineSegments>
    </group>
  );
}

interface GatewayNodeProps {
  hub: MapRegionNode;
  isOrigin: boolean;
  isDestination: boolean;
  isHovered: boolean;
  isSoftwareGl: boolean;
  onHover: (region: MapRegionNode | null) => void;
  onSelect: (region: MapRegionNode) => void;
}

function GatewayHubNode({
  hub,
  isOrigin,
  isDestination,
  isHovered,
  isSoftwareGl,
  onHover,
  onSelect,
}: GatewayNodeProps) {
  const floatGroupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  const targetLift = isHovered ? 0.26 : isDestination ? 0.16 : 0;

  useEffect(() => {
    invalidate();
  }, [targetLift, invalidate]);

  useFrame((_, delta) => {
    const g = floatGroupRef.current;
    const clampedDelta = Math.min(delta, 0.05);
    if (g) {
      const desiredY = targetLift;
      if (Math.abs(g.position.y - desiredY) > 0.002) {
        g.position.y = THREE.MathUtils.damp(g.position.y, desiredY, 9, clampedDelta);
        if (isSoftwareGl) invalidate();
      }
    }
  });

  const accentColor = isOrigin
    ? '#10b981'
    : isDestination
      ? '#0284c7'
      : isHovered
        ? '#f59e0b'
        : '#f97316';

  return (
    <group
      position={[hub.centroid.x, 0, hub.centroid.y]}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover(hub);
        invalidate();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        onHover(null);
        invalidate();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(hub);
        invalidate();
      }}
    >
      {/* Coastal turquoise ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.48, 0.58, 28]} />
        <meshBasicMaterial
          color={isHovered || isDestination ? '#fde047' : '#e0f2fe'}
          transparent
          opacity={0.78}
        />
      </mesh>

      <group ref={floatGroupRef}>
        {/* Lush green island base */}
        <mesh position={[0, 0.11, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <cylinderGeometry args={[0.45, 0.5, 0.22, 18]} />
          <meshStandardMaterial
            color={isDestination ? '#0ea5e9' : '#22c55e'}
            roughness={0.62}
          />
        </mesh>

        {/* Miniature city town cluster with terracotta roofs + trees */}
        <MiniatureHouse position={[-0.14, 0.22, -0.06]} roofColor="#ea580c" scale={1.1} />
        <MiniatureHouse position={[0.14, 0.22, 0.08]} roofColor="#f59e0b" scale={0.95} rotationY={0.8} />
        <ForestTree position={[0.12, 0.22, -0.18]} scale={0.85} />

        {/* Glowing hub beacon crystal */}
        <mesh position={[0, 0.66, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={isHovered || isDestination ? 0.9 : 0.45}
            roughness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}

function OriginEmeraldBeacon({
  region,
  isSoftwareGl,
}: {
  region: MapRegionNode;
  isSoftwareGl: boolean;
}) {
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isSoftwareGl) return;
    const t = (state.clock.elapsedTime * 0.9) % 1;
    if (pulseRingRef.current) {
      const scale = 0.65 + t * 1.9;
      pulseRingRef.current.scale.set(scale, scale, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.85;
    }
    if (headRef.current) {
      headRef.current.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.06;
    }
  });

  const baseY = region.elevation + 0.14;

  return (
    <group position={[region.centroid.x, baseY, region.centroid.y]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.2, 24]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.92} />
      </mesh>

      <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.22, 0.32, 32]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.8} />
      </mesh>

      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.028, 0.055, 0.54, 12]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.65}
          roughness={0.25}
        />
      </mesh>

      <mesh ref={headRef} position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.14, 18, 18]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#f59e0b"
          emissiveIntensity={1.1}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function HazardWarningBeacon({
  region,
  isCritical,
  isSoftwareGl,
}: {
  region: MapRegionNode;
  isCritical: boolean;
  isSoftwareGl: boolean;
}) {
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const beaconConeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isSoftwareGl) return;
    const t = (state.clock.elapsedTime * 1.35) % 1;
    if (pulseRingRef.current) {
      const scale = 0.7 + t * 2.2;
      pulseRingRef.current.scale.set(scale, scale, 1);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.92;
    }
    if (beaconConeRef.current) {
      beaconConeRef.current.position.y =
        0.54 + Math.sin(state.clock.elapsedTime * 4.5) * 0.06;
    }
  });

  const primaryColor = isCritical ? '#ef4444' : '#f59e0b';
  const glowColor = isCritical ? '#dc2626' : '#d97706';
  const baseY = region.elevation + 0.12;

  return (
    <group position={[region.centroid.x - 0.16, baseY, region.centroid.y - 0.14]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <circleGeometry args={[0.2, 20]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.9} />
      </mesh>

      <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.22, 0.34, 28]} />
        <meshBasicMaterial color={isCritical ? '#fca5a5' : '#fde047'} transparent opacity={0.85} />
      </mesh>

      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.024, 0.042, 0.44, 10]} />
        <meshStandardMaterial
          color={primaryColor}
          emissive={glowColor}
          emissiveIntensity={0.85}
        />
      </mesh>

      <mesh ref={beaconConeRef} position={[0, 0.54, 0]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color={isCritical ? '#fecaca' : '#fef08a'}
          emissive={primaryColor}
          emissiveIntensity={1.35}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function RouteTrajectoryArc({
  origin,
  destination,
  isSoftwareGl,
}: {
  origin: MapRegionNode;
  destination: MapRegionNode;
  isSoftwareGl: boolean;
}) {
  const pulseOrbRef = useRef<THREE.Mesh>(null);

  const { curve, coreTubeGeo, haloTubeGeo } = useMemo(() => {
    const start = {
      x: origin.centroid.x,
      y: origin.elevation + 0.42,
      z: origin.centroid.y,
    };
    const end = {
      x: destination.centroid.x,
      y: destination.kind === 'gateway' ? 0.66 : destination.elevation + 0.42,
      z: destination.centroid.y,
    };
    const pts = computeArcPoints(start, end, 40).map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );
    const catmull = new THREE.CatmullRomCurve3(pts);
    const core = new THREE.TubeGeometry(catmull, 44, 0.052, 8, false);
    const halo = new THREE.TubeGeometry(catmull, 44, 0.11, 8, false);
    return { curve: catmull, coreTubeGeo: core, haloTubeGeo: halo };
  }, [origin, destination]);

  useEffect(() => {
    return () => {
      coreTubeGeo.dispose();
      haloTubeGeo.dispose();
    };
  }, [coreTubeGeo, haloTubeGeo]);

  useFrame((state) => {
    if (!pulseOrbRef.current) return;
    const t = isSoftwareGl ? 0.55 : (state.clock.elapsedTime * 0.42) % 1;
    const pos = curve.getPointAt(t);
    pulseOrbRef.current.position.copy(pos);
  });

  const destBaseY = destination.kind === 'gateway' ? 0.25 : destination.elevation + 0.2;

  return (
    <group>
      {/* Vibrant golden-coral glowing travel arc */}
      <mesh geometry={coreTubeGeo}>
        <meshStandardMaterial
          color="#f97316"
          emissive="#f59e0b"
          emissiveIntensity={1.15}
          roughness={0.2}
        />
      </mesh>

      <mesh geometry={haloTubeGeo}>
        <meshBasicMaterial
          color="#fde047"
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pulseOrbRef}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      <group position={[destination.centroid.x, destBaseY, destination.centroid.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.31, 28]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  );
}

const REGIONAL_LIVE_VEHICLES: RegionalLiveVehicle[] = [
  {
    id: 'veh-vande-bharat',
    channel: 'irctc',
    serviceCode: '20632',
    name: 'Vande Bharat Express (IRCTC)',
    vehicleModel: 'Semi-High-Speed 16-Car Electric Trainset',
    from: 'Thiruvananthapuram (TVC) via CNGR / KTYM',
    to: 'Kasaragod (KGQ) via ERS / CLT',
    speedLabel: '108 km/h · Live Rail Spine',
    fareInr: 1240,
    accentHex: '#0284c7',
  },
  {
    id: 'veh-ksrtc-swift',
    channel: 'ksrtc',
    serviceCode: 'KS-SWF-04',
    name: 'KSRTC Swift Gajaraj Multi-Axle',
    vehicleModel: 'Volvo B11R A/C Sleeper / Seater',
    from: 'Pathanamthitta KSRTC Hub',
    to: 'Kalpetta / Wayanad & Bengaluru Corridor',
    speedLabel: '74 km/h · MC Road / NH-66 Express',
    fareInr: 540,
    accentHex: '#ea580c',
  },
];

/**
 * Animated clickable 3D Vande Bharat Train & KSRTC Swift Bus moving smoothly across Kerala terrain.
 */
function RegionalAnimatedVehicles({
  isSoftwareGl,
  onSelectVehicle,
}: {
  isSoftwareGl: boolean;
  onSelectVehicle: (vehicle: RegionalLiveVehicle) => void;
}) {
  const trainRef = useRef<THREE.Group>(null);
  const busRef = useRef<THREE.Group>(null);

  const { trainCurve, busCurve } = useMemo(() => {
    const tCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.42, 0.58, 4.9),
      new THREE.Vector3(-0.08, 0.56, 3.2),
      new THREE.Vector3(-0.62, 0.54, 1.4),
      new THREE.Vector3(-1.02, 0.56, -0.5),
      new THREE.Vector3(-1.45, 0.58, -2.5),
      new THREE.Vector3(-2.0, 0.58, -4.5),
    ]);
    const bCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, 0.66, 2.75),
      new THREE.Vector3(-0.05, 0.66, 1.55),
      new THREE.Vector3(-0.35, 0.68, 0.25),
      new THREE.Vector3(-0.55, 0.72, -1.25),
      new THREE.Vector3(-0.68, 0.92, -2.65),
    ]);
    return { trainCurve: tCurve, busCurve: bCurve };
  }, []);

  useFrame((state) => {
    const t1 = isSoftwareGl ? 0.35 : (state.clock.elapsedTime * 0.085) % 1;
    const t2 = isSoftwareGl ? 0.62 : (state.clock.elapsedTime * 0.07 + 0.4) % 1;

    if (trainRef.current) {
      const p = trainCurve.getPointAt(t1);
      const next = trainCurve.getPointAt(Math.min(0.999, t1 + 0.02));
      trainRef.current.position.copy(p);
      trainRef.current.lookAt(next);
    }
    if (busRef.current) {
      const p = busCurve.getPointAt(t2);
      const next = busCurve.getPointAt(Math.min(0.999, t2 + 0.02));
      busRef.current.position.copy(p);
      busRef.current.lookAt(next);
    }
  });

  return (
    <group>
      {/* 3D Vande Bharat Express Train */}
      <group
        ref={trainRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectVehicle(REGIONAL_LIVE_VEHICLES[0]);
        }}
      >
        <mesh>
          <boxGeometry args={[0.14, 0.12, 0.56]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.148, 0.036, 0.52]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.65} />
        </mesh>
        {/* Nose beacon */}
        <mesh position={[0, 0.03, 0.3]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* 3D KSRTC Swift Coach */}
      <group
        ref={busRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectVehicle(REGIONAL_LIVE_VEHICLES[1]);
        }}
      >
        <mesh>
          <boxGeometry args={[0.15, 0.13, 0.36]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[0.156, 0.045, 0.3]} />
          <meshStandardMaterial color="#fef08a" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function OverlayProjector({
  targets,
  domRefs,
}: {
  targets: ProjectedPinTarget[];
  domRefs: RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { camera, size } = useThree();
  const scratchRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const map = domRefs.current;
    if (!map) return;
    const v = scratchRef.current;

    for (const target of targets) {
      const el = map[target.key];
      if (!el) continue;

      v.set(target.worldX, target.worldY, target.worldZ);
      v.project(camera);

      const inFront = v.z >= -1 && v.z <= 1;
      const px = (v.x * 0.5 + 0.5) * size.width;
      const py = (-v.y * 0.5 + 0.5) * size.height;

      const inBounds =
        inFront &&
        px > 20 &&
        px < size.width - 20 &&
        py > 72 &&
        py < size.height - 56;

      if (!inBounds) {
        el.style.opacity = '0';
      } else {
        el.style.opacity = '1';
        el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    }
  });

  return null;
}

function CameraController({
  viewMode,
  destination,
  globeFocusCoord,
  resetSignal,
  isSoftwareGl,
}: {
  viewMode: ExplorerViewMode;
  destination: MapRegionNode | undefined;
  globeFocusCoord: { lat: number; lon: number; token: number } | null;
  resetSignal: number;
  isSoftwareGl: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();
  const isAnimatingRef = useRef(false);
  const goalPosRef = useRef(DEFAULT_GLOBE_CAMERA_POS.clone());
  const goalTargetRef = useRef(DEFAULT_GLOBE_TARGET.clone());
  const prevResetRef = useRef(resetSignal);
  const prevViewModeRef = useRef<ExplorerViewMode>(viewMode);
  const prevDestIdRef = useRef<string | null>(destination?.id ?? null);
  const prevGlobeTokenRef = useRef<number | null>(null);

  useEffect(() => {
    if (viewMode === 'globe' && globeFocusCoord && globeFocusCoord.token !== prevGlobeTokenRef.current) {
      prevGlobeTokenRef.current = globeFocusCoord.token;
      const pt = latLonToSpherePoint(globeFocusCoord.lat, globeFocusCoord.lon, 1);
      const normal = new THREE.Vector3(pt.x, pt.y, pt.z).normalize();
      goalPosRef.current.copy(normal.multiplyScalar(11.8));
      goalTargetRef.current.set(0, 0, 0);
      isAnimatingRef.current = true;
      invalidate();
    }
  }, [viewMode, globeFocusCoord, invalidate]);

  useEffect(() => {
    if (viewMode !== prevViewModeRef.current) {
      prevViewModeRef.current = viewMode;
      if (viewMode === 'terrain') {
        camera.position.set(-4.6, 23.0, 23.5);
        if (controlsRef.current) {
          controlsRef.current.target.set(0.4, 0.2, -0.5);
          controlsRef.current.update();
        }
        if (destination) {
          goalTargetRef.current.set(
            destination.centroid.x * 0.7,
            destination.elevation * 0.45,
            destination.centroid.y * 0.7
          );
          goalPosRef.current.set(
            destination.centroid.x * 0.7 - 2.6,
            9.6,
            destination.centroid.y * 0.7 + 9.0
          );
        } else {
          goalPosRef.current.copy(DEFAULT_TERRAIN_CAMERA_POS);
          goalTargetRef.current.copy(DEFAULT_TERRAIN_TARGET);
        }
      } else if (viewMode === 'india') {
        goalPosRef.current.copy(DEFAULT_INDIA_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_INDIA_TARGET);
      } else if (viewMode === 'state') {
        goalPosRef.current.copy(DEFAULT_STATE_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_STATE_TARGET);
      } else {
        goalPosRef.current.copy(DEFAULT_GLOBE_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_GLOBE_TARGET);
      }
      isAnimatingRef.current = true;
      invalidate();
    }
  }, [viewMode, destination, camera, invalidate]);

  useEffect(() => {
    const destId = destination?.id ?? null;
    if (viewMode === 'terrain' && destId && destId !== prevDestIdRef.current && destination) {
      prevDestIdRef.current = destId;
      goalTargetRef.current.set(
        destination.centroid.x * 0.72,
        destination.elevation * 0.45,
        destination.centroid.y * 0.72
      );
      goalPosRef.current.set(
        destination.centroid.x * 0.72 - 2.5,
        9.2,
        destination.centroid.y * 0.72 + 8.4
      );
      isAnimatingRef.current = true;
      invalidate();
    } else if (!destId) {
      prevDestIdRef.current = null;
    }
  }, [viewMode, destination, invalidate]);

  useEffect(() => {
    if (resetSignal !== prevResetRef.current) {
      prevResetRef.current = resetSignal;
      if (viewMode === 'globe') {
        goalPosRef.current.copy(DEFAULT_GLOBE_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_GLOBE_TARGET);
      } else if (viewMode === 'india') {
        goalPosRef.current.copy(DEFAULT_INDIA_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_INDIA_TARGET);
      } else if (viewMode === 'state') {
        goalPosRef.current.copy(DEFAULT_STATE_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_STATE_TARGET);
      } else {
        goalPosRef.current.copy(DEFAULT_TERRAIN_CAMERA_POS);
        goalTargetRef.current.copy(DEFAULT_TERRAIN_TARGET);
      }
      isAnimatingRef.current = true;
      invalidate();
    }
  }, [resetSignal, viewMode, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isAnimatingRef.current) {
      const clampedDelta = Math.min(delta, 0.05);
      const speed = 5.4;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, goalPosRef.current.x, speed, clampedDelta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, goalPosRef.current.y, speed, clampedDelta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, goalPosRef.current.z, speed, clampedDelta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, goalTargetRef.current.x, speed, clampedDelta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, goalTargetRef.current.y, speed, clampedDelta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, goalTargetRef.current.z, speed, clampedDelta);

      controls.update();

      const posDist = camera.position.distanceTo(goalPosRef.current);
      const tgtDist = controls.target.distanceTo(goalTargetRef.current);
      if (posDist < 0.05 && tgtDist < 0.05) {
        camera.position.copy(goalPosRef.current);
        controls.target.copy(goalTargetRef.current);
        controls.update();
        isAnimatingRef.current = false;
      } else if (isSoftwareGl) {
        invalidate();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[
        DEFAULT_GLOBE_TARGET.x,
        DEFAULT_GLOBE_TARGET.y,
        DEFAULT_GLOBE_TARGET.z,
      ]}
      enableDamping
      dampingFactor={0.07}
      minDistance={viewMode === 'globe' ? 6.0 : 5.5}
      maxDistance={viewMode === 'globe' ? 19 : 26}
      minPolarAngle={viewMode === 'globe' ? 0.25 : 0.22}
      maxPolarAngle={viewMode === 'globe' ? Math.PI - 0.25 : Math.PI / 2.18}
      onStart={() => {
        isAnimatingRef.current = false;
      }}
      onChange={() => {
        if (isSoftwareGl) invalidate();
      }}
    />
  );
}

export function Kerala3DMapScene({
  viewMode,
  originId,
  destinationId,
  selectedIndiaStateId = 'kerala',
  showBiodiversity,
  resetSignal,
  isSoftwareGl,
  districtHazardsMap,
  globeOriginPoint,
  globeDestinationPoint,
  globeFocusCoord,
  selectedCountryIso,
  onSelectWorldCountry,
  onSelectIndiaState,
  onSelectIndiaDistrict,
  onSelectLiveFlight,
  onSelectRegionalVehicle,
  onDiveToKerala,
  onSelectDestination,
  onContextLost,
}: Kerala3DMapSceneProps) {
  const [hoveredRegion, setHoveredRegion] = useState<MapRegionNode | null>(null);
  const [globeHoverLabel, setGlobeHoverLabel] = useState<string | null>(null);
  const labelDomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isUnmountingRef = useRef(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const lostHandlerRef = useRef<((e: Event) => void) | null>(null);

  const originNode = useMemo(() => getRegionById(originId), [originId]);
  const destinationNode = useMemo(
    () => (destinationId ? getRegionById(destinationId) : undefined),
    [destinationId]
  );

  const hazardDistrictEntries = useMemo(() => {
    if (!districtHazardsMap) return [];
    return KERALA_DISTRICTS.filter(
      (d) => (districtHazardsMap[d.id]?.length ?? 0) > 0
    ).map((district) => {
      const items = districtHazardsMap[district.id] ?? [];
      return {
        district,
        count: items.length,
        isCritical: items.some((item) => item.isCritical),
      };
    });
  }, [districtHazardsMap]);

  useEffect(() => {
    isUnmountingRef.current = false;
    return () => {
      isUnmountingRef.current = true;
      document.body.style.cursor = 'auto';
      if (canvasElRef.current && lostHandlerRef.current) {
        canvasElRef.current.removeEventListener('webglcontextlost', lostHandlerRef.current);
      }
    };
  }, []);

  const bioBadgeRegions = useMemo(
    () =>
      showBiodiversity && viewMode === 'terrain'
        ? ALL_MAP_REGIONS.filter((r) => FEATURED_BIODIVERSITY_BADGE_IDS.has(r.id))
        : [],
    [showBiodiversity, viewMode]
  );

  const pinTargets = useMemo<ProjectedPinTarget[]>(() => {
    if (viewMode === 'india' || viewMode === 'state') {
      return [];
    }
    if (viewMode === 'globe') {
      return [
        {
          key: 'globe-india-pin',
          worldX: KERALA_GLOBE_NORMAL.x * (GLOBE_RADIUS + 0.96),
          worldY: KERALA_GLOBE_NORMAL.y * (GLOBE_RADIUS + 0.96),
          worldZ: KERALA_GLOBE_NORMAL.z * (GLOBE_RADIUS + 0.96),
        },
      ];
    }

    const list: ProjectedPinTarget[] = [];
    for (const hub of INTERSTATE_GATEWAYS) {
      list.push({
        key: `hub-${hub.id}`,
        worldX: hub.centroid.x,
        worldY: 0.92,
        worldZ: hub.centroid.y,
      });
    }
    if (originNode) {
      list.push({
        key: 'origin-pin',
        worldX: originNode.centroid.x,
        worldY: originNode.elevation + 1.0,
        worldZ: originNode.centroid.y,
      });
    }
    if (destinationNode && destinationNode.id !== originNode?.id) {
      list.push({
        key: 'dest-pin',
        worldX: destinationNode.centroid.x,
        worldY:
          destinationNode.kind === 'gateway'
            ? 1.15
            : destinationNode.elevation + 0.95,
        worldZ: destinationNode.centroid.y,
      });
    }
    for (const bioRegion of bioBadgeRegions) {
      if (bioRegion.id === destinationNode?.id || bioRegion.id === originNode?.id) {
        continue;
      }
      const isGw = bioRegion.kind === 'gateway';
      list.push({
        key: `bio-badge-${bioRegion.id}`,
        worldX: bioRegion.centroid.x + (isGw ? 0.55 : 0.28),
        worldY: isGw ? 0.3 : bioRegion.elevation + 0.65,
        worldZ: bioRegion.centroid.y + (isGw ? 0.55 : -0.14),
      });
    }
    for (const hz of hazardDistrictEntries) {
      list.push({
        key: `hazard-pin-${hz.district.id}`,
        worldX: hz.district.centroid.x - 0.16,
        worldY: hz.district.elevation + 0.92,
        worldZ: hz.district.centroid.y - 0.14,
      });
    }
    if (hoveredRegion) {
      list.push({
        key: 'hover-tooltip',
        worldX: hoveredRegion.centroid.x,
        worldY:
          hoveredRegion.kind === 'gateway'
            ? 1.25
            : hoveredRegion.elevation + 1.15,
        worldZ: hoveredRegion.centroid.y,
      });
    }
    return list;
  }, [
    viewMode,
    originNode,
    destinationNode,
    bioBadgeRegions,
    hazardDistrictEntries,
    hoveredRegion,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Canvas
        dpr={isSoftwareGl ? 1 : [1, 2]}
        shadows={!isSoftwareGl}
        frameloop={isSoftwareGl ? 'demand' : 'always'}
        camera={{
          position: [
            DEFAULT_GLOBE_CAMERA_POS.x,
            DEFAULT_GLOBE_CAMERA_POS.y,
            DEFAULT_GLOBE_CAMERA_POS.z,
          ],
          fov: 42,
          near: 0.1,
          far: 120,
        }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvasElRef.current = canvas;
          const handleLost = (e: Event) => {
            if (isUnmountingRef.current) return;
            e.preventDefault();
            onContextLost();
          };
          lostHandlerRef.current = handleLost;
          canvas.addEventListener('webglcontextlost', handleLost, { once: true });
        }}
        className="w-full h-full block"
      >
        {viewMode === 'globe' && (
          <>
            <color attach="background" args={['#040b18']} />
            <fog attach="fog" args={['#040b18', 24, 58]} />
            <hemisphereLight args={['#e0f2fe', '#020617', 0.95]} />
            <directionalLight position={[14, 10, 14]} intensity={2.25} color="#fffbeb" />
            <directionalLight position={[-12, -4, -10]} intensity={0.42} color="#38bdf8" />
          </>
        )}

        {viewMode === 'terrain' && (
          <>
            <color attach="background" args={['#cbeafe']} />
            <fog attach="fog" args={['#dbeafe', 24, 58]} />
            <hemisphereLight args={['#e0f2fe', '#bbf7d0', 1.2]} />
            <directionalLight
              position={[12, 18, 12]}
              intensity={2.05}
              color="#fffbeb"
              castShadow={!isSoftwareGl}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-bias={-0.0003}
            />
            <directionalLight position={[-10, 10, -8]} intensity={0.75} color="#7dd3fc" />
          </>
        )}

        <StudioEnvironment isSoftwareGl={isSoftwareGl} />

        {viewMode === 'globe' ? (
          <WorldEarth3DGlobe
            isSoftwareGl={isSoftwareGl}
            originPoint={globeOriginPoint}
            destinationPoint={globeDestinationPoint}
            selectedCountryIso={selectedCountryIso}
            onSelectCountry={onSelectWorldCountry}
            onDiveToKerala={onDiveToKerala}
            onHoverLabelChange={setGlobeHoverLabel}
            onSelectLiveFlight={onSelectLiveFlight}
          />
        ) : viewMode === 'india' || viewMode === 'state' ? (
          <IndiaTopographicReliefScene
            mode={viewMode}
            selectedStateId={selectedIndiaStateId}
            isSoftwareGl={isSoftwareGl}
            activeHazardCountByState={{
              kerala: hazardDistrictEntries.reduce((acc, h) => acc + h.count, 0),
            }}
            onSelectState={(st) => onSelectIndiaState?.(st)}
            onSelectDistrictName={(distName, st) => onSelectIndiaDistrict?.(distName, st)}
            onSelectRegionalVehicle={onSelectRegionalVehicle}
          />
        ) : (
          <>
            <ShimmeringCoastalWaters isSoftwareGl={isSoftwareGl} />

            {/* All 14 Lush Green Kerala Districts */}
            <group>
              {KERALA_DISTRICTS.map((district) => (
                <DistrictExtrusion
                  key={district.id}
                  district={district}
                  isOrigin={district.id === originId}
                  isDestination={district.id === destinationId}
                  isHovered={hoveredRegion?.id === district.id}
                  isSoftwareGl={isSoftwareGl}
                  onHover={setHoveredRegion}
                  onSelect={onSelectDestination}
                />
              ))}
            </group>

            {/* 3D Miniature Trees, Palms, Snow-Tipped Western Ghats Mountains & Terracotta Houses */}
            <LushDioramaProps showBiodiversity={showBiodiversity} />

            {/* 6 Inter-State Gateway Islands & Town Clusters */}
            <group>
              {INTERSTATE_GATEWAYS.map((hub) => (
                <GatewayHubNode
                  key={hub.id}
                  hub={hub}
                  isOrigin={hub.id === originId}
                  isDestination={hub.id === destinationId}
                  isHovered={hoveredRegion?.id === hub.id}
                  isSoftwareGl={isSoftwareGl}
                  onHover={setHoveredRegion}
                  onSelect={onSelectDestination}
                />
              ))}
            </group>

            {/* Pulsing Origin Beacon */}
            {originNode && (
              <OriginEmeraldBeacon region={originNode} isSoftwareGl={isSoftwareGl} />
            )}

            {/* Pulsing Live Civic & Police Corridor Hazard Beacons */}
            {hazardDistrictEntries.map((entry) => (
              <HazardWarningBeacon
                key={`hz-beacon-${entry.district.id}`}
                region={entry.district}
                isCritical={entry.isCritical}
                isSoftwareGl={isSoftwareGl}
              />
            ))}

            {/* Animated Clickable 3D Vande Bharat Train & KSRTC Swift Bus */}
            <RegionalAnimatedVehicles
              isSoftwareGl={isSoftwareGl}
              onSelectVehicle={onSelectRegionalVehicle}
            />

            {/* Glowing 3D Route Trajectory Arc */}
            {originNode && destinationNode && originNode.id !== destinationNode.id && (
              <RouteTrajectoryArc
                origin={originNode}
                destination={destinationNode}
                isSoftwareGl={isSoftwareGl}
              />
            )}
          </>
        )}

        <OverlayProjector targets={pinTargets} domRefs={labelDomRefs} />

        <CameraController
          viewMode={viewMode}
          destination={destinationNode}
          globeFocusCoord={globeFocusCoord}
          resetSignal={resetSignal}
          isSoftwareGl={isSoftwareGl}
        />
      </Canvas>

      {/* Projected 3D labels rendered as crisp native React DOM overlays (zero drei <Html>) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-[5]">
        {viewMode === 'globe' && (
          <div
            ref={(el) => {
              labelDomRefs.current['globe-india-pin'] = el;
            }}
            style={{ opacity: 0, willChange: 'transform, opacity' }}
            className="absolute top-0 left-0 whitespace-nowrap"
          >
            <div className="px-3 py-1.5 rounded-full border border-white/80 bg-white/90 text-[#111315] text-xs font-bold shadow-lg">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 align-middle" />
              India &amp; Kerala · Click to Dive
            </div>
          </div>
        )}

        {viewMode === 'globe' && globeHoverLabel && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#111315]/90 border border-white/20 text-white text-xs font-semibold shadow-xl whitespace-nowrap">
            {globeHoverLabel}
          </div>
        )}

        {viewMode === 'terrain' &&
          INTERSTATE_GATEWAYS.map((hub) => {
            const isDest = hub.id === destinationId;
            return (
              <div
                key={`label-hub-${hub.id}`}
                ref={(el) => {
                  labelDomRefs.current[`hub-${hub.id}`] = el;
                }}
                style={{ opacity: 0, willChange: 'transform, opacity' }}
                className="absolute top-0 left-0 whitespace-nowrap"
              >
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-sm ${
                    isDest
                      ? 'bg-sky-600 border-sky-300 text-white'
                      : 'bg-white/95 border-amber-200 text-slate-800'
                  }`}
                >
                  {hub.name}
                </span>
              </div>
            );
          })}

        {viewMode === 'terrain' && originNode && (
          <div
            ref={(el) => {
              labelDomRefs.current['origin-pin'] = el;
            }}
            style={{ opacity: 0, willChange: 'transform, opacity' }}
            className="absolute top-0 left-0 whitespace-nowrap"
          >
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 border border-emerald-200 text-[10px] font-bold text-white shadow-md">
              ORIGIN · {originNode.name}
            </span>
          </div>
        )}

        {viewMode === 'terrain' &&
          destinationNode &&
          destinationNode.id !== originNode?.id && (
            <div
              ref={(el) => {
                labelDomRefs.current['dest-pin'] = el;
              }}
              style={{ opacity: 0, willChange: 'transform, opacity' }}
              className="absolute top-0 left-0 whitespace-nowrap"
            >
              <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 border border-amber-200 text-[10px] font-bold text-white shadow-md">
                DEST · {destinationNode.name}
              </span>
            </div>
          )}

        {viewMode === 'terrain' &&
          bioBadgeRegions.map((region) => {
            if (region.id === destinationNode?.id || region.id === originNode?.id) {
              return null;
            }
            return (
              <div
                key={`label-bio-${region.id}`}
                ref={(el) => {
                  labelDomRefs.current[`bio-badge-${region.id}`] = el;
                }}
                style={{ opacity: 0, willChange: 'transform, opacity' }}
                className="absolute top-0 left-0 whitespace-nowrap"
              >
                <span className="px-2 py-0.5 rounded-lg bg-white/95 border border-emerald-300 text-[9px] font-semibold text-emerald-800 shadow-sm">
                  {region.biodiversity.badgeText}
                </span>
              </div>
            );
          })}

        {viewMode === 'terrain' &&
          hazardDistrictEntries.map((entry) => (
            <div
              key={`label-hazard-${entry.district.id}`}
              ref={(el) => {
                labelDomRefs.current[`hazard-pin-${entry.district.id}`] = el;
              }}
              style={{ opacity: 0, willChange: 'transform, opacity' }}
              className="absolute top-0 left-0 whitespace-nowrap"
            >
              <span
                className={`px-2 py-0.5 rounded-lg text-[9px] font-black border shadow-md ${
                  entry.isCritical
                    ? 'bg-rose-600 border-rose-200 text-white'
                    : 'bg-amber-500 border-amber-200 text-slate-950'
                }`}
              >
                ⚠ {entry.count} HAZARD{entry.count > 1 ? 'S' : ''} · {entry.district.code}
              </span>
            </div>
          ))}

        {viewMode === 'terrain' && hoveredRegion && (
          <div
            ref={(el) => {
              labelDomRefs.current['hover-tooltip'] = el;
            }}
            style={{ opacity: 0, willChange: 'transform, opacity' }}
            className="absolute top-0 left-0 whitespace-nowrap"
          >
            <div className="px-3 py-1.5 rounded-xl bg-white/95 border border-sky-300 shadow-lg text-slate-900">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span>{hoveredRegion.name}</span>
                <span className="text-[10px] font-mono text-sky-700">{hoveredRegion.code}</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">
                {hoveredRegion.biodiversity.badgeText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
