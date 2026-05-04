import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SquadState } from '@/types';
import { useOfficeChoreography, type AgentPose } from './useOfficeChoreography';
import { CELL_3D, DRIVE_DOOR, GRID_COLS, GRID_ROWS, ROOMS, STATUS_COLOR } from './officeLayout';

interface Props {
  squadState: SquadState | null;
}

function gridToWorld(col: number, row: number): [number, number] {
  return [(col - GRID_COLS / 2) * CELL_3D, (row - GRID_ROWS / 2) * CELL_3D];
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GRID_COLS * CELL_3D, GRID_ROWS * CELL_3D]} />
      <meshStandardMaterial color="#0b1220" />
    </mesh>
  );
}

function Rooms() {
  return (
    <group>
      {ROOMS.map((room) => {
        const [cs, rs, ce, re] = room.rect;
        const cx = (cs + ce + 1) / 2;
        const cy = (rs + re + 1) / 2;
        const [wx, wz] = gridToWorld(cx - 0.5, cy - 0.5);
        const w = (ce - cs + 1) * CELL_3D;
        const h = (re - rs + 1) * CELL_3D;
        return (
          <group key={room.id} position={[wx, 0.01, wz]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[w - 0.1, h - 0.1]} />
              <meshStandardMaterial color={room.color} transparent opacity={0.22} />
            </mesh>
            {/* low walls */}
            <mesh position={[0, 0.2, -h / 2]}>
              <boxGeometry args={[w, 0.4, 0.05]} />
              <meshStandardMaterial color={room.color} />
            </mesh>
            <mesh position={[0, 0.2, h / 2]}>
              <boxGeometry args={[w, 0.4, 0.05]} />
              <meshStandardMaterial color={room.color} />
            </mesh>
            <Html position={[0, 0.6, -h / 2]} center distanceFactor={10}>
              <div
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider"
                style={{ background: room.color, color: '#0b1220' }}
              >
                {room.label}
              </div>
            </Html>
            {/* desks */}
            {room.isDept &&
              Array.from({ length: room.desks }).map((_, i) => {
                const cols = Math.min(2, ce - cs - 1);
                const c = i % cols;
                const r = Math.floor(i / cols);
                const dx = (c - (cols - 1) / 2) * 1.2;
                const dz = (r - (Math.ceil(room.desks / cols) - 1) / 2) * 1.2;
                return (
                  <mesh key={i} position={[dx, 0.25, dz]} castShadow>
                    <boxGeometry args={[0.7, 0.1, 0.5]} />
                    <meshStandardMaterial color="#1f2937" />
                  </mesh>
                );
              })}
          </group>
        );
      })}
      {/* Drive door */}
      {(() => {
        const [dx, dz] = gridToWorld(DRIVE_DOOR.col, DRIVE_DOOR.row);
        return (
          <mesh position={[dx, 0.6, dz]}>
            <boxGeometry args={[0.2, 1.2, 0.8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.4} />
          </mesh>
        );
      })()}
    </group>
  );
}

function Agent({ pose }: { pose: AgentPose }) {
  const ref = useRef<THREE.Group>(null);
  const color = STATUS_COLOR[pose.status] ?? '#64748b';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const bob = pose.motion > 0.05 ? Math.abs(Math.sin(t * 8)) * 0.1 : 0;
    const [x, z] = gridToWorld(pose.col, pose.row);
    ref.current.position.set(x, 0.4 + bob, z);
    ref.current.rotation.y = Math.sin(t * 2) * 0.05;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={pose.status === 'working' ? 0.6 : 0.15} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      <Html position={[0, 0.85, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-base leading-none">{pose.icon}</div>
          {pose.bubble && (
            <div className="max-w-[120px] truncate rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-slate-900">
              {pose.bubble}
            </div>
          )}
          {pose.carrying && (
            <div className="text-sm leading-none">{pose.carrying === 'folder' ? '📁' : '📄'}</div>
          )}
        </div>
      </Html>
    </group>
  );
}

export default function OfficeViewer3D({ squadState }: Props) {
  const choreo = useOfficeChoreography(squadState);
  const cam = useMemo<[number, number, number]>(() => [10, 12, 14], []);
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`, background: '#020617' }}
    >
      <Canvas shadows camera={{ position: cam, fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 12, 6]} intensity={0.8} castShadow />
        <Suspense fallback={null}>
          <Floor />
          <Rooms />
          {choreo.poses.map((p) => (
            <Agent key={p.id} pose={p} />
          ))}
        </Suspense>
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.4}
          minDistance={10}
          maxDistance={30}
        />
      </Canvas>
    </div>
  );
}
