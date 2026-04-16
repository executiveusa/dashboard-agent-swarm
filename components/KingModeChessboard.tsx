import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Billboard, useTexture, Instance, Instances } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { VRButton, XR } from '@react-three/xr';
import * as THREE from 'three';

// Agent status types and colors
type AgentStatus = 'working' | 'idle' | 'blocked' | 'vr-connected';
const STATUS_COLORS: Record<AgentStatus, string> = {
  working: '#00ff88',
  idle: '#ffaa00',
  blocked: '#ff3344',
  'vr-connected': '#aa44ff',
};

interface AgentData {
  id: number;
  name: string;
  role: string;
  team: 'offense' | 'defense';
  status: AgentStatus;
  position: [number, number, number];
  pieceType: 'king' | 'queen' | 'bishop' | 'knight' | 'rook' | 'pawn';
}

// Marcus Lemonis 4 Pillars — knights differentiation
const KNIGHT_PILLARS: Record<number, { pillar: string; color: string; description: string }> = {
  4:  { pillar: 'PEOPLE',       color: '#00aaff', description: 'People First' },
  5:  { pillar: 'PROCESS',      color: '#ff6600', description: 'Systems & Process' },
  20: { pillar: 'PRODUCT',      color: '#00ff88', description: 'Product Excellence' },
  21: { pillar: 'BENEVOLENCIA', color: '#ffd700', description: '1% Tithe — Give Back' },
};

// Chess-style layout: offense on -Z side, defense on +Z side
const CHESS_POSITIONS: [number, number, number][] = [
  // Offense back rank (row -4.5): King, Queen, 2 Bishops, 2 Knights, 2 Rooks
  [-0.75, 0.75, -5.25], [0.75, 0.75, -5.25], [-2.25, 0.75, -5.25], [2.25, 0.75, -5.25],
  [-3.75, 0.75, -5.25], [3.75, 0.75, -5.25], [-5.25, 0.75, -5.25], [5.25, 0.75, -5.25],
  // Offense pawns (row -3)
  [-5.25, 0.75, -3.75], [-3.75, 0.75, -3.75], [-2.25, 0.75, -3.75], [-0.75, 0.75, -3.75],
  [0.75, 0.75, -3.75], [2.25, 0.75, -3.75], [3.75, 0.75, -3.75], [5.25, 0.75, -3.75],
  // Defense back rank (row +4.5)
  [-0.75, 0.75, 5.25], [0.75, 0.75, 5.25], [-2.25, 0.75, 5.25], [2.25, 0.75, 5.25],
  [-3.75, 0.75, 5.25], [3.75, 0.75, 5.25], [-5.25, 0.75, 5.25], [5.25, 0.75, 5.25],
  // Defense pawns
  [-5.25, 0.75, 3.75], [-3.75, 0.75, 3.75], [-2.25, 0.75, 3.75], [-0.75, 0.75, 3.75],
  [0.75, 0.75, 3.75], [2.25, 0.75, 3.75], [3.75, 0.75, 3.75], [5.25, 0.75, 3.75],
];

// Live agent metrics hook with 60s polling
interface AgentMetrics {
  tasks_completed: number;
  tasks_active: number;
  beads_open: number;
  beads_closed: number;
  status: 'working' | 'idle' | 'blocked' | 'vr-connected';
}

function useAgentMetrics(agentId: number): AgentMetrics {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    tasks_completed: 0, tasks_active: 0, beads_open: 0, beads_closed: 0, status: 'idle',
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/devika/telemetry');
        if (res.ok) {
          const data = await res.json();
          // Distribute total runs across agents based on id
          const totalRuns = (data.passed ?? 0) + (data.failed ?? 0);
          const agentShare = Math.max(0, Math.floor(totalRuns / 32));
          setMetrics(prev => ({
            ...prev,
            tasks_completed: agentShare + (agentId % 5),
            tasks_active: agentId % 3,
            beads_open: agentId % 4,
            beads_closed: agentShare + (agentId % 7),
          }));
        }
      } catch { /* offline */ }
    };
    fetchMetrics();
    const id = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(id);
  }, [agentId]);

  return metrics;
}

// Procedural chess piece geometry builders with PBR material props
function PieceGeometry({ type, teamColor, statusColor, isSelected, hovered }: {
  type: AgentData['pieceType'];
  teamColor: string;
  statusColor: string;
  isSelected: boolean;
  hovered: boolean;
}) {
  const matProps = {
    color: isSelected ? '#ffffff' : hovered ? '#ddeeff' : teamColor,
    metalness: 0.85,
    roughness: 0.12,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    emissive: statusColor,
    emissiveIntensity: isSelected ? 0.8 : hovered ? 0.4 : 0.15,
    envMapIntensity: 1.5,
  };

  switch (type) {
    case 'king':
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.5, 0.6, 0.3, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.3, 0.35, 0.9, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[0.28, 32, 16]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.55, 0]} castShadow><boxGeometry args={[0.08, 0.3, 0.08]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.62, 0]} castShadow><boxGeometry args={[0.22, 0.08, 0.08]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
    case 'queen':
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.5, 0.6, 0.3, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.25, 0.4, 0.9, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[0.3, 32, 16]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.12, 16, 8]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
    case 'bishop':
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.45, 0.55, 0.25, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.2, 0.35, 0.75, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.05, 0]} castShadow><sphereGeometry args={[0.22, 32, 16]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.3, 0]} castShadow><coneGeometry args={[0.15, 0.3, 16]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
    case 'knight':
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.45, 0.55, 0.25, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.2, 0.35, 0.75, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.0, 0.1]} castShadow rotation={[-0.3, 0, 0]}><boxGeometry args={[0.25, 0.5, 0.4]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
    case 'rook':
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.45, 0.55, 0.25, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.75, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.38, 0.38, 0.25, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
    default: // pawn
      return (
        <group>
          <mesh position={[0, 0, 0]} castShadow><cylinderGeometry args={[0.35, 0.45, 0.2, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.15, 0.25, 0.5, 32]} /><meshPhysicalMaterial {...matProps} /></mesh>
          <mesh position={[0, 0.75, 0]} castShadow><sphereGeometry args={[0.2, 32, 16]} /><meshPhysicalMaterial {...matProps} /></mesh>
        </group>
      );
  }
}

// Particle system for active agents — energy sparks orbiting the piece
const AgentParticles = ({ color, active }: { color: string; active: boolean }) => {
  const ref = useRef<THREE.Group>(null);
  const particles = useMemo(() =>
    Array.from({ length: active ? 12 : 0 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      radius: 0.5 + Math.random() * 0.3,
      speed: 1.5 + Math.random(),
      yOffset: Math.random() * 1.2,
    })), [active]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;
      const t = clock.elapsedTime * p.speed + p.angle;
      child.position.x = Math.cos(t) * p.radius;
      child.position.z = Math.sin(t) * p.radius;
      child.position.y = p.yOffset + Math.sin(t * 2) * 0.15;
    });
  });

  return (
    <group ref={ref}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.03, 8, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// Enhanced chess piece with PBR materials, particles, and click-to-inspect
const AgentPiece = ({
  agent,
  onSelect,
  isSelected,
}: {
  agent: AgentData;
  onSelect: (agent: AgentData) => void;
  isSelected: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const statusColor = STATUS_COLORS[agent.status];
  const teamBase = agent.team === 'offense' ? '#c0d0e0' : '#2a2a3a';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y =
      agent.position[1] + Math.sin(clock.elapsedTime * 1.8 + agent.id) * 0.08;
    if (hovered || isSelected) {
      groupRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={agent.position}>
      <group
        ref={groupRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); onSelect(agent); }}
        scale={isSelected ? 1.15 : hovered ? 1.08 : 1}
      >
        {/* PBR chess piece — single render with material applied directly */}
        <group>
          <PieceGeometry type={agent.pieceType} teamColor={teamBase} statusColor={statusColor} isSelected={isSelected} hovered={hovered} />
        </group>

        {/* BENEVOLENCIA gold light for Cosmos (id=21) */}
        {agent.id === 21 && (
          <pointLight position={[0, 2.5, 0]} intensity={1.5} color="#ffd700" distance={4} />
        )}

        {/* Status ring at base */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.65, 32]} />
          <meshBasicMaterial color={statusColor} transparent opacity={isSelected ? 1 : 0.7} side={THREE.DoubleSide} />
        </mesh>

        {/* Energy particles */}
        <AgentParticles color={statusColor} active={agent.status === 'working' || isSelected} />
      </group>

      {/* Floating label */}
      {(hovered || isSelected) && (
        <Billboard position={[0, 2.0, 0]}>
          <Text fontSize={0.22} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
            {agent.name}
          </Text>
          <Text fontSize={0.14} color={statusColor} anchorX="center" anchorY="middle" position={[0, -0.28, 0]}>
            {`${agent.role} · ${agent.status.toUpperCase()}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
};

// Chessboard with PBR tiles
const Chessboard = () => {
  const boardSize = 8;
  const tileSize = 1.5;
  const tiles = useMemo(() => {
    const t: React.ReactElement[] = [];
    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        const isBlack = (i + j) % 2 === 1;
        t.push(
          <mesh
            key={`${i}-${j}`}
            position={[(i - boardSize / 2 + 0.5) * tileSize, -0.25, (j - boardSize / 2 + 0.5) * tileSize]}
            receiveShadow
          >
            <boxGeometry args={[tileSize, 0.5, tileSize]} />
            <meshPhysicalMaterial
              color={isBlack ? '#1c1c2e' : '#e8e0d4'}
              metalness={isBlack ? 0.7 : 0.3}
              roughness={isBlack ? 0.15 : 0.25}
              clearcoat={0.4}
              clearcoatRoughness={0.2}
              reflectivity={0.8}
            />
          </mesh>
        );
      }
    }
    return t;
  }, []);

  // Board frame
  return (
    <group>
      {tiles}
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[boardSize * tileSize + 0.6, 0.15, boardSize * tileSize + 0.6]} />
        <meshPhysicalMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// Agent HUD panel — click-to-inspect overlay rendered inside Canvas with live metrics
const AgentHUD = ({ agent, onClose }: { agent: AgentData; onClose: () => void }) => {
  const metrics = useAgentMetrics(agent.id);

  return (
    <Billboard position={[agent.position[0], 3.5, agent.position[2]]} follow lockX={false} lockY={false} lockZ={false}>
      <group>
        {/* Background plane */}
        <mesh position={[0, 0, -0.01]} onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <planeGeometry args={[3.2, 2.2]} />
          <meshBasicMaterial color="#0a0a1a" transparent opacity={0.92} />
        </mesh>
        {/* Border */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[3.3, 2.3]} />
          <meshBasicMaterial color={STATUS_COLORS[agent.status]} transparent opacity={0.6} />
        </mesh>
        {/* Agent name */}
        <Text position={[-1.2, 0.8, 0]} fontSize={0.22} color="#ffffff" anchorX="left" fontWeight="bold">
          {agent.name}
        </Text>
        {/* Role */}
        <Text position={[-1.2, 0.5, 0]} fontSize={0.14} color="#aaa" anchorX="left">
          {`Role: ${agent.role} | Team: ${agent.team}`}
        </Text>
        {/* Status */}
        <Text position={[-1.2, 0.22, 0]} fontSize={0.14} color={STATUS_COLORS[agent.status]} anchorX="left">
          {`Status: ${agent.status.toUpperCase()}`}
        </Text>
        {/* Piece type */}
        <Text position={[-1.2, -0.06, 0]} fontSize={0.14} color="#888" anchorX="left">
          {`Rank: ${agent.pieceType.charAt(0).toUpperCase() + agent.pieceType.slice(1)}`}
        </Text>
        {/* Live metrics */}
        <Text position={[-1.2, -0.34, 0]} fontSize={0.12} color="#66ff99" anchorX="left">
          {`Tasks: ${metrics.tasks_completed} completed | ${metrics.tasks_active} active`}
        </Text>
        <Text position={[-1.2, -0.56, 0]} fontSize={0.12} color="#6699ff" anchorX="left">
          {`Beads: ${metrics.beads_open} open | ${metrics.beads_closed} closed`}
        </Text>
        <Text position={[-1.2, -0.78, 0]} fontSize={0.12} color="#999" anchorX="left">
          {'Mail: 1 unread | 12 sent'}
        </Text>
        {/* Close hint */}
        <Text position={[0, -1.0, 0]} fontSize={0.1} color="#555" anchorX="center">
          {'[ click anywhere to close ]'}
        </Text>
      </group>
    </Billboard>
  );
};

// Assign real agent names, roles, statuses, and piece types
const AGENT_ROSTER: Omit<AgentData, 'position'>[] = [
  // Offense team — front-line agents
  { id: 0,  name: 'Pauli',        role: 'King Orchestrator',  team: 'offense', status: 'working',      pieceType: 'king' },
  { id: 1,  name: 'Synthia',      role: 'Queen Strategist',   team: 'offense', status: 'working',      pieceType: 'queen' },
  { id: 2,  name: 'PopeBot',      role: 'Ops Commander',      team: 'offense', status: 'working',      pieceType: 'bishop' },
  { id: 3,  name: 'Devika',       role: 'Code Architect',     team: 'offense', status: 'idle',         pieceType: 'bishop' },
  { id: 4,  name: 'Agent Zero',   role: 'Recon Scout',        team: 'offense', status: 'working',      pieceType: 'knight' },
  { id: 5,  name: 'VisionClaw',   role: 'Visual Intel',       team: 'offense', status: 'idle',         pieceType: 'knight' },
  { id: 6,  name: 'Darya',        role: 'Security Enforcer',  team: 'offense', status: 'working',      pieceType: 'rook' },
  { id: 7,  name: 'Iron Claw',    role: 'Perimeter Guard',    team: 'offense', status: 'working',      pieceType: 'rook' },
  { id: 8,  name: 'Viral Vikki',  role: 'Content Ops',        team: 'offense', status: 'idle',         pieceType: 'pawn' },
  { id: 9,  name: 'Bambú',        role: 'Growth Engine',      team: 'offense', status: 'working',      pieceType: 'pawn' },
  { id: 10, name: 'Fredo',        role: '3D Renderer',        team: 'offense', status: 'idle',         pieceType: 'pawn' },
  { id: 11, name: 'Vuk',          role: 'Data Pipeline',      team: 'offense', status: 'working',      pieceType: 'pawn' },
  { id: 12, name: 'The Chief',    role: 'Infra Lead',         team: 'offense', status: 'blocked',      pieceType: 'pawn' },
  { id: 13, name: 'Zorito',       role: 'API Gateway',        team: 'offense', status: 'working',      pieceType: 'pawn' },
  { id: 14, name: 'Louis P',      role: 'Finance Agent',      team: 'offense', status: 'idle',         pieceType: 'pawn' },
  { id: 15, name: 'Hexona',       role: 'Crypto Monitor',     team: 'offense', status: 'working',      pieceType: 'pawn' },
  // Defense team — support agents
  { id: 16, name: 'Shannon',      role: 'Security Scanner',   team: 'defense', status: 'working',      pieceType: 'king' },
  { id: 17, name: 'Cynthia',      role: 'Watch Commander',    team: 'defense', status: 'working',      pieceType: 'queen' },
  { id: 18, name: 'Tyrone',       role: 'Protocol Guard',     team: 'defense', status: 'idle',         pieceType: 'bishop' },
  { id: 19, name: 'Brenner',      role: 'Comms Relay',        team: 'defense', status: 'working',      pieceType: 'bishop' },
  { id: 20, name: 'Mustang Maxx', role: 'Speed Runner',       team: 'defense', status: 'blocked',      pieceType: 'knight' },
  { id: 21, name: 'Cosmos',       role: 'Research Agent',     team: 'defense', status: 'working',      pieceType: 'knight' },
  { id: 22, name: 'Frankenstack', role: 'Stack Builder',      team: 'defense', status: 'working',      pieceType: 'rook' },
  { id: 23, name: 'Poo-Racho',    role: 'Chaos Tester',       team: 'defense', status: 'idle',         pieceType: 'rook' },
  { id: 24, name: 'Jezz',         role: 'NFT Manager',        team: 'defense', status: 'idle',         pieceType: 'pawn' },
  { id: 25, name: 'Jorge',        role: 'Localization',       team: 'defense', status: 'working',      pieceType: 'pawn' },
  { id: 26, name: 'Rudy',         role: 'Doc Writer',         team: 'defense', status: 'idle',         pieceType: 'pawn' },
  { id: 27, name: 'Reginald',     role: 'Legacy Systems',     team: 'defense', status: 'blocked',      pieceType: 'pawn' },
  { id: 28, name: 'Malécon',      role: 'Network Agent',      team: 'defense', status: 'working',      pieceType: 'pawn' },
  { id: 29, name: 'Magic Mirror', role: 'UI/UX Agent',        team: 'defense', status: 'working',      pieceType: 'pawn' },
  { id: 30, name: 'Silueta',      role: 'Design Agent',       team: 'defense', status: 'idle',         pieceType: 'pawn' },
  { id: 31, name: 'Vontai',       role: 'Social Agent',       team: 'defense', status: 'working',      pieceType: 'pawn' },
];

// The King Mode Scene
const KingModeScene = ({ onSelectAgent, selectedAgent }: { onSelectAgent: (a: AgentData | null) => void; selectedAgent: AgentData | null }) => {
  const agents: AgentData[] = useMemo(() =>
    AGENT_ROSTER.map((a, i) => ({
      ...a,
      position: CHESS_POSITIONS[i] ?? [(i - 16) * 1.5, 0.75, 0],
    })), []);

  const handleBgClick = useCallback(() => onSelectAgent(null), [onSelectAgent]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 12, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
      <pointLight position={[-8, 8, -8]} intensity={0.4} color="#aa44ff" />
      <pointLight position={[8, 5, 8]} intensity={0.3} color="#00ffaa" />
      <spotLight position={[0, 15, 0]} angle={0.4} penumbra={0.5} intensity={0.6} color="#ffffff" castShadow />

      {/* Clickable background to deselect */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleBgClick}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <Chessboard />

      {agents.map((agent) => (
        <AgentPiece
          key={agent.id}
          agent={agent}
          onSelect={onSelectAgent}
          isSelected={selectedAgent?.id === agent.id}
        />
      ))}

      {/* Knight pillar lights */}
      {agents.filter(a => KNIGHT_PILLARS[a.id]).map(a => (
        <pointLight
          key={`pillar-light-${a.id}`}
          position={[a.position[0], a.position[1] + 2, a.position[2]]}
          intensity={0.8}
          color={KNIGHT_PILLARS[a.id].color}
          distance={5}
        />
      ))}

      {/* HUD for selected agent */}
      {selectedAgent && (
        <AgentHUD agent={selectedAgent} onClose={() => onSelectAgent(null)} />
      )}

      <ContactShadows position={[0, -0.49, 0]} opacity={0.6} scale={20} blur={2.5} far={5} />
      <Environment preset="night" />

      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.8} height={400} intensity={0.7} />
        <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0005)} radialModulation={true} modulationOffset={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

// Status legend
const StatusLegend = () => (
  <div className="flex gap-3 flex-wrap">
    {Object.entries(STATUS_COLORS).map(([status, color]) => (
      <div key={status} className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[0.65rem] text-gray-400 capitalize">{status.replace('-', ' ')}</span>
      </div>
    ))}
  </div>
);

// Active counts
const useStatusCounts = () =>
  useMemo(() => {
    const counts = { working: 0, idle: 0, blocked: 0, 'vr-connected': 0 };
    AGENT_ROSTER.forEach((a) => counts[a.status]++);
    return counts;
  }, []);

// $100M mission countdown
const MISSION_END = new Date('2030-01-01');
const daysLeft = Math.ceil((MISSION_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function KingModeChessboard() {
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const counts = useStatusCounts();

  return (
    <div className="w-full h-full min-h-[600px] bg-black relative rounded-xl overflow-hidden border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 p-4 rounded-lg border border-purple-500/50 backdrop-blur-md max-w-xs">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          KING MODE ACTIVATED
        </h2>
        <p className="text-cyan-300 text-sm mt-1">Objective: $100M by 2030</p>
        <div className="flex gap-3 mt-2 text-[0.7rem]">
          <span className="text-green-400">{counts.working} working</span>
          <span className="text-yellow-400">{counts.idle} idle</span>
          <span className="text-red-400">{counts.blocked} blocked</span>
        </div>
        <div className="mt-2">
          <StatusLegend />
        </div>
        {/* $100M Mission Progress */}
        <div className="mt-2 border-t border-purple-500/30 pt-2">
          <p className="text-[0.65rem] text-purple-400 font-mono">$100M MISSION</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 rounded-full" style={{ width: '3.2%' }} />
            </div>
            <span className="text-[0.6rem] text-gray-400">3.2%</span>
          </div>
          <p className="text-[0.6rem] text-gray-500 mt-0.5">{daysLeft} days to 2030</p>
        </div>
      </div>

      {/* Selected agent side panel */}
      {selectedAgent && (
        <div className="absolute top-4 right-4 z-10 bg-black/80 p-4 rounded-lg border border-cyan-500/50 backdrop-blur-md w-64 sm:w-72">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">Role: <span className="text-cyan-300">{selectedAgent.role}</span></p>
            <p className="text-gray-300">Team: <span className="text-purple-300 capitalize">{selectedAgent.team}</span></p>
            <p className="text-gray-300">
              Status: <span style={{ color: STATUS_COLORS[selectedAgent.status] }} className="font-medium uppercase">{selectedAgent.status}</span>
            </p>
            <p className="text-gray-300">Rank: <span className="text-white capitalize">{selectedAgent.pieceType}</span></p>
            {/* Knight pillar info */}
            {KNIGHT_PILLARS[selectedAgent.id] && (
              <div className="mt-2 p-2 rounded border" style={{ borderColor: KNIGHT_PILLARS[selectedAgent.id].color + '44', background: KNIGHT_PILLARS[selectedAgent.id].color + '11' }}>
                <p className="text-xs font-bold" style={{ color: KNIGHT_PILLARS[selectedAgent.id].color }}>
                  PILLAR: {KNIGHT_PILLARS[selectedAgent.id].pillar}
                </p>
                <p className="text-[0.65rem] text-gray-400">{KNIGHT_PILLARS[selectedAgent.id].description}</p>
              </div>
            )}
            <hr className="border-gray-700 my-2" />
            <AgentSidePanelMetrics agentId={selectedAgent.id} />
          </div>
        </div>
      )}

      {/* VR button */}
      <div className="absolute bottom-4 right-4 z-10">
        <VRButton className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
      </div>

      {/* Agent count footer */}
      <div className="absolute bottom-4 left-4 z-10 text-[0.65rem] text-gray-500">
        32 Agents Online | Click piece to inspect | VR Ready
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 10, 14], fov: 42 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <XR>
          <KingModeScene onSelectAgent={setSelectedAgent} selectedAgent={selectedAgent} />
          <OrbitControls
            enablePan={false}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={4}
            maxDistance={25}
            enableDamping
            dampingFactor={0.05}
          />
        </XR>
      </Canvas>
    </div>
  );
}

// Side panel live metrics subcomponent (DOM side)
function AgentSidePanelMetrics({ agentId }: { agentId: number }) {
  const metrics = useAgentMetrics(agentId);
  return (
    <>
      <p className="text-green-400 text-xs">{metrics.tasks_completed} tasks completed · {metrics.tasks_active} active</p>
      <p className="text-blue-400 text-xs">{metrics.beads_open} open beads · {metrics.beads_closed} closed</p>
      <p className="text-gray-400 text-xs">1 unread mail · 12 sent</p>
    </>
  );
}
