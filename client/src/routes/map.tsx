import React, { Suspense, useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { FaCloud, FaBorderAll } from "react-icons/fa";
import TerminalLogs from "../components/terminallogs";

// Debug: griglia di rivelazione della mappa (UV space)
export const REVEAL_COLS = 16;
export const REVEAL_ROWS = 8;
// Elenco celle (x,y) sbloccate - modificabile per debug
export const DEBUG_REVEALED_CELLS: Array<[number, number]> = [
  [1, 2],
  [3, 1],
];

// Debug: calibrazione allineamento UV nuvole rispetto alla griglia del pianeta
export const CLOUD_UV_OFFSET_U = 0.0; // in giri [0..1]
export const CLOUD_UV_FLIP_X = true;
export const CLOUD_UV_FLIP_Y = false;

export default function Map() {
  const [cloudsEnabled, setCloudsEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);

  // Offset orizzontale per spostare il pianeta e l’overlay
  const offsetX = 800; // in px

  // Costante debug per il terreno
  const TERRAIN = "/terrain-template.png";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Keyframes to rotate overlays around their own center while staying centered on screen */}
      <style>
        {`
          @keyframes spinAroundCenter {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
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

      {/* Tre layer PNG sovrapposti dietro al pianeta, ognuno ruota a velocità diversa */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(50% + ${offsetX}px)`,
          width: "1600px",
          height: "auto",
          transform: "translate(-50%, -50%)",
          animation: "spinAroundCenter 180s linear infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <img
          src="/planetbgdown.png"
          alt="overlay planet down"
          style={{ width: "1600px", height: "auto", display: "block", mixBlendMode: "screen" }}
        />
      </div>

      {/* Topology container in alto a sinistra */}
      <img
        src="/bg-topologycontainer.png"
        alt="topology container"
        style={{
          position: "absolute",
          top: 100,
          bottom: 25,
          right: "55%",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Terminal logs overlay sopra il topology container */}
      <div style={{ position: "absolute", top: 175, left: 0, right: 1100, zIndex: 4, pointerEvents: "none" }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <TerminalLogs />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(50% + ${offsetX}px)`,
          width: "1600px",
          height: "auto",
          transform: "translate(-50%, -50%)",
          animation: "spinAroundCenter 60s linear infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <img
          src="/planetbgup.png"
          alt="overlay planet up"
          style={{ width: "1600px", height: "auto", display: "block", mixBlendMode: "screen" }}
        />
      </div>

      {/* Controlli centrati: nuvole e griglia affiancati */}
      <div
        style={{
          position: "absolute",
          top: 980,
          left: "40%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          gap: 16,
          zIndex: 3,
        }}
      >
        <button
          style={{
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
        <button
          style={{
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
          onClick={() => setGridEnabled((v) => !v)}
          aria-label={gridEnabled ? "Disattiva griglia" : "Riattiva griglia"}
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <span style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <FaBorderAll />
            </span>
            {!gridEnabled && (
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
      </div>

      {/* Canvas 3D, centrato sull’overlay e pianeta */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(50% + ${offsetX}px)`,
          transform: "translate(-50%, -50%)",
          width: 2200,
          height: 2200,
          zIndex: 2,
        }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.NoToneMapping;
          }}
        >
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
            <PlanetScene cloudsEnabled={cloudsEnabled} gridEnabled={gridEnabled} />
          </Suspense>

          <OrbitControls enableZoom={false} />
        </Canvas>

      
        
      </div>
    </div>
  );
}

function PlanetScene({ cloudsEnabled, gridEnabled }: { cloudsEnabled: boolean; gridEnabled: boolean }) {
  // carico texture del pianeta, delle nuvole e dei tile bloccati
  const [planetMap, cloudMap, lockedMap] = useTexture([
    "/planet_diffuse.png",
    "/planet_clouds.png",
    "/planet-locked.png",
  ]);
  // Ensure correct color space and filtering
  useMemo(() => {
    planetMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    lockedMap.colorSpace = THREE.SRGBColorSpace;
    planetMap.anisotropy = 8;
    cloudMap.anisotropy = 4;
    lockedMap.anisotropy = 8;
    planetMap.needsUpdate = true;
    cloudMap.needsUpdate = true;
    lockedMap.needsUpdate = true;
  }, [planetMap, cloudMap, lockedMap]);
  return (
    <Planet
      cloudsEnabled={cloudsEnabled}
      gridEnabled={gridEnabled}
      planetMap={planetMap}
      cloudMap={cloudMap}
      lockedMap={lockedMap}
    />
  );
}

function Planet({
  cloudsEnabled,
  gridEnabled,
  planetMap,
  cloudMap,
  lockedMap,
}: {
  cloudsEnabled: boolean;
  gridEnabled: boolean;
  planetMap: THREE.Texture;
  cloudMap: THREE.Texture;
  lockedMap: THREE.Texture;
}) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  // Build reveal mask texture from debug cells
  const revealMask = useMemo(() => {
    const w = REVEAL_COLS, h = REVEAL_ROWS;
    const data = new Uint8Array(w * h * 4);
    // Default locked (0)
    for (let i = 0; i < w * h; i++) {
      data[i * 4 + 0] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
    // Mark revealed cells
    for (const [cx, cy] of DEBUG_REVEALED_CELLS) {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
        const idx = cy * w + cx;
        data[idx * 4 + 0] = 255; // red channel marks reveal
        data[idx * 4 + 1] = 0;
        data[idx * 4 + 2] = 0;
        data[idx * 4 + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // Dev helper to add cells at runtime: window.revealCell(x,y)
    (window as any).revealCell = (cx: number, cy: number) => {
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
        const idx = cy * w + cx;
        data[idx * 4 + 0] = 255;
        data[idx * 4 + 3] = 255;
        tex.needsUpdate = true;
        console.log("Revealed cell", cx, cy);
      }
    };
    // Reveal all cells quickly for debugging
    (window as any).revealAll = () => {
      for (let i = 0; i < w * h; i++) {
        data[i * 4 + 0] = 255;
        data[i * 4 + 3] = 255;
      }
      tex.needsUpdate = true;
      console.log("All cells revealed");
    };
    return tex;
  }, []);

  // Hologram shader material for the planet (scanlines + fresnel glow + tint)
  const holoMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: planetMap },
        uLockedTexture: { value: lockedMap },
        uRevealMask: { value: revealMask },
        uGridSize: { value: new THREE.Vector2(REVEAL_COLS, REVEAL_ROWS) },
        uBlurStrength: { value: 0.01 }, // unused when darkening/locked texture, kept for future
        uBlurSamples: { value: 6.0 },
        // Less intense color tint (#152f49)
        uTint: { value: new THREE.Color(0x152f49) },
        uOpacity: { value: 0.85 },
        uLineFrequency: { value: 120.0 },
        // Make scanlines less intrusive
    uLineStrength: { value: 0.15 },
        // Softer rim glow
        uGlowStrength: { value: 0.35 },
  // Grid controls - match reveal grid
  uGridCountU: { value: REVEAL_COLS },
  uGridCountV: { value: REVEAL_ROWS },
    uGridWidth: { value: 0.006 },
    uGridIntensity: { value: 0.45 },
        // Grid style & effects
    uGridColor: { value: new THREE.Color(0xdfffff) },
    uGridGlow: { value: 0.3 },
        uGlitchStrength: { value: 0.01 },
        uGlitchSpeed: { value: 0.5 },
        uFlickerSpeed: { value: 10.0 },
        uFlickerIntensity: { value: 5 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vFresnel;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position; // object-space position on sphere
          vec3 n = normalize(normalMatrix * normal);
          vec3 v = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
          vFresnel = pow(1.0 - max(dot(n, v), 0.0), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uLockedTexture;
        uniform sampler2D uRevealMask;
        uniform float uTime;
        uniform vec3 uTint;
        uniform float uOpacity;
        uniform float uLineFrequency;
        uniform float uLineStrength;
        uniform float uGlowStrength;
        uniform float uGridCountU;
        uniform float uGridCountV;
        uniform float uGridWidth;
        uniform float uGridIntensity;
        uniform vec3 uGridColor;
        uniform float uGridGlow;
        uniform float uGlitchStrength;
        uniform float uGlitchSpeed;
        uniform float uFlickerSpeed;
        uniform float uFlickerIntensity;
  uniform vec2 uGridSize; // reveal grid (cols, rows)
  uniform float uBlurStrength;
  uniform float uBlurSamples;
        varying vec2 vUv;
        varying float vFresnel;
        varying vec3 vPos;

        const float PI = 3.14159265359;

        float hash(float x) { return fract(sin(x) * 43758.5453); }

        float gridLine(float coord, float count, float width) {
          float x = fract(coord * count);
          float edge = min(x, 1.0 - x);
          return smoothstep(width, 0.0, edge);
        }
        float gridGlowLine(float coord, float count, float width, float glow) {
          float x = fract(coord * count);
          float edge = min(x, 1.0 - x);
          return smoothstep(width * glow, 0.0, edge);
        }
  // No blur function needed when using locked texture

        void main() {
          vec2 uv = vUv;
          // Determine reveal cell from uv
          vec2 grid = uGridSize;
          vec2 cell = floor(uv * grid);
          vec2 cellUV = (cell + 0.5) / grid;
          float revealed = texture2D(uRevealMask, cellUV).r; // 1 if revealed

          // For unrevealed, use locked texture; for revealed, use clean diffuse
          vec4 tex;
          if (revealed > 0.5) {
            tex = texture2D(uTexture, uv);
          } else {
            tex = texture2D(uLockedTexture, uv);
          }

          // Scanlines
          float lines = 0.5 + 0.5 * sin(vUv.y * uLineFrequency + uTime * 8.0);
          float lineMask = mix(1.0 - uLineStrength, 1.0, lines);

          // Fresnel rim glow
          vec3 glow = uTint * vFresnel * uGlowStrength;
          // Base color with subtle tint
          vec3 base = mix(tex.rgb, uTint, 0.15);
          vec3 color = (base * lineMask) + glow;

          // UV-grid overlay to perfectly match reveal grid
          float gU = gridLine(vUv.x, uGridCountU, uGridWidth);
          float gV = gridLine(vUv.y, uGridCountV, uGridWidth);
          float gridMask = max(gU, gV);
          // Wider glow around lines
          float gUGlow = gridGlowLine(vUv.x, uGridCountU, uGridWidth, 3.0);
          float gVGlow = gridGlowLine(vUv.y, uGridCountV, uGridWidth, 3.0);
          float gridGlowMask = max(gUGlow, gVGlow);

          // Flicker to make grid feel alive
          float flicker = 1.0 + uFlickerIntensity * (0.5 + 0.5 * sin(uTime * uFlickerSpeed + vUv.y * 20.0));
          vec3 gridCol = uGridColor * (gridMask * uGridIntensity * flicker) + uGridColor * (gridGlowMask * uGridGlow);
          color += gridCol; // additive for bright grid

          // Alpha without appearance mask
          float alpha = uOpacity;

          gl_FragColor = vec4(color, alpha);
        }
      `,
  transparent: true,
  blending: THREE.NormalBlending,
      depthWrite: true,
    });
    return material;
  }, [planetMap, lockedMap]);

  // Clouds shader: show only in revealed cells, fully hide elsewhere
  const cloudsMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: cloudMap },
        uRevealMask: { value: revealMask },
        uGridSize: { value: new THREE.Vector2(REVEAL_COLS, REVEAL_ROWS) },
        uOpacity: { value: 0.9 },
        uUVOffsetU: { value: CLOUD_UV_OFFSET_U },
        uFlipX: { value: CLOUD_UV_FLIP_X ? 1.0 : 0.0 },
        uFlipY: { value: CLOUD_UV_FLIP_Y ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uRevealMask;
        uniform vec2 uGridSize;
        uniform float uOpacity;
        uniform float uUVOffsetU;
        uniform float uFlipX;
        uniform float uFlipY;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        const float PI = 3.14159265359;
        void main() {
          // Compute planet-anchored uv matching planet mapping (lon/lat via atan/asin)
          vec3 p = normalize(vWorldPos);
          float lon = atan(p.z, p.x);
          float lat = asin(clamp(p.y, -1.0, 1.0));
          float u = (lon + PI) / (2.0 * PI);
          float v = (lat + 0.5 * PI) / PI;
          // Apply flips and offset for calibration
          if (uFlipX > 0.5) u = 1.0 - u;
          if (uFlipY > 0.5) v = 1.0 - v;
          u = fract(u + uUVOffsetU);
          vec2 uvPlanet = vec2(u, v);

          vec2 grid = uGridSize;
          vec2 cell = floor(uvPlanet * grid);
          vec2 cellUV = (cell + 0.5) / grid;
          float revealed = texture2D(uRevealMask, cellUV).r;
          vec4 tex = texture2D(uTexture, vUv);
          // Hide outside revealed cells
          float a = tex.a * uOpacity * step(0.5, revealed);
          if (a <= 0.0) discard;
          gl_FragColor = vec4(tex.rgb, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    return material;
  }, [cloudMap, revealMask]);

  // Toggle grid by updating shader uniforms based on prop
  useEffect(() => {
    if (!holoMaterial) return;
    (holoMaterial.uniforms.uGridIntensity as any).value = gridEnabled ? 0.45 : 0.0;
    (holoMaterial.uniforms.uGridGlow as any).value = gridEnabled ? 0.3 : 0.0;
  }, [gridEnabled, holoMaterial]);

  useFrame((_, delta) => {
    // Animate hologram
    if (holoMaterial) {
      (holoMaterial.uniforms.uTime as any).value += delta;
    }
    if (cloudRef.current && cloudsEnabled) {
      cloudRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <>
      <mesh ref={planetRef} geometry={new THREE.SphereGeometry(1, 64, 64)}>
        <primitive attach="material" object={holoMaterial} />
      </mesh>

      {cloudsEnabled && (
        <mesh ref={cloudRef} geometry={new THREE.SphereGeometry(1.002, 64, 64)}>
          <primitive attach="material" object={cloudsMaterial} />
        </mesh>
      )}
    </>
  );
}
