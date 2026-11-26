import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Layers, RotateCcw } from 'lucide-react';
import type { CabinLayoutSpec, CabinSeatItem } from '../../shared/seatLayout';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

interface SeatPicker3DCanvasProps {
  layout: CabinLayoutSpec;
  selectedSeatIds: string[];
  isSoftwareGl: boolean;
  onToggleSeat: (seat: CabinSeatItem) => void;
}

interface SeatMesh3DProps {
  seat: CabinSeatItem;
  isSelected: boolean;
  isHovered: boolean;
  isSoftwareGl: boolean;
  onHover: (seat: CabinSeatItem | null) => void;
  onToggle: (seat: CabinSeatItem) => void;
}

function SeatMesh3D({
  seat,
  isSelected,
  isHovered,
  isSoftwareGl,
  onHover,
  onToggle,
}: SeatMesh3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { invalidate } = useThree();
  const isBooked = seat.status === 'booked';

  const targetLift = isSelected ? 0.1 : isHovered && !isBooked ? 0.06 : 0;

  useEffect(() => {
    invalidate();
  }, [targetLift, isSelected, isHovered, invalidate]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const clamped = Math.min(delta, 0.05);
    const goalY = seat.y + targetLift;
    if (Math.abs(g.position.y - goalY) > 0.002) {
      g.position.y = THREE.MathUtils.damp(g.position.y, goalY, 12, clamped);
      if (isSoftwareGl) invalidate();
    } else if (g.position.y !== goalY) {
      g.position.y = goalY;
    }
  });

  // Color coding: Emerald Green = Available, Glowing Amber/Gold = Selected, Slate Gray = Booked
  const seatColor = isBooked
    ? '#94a3b8'
    : isSelected
      ? '#f59e0b'
      : isHovered
        ? '#34d399'
        : '#10b981';

  const emissiveColor = isBooked
    ? '#475569'
    : isSelected
      ? '#f59e0b'
      : isHovered
        ? '#10b981'
        : '#047857';

  const emissiveIntensity = isBooked ? 0.05 : isSelected ? 0.65 : isHovered ? 0.35 : 0.12;

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = isBooked ? 'not-allowed' : 'pointer';
    onHover(seat);
    invalidate();
  };

  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    onHover(null);
    invalidate();
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isBooked) {
      onToggle(seat);
      invalidate();
    }
  };

  if (seat.kind === 'berth') {
    return (
      <group
        ref={groupRef}
        position={[seat.x, seat.y, seat.z]}
        rotation={[0, seat.rotY, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {/* Cushioned Indian Railways berth mattress */}
        <mesh castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
          <boxGeometry args={[seat.width, 0.12, seat.depth]} />
          <meshStandardMaterial
            color={seatColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.5}
          />
        </mesh>
        {/* White pillow block at window end */}
        <mesh
          position={[
            seat.column === 'Side' ? 0 : -seat.width * 0.34,
            0.09,
            seat.column === 'Side' ? -seat.depth * 0.34 : 0,
          ]}
        >
          <boxGeometry
            args={[
              seat.column === 'Side' ? seat.width * 0.65 : 0.24,
              0.06,
              seat.column === 'Side' ? 0.24 : seat.depth * 0.65,
            ]}
          />
          <meshStandardMaterial color={isSelected ? '#fef3c7' : '#f8fafc'} roughness={0.8} />
        </mesh>
        {/* Stainless berth frame trim */}
        <mesh position={[0, -0.07, 0]}>
          <boxGeometry args={[seat.width + 0.04, 0.03, seat.depth + 0.04]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={groupRef}
      position={[seat.x, seat.y, seat.z]}
      rotation={[0, seat.rotY, 0]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Seat base cushion */}
      <mesh position={[0, 0, 0]} castShadow={!isSoftwareGl} receiveShadow={!isSoftwareGl}>
        <boxGeometry args={[seat.width, 0.13, seat.depth]} />
        <meshStandardMaterial
          color={seatColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.48}
        />
      </mesh>
      {/* Angled reclining backrest */}
      <mesh position={[0, 0.24, seat.depth * 0.36]} rotation={[-0.14, 0, 0]} castShadow={!isSoftwareGl}>
        <boxGeometry args={[seat.width, 0.44, 0.11]} />
        <meshStandardMaterial
          color={seatColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.48}
        />
      </mesh>
      {/* Headrest cushion */}
      <mesh position={[0, 0.49, seat.depth * 0.4]}>
        <boxGeometry args={[seat.width * 0.72, 0.12, 0.12]} />
        <meshStandardMaterial
          color={isSelected ? '#fde68a' : isBooked ? '#cbd5e1' : '#a7f3d0'}
          roughness={0.55}
        />
      </mesh>
      {/* Side armrests */}
      <mesh position={[-seat.width * 0.48, 0.1, 0.02]}>
        <boxGeometry args={[0.045, 0.07, seat.depth * 0.75]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      <mesh position={[seat.width * 0.48, 0.1, 0.02]}>
        <boxGeometry args={[0.045, 0.07, seat.depth * 0.75]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
    </group>
  );
}

function VehicleShell3D({ layout }: { layout: CabinLayoutSpec }) {
  const halfW = layout.cabinWidth / 2;
  const halfL = layout.cabinLength / 2;

  if (layout.channel === 'flight') {
    const liveryAccent = layout.liveryAccentHex || '#4F5BD5';
    return (
      <group>
        {/* Sleek airplane cabin floor */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[layout.cabinWidth, 0.12, layout.cabinLength]} />
          <meshStandardMaterial color="#f5f4f0" roughness={0.65} />
        </mesh>
        {/* Airline-livery colored center aisle carpet */}
        <mesh position={[0, 0.106, 0.2]}>
          <boxGeometry args={[0.68, 0.015, layout.cabinLength - 0.8]} />
          <meshStandardMaterial color={liveryAccent} roughness={0.7} />
        </mesh>
        {/* Left & Right fuselage walls with airline livery accent trim + sky-blue window strips */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (halfW - 0.07), 0.44, 0]}>
            <mesh>
              <boxGeometry args={[0.14, 0.72, layout.cabinLength]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
            {/* Airline Livery Exterior/Interior Accent Stripe */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.16, 0.14, layout.cabinLength]} />
              <meshStandardMaterial color={liveryAccent} roughness={0.45} />
            </mesh>
            {/* Glowing cabin windows */}
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} position={[side * -0.075, 0.08, -3.5 + i * 0.9]}>
                <boxGeometry args={[0.02, 0.24, 0.36]} />
                <meshStandardMaterial
                  color="#7dd3fc"
                  emissive="#38bdf8"
                  emissiveIntensity={0.45}
                />
              </mesh>
            ))}
          </group>
        ))}
        {/* Front Cockpit Nose Cone & Forward Direction Indicator (-Z) */}
        <group position={[0, 0.22, -halfL - 0.55]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[halfW * 0.65, 1.5, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.15} />
          </mesh>
          {/* Cockpit windshield visor */}
          <mesh position={[0, 0.28, 0.1]}>
            <boxGeometry args={[1.65, 0.26, 0.45]} />
            <meshStandardMaterial color={liveryAccent} roughness={0.2} metalness={0.4} />
          </mesh>
        </group>
      </group>
    );
  }

  if (layout.channel === 'irctc') {
    return (
      <group>
        {/* Indian Railways coach floor */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[layout.cabinWidth, 0.12, layout.cabinLength]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.72} />
        </mesh>
        {/* Corridor runner */}
        <mesh position={[layout.isSleeperBerth ? 0.34 : 0.06, 0.106, 0]}>
          <boxGeometry args={[0.72, 0.015, layout.cabinLength - 0.5]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.75} />
        </mesh>
        {/* Left & right rail coach walls with windows */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (halfW - 0.07), 0.72, 0]}>
            <mesh>
              <boxGeometry args={[0.14, 1.32, layout.cabinLength]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.55} />
            </mesh>
            {Array.from({ length: 4 }, (_, i) => (
              <mesh key={i} position={[side * -0.075, 0.14, -3.5 + i * 2.35]}>
                <boxGeometry args={[0.02, 0.52, 1.15]} />
                <meshStandardMaterial
                  color="#bae6fd"
                  emissive="#38bdf8"
                  emissiveIntensity={0.35}
                />
              </mesh>
            ))}
          </group>
        ))}
        {/* Compartment partition dividers & stainless support stanchions for Sleeper/AC */}
        {layout.isSleeperBerth &&
          [-3.7, -1.25, 1.25, 3.7].map((zPos, i) => (
            <group key={i}>
              <mesh position={[-1.02, 0.76, zPos]}>
                <boxGeometry args={[1.65, 1.4, 0.06]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.5} />
              </mesh>
              <mesh position={[-0.22, 0.76, zPos]}>
                <cylinderGeometry args={[0.026, 0.026, 1.44, 8]} />
                <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.25} />
              </mesh>
            </group>
          ))}
        {/* Front engine direction bumper */}
        <mesh position={[0, 0.25, -halfL - 0.12]}>
          <boxGeometry args={[layout.cabinWidth, 0.42, 0.22]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>
      </group>
    );
  }

  // KSRTC Bus Coach Shell with Front Driver Cabin
  return (
    <group>
      {/* Bus coach floor */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[layout.cabinWidth, 0.12, layout.cabinLength]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.68} />
      </mesh>
      {/* Center aisle strip */}
      <mesh position={[0, 0.106, 0.4]}>
        <boxGeometry args={[0.54, 0.015, layout.cabinLength - 1.6]} />
        <meshStandardMaterial color="#10b981" roughness={0.75} />
      </mesh>
      {/* Side bus body walls (KSRTC crimson/amber trim + windows) */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (halfW - 0.06), 0.45, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.76, layout.cabinLength]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[0.14, 0.16, layout.cabinLength]} />
            <meshStandardMaterial color="#ea580c" roughness={0.45} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[side * -0.065, 0.12, -3.1 + i * 1.15]}>
              <boxGeometry args={[0.02, 0.34, 0.82]} />
              <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Front Driver Cabin (-Z) */}
      <group position={[0, 0.12, -halfL + 0.72]}>
        {/* Dashboard console */}
        <mesh position={[0, 0.36, -0.45]}>
          <boxGeometry args={[layout.cabinWidth - 0.3, 0.48, 0.46]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        {/* Front panoramic windshield glass */}
        <mesh position={[0, 0.78, -0.62]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[layout.cabinWidth - 0.2, 0.56, 0.05]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.55} roughness={0.15} />
        </mesh>
        {/* Driver seat (right-hand drive India!) */}
        <mesh position={[0.92, 0.22, 0.18]}>
          <boxGeometry args={[0.48, 0.36, 0.45]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        {/* Steering wheel */}
        <mesh position={[0.92, 0.56, -0.18]} rotation={[0.6, 0, 0]}>
          <torusGeometry args={[0.2, 0.032, 8, 20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function SeatCameraController({
  channel,
  resetTick,
  isSoftwareGl,
}: {
  channel: string;
  resetTick: number;
  isSoftwareGl: boolean;
}) {
  const { camera, invalidate } = useThree();
  const prevRef = useRef({ channel, resetTick });

  useEffect(() => {
    if (prevRef.current.channel !== channel || prevRef.current.resetTick !== resetTick) {
      prevRef.current = { channel, resetTick };
      if (channel === 'irctc') {
        camera.position.set(5.4, 5.2, 6.2);
      } else if (channel === 'flight') {
        camera.position.set(4.8, 6.4, 6.6);
      } else {
        camera.position.set(4.4, 5.8, 6.0);
      }
      camera.lookAt(0, 0.3, 0);
      invalidate();
    }
  }, [channel, resetTick, camera, invalidate]);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3.6}
      maxDistance={15}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI / 2.05}
      onChange={() => {
        if (isSoftwareGl) invalidate();
      }}
    />
  );
}

function Seat2DFallbackGrid({
  layout,
  selectedSeatIds,
  onToggleSeat,
}: {
  layout: CabinLayoutSpec;
  selectedSeatIds: string[];
  onToggleSeat: (seat: CabinSeatItem) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const rows = useMemo(() => {
    const grouped = new Map<number, CabinSeatItem[]>();
    for (const s of layout.seats) {
      const list = grouped.get(s.row) ?? [];
      list.push(s);
      grouped.set(s.row, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [layout.seats]);

  return (
    <div className="w-full h-full overflow-y-auto p-3.5 bg-gradient-to-b from-sky-50 to-white">
      <div className="text-center text-[10px] font-mono uppercase tracking-wider text-sky-700 bg-sky-100/80 border border-sky-200 rounded-lg py-1 mb-3">
        {layout.channel === 'flight'
          ? '▲ Front Cockpit Direction ▲'
          : layout.channel === 'ksrtc'
            ? '▲ Front Driver Cabin ▲'
            : '▲ Front Locomotive Direction ▲'}
      </div>

      <div className="space-y-2 max-w-[340px] mx-auto">
        {rows.map(([rowNum, items]) => (
          <div
            key={rowNum}
            className="flex items-center justify-between gap-1.5 bg-white/90 border border-slate-200/80 rounded-xl px-2.5 py-1.5"
          >
            <span className="text-[10px] font-mono font-bold text-slate-400 w-7 shrink-0">
              {layout.isSleeperBerth ? `B${rowNum}` : `R${rowNum}`}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 justify-end flex-1">
              {items.map((seat) => {
                const isSelected = selectedSet.has(seat.id);
                const isBooked = seat.status === 'booked';
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isBooked}
                    onClick={() => onToggleSeat(seat)}
                    title={seat.displayLabel}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                      isBooked
                        ? 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                        : isSelected
                          ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-sm cursor-pointer scale-105'
                          : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600 text-white cursor-pointer'
                    }`}
                  >
                    {seat.code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatPicker3DCanvas({
  layout,
  selectedSeatIds,
  isSoftwareGl,
  onToggleSeat,
}: SeatPicker3DCanvasProps) {
  const [hoveredSeat, setHoveredSeat] = useState<CabinSeatItem | null>(null);
  const [use2DDeck, setUse2DDeck] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  const isUnmountingRef = useRef(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const lostHandlerRef = useRef<((e: Event) => void) | null>(null);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

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

  const availableCount = useMemo(
    () => layout.seats.filter((s) => s.status === 'available').length,
    [layout.seats]
  );

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-slate-200/90 bg-gradient-to-b from-sky-50 via-white to-emerald-50/40 shadow-inner">
      {/* Cabin Top Bar */}
      <div className="px-3.5 py-2.5 bg-white/95 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{layout.title}</p>
          <p className="text-[11px] text-slate-500 truncate">{layout.subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!use2DDeck && (
            <button
              type="button"
              onClick={() => setResetTick((t) => t + 1)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-semibold text-sky-800 cursor-pointer"
              title="Reset 3D cabin angle"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setUse2DDeck((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
          >
            <Layers className="w-3 h-3" aria-hidden="true" />
            {use2DDeck ? '3D Cabin' : '2D Deck'}
          </button>
        </div>
      </div>

      {/* 3D Interactive Canvas OR 2D Deck Fallback */}
      <div className="relative flex-1 min-h-[290px] sm:min-h-[340px]">
        {use2DDeck ? (
          <Seat2DFallbackGrid
            layout={layout}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={onToggleSeat}
          />
        ) : (
          <WebGLErrorBoundary
            fallback={() => (
              <Seat2DFallbackGrid
                layout={layout}
                selectedSeatIds={selectedSeatIds}
                onToggleSeat={onToggleSeat}
              />
            )}
          >
            <Canvas
              dpr={isSoftwareGl ? 1 : [1, 2]}
              shadows={!isSoftwareGl}
              frameloop={isSoftwareGl ? 'demand' : 'always'}
              camera={{ position: [4.8, 5.8, 6.2], fov: 40, near: 0.1, far: 80 }}
              gl={{ antialias: !isSoftwareGl, powerPreference: 'high-performance' }}
              onCreated={({ gl }) => {
                const canvas = gl.domElement;
                canvasElRef.current = canvas;
                const handleLost = (e: Event) => {
                  if (isUnmountingRef.current) return;
                  e.preventDefault();
                  setUse2DDeck(true);
                };
                lostHandlerRef.current = handleLost;
                canvas.addEventListener('webglcontextlost', handleLost, { once: true });
              }}
              className="w-full h-full block"
            >
              <color attach="background" args={['#e0f2fe']} />
              <hemisphereLight args={['#ffffff', '#bae6fd', 1.15]} />
              <directionalLight position={[6, 12, 8]} intensity={1.7} color="#fffbeb" />
              <directionalLight position={[-6, 8, -6]} intensity={0.7} color="#7dd3fc" />

              <VehicleShell3D layout={layout} />

              {layout.seats.map((seat) => (
                <SeatMesh3D
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSet.has(seat.id)}
                  isHovered={hoveredSeat?.id === seat.id}
                  isSoftwareGl={isSoftwareGl}
                  onHover={setHoveredSeat}
                  onToggle={onToggleSeat}
                />
              ))}

              <SeatCameraController
                channel={layout.channel}
                resetTick={resetTick}
                isSoftwareGl={isSoftwareGl}
              />
            </Canvas>
          </WebGLErrorBoundary>
        )}

        {/* Hover / Selection floating readout pill */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-white/95 border border-sky-200 text-[11px] font-semibold text-slate-800 shadow-sm">
            {hoveredSeat ? (
              <span>
                <span className="text-sky-700 font-mono">{hoveredSeat.displayLabel}</span>
                {' · '}
                {hoveredSeat.status === 'booked' ? (
                  <span className="text-slate-500">Already Booked</span>
                ) : selectedSet.has(hoveredSeat.id) ? (
                  <span className="text-amber-600">Selected (click to deselect)</span>
                ) : (
                  <span className="text-emerald-600">
                    Available{hoveredSeat.surchargeInr > 0 ? ` (+₹${hoveredSeat.surchargeInr})` : ''}
                  </span>
                )}
              </span>
            ) : (
              <span>
                Click any green 3D {layout.isSleeperBerth ? 'berth' : 'seat'} · Drag to rotate cabin
              </span>
            )}
          </div>

          <span className="px-2 py-1 rounded-lg bg-white/95 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-700 shadow-sm shrink-0">
            {availableCount} Open
          </span>
        </div>
      </div>

      {/* Seat Color Legend */}
      <div className="px-3.5 py-2 bg-white/95 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-600">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 inline-block" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500 inline-block shadow-xs" />
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-400 border border-slate-500 inline-block" />
            Booked
          </span>
        </div>
        <span className="font-mono text-[10px] text-sky-700 font-semibold">{layout.layoutTag}</span>
      </div>
    </div>
  );
}
