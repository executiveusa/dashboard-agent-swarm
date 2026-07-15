import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Billboard, ContactShadows, useTexture, Plane } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ColorAverage, HueSaturation, BrightnessContrast, Sepia } from '@react-three/postprocessing';
// @react-three/xr v6 removed VRButton, XR, Controllers, Hands - XR feature disabled
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────
type AgentStatus = 'active' | 'idle' | 'chatting' | 'patrolling';
const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#ff3344',    // Red pop — the only color that breaks sepia
  idle: '#ccbb99',
  chatting: '#ff5566',
  patrolling: '#ff2244',
};

interface YappyAgent {
  id: number;
  name: string;
  role: string;
  avatar: string;       // path to avatar image in /yappyverse/pauli/
  status: AgentStatus;
  position: [number, number, number];
  walkRadius?: number;
}

// ── Agent Roster ──────────────────────────────────────────
const YAPPY_ROSTER: YappyAgent[] = [
  { id: 0,  name: 'Pauli',        role: 'King · Orchestrator',    avatar: '/yappyverse/pauli/pauli-full.png',    status: 'active',     position: [0, 0, 0],     walkRadius: 2 },
  { id: 1,  name: 'Synthia',      role: 'Queen · Strategist',     avatar: '/yappyverse/pauli/pauli-scene-1.png', status: 'chatting',   position: [3, 0, -2],    walkRadius: 1.5 },
  { id: 2,  name: 'PopeBot',      role: 'Ops Commander',          avatar: '/yappyverse/pauli/pauli-scene-2.png', status: 'active',     position: [-4, 0, 1],    walkRadius: 1.8 },
  { id: 3,  name: 'Devika',       role: 'Code Architect',         avatar: '/yappyverse/pauli/pauli-scene-3.png', status: 'idle',       position: [5, 0, 3],     walkRadius: 1 },
  { id: 4,  name: 'Agent Zero',   role: 'Recon Scout',            avatar: '/yappyverse/pauli/pauli-scene-4.png', status: 'patrolling', position: [-6, 0, -4],   walkRadius: 3 },
  { id: 5,  name: 'VisionClaw',   role: 'Visual Intel',           avatar: '/yappyverse/pauli/paulicoin.png',     status: 'active',     position: [7, 0, -1],    walkRadius: 1.5 },
  { id: 6,  name: 'Darya',        role: 'Security Enforcer',      avatar: '/yappyverse/pauli/pauli-mugshot.png', status: 'patrolling', position: [-3, 0, 5],    walkRadius: 2.5 },
  { id: 7,  name: 'Iron Claw',    role: 'Perimeter Guard',        avatar: '/yappyverse/pauli/pauli-profile.png', status: 'active',     position: [2, 0, 6],     walkRadius: 2 },
  { id: 8,  name: 'Viral Vikki',  role: 'Content Ops',            avatar: '/yappyverse/pauli/pauli-scene-1.png', status: 'chatting',   position: [-7, 0, -1],   walkRadius: 1 },
  { id: 9,  name: 'The Chief',    role: 'Infra Lead',             avatar: '/yappyverse/pauli/pauli-scene-2.png', status: 'active',     position: [4, 0, -5],    walkRadius: 1.5 },
  { id: 10, name: 'Bambú',        role: 'Growth Engine',          avatar: '/yappyverse/pauli/pauli-scene-3.png', status: 'idle',       position: [-5, 0, -6],   walkRadius: 1 },
  { id: 11, name: 'Frankenstack', role: 'Stack Builder',          avatar: '/yappyverse/pauli/pauli-scene-4.png', status: 'active',     position: [6, 0, 5],     walkRadius: 1.5 },
];

// ── Billboard Avatar ──────────────────────────────────────────
// Agents appear as 2D billboard sprites walking around the 3D space
const AgentAvatar = ({
  agent,
  onSelect,
  isSelected,
}: {
  agent: YappyAgent;
  onSelect: (a: YappyAgent) => void;
  isSelected: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // Walking animation — circle around the home position
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime * (agent.status === 'patrolling' ? 0.4 : 0.15) + agent.id * 1.3;
    const r = agent.walkRadius ?? 1;
    groupRef.current.position.x = agent.position[0] + Math.cos(t) * r;
    groupRef.current.position.z = agent.position[2] + Math.sin(t) * r;
    // Gentle bob
    groupRef.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 2 + agent.id) * 0.05;
  });

  const statusColor = STATUS_COLORS[agent.status];

  return (
    <group ref={groupRef}>
      {/* Avatar billboard */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
          scale={isSelected ? 1.3 : hovered ? 1.15 : 1}
        >
          <planeGeometry args={[1.2, 1.6]} />
          <meshBasicMaterial color={isSelected ? '#fff8f0' : '#e8dcc8'} transparent opacity={0.95} />
        </mesh>

        {/* Name plate */}
        <Text
          position={[0, -1.0, 0.01]}
          fontSize={0.14}
          color={statusColor}
          anchorX="center"
          outlineWidth={0.01}
          outlineColor="#000"
          fontWeight="bold"
        >
          {agent.name}
        </Text>

        {/* Role subtitle */}
        <Text
          position={[0, -1.2, 0.01]}
          fontSize={0.09}
          color="#b0a080"
          anchorX="center"
        >
          {agent.role}
        </Text>

        {/* Status dot */}
        <mesh position={[0.5, 0.7, 0.02]}>
          <circleGeometry args={[0.06, 16]} />
          <meshBasicMaterial color={statusColor} />
        </mesh>
      </Billboard>

      {/* Shadow circle on ground */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#1a1008" transparent opacity={0.35} />
      </mesh>

      {/* Chat bubble when chatting */}
      {agent.status === 'chatting' && (
        <Billboard position={[0.7, 1.8, 0]}>
          <mesh>
            <planeGeometry args={[0.6, 0.35]} />
            <meshBasicMaterial color="#ff3344" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.08} color="#ffffff" anchorX="center">
            {"💬 ..."}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// ── Ground — Vegas 2056 themed ──────────────────────────────────────────
const VegasGround = () => (
  <group>
    {/* Main floor — polished dark surface */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshPhysicalMaterial
        color="#2a2018"
        metalness={0.6}
        roughness={0.3}
        clearcoat={0.8}
      />
    </mesh>

    {/* Red carpet strip — THE red pop element */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      <planeGeometry args={[2.5, 30]} />
      <meshStandardMaterial color="#cc1122" emissive="#880011" emissiveIntensity={0.3} />
    </mesh>

    {/* Grid lines (subtle) */}
    {Array.from({ length: 21 }, (_, i) => (
      <group key={`grid-${i}`}>
        <mesh position={[i * 2 - 20, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 40]} />
          <meshBasicMaterial color="#3a3020" transparent opacity={0.3} />
        </mesh>
        <mesh position={[0, 0.003, i * 2 - 20]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.02, 40]} />
          <meshBasicMaterial color="#3a3020" transparent opacity={0.3} />
        </mesh>
      </group>
    ))}
  </group>
);

// ── Vegas 2056 environment structures ──────────────────────────────────────────
const VegasStructures = () => {
  // Holographic signage pillars
  const pillars = useMemo(
    () =>
      [
        { pos: [-10, 3, -8] as [number, number, number], label: 'FOXIES' },
        { pos: [10, 3, -8] as [number, number, number], label: 'YAPPYVERSE' },
        { pos: [-10, 3, 8] as [number, number, number], label: 'PAULI EFFECT' },
        { pos: [10, 3, 8] as [number, number, number], label: '$100M · 2030' },
      ],
    []
  );

  return (
    <group>
      {pillars.map(({ pos, label }, i) => (
        <group key={i} position={pos}>
          {/* Pillar body */}
          <mesh castShadow>
            <boxGeometry args={[0.8, 6, 0.8]} />
            <meshPhysicalMaterial color="#1a1208" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glow ring at top */}
          <mesh position={[0, 3.2, 0]}>
            <torusGeometry args={[0.5, 0.06, 8, 32]} />
            <meshBasicMaterial color="#ff2233" transparent opacity={0.8} />
          </mesh>
          {/* Sign text */}
          <Billboard position={[0, 4, 0]}>
            <Text fontSize={0.35} color="#ff3344" anchorX="center" outlineWidth={0.02} outlineColor="#440000" fontWeight="bold">
              {label}
            </Text>
          </Billboard>
        </group>
      ))}

      {/* Central fountain — Bellagio style (simplified) */}
      <group position={[0, 0, -10]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[3, 3.5, 1, 32]} />
          <meshPhysicalMaterial color="#221810" metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Water jets — just glowing cylinders */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <FountainJet key={i} angle={angle} />
          );
        })}
      </group>
    </group>
  );
};

const FountainJet = ({ angle }: { angle: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const height = 2 + Math.sin(clock.elapsedTime * 3 + angle * 2) * 1.5;
    ref.current.scale.y = height;
    ref.current.position.y = 1 + height / 2;
  });
  return (
    <mesh
      ref={ref}
      position={[Math.cos(angle) * 2, 2, -10 + Math.sin(angle) * 2]}
    >
      <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
      <meshBasicMaterial color="#ff4455" transparent opacity={0.4} />
    </mesh>
  );
};

// ── Yappyverse Scene ──────────────────────────────────────────
const YappyverseSceneInner = ({
  onSelectAgent,
  selectedAgent,
}: {
  onSelectAgent: (a: YappyAgent | null) => void;
  selectedAgent: YappyAgent | null;
}) => {
  const handleBgClick = useCallback(() => onSelectAgent(null), [onSelectAgent]);

  return (
    <>
      {/* Warm, cinematic lighting — sepia mood */}
      <ambientLight intensity={0.2} color="#ffddaa" />
      <directionalLight position={[10, 15, 5]} intensity={0.8} color="#ffeedd" castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-8, 6, -6]} intensity={0.3} color="#ff3344" /> {/* Red accent */}
      <pointLight position={[8, 4, 8]} intensity={0.2} color="#ffaa66" />
      <spotLight position={[0, 12, 0]} angle={0.5} penumbra={0.7} intensity={0.4} color="#ffccaa" />

      {/* Fog for depth */}
      <fog attach="fog" args={['#1a1008', 15, 45]} />

      {/* Background click to deselect */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleBgClick}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <VegasGround />
      <VegasStructures />

      {/* Agents */}
      {YAPPY_ROSTER.map((agent) => (
        <AgentAvatar
          key={agent.id}
          agent={agent}
          onSelect={onSelectAgent}
          isSelected={selectedAgent?.id === agent.id}
        />
      ))}

      <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={40} blur={3} far={6} color="#1a0800" />
      <Environment preset="sunset" />

      {/* Sepia + red pop post-processing */}
      <EffectComposer multisampling={4}>
        <Sepia intensity={0.6} />
        <BrightnessContrast brightness={-0.05} contrast={0.15} />
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.8} height={300} intensity={0.5} />
        <Vignette eskil={false} offset={0.15} darkness={1.3} />
      </EffectComposer>
    </>
  );
};

// ── Status Legend ──────────────────────────────────────────
const YappyStatusLegend = () => (
  <div className="flex gap-3 flex-wrap">
    {Object.entries(STATUS_COLORS).map(([status, color]) => (
      <div key={status} className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[0.65rem] capitalize" style={{ color: '#b0a080' }}>{status}</span>
      </div>
    ))}
  </div>
);

// ── Main Export ──────────────────────────────────────────
export default function YappyverseScene() {
  const [selectedAgent, setSelectedAgent] = useState<YappyAgent | null>(null);

  return (
    <div className="w-full h-full min-h-[600px] bg-[#1a1008] relative rounded-xl overflow-hidden border border-[#cc1122]/30 shadow-[0_0_30px_rgba(204,17,34,0.2)]">
      {/* Top HUD — sepia themed */}
      <div className="absolute top-4 left-4 z-10 bg-[#1a1008]/80 p-4 rounded-lg border border-[#cc1122]/40 backdrop-blur-md max-w-xs">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#cc1122] to-[#ffaa44]">
          PAULI'S WORLD
        </h2>
        <p className="text-[#ccbb88] text-sm mt-1">Yappyverse · Las Vegas 2056</p>
        <p className="text-[#887755] text-xs mt-1">{YAPPY_ROSTER.length} agents in the verse</p>
        <div className="mt-2">
          <YappyStatusLegend />
        </div>
      </div>

      {/* Selected agent panel */}
      {selectedAgent && (
        <div className="absolute top-4 right-4 z-10 bg-[#1a1008]/90 p-4 rounded-lg border border-[#cc1122]/50 backdrop-blur-md w-64 sm:w-72">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-[#ffe8cc]">{selectedAgent.name}</h3>
            <button onClick={() => setSelectedAgent(null)} className="text-[#887755] hover:text-[#ffaa44] text-sm">✕</button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-[#b0a080]">Role: <span className="text-[#cc1122]">{selectedAgent.role}</span></p>
            <p className="text-[#b0a080]">
              Status: <span style={{ color: STATUS_COLORS[selectedAgent.status] }} className="font-medium uppercase">{selectedAgent.status}</span>
            </p>
            <hr className="border-[#3a2a18] my-2" />
            <p className="text-[#cc1122] text-xs">Active in the Yappyverse</p>
            <p className="text-[#887755] text-xs">Beads: 2 open · 5 closed</p>
            <p className="text-[#887755] text-xs">Mail: 1 unread · 8 sent</p>
          </div>
        </div>
      )}

      {/* VR button - disabled: @react-three/xr v6 removed VRButton */}

      {/* Footer */}
      <div className="absolute bottom-4 left-4 z-10 text-[0.65rem] text-[#665533]">
        {YAPPY_ROSTER.length} Agents · Click avatar to inspect · VR Ready · The Pauli Effect
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 8, 18], fov: 50 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <>
          <YappyverseSceneInner onSelectAgent={setSelectedAgent} selectedAgent={selectedAgent} />
          <OrbitControls
            enablePan
            maxPolarAngle={Math.PI / 2 - 0.02}
            minDistance={5}
            maxDistance={35}
            enableDamping
            dampingFactor={0.06}
            target={[0, 1, 0]}
          />
        </>
      </Canvas>
    </div>
  );
}
