import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, Html, useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { Calendar, MapPin, Ticket, ArrowRight, AlertTriangle } from 'lucide-react';

const MOCK_EVENTS = [
  { id: 1, title: "Campus Tech Summit 2026", date: "Oct 15, 2026", venue: "Innovation Hall A", price: 45.00, capacity: 500, available: 12 },
  { id: 2, title: "Spring Career Fair", date: "Nov 02, 2026", venue: "Main Arena", price: 0, capacity: 2000, available: 450 },
  { id: 3, title: "Web3 Developer Conference", date: "Dec 10, 2026", venue: "Virtual / Hall C", price: 120.00, capacity: 300, available: 5 },
  { id: 4, title: "AI Research Symposium", date: "Jan 15, 2027", venue: "Science Building", price: 85.00, capacity: 400, available: 150 },
  { id: 5, title: "Global Business Expo", date: "Feb 20, 2027", venue: "City Convention Center", price: 200.00, capacity: 5000, available: 2000 }
];

function EventCard3D({ event, index, total, onBook }) {
  const meshRef = useRef();
  const scroll = useScroll();
  const { viewport, mouse } = useThree();
  
  const [hovered, setHovered] = useState(false);

  // Position logic
  const zSpacing = 4;
  const startZ = -index * zSpacing;
  
  // Create a target quaternion for smooth rotation
  const targetRotation = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // 1. Z-axis Parallax Scrolling
    // As the user scrolls (0 to 1), move the cards forward along the Z axis
    const scrollOffset = scroll.offset * (total * zSpacing);
    meshRef.current.position.z = startZ + scrollOffset;
    
    // Calculate how close the card is to the camera (z=0)
    const distanceToCamera = Math.abs(meshRef.current.position.z);
    
    // Fade out / scale down if it goes past the camera (z > 2) or is too far
    if (meshRef.current.position.z > 2) {
      meshRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    } else {
      // Normal scale based on hover
      const scale = hovered ? 1.05 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }

    // 2. Micro-tilts based on cursor coordinates
    // We only apply strong tilt to the cards near the focal point (-2 < z < 1)
    if (distanceToCamera < 4) {
       const tiltX = (mouse.y * Math.PI) / 8;
       const tiltY = (mouse.x * Math.PI) / 8;
       
       const euler = new THREE.Euler(tiltX, tiltY, 0);
       targetRotation.setFromEuler(euler);
    } else {
       targetRotation.setFromEuler(new THREE.Euler(0, 0, 0));
    }

    // Smoothly interpolate current rotation to target rotation
    meshRef.current.quaternion.slerp(targetRotation, 0.1);
  });

  return (
    <group ref={meshRef} position={[0, 0, startZ]}>
      {/* 3D Mesh representing the physical card */}
      <mesh 
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <planeGeometry args={[viewport.width > 8 ? 6 : viewport.width * 0.8, 3.5]} />
        <meshStandardMaterial 
          color={hovered ? '#1e1b4b' : '#0f172a'} 
          transparent 
          opacity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* HTML Overlay mapped precisely to the 3D card */}
      <Html 
        transform 
        occlude 
        position={[0, 0, 0.01]} 
        className="w-[600px] h-[350px] pointer-events-none select-none max-w-full"
      >
        <div className={`w-full h-full p-8 flex flex-col justify-between border-2 rounded-2xl transition-all duration-300 ${hovered ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'border-slate-700/50'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-medium text-slate-300 mb-4 shadow-xl">
                <Ticket className="w-3 h-3 text-indigo-400" />
                <span>Event ID: {event.id.toString().padStart(4, '0')}</span>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">{event.title}</h2>
            </div>
            {event.available < 20 && (
              <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold text-rose-300">Only {event.available} left!</span>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center space-x-3 text-slate-300 text-lg">
              <Calendar className="w-5 h-5 text-indigo-400 drop-shadow-md" />
              <span className="font-medium drop-shadow-md">{event.date}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300 text-lg">
              <MapPin className="w-5 h-5 text-indigo-400 drop-shadow-md" />
              <span className="font-medium drop-shadow-md">{event.venue}</span>
            </div>
          </div>

          <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-700/50">
            <div className="text-3xl font-black text-white drop-shadow-xl">
              {event.price === 0 ? "FREE" : `$${event.price.toFixed(2)}`}
            </div>
            {/* Using pointer-events-auto so the button is clickable despite the container being pointer-events-none */}
            <button 
              onClick={(e) => { e.stopPropagation(); onBook(event); }}
              className="pointer-events-auto flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] hover:scale-105"
            >
              <span>Book Ticket</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Html>
    </group>
  );
}

export default function EventLanding3D({ onBookTicket }) {
  return (
    <div className="w-full h-full bg-slate-950 relative">
      {/* 2D Overlay Instructions */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-600 tracking-tighter opacity-20 transform -rotate-90 origin-left">
          SCROLL TO EXPLORE
        </h1>
      </div>

      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#6366f1" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#3b82f6" />
        <fog attach="fog" args={['#020617', 5, 20]} />

        {/* ScrollControls allows us to scroll through the 3D scene. 
            pages determines how long the scroll is relative to viewport height. */}
        <ScrollControls pages={MOCK_EVENTS.length * 0.8} damping={0.2}>
          <Scroll>
            {MOCK_EVENTS.map((event, index) => (
              <EventCard3D 
                key={event.id} 
                event={event} 
                index={index} 
                total={MOCK_EVENTS.length}
                onBook={onBookTicket}
              />
            ))}
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
