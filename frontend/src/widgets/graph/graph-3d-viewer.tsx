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

/**
 * Generate a star-burst glow texture via Canvas2D.
 * Produces a radial gradient with 4-spike cross flare.
 */
function createStarTexture(
  color: string,
  size: number = 128,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Parse hex to RGB for gradient stops
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // 1) Radial soft glow
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  radial.addColorStop(0, `rgba(255,255,255,1)`);
  radial.addColorStop(0.05, `rgba(${r},${g},${b},0.9)`);
  radial.addColorStop(0.3, `rgba(${r},${g},${b},0.3)`);
  radial.addColorStop(0.6, `rgba(${r},${g},${b},0.08)`);
  radial.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, size, size);

  // 2) Cross-shaped light spikes (4 directions)
  ctx.globalCompositeOperation = "screen";
  const spikeLength = cx * 0.95;
  const spikeWidth = size * 0.02;

  for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, spikeLength, 0);
    grad.addColorStop(0, `rgba(255,255,255,0.8)`);
    grad.addColorStop(0.2, `rgba(${r},${g},${b},0.5)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    // Draw both directions of the spike
    ctx.fillStyle = grad;
    ctx.fillRect(0, -spikeWidth / 2, spikeLength, spikeWidth);

    const grad2 = ctx.createLinearGradient(0, 0, -spikeLength, 0);
    grad2.addColorStop(0, `rgba(255,255,255,0.8)`);
    grad2.addColorStop(0.2, `rgba(${r},${g},${b},0.5)`);
    grad2.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad2;
    ctx.fillRect(-spikeLength, -spikeWidth / 2, spikeLength, spikeWidth);

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Texture cache — one per color
const textureCache = new Map<string, THREE.CanvasTexture>();

function getStarTexture(color: string): THREE.CanvasTexture {
  let tex = textureCache.get(color);
  if (!tex) {
    tex = createStarTexture(color);
    textureCache.set(color, tex);
  }
  return tex;
}

// Background star particles
const Stars = () => {
  const count = 800;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.008;
    }
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
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
};

// Cursor management
const CursorManager = ({ isHovering }: { isHovering: boolean }) => {
  const { gl } = useThree();
  const prevCursor = useRef("");

  useFrame(() => {
    const target = isHovering ? "pointer" : "grab";
    if (prevCursor.current !== target) {
      gl.domElement.style.cursor = target;
      prevCursor.current = target;
    }
  });

  return null;
};

type StarNodeProps = {
  node: Graph3DNode;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  onClick: (nodeId: string) => void;
  onHover: (isHovered: boolean) => void;
};

const StarNode = ({
  node,
  isSelected,
  isConnected,
  isDimmed,
  onClick,
  onHover,
}: StarNodeProps) => {
  const color = getNodeColor(node.tags);
  const label = getNodeLabel(node.tags, node.label);
  const starTexture = useMemo(() => getStarTexture(color), [color]);

  const groupRef = useRef<THREE.Group>(null);
  const spriteRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((_state, delta) => {
    // Smooth scale transition
    if (groupRef.current) {
      const targetScale = isSelected ? 1.4 : isHovered ? 1.2 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 8,
      );
    }
    // Pulse the flare sprite
    if (spriteRef.current) {
      const mat = spriteRef.current.material as THREE.SpriteMaterial;
      const base = isSelected ? 0.95 : isConnected ? 0.75 : 0.55;
      const pulse = Math.sin(Date.now() * 0.003) * 0.1;
      mat.opacity = isDimmed ? 0.08 : base + pulse;

      // Slowly rotate the flare sprite
      mat.rotation += delta * 0.15;
    }
    // Pulsing inner core brightness
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      const base = isSelected ? 0.9 : 0.5;
      const pulse = Math.sin(Date.now() * 0.005) * 0.15;
      mat.opacity = isDimmed ? 0.05 : base + pulse;
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(node.id);
    },
    [node.id, onClick],
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
    onHover(true);
  }, [onHover]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    onHover(false);
  }, [onHover]);

  const baseOpacity = isDimmed ? 0.12 : 1.0;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <group ref={groupRef}>
        {/* Star flare sprite — cross-shaped glow, always faces camera */}
        <sprite ref={spriteRef} scale={[3.0, 3.0, 1]}>
          <spriteMaterial
            map={starTexture}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Clickable core sphere — small and bright */}
        <mesh
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={
              isSelected ? 1.2 : isConnected ? 0.8 : 0.5
            }
            transparent
            opacity={baseOpacity}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>

        {/* White-hot inner core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial
            color="white"
            transparent
            opacity={isDimmed ? 0.05 : 0.5}
          />
        </mesh>

        {/* Soft glow halo */}
        <mesh>
          <sphereGeometry args={[0.45, 20, 20]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isDimmed ? 0.02 : 0.1}
          />
        </mesh>
      </group>

      {/* Billboard label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, -0.85, 0]}
          fontSize={0.28}
          color="white"
          anchorX="center"
          anchorY="top"
          fillOpacity={isDimmed ? 0.08 : 0.85}
          outlineWidth={0.02}
          outlineColor="#000000"
          outlineOpacity={isDimmed ? 0.03 : 0.6}
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
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);
  if (!sourceNode || !targetNode) return null;

  const points: [number, number, number][] = [
    [sourceNode.position.x, sourceNode.position.y, sourceNode.position.z],
    [targetNode.position.x, targetNode.position.y, targetNode.position.z],
  ];

  const color = isHighlighted ? "#a5b4fc" : "#6366f1";
  const lineWidth = isHighlighted
    ? Math.max(1.5, edge.similarity * 3)
    : Math.max(0.5, edge.similarity * 1.5);
  const opacity = isDimmed ? 0.04 : isHighlighted ? 0.9 : 0.3;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
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
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  const nodeMap = useMemo(() => {
    const map = new Map<string, Graph3DNode>();
    for (const node of graphData.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [graphData.nodes]);

  const connectedNodeIds = useMemo(() => {
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
      camera={{ position: [20, 15, 20], fov: 50 }}
      onPointerMissed={onPaneClick}
      style={{ background: "#0F0F1A" }}
      gl={{ antialias: true, alpha: false }}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[25, 20, 25]} intensity={0.5} />
      <pointLight
        position={[-15, -10, -15]}
        intensity={0.2}
        color="#6366f1"
      />

      <CursorManager isHovering={isNodeHovered} />
      <Stars />

      {graphData.edges.map((edge: GraphEdge, i: number) => {
        const isHighlighted =
          selectedNodeId !== null &&
          (edge.source === selectedNodeId ||
            edge.target === selectedNodeId);
        const isDimmed = selectedNodeId !== null && !isHighlighted;

        return (
          <EdgeLine
            key={`edge-${i}`}
            edge={edge}
            nodeMap={nodeMap}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
          />
        );
      })}

      {graphData.nodes.map((node: Graph3DNode) => {
        const isSelected = node.id === selectedNodeId;
        const isConnected = connectedNodeIds.has(node.id);
        const isDimmed =
          selectedNodeId !== null && !isSelected && !isConnected;

        return (
          <StarNode
            key={node.id}
            node={node}
            isSelected={isSelected}
            isConnected={isConnected}
            isDimmed={isDimmed}
            onClick={onNodeSelect}
            onHover={setIsNodeHovered}
          />
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
      />
    </Canvas>
  );
};
