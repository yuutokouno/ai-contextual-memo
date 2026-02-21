import { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Line, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { Graph3DData, Graph3DNode, GraphEdge } from "@/entities/graph";

const NODE_COLORS = [
  "#60a5fa",
  "#c084fc",
  "#4ade80",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#a3e635",
  "#6366f1",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getNodeColor(tags: string[]): string {
  const key = tags.length > 0 ? tags[0] : "";
  return NODE_COLORS[hashString(key) % NODE_COLORS.length];
}

function getNodeLabel(tags: string[], label: string): string {
  if (tags.length > 0) {
    return tags.slice(0, 2).join(" / ");
  }
  return label.length > 12 ? label.slice(0, 12) + "..." : label;
}

function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Star texture — 4-spike diffraction cross + soft radial halo.
 * Intentionally asymmetric: vertical spikes are longer than horizontal
 * to avoid the "uniform AI-generated" look.
 */
function createStarTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const [r, g, b] = parseHex(color);

  // Layer 1: Large soft halo
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  halo.addColorStop(0, `rgba(255,255,255,0.6)`);
  halo.addColorStop(0.03, `rgba(${r},${g},${b},0.5)`);
  halo.addColorStop(0.15, `rgba(${r},${g},${b},0.15)`);
  halo.addColorStop(0.4, `rgba(${r},${g},${b},0.03)`);
  halo.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Layer 2: Tight bright core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.06);
  core.addColorStop(0, `rgba(255,255,255,1)`);
  core.addColorStop(0.5, `rgba(255,255,255,0.7)`);
  core.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  // Layer 3: 4-spike diffraction cross
  // Vertical spikes are 1.2x longer — mimics real telescope diffraction
  const spikes: [number, number, number][] = [
    [0, cx * 0.85, 1.8],          // horizontal — shorter, thinner
    [Math.PI / 2, cx * 0.95, 2],  // vertical — longer, slightly wider
    [Math.PI / 4, cx * 0.35, 1],  // diagonal — subtle accent
    [-Math.PI / 4, cx * 0.35, 1], // diagonal — subtle accent
  ];

  for (const [angle, length, width] of spikes) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Positive direction
    const gp = ctx.createLinearGradient(0, 0, length, 0);
    gp.addColorStop(0, `rgba(255,255,255,0.9)`);
    gp.addColorStop(0.08, `rgba(${r},${g},${b},0.6)`);
    gp.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
    gp.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gp;
    ctx.fillRect(0, -width / 2, length, width);

    // Negative direction
    const gn = ctx.createLinearGradient(0, 0, -length, 0);
    gn.addColorStop(0, `rgba(255,255,255,0.9)`);
    gn.addColorStop(0.08, `rgba(${r},${g},${b},0.6)`);
    gn.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
    gn.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gn;
    ctx.fillRect(-length, -width / 2, length, width);

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// One texture per color
const textureCache = new Map<string, THREE.CanvasTexture>();

function getStarTexture(color: string): THREE.CanvasTexture {
  let tex = textureCache.get(color);
  if (!tex) {
    tex = createStarTexture(color);
    textureCache.set(color, tex);
  }
  return tex;
}

// Background dust — dim, distant, no interaction
const BackgroundStars = () => {
  const count = 1000;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 160;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 160;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_s, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
};

// Cursor
const CursorManager = ({ isHovering }: { isHovering: boolean }) => {
  const { gl } = useThree();
  const prev = useRef("");
  useFrame(() => {
    const c = isHovering ? "pointer" : "grab";
    if (prev.current !== c) {
      gl.domElement.style.cursor = c;
      prev.current = c;
    }
  });
  return null;
};

type StarNodeProps = {
  node: Graph3DNode;
  /** 0-1, how "important" this node is (based on edge count) */
  importance: number;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  onClick: (nodeId: string) => void;
  onHover: (h: boolean) => void;
};

const StarNode = ({
  node,
  importance,
  isSelected,
  isConnected,
  isDimmed,
  onClick,
  onHover,
}: StarNodeProps) => {
  const color = getNodeColor(node.tags);
  const label = getNodeLabel(node.tags, node.label);
  const tex = useMemo(() => getStarTexture(color), [color]);

  const groupRef = useRef<THREE.Group>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = useState(false);

  // Size scales with importance: range 0.7x – 1.4x
  const sizeScale = 0.7 + importance * 0.7;
  const flareSize = 3.5 * sizeScale;
  const coreRadius = 0.2 * sizeScale;

  useFrame((_s, dt) => {
    if (groupRef.current) {
      const target = isSelected ? 1.35 : hovered ? 1.15 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(target, target, target),
        dt * 6,
      );
    }
    if (spriteRef.current) {
      const mat = spriteRef.current.material as THREE.SpriteMaterial;
      const base = isSelected ? 0.9 : isConnected ? 0.7 : 0.5;
      // Gentle twinkle — unique per node via position hash
      const phase = node.position.x * 1.7 + node.position.y * 2.3;
      const twinkle = Math.sin(Date.now() * 0.002 + phase) * 0.08;
      mat.opacity = isDimmed ? 0.06 : base + twinkle;
      mat.rotation += dt * 0.08;
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(node.id);
    },
    [node.id, onClick],
  );
  const onEnter = useCallback(() => {
    setHovered(true);
    onHover(true);
  }, [onHover]);
  const onLeave = useCallback(() => {
    setHovered(false);
    onHover(false);
  }, [onHover]);

  const opacity = isDimmed ? 0.1 : 1.0;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <group ref={groupRef}>
        {/* Flare sprite */}
        <sprite ref={spriteRef} scale={[flareSize, flareSize, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Core sphere — click target */}
        <mesh
          onClick={handleClick}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        >
          <sphereGeometry args={[coreRadius, 24, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 1.5 : isConnected ? 1.0 : 0.6}
            transparent
            opacity={opacity}
            roughness={0.1}
            metalness={0.05}
          />
        </mesh>

        {/* White-hot center dot */}
        <mesh>
          <sphereGeometry args={[coreRadius * 0.35, 12, 12]} />
          <meshBasicMaterial
            color="white"
            transparent
            opacity={isDimmed ? 0.03 : 0.6}
          />
        </mesh>
      </group>

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, -(coreRadius + 0.65), 0]}
          fontSize={0.35}
          color="white"
          anchorX="center"
          anchorY="top"
          fillOpacity={isDimmed ? 0.06 : 0.85}
          outlineWidth={0.025}
          outlineColor="#000000"
          outlineOpacity={isDimmed ? 0.02 : 0.55}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
};

type EdgeLineProps = {
  edge: GraphEdge;
  nodeMap: Map<string, Graph3DNode>;
  isHighlighted: boolean;
  isDimmed: boolean;
};

const EdgeLine = ({
  edge,
  nodeMap,
  isHighlighted,
  isDimmed,
}: EdgeLineProps) => {
  const src = nodeMap.get(edge.source);
  const tgt = nodeMap.get(edge.target);
  if (!src || !tgt) return null;

  const pts: [number, number, number][] = [
    [src.position.x, src.position.y, src.position.z],
    [tgt.position.x, tgt.position.y, tgt.position.z],
  ];

  return (
    <Line
      points={pts}
      color={isHighlighted ? "#a5b4fc" : "#6366f1"}
      lineWidth={
        isHighlighted
          ? Math.max(1.5, edge.similarity * 3)
          : Math.max(0.5, edge.similarity * 1.5)
      }
      transparent
      opacity={isDimmed ? 0.03 : isHighlighted ? 0.85 : 0.25}
    />
  );
};

type Graph3DViewerProps = {
  graphData: Graph3DData;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
};

export const Graph3DViewer = ({
  graphData,
  selectedNodeId,
  onNodeSelect,
  onPaneClick,
}: Graph3DViewerProps) => {
  const [nodeHovered, setNodeHovered] = useState(false);

  const nodeMap = useMemo(() => {
    const m = new Map<string, Graph3DNode>();
    for (const n of graphData.nodes) m.set(n.id, n);
    return m;
  }, [graphData.nodes]);

  // Edge count per node → importance 0-1
  const importanceMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of graphData.edges) {
      counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
      counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    const imp = new Map<string, number>();
    for (const n of graphData.nodes) {
      imp.set(n.id, (counts.get(n.id) ?? 0) / max);
    }
    return imp;
  }, [graphData.nodes, graphData.edges]);

  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of graphData.edges) {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    }
    return ids;
  }, [selectedNodeId, graphData.edges]);

  return (
    <Canvas
      camera={{ position: [35, 25, 35], fov: 45 }}
      onPointerMissed={onPaneClick}
      style={{ background: "#070710" }}
      gl={{ antialias: true, alpha: false }}
    >
      {/* Minimal ambient — let emissive/additive do the work */}
      <ambientLight intensity={0.08} />
      <pointLight position={[30, 25, 30]} intensity={0.3} />

      <CursorManager isHovering={nodeHovered} />
      <BackgroundStars />

      {graphData.edges.map((edge: GraphEdge, i: number) => {
        const hl =
          selectedNodeId !== null &&
          (edge.source === selectedNodeId ||
            edge.target === selectedNodeId);
        return (
          <EdgeLine
            key={`e-${i}`}
            edge={edge}
            nodeMap={nodeMap}
            isHighlighted={hl}
            isDimmed={selectedNodeId !== null && !hl}
          />
        );
      })}

      {graphData.nodes.map((node: Graph3DNode) => {
        const isSel = node.id === selectedNodeId;
        const isCon = connectedIds.has(node.id);
        return (
          <StarNode
            key={node.id}
            node={node}
            importance={importanceMap.get(node.id) ?? 0}
            isSelected={isSel}
            isConnected={isCon}
            isDimmed={selectedNodeId !== null && !isSel && !isCon}
            onClick={onNodeSelect}
            onHover={setNodeHovered}
          />
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={80}
      />
    </Canvas>
  );
};
