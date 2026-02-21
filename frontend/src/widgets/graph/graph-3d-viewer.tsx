import { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
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

// Background star particles
const Stars = () => {
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.01;
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
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
};

type NodeSphereProps = {
  node: Graph3DNode;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  onClick: (nodeId: string) => void;
};

const NodeSphere = ({
  node,
  isSelected,
  isConnected,
  isDimmed,
  onClick,
}: NodeSphereProps) => {
  const color = getNodeColor(node.tags);
  const label = getNodeLabel(node.tags, node.label);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      const targetScale = isSelected ? 1.3 : isHovered ? 1.15 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 8,
      );
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick(node.id);
    },
    [node.id, onClick],
  );

  const opacity = isDimmed ? 0.15 : 1.0;

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : isConnected ? 0.5 : 0.3}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Glow effect */}
      {(isSelected || isHovered) && (
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
          />
        </mesh>
      )}
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="top"
        fillOpacity={isDimmed ? 0.15 : 0.8}
      >
        {label}
      </Text>
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
    ? "rgba(165, 180, 252, 1)"
    : "rgba(99, 102, 241, 0.6)";
  const lineWidth = Math.max(0.5, edge.similarity * 2);
  const opacity = isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.4;

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
      <ambientLight intensity={0.4} />
      <pointLight position={[20, 20, 20]} intensity={0.8} />
      <pointLight position={[-20, -10, -20]} intensity={0.3} color="#6366f1" />

      <Stars />

      {graphData.edges.map((edge: GraphEdge, i: number) => {
        const isHighlighted =
          selectedNodeId !== null &&
          (edge.source === selectedNodeId || edge.target === selectedNodeId);
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
