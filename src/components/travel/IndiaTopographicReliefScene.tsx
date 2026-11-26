import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  INDIA_MAJOR_RIVERS,
  INDIA_STATES_AND_UTS,
  fetchIndiaStateTopoJson,
  fetchIndiaWholeTopoJson,
  getIndiaStateByIdOrSlug,
  type GeoFeatureSimple,
  type IndiaBiome,
  type IndiaStateSpec,
} from '../../data/indiaStatesData';
import type { RegionalLiveVehicle } from './Kerala3DMapScene';

export interface IndiaTopographicReliefSceneProps {
  mode: 'india' | 'state';
  selectedStateId: string;
  isSoftwareGl: boolean;
  activeHazardCountByState?: Record<string, number>;
  onSelectState: (state: IndiaStateSpec) => void;
  onSelectDistrictName?: (districtName: string, state: IndiaStateSpec) => void;
  onSelectRegionalVehicle?: (vehicle: RegionalLiveVehicle) => void;
}

function hash2D(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function fbmRelief(x: number, y: number): number {
  let value = 0;
  let amp = 0.55;
  let freq = 0.72;
  for (let i = 0; i < 4; i++) {
    const n =
      Math.sin(x * freq + Math.cos(y * freq * 1.15)) * 0.5 +
      Math.cos(y * freq * 1.25 - Math.sin(x * freq * 0.85)) * 0.5 +
      (hash2D(Math.floor(x * freq), Math.floor(y * freq)) - 0.5) * 0.35;
    value += n * amp;
    freq *= 2.08;
    amp *= 0.48;
  }
  return Math.max(0, value * 0.5 + 0.5);
}

function getBiomePalette(biome: IndiaBiome): {
  low: THREE.Color;
  mid: THREE.Color;
  high: THREE.Color;
  side: string;
} {
  switch (biome) {
    case 'himalayan':
      return {
        low: new THREE.Color('#2D6A4F'),
        mid: new THREE.Color('#6B705C'),
        high: new THREE.Color('#F8FAFC'), // Snow-capped Himalayas
        side: '#6B5B4D',
      };
    case 'desert':
      return {
        low: new THREE.Color('#D9A05B'),
        mid: new THREE.Color('#E8C07D'),
        high: new THREE.Color('#C47F45'),
        side: '#9C7B56',
      };
    case 'ghats':
      return {
        low: new THREE.Color('#2D6A4F'),
        mid: new THREE.Color('#40916C'),
        high: new THREE.Color('#74C69D'),
        side: '#6F5846',
      };
    case 'northeast':
      return {
        low: new THREE.Color('#1B4332'),
        mid: new THREE.Color('#2D6A4F'),
        high: new THREE.Color('#95D5B2'),
        side: '#635343',
      };
    case 'coastal':
    case 'island':
      return {
        low: new THREE.Color('#388E6C'),
        mid: new THREE.Color('#52B788'),
        high: new THREE.Color('#A3C9A8'),
        side: '#7A6855',
      };
    case 'deccan':
      return {
        low: new THREE.Color('#4A7C59'),
        mid: new THREE.Color('#809671'),
        high: new THREE.Color('#B59E7A'),
        side: '#7D6652',
      };
    default: // plains
      return {
        low: new THREE.Color('#3D7A52'),
        mid: new THREE.Color('#669E6B'),
        high: new THREE.Color('#A7C98F'),
        side: '#7D6C58',
      };
  }
}

function buildTopographicSlabGeometry(
  rings: Array<Array<[number, number]>>,
  project: (lon: number, lat: number) => [number, number],
  slabDepth: number,
  reliefScale: number,
  biome: IndiaBiome
): THREE.BufferGeometry | null {
  const shapes: THREE.Shape[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const step = ring.length > 90 ? Math.ceil(ring.length / 80) : 1;
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < ring.length; i += step) {
      const [lon, lat] = ring[i];
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const [px, py] = project(lon, lat);
      pts.push(new THREE.Vector2(px, py));
    }
    if (pts.length >= 3) {
      shapes.push(new THREE.Shape(pts));
    }
  }
  if (shapes.length === 0) return null;

  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: slabDepth,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.032,
    bevelSegments: 2,
    curveSegments: 3,
  });
  // Rotate so XY becomes XZ plane and extrusion rises upward along +Y
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const palette = getBiomePalette(biome);
  const sideCol = new THREE.Color(palette.side);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);

    const isTopSurface = vy > slabDepth * 0.72;
    if (isTopSurface) {
      const ridge = fbmRelief(vx * 1.15, vz * 1.15);
      const disp = ridge * reliefScale;
      pos.setY(i, vy + disp);

      if (ridge > 0.72) {
        tmpCol.copy(palette.mid).lerp(palette.high, Math.min(1, (ridge - 0.72) / 0.28));
      } else {
        tmpCol.copy(palette.low).lerp(palette.mid, Math.min(1, ridge / 0.72));
      }
    } else {
      // Geological earth cross-section side walls
      const strata = 0.86 + 0.14 * Math.sin(vy * 22);
      tmpCol.copy(sideCol).multiplyScalar(strata);
    }

    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function StateSlabMesh({
  featureItem,
  stateSpec,
  project,
  isSelected,
  isHovered,
  slabDepth,
  reliefScale,
  onHover,
  onClick,
}: {
  featureItem: GeoFeatureSimple;
  stateSpec: IndiaStateSpec;
  project: (lon: number, lat: number) => [number, number];
  isSelected: boolean;
  isHovered: boolean;
  slabDepth: number;
  reliefScale: number;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(
    () =>
      buildTopographicSlabGeometry(
        featureItem.rings,
        project,
        slabDepth,
        reliefScale,
        stateSpec.biome
      ),
    [featureItem.rings, project, slabDepth, reliefScale, stateSpec.biome]
  );

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  useFrame((_state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const targetY = isSelected ? 0.34 : isHovered ? 0.24 : 0;
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 9, delta);
  });

  if (!geometry) return null;

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(featureItem.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.62}
          metalness={0.05}
          emissive={isSelected ? '#4F5BD5' : isHovered ? '#2A9D8F' : '#000000'}
          emissiveIntensity={isSelected ? 0.24 : isHovered ? 0.14 : 0}
        />
      </mesh>
    </group>
  );
}

/** Animated composite 3D vehicle gliding across the State Topography */
function TopographicAnimatedVehicle({
  startPos,
  endPos,
  color,
  altitude,
  speed,
  isPlane,
  isSoftwareGl,
  onClick,
}: {
  startPos: [number, number, number];
  endPos: [number, number, number];
  color: string;
  altitude: number;
  speed: number;
  isPlane: boolean;
  isSoftwareGl: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const mid = new THREE.Vector3(
      (startPos[0] + endPos[0]) * 0.5,
      Math.max(startPos[1], endPos[1]) + altitude,
      (startPos[2] + endPos[2]) * 0.5
    );
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...startPos),
      mid,
      new THREE.Vector3(...endPos)
    );
  }, [startPos, endPos, altitude]);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.025, 6, false), [curve]);
  useEffect(() => () => tubeGeo.dispose(), [tubeGeo]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = isSoftwareGl ? 0.42 : (state.clock.elapsedTime * speed) % 1;
    const pos = curve.getPointAt(t);
    const next = curve.getPointAt(Math.min(0.999, t + 0.02));
    g.position.copy(pos);
    g.lookAt(next);
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
        {isPlane ? (
          <group scale={0.28}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.16, 0.9, 6, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.35} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[1.4, 0.05, 0.3]} />
              <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.22, -0.45]} castShadow>
              <boxGeometry args={[0.06, 0.38, 0.28]} />
              <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
          </group>
        ) : (
          <group scale={0.25}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.34, 1.35]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.14, 0.2]} castShadow>
              <boxGeometry args={[0.4, 0.14, 0.85]} />
              <meshStandardMaterial color="#e0f2fe" roughness={0.15} metalness={0.5} />
            </mesh>
            <mesh position={[0, -0.18, 0]}>
              <boxGeometry args={[0.42, 0.08, 1.3]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

export function IndiaTopographicReliefScene({
  mode,
  selectedStateId,
  isSoftwareGl,
  activeHazardCountByState = {},
  onSelectState,
  onSelectDistrictName,
  onSelectRegionalVehicle,
}: IndiaTopographicReliefSceneProps) {
  const [indiaFeatures, setIndiaFeatures] = useState<GeoFeatureSimple[]>([]);
  const [stateFeatures, setStateFeatures] = useState<GeoFeatureSimple[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedState = useMemo(
    () => getIndiaStateByIdOrSlug(selectedStateId),
    [selectedStateId]
  );

  useEffect(() => {
    let cancelled = false;
    if (mode === 'india') {
      void fetchIndiaWholeTopoJson().then((list) => {
        if (!cancelled) setIndiaFeatures(list);
      });
    } else {
      void fetchIndiaStateTopoJson(selectedState).then((list) => {
        if (!cancelled) setStateFeatures(list);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, selectedState]);

  // Whole India projection centered around [lon: 82.0, lat: 21.8]
  const wholeIndiaProject = useMemo(() => {
    return (lon: number, lat: number): [number, number] => [
      (lon - 82.2) * 0.42,
      (lat - 21.5) * 0.42,
    ];
  }, []);

  // State Topography auto-fit bounding projection
  const stateProjection = useMemo(() => {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    const source = stateFeatures.length > 0 ? stateFeatures : [
      { id: selectedState.id, name: selectedState.name, rings: [selectedState.fallbackPolygon] },
    ];
    for (const f of source) {
      for (const ring of f.rings) {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
    if (!Number.isFinite(minLon)) {
      minLon = selectedState.lon - 2;
      maxLon = selectedState.lon + 2;
      minLat = selectedState.lat - 2;
      maxLat = selectedState.lat + 2;
    }
    const cLon = (minLon + maxLon) * 0.5;
    const cLat = (minLat + maxLat) * 0.5;
    const span = Math.max(maxLon - minLon, maxLat - minLat, 0.8);
    const scale = 8.4 / span;
    return (lon: number, lat: number): [number, number] => [
      (lon - cLon) * scale,
      (lat - cLat) * scale,
    ];
  }, [stateFeatures, selectedState]);

  // River TubeGeometries for Whole India Relief
  const riverGeos = useMemo(() => {
    if (mode !== 'india') return [];
    return INDIA_MAJOR_RIVERS.map((river) => {
      const pts = river.points.map(([lon, lat]) => {
        const [x, y] = wholeIndiaProject(lon, lat);
        return new THREE.Vector3(x, 0.72, -y);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      return {
        id: river.id,
        geo: new THREE.TubeGeometry(curve, 36, 0.048, 8, false),
      };
    });
  }, [mode, wholeIndiaProject]);

  useEffect(() => {
    return () => {
      riverGeos.forEach((r) => r.geo.dispose());
    };
  }, [riverGeos]);

  // Showcase major national pins on Whole India Relief
  const nationalPins = useMemo(
    () => [
      { name: 'New Delhi', stateId: 'delhi', lon: 77.21, lat: 28.61 },
      { name: 'Mumbai', stateId: 'maharashtra', lon: 72.87, lat: 19.07 },
      { name: 'Bengaluru', stateId: 'karnataka', lon: 77.59, lat: 12.97 },
      { name: 'Chennai', stateId: 'tamil-nadu', lon: 80.27, lat: 13.08 },
      { name: 'Pathanamthitta', stateId: 'kerala', lon: 76.78, lat: 9.26 },
      { name: 'Thiruvananthapuram', stateId: 'kerala', lon: 76.93, lat: 8.52 },
      { name: 'Guwahati', stateId: 'assam', lon: 91.73, lat: 26.14 },
      { name: 'Kolkata', stateId: 'west-bengal', lon: 88.36, lat: 22.57 },
      { name: 'Leh', stateId: 'ladakh', lon: 77.57, lat: 34.15 },
      { name: 'Jaipur', stateId: 'rajasthan', lon: 75.78, lat: 26.91 },
    ],
    []
  );

  // State-level moving vehicles (3D Flight + Express Rail)
  const stateVehicleCoords = useMemo(() => {
    const cities = selectedState.majorCities;
    const c1 = cities[0] ?? { name: selectedState.capital, lat: selectedState.lat, lon: selectedState.lon };
    const c2 = cities[1] ?? {
      name: selectedState.districts[1] || `${selectedState.name} Hub`,
      lat: selectedState.lat + 0.7,
      lon: selectedState.lon - 0.6,
    };
    const [x1, y1] = stateProjection(c1.lon, c1.lat);
    const [x2, y2] = stateProjection(c2.lon, c2.lat);
    return {
      c1,
      c2,
      p1: [x1, 1.05, -y1] as [number, number, number],
      p2: [x2, 1.05, -y2] as [number, number, number],
    };
  }, [selectedState, stateProjection]);

  const activeList =
    mode === 'india'
      ? indiaFeatures
      : stateFeatures.length > 0
        ? stateFeatures
        : [{ id: selectedState.id, name: selectedState.name, rings: [selectedState.fallbackPolygon] }];

  return (
    <group>
      {/* Warm Sunlit Alabaster Studio Backdrop & Horizon Fog */}
      <color attach="background" args={['#F5F3EE']} />
      <fog attach="fog" args={['#F5F3EE', 22, 48]} />

      {/* Studio 3-Point Warm Key + Cool Hemisphere Fill */}
      <hemisphereLight args={['#e0f2fe', '#d6cbb8', 1.1]} />
      <directionalLight
        position={[11, 18, 12]}
        intensity={1.65}
        color="#fff6e6"
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-10, 8, -9]} intensity={0.45} color="#bae6fd" />

      {/* Clean Sunlit Alabaster Studio Pedestal Table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <circleGeometry args={[18, 64]} />
        <meshStandardMaterial color="#EFECE6" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Subtle Contact Ground Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]}>
        <ringGeometry args={[7.1, 7.25, 72]} />
        <meshBasicMaterial color="#d8d2c7" transparent opacity={0.65} />
      </mesh>

      {/* Extruded 3D Topographic Relief Cutout Slabs */}
      {activeList.map((feat) => {
        const matchedState =
          mode === 'india' ? getIndiaStateByIdOrSlug(feat.name) : selectedState;
        const isSelected = mode === 'india' && matchedState.id === selectedState.id;
        return (
          <StateSlabMesh
            key={feat.id}
            featureItem={feat}
            stateSpec={matchedState}
            project={mode === 'india' ? wholeIndiaProject : stateProjection}
            isSelected={isSelected}
            isHovered={hoveredId === feat.id}
            slabDepth={mode === 'india' ? 0.52 : 0.72}
            reliefScale={
              mode === 'india'
                ? matchedState.peakElevation * 0.65
                : Math.max(0.55, selectedState.peakElevation * 0.9)
            }
            onHover={setHoveredId}
            onClick={() => {
              if (mode === 'india') {
                onSelectState(matchedState);
              } else {
                onSelectDistrictName?.(feat.name, selectedState);
              }
            }}
          />
        );
      })}

      {/* Turquoise / Cerulean River Channels on Whole India Relief */}
      {mode === 'india' &&
        riverGeos.map((r) => (
          <mesh key={r.id} geometry={r.geo}>
            <meshStandardMaterial
              color="#2A9D8F"
              emissive="#48CAE4"
              emissiveIntensity={0.28}
              roughness={0.22}
              metalness={0.25}
            />
          </mesh>
        ))}

      {/* Winding Turquoise River / Backwater Channel inside State Topography */}
      {mode === 'state' && (
        <mesh position={[0, 0.85, 0]} rotation={[0, 0.3, 0]}>
          <tubeGeometry
            args={[
              new THREE.CatmullRomCurve3([
                new THREE.Vector3(-2.1, 0.05, -1.6),
                new THREE.Vector3(-0.6, 0.02, -0.3),
                new THREE.Vector3(0.8, 0.0, 0.8),
                new THREE.Vector3(2.0, -0.02, 1.8),
              ]),
              32,
              0.055,
              8,
              false,
            ]}
          />
          <meshStandardMaterial
            color="#2A9D8F"
            emissive="#48CAE4"
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>
      )}

      {/* National Capital & Major City Typographic Pins (Whole India Mode) */}
      {mode === 'india' &&
        nationalPins.map((pin) => {
          const [x, y] = wholeIndiaProject(pin.lon, pin.lat);
          const hazardCount = activeHazardCountByState[pin.stateId] ?? 0;
          return (
            <group key={pin.name} position={[x, 0.96, -y]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.42, 10]} />
                <meshStandardMaterial color={hazardCount > 0 ? '#e11d48' : '#111315'} />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <sphereGeometry args={[0.09, 12, 12]} />
                <meshStandardMaterial
                  color={hazardCount > 0 ? '#f43f5e' : '#4F5BD5'}
                  emissive={hazardCount > 0 ? '#f43f5e' : '#4F5BD5'}
                  emissiveIntensity={0.45}
                />
              </mesh>
              <Html
                position={[0, 0.45, 0]}
                center
                distanceFactor={14}
                style={{ pointerEvents: 'none' }}
              >
                <div className="px-2 py-0.5 rounded-full bg-white/90 border border-black/10 shadow-sm text-[10px] font-bold text-[#111315] whitespace-nowrap">
                  {pin.name}
                  {hazardCount > 0 ? ` · ⚠ ${hazardCount}` : ''}
                </div>
              </Html>
            </group>
          );
        })}

      {/* State City Pins + Moving 3D Flight & Express Train (State Topography Mode) */}
      {mode === 'state' && (
        <>
          {selectedState.majorCities.map((city) => {
            const [cx, cy] = stateProjection(city.lon, city.lat);
            return (
              <group key={city.name} position={[cx, 1.18, -cy]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.52, 10]} />
                  <meshStandardMaterial color={city.isCapital ? '#4F5BD5' : '#111315'} />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                  <sphereGeometry args={[0.11, 14, 14]} />
                  <meshStandardMaterial
                    color={city.isCapital ? '#4F5BD5' : '#2A9D8F'}
                    emissive={city.isCapital ? '#4F5BD5' : '#2A9D8F'}
                    emissiveIntensity={0.4}
                  />
                </mesh>
                <Html
                  position={[0, 0.56, 0]}
                  center
                  distanceFactor={13}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="px-2.5 py-0.5 rounded-full bg-white/92 border border-black/10 shadow-md text-[10.5px] font-extrabold text-[#111315] whitespace-nowrap">
                    {city.isCapital ? '★ ' : ''}
                    {city.name}
                  </div>
                </Html>
              </group>
            );
          })}

          {/* Moving 3D Domestic Flight across State */}
          <TopographicAnimatedVehicle
            startPos={stateVehicleCoords.p1}
            endPos={stateVehicleCoords.p2}
            color="#4F5BD5"
            altitude={1.55}
            speed={0.09}
            isPlane={true}
            isSoftwareGl={isSoftwareGl}
            onClick={() =>
              onSelectRegionalVehicle?.({
                id: `state-air-${selectedState.code}`,
                channel: 'irctc',
                name: `IndiGo Regional Hop · ${selectedState.name}`,
                serviceCode: `6E-${selectedState.code}21`,
                vehicleModel: 'ATR 72-600 / Airbus A320neo',
                from: stateVehicleCoords.c1.name,
                to: stateVehicleCoords.c2.name,
                fareInr: 3450,
                speedLabel: 'FL240 · 420 kts · Live',
                accentHex: '#4F5BD5',
              })
            }
          />

          {/* Moving 3D Vande Bharat Express across State */}
          <TopographicAnimatedVehicle
            startPos={stateVehicleCoords.p2}
            endPos={stateVehicleCoords.p1}
            color="#0284c7"
            altitude={0.28}
            speed={0.065}
            isPlane={false}
            isSoftwareGl={isSoftwareGl}
            onClick={() =>
              onSelectRegionalVehicle?.({
                id: `state-rail-${selectedState.code}`,
                channel: 'irctc',
                name: `Vande Bharat Express · ${selectedState.name}`,
                serviceCode: `VB-${selectedState.code}01`,
                vehicleModel: 'IRCTC Semi-High-Speed 8-Car',
                from: stateVehicleCoords.c2.name,
                to: stateVehicleCoords.c1.name,
                fareInr: 760,
                speedLabel: '126 km/h · On Time',
                accentHex: '#0284c7',
              })
            }
          />
        </>
      )}
    </group>
  );
}
