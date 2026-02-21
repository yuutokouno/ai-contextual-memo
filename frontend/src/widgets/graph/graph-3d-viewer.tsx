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

// Background star particles with varied sizes
const Stars = () => {
  const count = 800;

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sz[i] = Math.random() * 0.12 + 0.02;
    }
    return { positions: pos, sizes: sz };
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
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
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

// Cursor management — switch to pointer on hover
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

type NodeSphereProps = {
  node: Graph3DNode;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  onClick: (nodeId: string) => void;
  onHover: (isHovered: boolean) => void;
};

const NodeSphere = ({
  node,
  isSelected,
  isConnected,
  isDimmed,
  onClick,
  onHover,
}: NodeSphereProps) => {
  const color = getNodeColor(node.tags);
  const label = getNodeLabel(node.tags, node.label);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      const targetScale = isSelected ? 1.3 : isHovered ? 1.15 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 8,
      );
    }
    // Pulse the outer glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = isSelected ? 0.2 : isHovered ? 0.15 : 0.08;
      const pulse = Math.sin(Date.now() * 0.003) * 0.03;
      mat.opacity = isDimmed ? 0.02 : baseOpacity + pulse;
    }
    // Rotate the ring
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.4;
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

  const opacity = isDimmed ? 0.15 : 1.0;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <group ref={groupRef}>
        {/* Outer glow — always visible */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.65, 20, 20]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} />
        </mesh>

        {/* Main sphere */}
        <mesh
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={
              isSelected ? 0.9 : isConnected ? 0.6 : 0.35
            }
            transparent
            opacity={opacity}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>

        {/* Inner core — bright center */}
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            color="white"
            transparent
            opacity={isDimmed ? 0.05 : 0.35}
          />
        </mesh>

        {/* Decorative ring — selected or hovered */}
        {(isSelected || isHovered) && (
          <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 48]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Billboard label — always faces camera */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, -0.85, 0]}
          fontSize={0.28}
          color="white"
          anchorX="center"
          anchorY="top"
          fillOpacity={isDimmed ? 0.1 : 0.85}
          outlineWidth={0.015}
          outlineColor="#000000"
          outlineOpacity={isDimmed ? 0.05 : 0.5}
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

  const color = isHighlighted
    ? "#a5b4fc"
    : "#6366f1";
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
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[25, 20, 25]} intensity={0.7} />
      <pointLight
        position={[-15, -10, -15]}
        intensity={0.25}
        color="#6366f1"
      />
      <pointLight
        position={[0, 25, 0]}
        intensity={0.15}
        color="#c084fc"
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
          <NodeSphere
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
