/**
 * 3D Memory Palace visualization using Three.js
 */
import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/services/store';

interface Room3DProps {
  room: {
    id: string;
    name: string;
    description: string;
    notes: string[];
    position: { x: number; y: number; z: number };
    color: string;
    connections: string[];
  };
  isActive: boolean;
  onClick: () => void;
}

// Individual room component
function Room3D({ room, isActive, onClick }: Room3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Gentle floating animation
    meshRef.current.position.y = room.position.y + Math.sin(state.clock.elapsedTime + room.position.x) * 0.1;

    // Scale effect when active or hovered
    const targetScale = isActive ? 1.3 : hovered ? 1.15 : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    // Gentle rotation
    if (isActive) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {/* Main room cube */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color={room.color}
          emissive={room.color}
          emissiveIntensity={isActive ? 0.5 : hovered ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={isActive ? 1 : hovered ? 0.9 : 0.7}
        />
      </mesh>

      {/* Room label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {room.name}
      </Text>

      {/* Note count badge */}
      {room.notes.length > 0 && (
        <Html position={[0.9, 0.9, 0]} center>
          <div className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            {room.notes.length}
          </div>
        </Html>
      )}

      {/* Hover/Active info */}
      {(hovered || isActive) && (
        <Html position={[0, -1.2, 0]} center>
          <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-xl max-w-xs text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300">{room.description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Connection lines between rooms
function ConnectionLines({ rooms }: { rooms: any[] }) {
  const roomPositions = new Map(
    rooms.map((r) => [r.id, new THREE.Vector3(r.position.x, r.position.y, r.position.z)])
  );

  return (
    <group>
      {rooms.map((room) =>
        room.connections.map((connectedId: string) => {
          const startPos = roomPositions.get(room.id);
          const endPos = roomPositions.get(connectedId);

          if (!startPos || !endPos) return null;

          const points = [startPos, endPos];
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

          return (
            <line key={`${room.id}-${connectedId}`} geometry={lineGeometry}>
              <lineBasicMaterial
                color="#64748b"
                opacity={0.3}
                transparent
                linewidth={1}
              />
            </line>
          );
        })
      )}
    </group>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="spinner !w-12 !h-12 border-primary-600" />
        <p className="text-white text-sm font-medium">Loading Memory Palace...</p>
      </div>
    </Html>
  );
}

// Main 3D canvas component
interface MemoryPalace3DProps {
  onRoomClick?: (roomId: string) => void;
}

export default function MemoryPalace3D({ onRoomClick }: MemoryPalace3DProps) {
  const { memoryPalace, currentRoom, setCurrentRoom } = useAppStore();

  if (!memoryPalace || !memoryPalace.rooms.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Memory Palace Yet</h3>
          <p className="text-slate-300">
            Upload some notes to get started building your palace
          </p>
        </div>
      </div>
    );
  }

  const handleRoomClick = (roomId: string) => {
    setCurrentRoom(currentRoom === roomId ? null : roomId);
    onRoomClick?.(roomId);
  };

  return (
    <div className="w-full h-full canvas-container">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={<LoadingFallback />}>
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={60} />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#4F46E5" />
          <spotLight
            position={[0, 15, 0]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
            castShadow
          />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.1}
              roughness={0.8}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Grid helper */}
          <gridHelper args={[50, 50, '#475569', '#334155']} position={[0, -1.99, 0]} />

          {/* Rooms */}
          {memoryPalace.rooms.map((room) => (
            <Room3D
              key={room.id}
              room={room}
              isActive={currentRoom === room.id}
              onClick={() => handleRoomClick(room.id)}
            />
          ))}

          {/* Connection lines */}
          <ConnectionLines rooms={memoryPalace.rooms} />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 glass p-4 rounded-lg text-white max-w-xs">
        <h3 className="font-bold mb-2">Memory Palace</h3>
        <p className="text-sm opacity-90">
          {memoryPalace.rooms.length} rooms • {Object.keys(memoryPalace.notes_index).length} notes
        </p>
        <p className="text-xs opacity-75 mt-2">
          Click rooms to explore • Drag to rotate • Scroll to zoom
        </p>
      </div>

      {/* Mobile controls hint */}
      <div className="absolute bottom-4 right-4 glass p-3 rounded-lg text-white text-xs md:hidden">
        <p>📱 Touch to rotate</p>
        <p>🤏 Pinch to zoom</p>
      </div>
    </div>
  );
}
