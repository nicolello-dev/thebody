import React, { Suspense, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FaCloud } from "react-icons/fa";

export default function Map() {
  const [cloudsEnabled, setCloudsEnabled] = useState(true);

  // Offset orizzontale per spostare il pianeta e l’overlay
  const offsetX = 500; // in px

  // Costante debug per il terreno
  const TERRAIN = "/terrain-template.png";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Sfondo fullscreen rimane centrato */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "url(/bg.png) center/cover no-repeat",
          zIndex: 0,
        }}
      />

      {/* Overlay planetbg, allineato al Canvas */}
      <img
        src="/planetbg.png"
        alt="overlay planet"
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(50% + ${offsetX}px)`,
          width: "950px",
          height: "auto",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 1,
          opacity: 0.2,
        }}
      />

      {/* Pulsante toggle nuvole */}
      <button
        style={{
          position: "absolute",
          bottom: 260,
          left: `calc(50% + ${offsetX + 220}px)`,
          zIndex: 3,
          width: 65,
          height: 65,
          borderRadius: 24,
          border: "none",
          background: "url(/hexbg.png) center/cover no-repeat",
          color: "lightblue",
          cursor: "pointer",
          fontSize: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
        onClick={() => setCloudsEnabled((v) => !v)}
        aria-label={cloudsEnabled ? "Disattiva nuvole" : "Riattiva nuvole"}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <span style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <FaCloud />
          </span>
          {!cloudsEnabled && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                height: 3,
                backgroundColor: "lightblue",
                transform: "translateY(-50%) rotate(-20deg)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </button>

      {/* Canvas 3D, centrato sull’overlay e pianeta */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(50% + ${offsetX}px)`,
          transform: "translate(-50%, -50%)",
          width: 1900,
          height: 1900,
          zIndex: 2,
        }}
      >
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
          {/* Luci più brillanti e con ombre */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[0, -5, 0]} // Polo Sud
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-radius={4}
          />
          <pointLight position={[2, 2, 3]} intensity={0.8} color={"#ffffff"} />

          <Suspense fallback={null}>
            <PlanetScene cloudsEnabled={cloudsEnabled} />
          </Suspense>

          <OrbitControls enableZoom={false} />
        </Canvas>

      
        
      </div>
    </div>
  );
}

function PlanetScene({ cloudsEnabled }: { cloudsEnabled: boolean }) {
  // carico texture del pianeta e delle nuvole
  const [planetMap, cloudMap] = useTexture(["/planet_diffuse.png", "/planet_clouds.png"]);
  return <Planet cloudsEnabled={cloudsEnabled} planetMap={planetMap} cloudMap={cloudMap} />;
}

function Planet({
  cloudsEnabled,
  planetMap,
  cloudMap,
}: {
  cloudsEnabled: boolean;
  planetMap: THREE.Texture;
  cloudMap: THREE.Texture;
}) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (cloudRef.current && cloudsEnabled) {
      cloudRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <>
      <mesh ref={planetRef} geometry={new THREE.SphereGeometry(1, 64, 64)}>
        <meshStandardMaterial map={planetMap} metalness={0.2} roughness={0.7}  />
      </mesh>

      {cloudsEnabled && (
        <mesh ref={cloudRef} geometry={new THREE.SphereGeometry(1.01, 64, 64)}>
          <meshStandardMaterial map={cloudMap} transparent depthWrite={false} opacity={0.9} />
        </mesh>
      )}
    </>
  );
}
