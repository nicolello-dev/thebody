import { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FaCloud, FaBorderAll, FaMapMarkerAlt, FaTimes, FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa';
import TerminalLogs from '../components/terminallogs';
import { useUser } from '../context/user';

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

// Marker types
interface MapMarker {
  id: string;
  name: string;
  position: THREE.Vector3;
  color: string;
  description?: string;
}

// Available marker colors
const MARKER_COLORS = [
  { name: 'Bianco', value: '#dfffff' },
  { name: 'Acqua', value: '#60fcd5' },
  { name: 'Azzurro', value: '#72dff8' },
  { name: 'Arancione', value: '#ffa955' },
];

const MARKERS_STORAGE_KEY = 'thebody.mapMarkers';

export default function Map() {
  const { user } = useUser();
  const [cloudsEnabled, setCloudsEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [markerPlacementMode, setMarkerPlacementMode] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [markerPopup, setMarkerPopup] = useState<{
    position: THREE.Vector3;
    screenPos: { x: number; y: number };
  } | null>(null);
  const [editingMarker, setEditingMarker] = useState<{
    name: string;
    color: string;
    description: string;
  }>({ name: '', color: '#dfffff', description: '' });
  const [tempXMarker, setTempXMarker] = useState<{ position: THREE.Vector3; screenPos: { x: number; y: number } } | null>(null);
  const [viewingMarker, setViewingMarker] = useState<{
    marker: MapMarker;
    screenPos: { x: number; y: number };
  } | null>(null);

  // Format description: capitalize first letter and ensure ending punctuation
  const formatDescription = (text: string): string => {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    const endsWithPunct = /[.!?…]$/.test(capped);
    return endsWithPunct ? capped : capped + '.';
  };
  const [controlsDisabled, setControlsDisabled] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // Load markers from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MARKERS_STORAGE_KEY);
      if (saved) {
        const parsedMarkers = JSON.parse(saved);
        // Convert position arrays back to Vector3 and normalize to surface
        const reconstructedMarkers = parsedMarkers.map((m: any) => ({
          ...m,
          position: new THREE.Vector3(m.position.x, m.position.y, m.position.z).normalize()
        }));
        setMarkers(reconstructedMarkers);
      }
    } catch (error) {
      console.error('Failed to load markers:', error);
    }
  }, []);

  // Save markers to localStorage whenever markers change
  useEffect(() => {
    try {
      localStorage.setItem(MARKERS_STORAGE_KEY, JSON.stringify(markers));
    } catch (error) {
      console.error('Failed to save markers:', error);
    }
  }, [markers]);

  const handleMarkerPlaced = (position: THREE.Vector3, screenPos: { x: number; y: number }) => {
    // Normalize the position to ensure it's on the unit sphere
    const normalizedPosition = position.clone().normalize();
    setTempXMarker({ position: normalizedPosition, screenPos });
    setControlsDisabled(true);
    setMarkerPopup({ position: normalizedPosition, screenPos });
    setEditingMarker({ name: '', color: '#dfffff', description: '' });
  };

  const confirmCreateMarker = () => {
    if (markerPopup && editingMarker.name.trim()) {
      const newMarker: MapMarker = {
        id: Date.now().toString(),
        position: markerPopup.position.clone().normalize(),
        name: editingMarker.name,
        color: editingMarker.color,
        description: editingMarker.description,
      };
      const updatedMarkers = [...markers, newMarker];
      setMarkers(updatedMarkers);
      localStorage.setItem(MARKERS_STORAGE_KEY, JSON.stringify(updatedMarkers));
      setMarkerPopup(null);
      setEditingMarker({ name: '', color: MARKER_COLORS[0].value, description: '' });
      setTempXMarker(null);
      setControlsDisabled(false);
      setMarkerPlacementMode(false);
    }
  };

  // Handler per il click sui marker - versione globale
  const handleGlobalMarkerClick = (markerId: string) => {
    const marker = markers.find(m => m.id === markerId);
    if (marker) {
      setViewingMarker({ 
        marker, 
        screenPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      });
    }
  };

  // Rendi la funzione globalmente accessibile
  useEffect(() => {
    (window as any).handleMarkerClick = handleGlobalMarkerClick;
    (window as any).setHoveredMarkerId = setHoveredMarkerId;
    return () => {
      delete (window as any).handleMarkerClick;
      delete (window as any).setHoveredMarkerId;
    };
  }, [markers]);

  const cancelCreateMarker = () => {
    setMarkerPopup(null);
    setEditingMarker({ name: '', color: MARKER_COLORS[0].value, description: '' });
    setTempXMarker(null);
    setControlsDisabled(false);
    setMarkerPlacementMode(false);
  };

  const deleteMarker = (markerId: string) => {
    const updatedMarkers = markers.filter(m => m.id !== markerId);
    setMarkers(updatedMarkers);
    localStorage.setItem(MARKERS_STORAGE_KEY, JSON.stringify(updatedMarkers));
    setViewingMarker(null);
  };

  const closeViewMarker = () => {
    setViewingMarker(null);
  };

  // Offset orizzontale per spostare il pianeta e l'overlay
  const offsetX = 800; // in px

  // Costante debug per il terreno
  const TERRAIN = '/terrain-template.png';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: viewingMarker ? 'none' : 'auto',
      }}
    >
      {/* Keyframes to rotate overlays around their own center while staying centered on screen */}
      <style>
        {`
          @keyframes spinAroundCenter {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes pulse {
            0% { opacity: 1; transform: translateX(-50%) scale(1); }
            50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
            100% { opacity: 1; transform: translateX(-50%) scale(1); }
          }
          @keyframes hexGlow {
            0% { box-shadow: 0 0 20px rgba(0, 188, 212, 0.3), inset 0 0 20px rgba(0, 188, 212, 0.1); }
            50% { box-shadow: 0 0 30px rgba(0, 188, 212, 0.6), inset 0 0 30px rgba(0, 188, 212, 0.2); }
            100% { box-shadow: 0 0 20px rgba(0, 188, 212, 0.3), inset 0 0 20px rgba(0, 188, 212, 0.1); }
          }
          .hexagon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, rgba(223, 255, 255, 0.2), rgba(223, 255, 255, 0.1));
            position: relative;
            border: 2px solid #dfffff;
            transition: all 0.3s ease;
          }
          .hexagon-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #dfffff;
            font-size: 16px;
            z-index: 10;
          }
          .hexagon:hover {
            transform: scale(1.05);
          }
          @keyframes markerPulse {
            0% { 
              transform: scale(1); 
              opacity: 1; 
            }
            50% { 
              transform: scale(1.2); 
              opacity: 0.8; 
            }
            100% { 
              transform: scale(1); 
              opacity: 1; 
            }
          }
          @keyframes markerPulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes markerRipple {
            0% {
              width: 6px;
              height: 6px;
              opacity: 0.8;
            }
            50% {
              width: 28px;
              height: 28px;
              opacity: 0.4;
            }
            100% {
              width: 40px;
              height: 40px;
              opacity: 0;
            }
          }
          
          @media (max-width: 768px) {
            .hexagon {
              width: 45px;
              height: 39px;
              margin: 20px 0;
            }
            .hexagon:before,
            .hexagon:after {
              border-left: 24px solid transparent;
              border-right: 24px solid transparent;
            }
            .hexagon:before {
              border-bottom: 20px solid rgba(0, 188, 212, 0.4);
            }
            .hexagon:after {
              border-top: 20px solid rgba(0, 188, 212, 0.4);
            }
          }
          
          @media (max-height: 600px) {
            .hexagon {
              width: 40px;
              height: 34px;
              margin: 15px 0;
            }
            .hexagon:before,
            .hexagon:after {
              border-left: 20px solid transparent;
              border-right: 20px solid transparent;
            }
            .hexagon:before {
              border-bottom: 17px solid rgba(0, 188, 212, 0.4);
            }
            .hexagon:after {
              border-top: 17px solid rgba(0, 188, 212, 0.4);
            }
          }
        `}
      </style>
      {/* Sfondo fullscreen rimane centrato */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'url(/bg.png) center/cover no-repeat',
          zIndex: 0,
        }}
      />

      {/* Tre layer PNG sovrapposti dietro al pianeta, ognuno ruota a velocità diversa */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          width: '1600px',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          animation: 'spinAroundCenter 180s linear infinite',
          pointerEvents: 'none',
          zIndex: 0.8,
        }}
      >
        <img
          src='/planetbgdown.png'
          alt='overlay planet down'
          style={{
            width: '1600px',
            height: 'auto',
            display: 'block',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Topology container in alto a sinistra */}
      <img
        src='/bg-topologycontainer.png'
        alt='topology container'
        style={{
          position: 'absolute',
          top: 60,
          bottom: 25,
          left: 350,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Wandering cursor just above topology container */}
      <img
        src='/wanderingcursor.png'
        alt='wandering cursor'
        style={{
          position: 'absolute',
          bottom: '11%',
          left: '450px',
          transform: 'translateX(-50%)',
          zIndex: 4,
          pointerEvents: 'none',
          animation: 'wanderHorizontal 3s ease-in-out infinite alternate',
        }}
      />
      
      <style>{`
        @keyframes wanderHorizontal {
          0% {
            left: 450px;
          }
          100% {
            left: 495px;
          }
        }
      `}</style>

      {/* Bgmegatracker background for small planet */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: 597,
          transform: 'translate(-50%, -50%)',
          zIndex: 3.5,
          pointerEvents: 'none',
          width: '442px',
          height: '442px',
        }}
      >
        <img
          src="/bgmegatracker.png"
          alt="planet background"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            display: 'block',
            opacity: 0.5,
            width: '442px',
            height: '442px',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Small Planetary Model */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: 597,
          transform: 'translate(-50%, -50%)',
          width: '5px',
          height: '5px',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '406px',
            height: '406px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <Canvas
            dpr={[1, 1]}
            camera={{
              position: [0, 0, 2.5],
              fov: 45,
            }}
            gl={{ 
              alpha: true, 
              antialias: true,
              preserveDrawingBuffer: true 
            }}
            style={{
              background: 'transparent',
              width: '100%',
              height: '100%',
            }}
          >
          {/* Same lighting as main planet */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[0, -5, 0]} // Polo Sud
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight
            position={[0, 5, 0]} // Polo Nord
            intensity={0.8}
          />
          <pointLight position={[5, 0, 5]} intensity={0.6} color="#ffffff" />
          <pointLight position={[-5, 0, -5]} intensity={0.4} color="#4a9eff" />
          <Suspense fallback={null}>
            {/* <SmallPlanet /> */}
          </Suspense>
        </Canvas>
        </div>
      </div>

      {/* Terminal logs overlay sopra il topology container */}
      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 0,
          right: 1100,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'none' }}>
          <TerminalLogs />
        </div>
      </div>

      {/* Bgmegatracker background for main planet */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          width: '1600px',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          animation: 'spinAroundCenter 60s linear infinite',
          pointerEvents: 'none',
          zIndex: 0.5,
        }}
      >
      </div>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          width: '1600px',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          animation: 'spinAroundCenter 60s linear infinite',
          pointerEvents: 'none',
          zIndex: 0.9,
        }}
      >
        <img
          src='/planetbgup.png'
          alt='overlay planet up'
          style={{
            width: '1600px',
            height: 'auto',
            display: 'block',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Planetbggrid - same position as planetbgup but behind planet without rotation */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          width: '1600px',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1.2,
        }}
      >
        <img
          src='/planetbggrid.png'
          alt='planet background grid'
          style={{
            width: '1600px',
            height: 'auto',
            display: 'block',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Controlli esagonali allineati con topology container */}
      <div
        style={{
          position: 'absolute',
          bottom: '45px',
          left: '350px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          zIndex: 3,
          maxWidth: '90vw',
          justifyContent: 'flex-start',
        }}
      >
        {/* Clouds Toggle */}
        <button
          onClick={() => setCloudsEnabled(v => !v)}
          aria-label={cloudsEnabled ? 'Disattiva nuvole' : 'Riattiva nuvole'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div className="hexagon" style={{
            borderColor: cloudsEnabled ? '#dfffff' : '#152f49',
            background: cloudsEnabled 
              ? 'linear-gradient(135deg, rgba(223, 255, 255, 0.2), rgba(223, 255, 255, 0.1))'
              : 'linear-gradient(135deg, rgba(21, 47, 73, 0.2), rgba(21, 47, 73, 0.1))'
          }}>
            <div className="hexagon-content" style={{
              color: cloudsEnabled ? '#dfffff' : '#152f49'
            }}>
              <FaCloud />
            </div>
          </div>
        </button>

        {/* Clouds Label */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: '48px',
          color: cloudsEnabled ? '#dfffff' : '#152f49',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginLeft: '6px',
          marginRight: '15px',
          fontFamily: 'Eurostile, sans-serif',
        }}>
          <div style={{ fontSize: '16px', lineHeight: '1' }}>TOGGLE</div>
          <div style={{ fontSize: '12px', lineHeight: '1' }}>NUVOLE</div>
        </div>

        {/* Grid Toggle */}
        <button
          onClick={() => setGridEnabled(v => !v)}
          aria-label={gridEnabled ? 'Disattiva griglia' : 'Riattiva griglia'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div className="hexagon" style={{
            borderColor: gridEnabled ? '#dfffff' : '#152f49',
            background: gridEnabled 
              ? 'linear-gradient(135deg, rgba(223, 255, 255, 0.2), rgba(223, 255, 255, 0.1))'
              : 'linear-gradient(135deg, rgba(21, 47, 73, 0.2), rgba(21, 47, 73, 0.1))'
          }}>
            <div className="hexagon-content" style={{
              color: gridEnabled ? '#dfffff' : '#152f49'
            }}>
              <FaBorderAll />
            </div>
          </div>
        </button>

        {/* Grid Label */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: '48px',
          color: gridEnabled ? '#dfffff' : '#152f49',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginLeft: '6px',
          marginRight: '15px',
          fontFamily: 'Eurostile, sans-serif',
        }}>
          <div style={{ fontSize: '16px', lineHeight: '1' }}>TOGGLE</div>
          <div style={{ fontSize: '12px', lineHeight: '1' }}>GRIGLIA</div>
        </div>

        {/* Markers Toggle */}
        <button
          onClick={() => setMarkersVisible(v => !v)}
          aria-label={markersVisible ? 'Nascondi marker' : 'Mostra marker'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div className="hexagon" style={{
            borderColor: markersVisible ? '#dfffff' : '#152f49',
            background: markersVisible 
              ? 'linear-gradient(135deg, rgba(223, 255, 255, 0.2), rgba(223, 255, 255, 0.1))'
              : 'linear-gradient(135deg, rgba(21, 47, 73, 0.2), rgba(21, 47, 73, 0.1))'
          }}>
            <div className="hexagon-content" style={{
              color: markersVisible ? '#dfffff' : '#152f49'
            }}>
              {markersVisible ? <FaEye /> : <FaEyeSlash />}
            </div>
          </div>
        </button>

        {/* Markers Label */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: '48px',
          color: markersVisible ? '#dfffff' : '#152f49',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginLeft: '6px',
          marginRight: '15px',
          fontFamily: 'Eurostile, sans-serif',
        }}>
          <div style={{ fontSize: '16px', lineHeight: '1' }}>TOGGLE</div>
          <div style={{ fontSize: '12px', lineHeight: '1' }}>MARKER</div>
        </div>

        {/* Marker Placement Toggle */}
        <button
          onClick={() => setMarkerPlacementMode(v => !v)}
          aria-label={markerPlacementMode ? 'Disattiva piazzamento marker' : 'Attiva piazzamento marker'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div className="hexagon" style={{
            borderColor: markerPlacementMode ? '#dfffff' : '#152f49',
            background: markerPlacementMode 
              ? 'linear-gradient(135deg, rgba(223, 255, 255, 0.2), rgba(223, 255, 255, 0.1))'
              : 'linear-gradient(135deg, rgba(21, 47, 73, 0.2), rgba(21, 47, 73, 0.1))'
          }}>
            <div className="hexagon-content" style={{
              color: markerPlacementMode ? '#dfffff' : '#152f49'
            }}>
              <FaMapMarkerAlt />
            </div>
          </div>
        </button>

        {/* Marker Placement Label */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: '48px',
          color: markerPlacementMode ? '#dfffff' : '#152f49',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginLeft: '6px',
          fontFamily: 'Eurostile, sans-serif',
        }}>
          <div style={{ fontSize: '16px', lineHeight: '1' }}>CREA</div>
          <div style={{ fontSize: '12px', lineHeight: '1' }}>MARKER</div>
        </div>
      </div>

      {/* Canvas 3D, centrato sull’overlay e pianeta */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          transform: 'translate(-50%, -50%)',
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
          <pointLight position={[2, 2, 3]} intensity={0.8} color={'#ffffff'} />

          <Suspense fallback={null}>
            <PlanetScene
              cloudsEnabled={cloudsEnabled}
              gridEnabled={gridEnabled}
              markersVisible={markersVisible}
              markerPlacementMode={markerPlacementMode}
              markers={markers}
              onMarkerPlaced={handleMarkerPlaced}
            />
          </Suspense>

          <OrbitControls 
            enableZoom={false}
            enableRotate={!controlsDisabled && !markerPlacementMode}
            enablePan={false}
            rotateSpeed={1}
          />
        </Canvas>
      </div>

      {/* Simplified Marker Creation Popup */}
      {markerPopup && (
        <div
          style={{
            position: 'fixed',
            left: Math.max(10, Math.min(window.innerWidth - 330, markerPopup.screenPos.x - 155)),
            top: Math.max(10, Math.min(window.innerHeight - 220, markerPopup.screenPos.y - 110)),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1000,
            width: '310px',
            padding: '10px',
            background: 'rgba(0, 20, 40, 0.95)',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            backdropFilter: 'blur(5px)',
          }}
        >
          {/* Title Text */}
          <div style={{
            width: '300px',
            textAlign: 'center',
            color: '#dfffff',
            fontSize: '16px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            fontFamily: 'Eurostile, sans-serif',
            marginBottom: '4px',
          }}>
            MAP MARKER CREATOR
          </div>

          {/* Input Container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
          {/* Small rectangle indicator */}
          <div style={{
            width: '6px',
            height: '40px',
            background: '#dfffff',
            border: 'none',
          }} />

          {/* Text Input with bg-title background */}
          <div style={{
            position: 'relative',
            width: '300px',
            height: '40px',
            background: 'url(/bg-title.png) center/cover no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <input
              type="text"
              value={editingMarker.name}
              onChange={(e) => {
                if (e.target.value.length <= 20) {
                  setEditingMarker(prev => ({ ...prev, name: e.target.value }))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingMarker.name.trim()) {
                  confirmCreateMarker();
                }
              }}
              style={{
                width: '90%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: '#dfffff',
                fontSize: '14px',
                fontWeight: 'bold',
                textAlign: 'center',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontFamily: 'Eurostile, sans-serif',
              }}
              placeholder=""
              autoFocus
            />
            {/* Placeholder text with low opacity */}
            {!editingMarker.name && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#dfffff',
                opacity: 0.3,
                fontSize: '13px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                pointerEvents: 'none',
                fontFamily: 'Eurostile, sans-serif',
              }}>
                INSERIRE NOME MARKER
              </div>
            )}
            {/* Contatore caratteri nome */}
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '8px',
              color: '#dfffff',
              fontSize: '10px',
              opacity: 0.6,
              fontFamily: 'Eurostile, sans-serif',
            }}>
              {editingMarker.name.length}/<span style={{fontWeight: 'bold'}}>20</span>
            </div>
          </div>

          </div>

          {/* Description Container */}
          <div style={{
            position: 'relative',
            width: '300px',
            height: '60px',
            background: 'url(/bg-description.png) center/cover no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px',
          }}>
            <textarea
              value={editingMarker.description || ''}
              onChange={(e) => {
                if (e.target.value.length <= 100) {
                  setEditingMarker(prev => ({ ...prev, description: e.target.value }))
                }
              }}
              style={{
                width: '90%',
                height: '80%',
                background: 'transparent',
                border: 'none',
                color: '#dfffff',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                outline: 'none',
                textTransform: 'none',
                letterSpacing: '2px',
                fontFamily: 'Eurostile, sans-serif',
                resize: 'none',
              }}
              placeholder="DESCRIZIONE MARKER"
            />
            {/* Contatore caratteri descrizione */}
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '8px',
              color: '#dfffff',
              fontSize: '10px',
              opacity: 0.6,
              fontFamily: 'Eurostile, sans-serif',
            }}>
              {(editingMarker.description || '').length}/<span style={{fontWeight: 'bold'}}>100</span>
            </div>
          </div>

          {/* Color Selector */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '8px',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {MARKER_COLORS.map((colorOption, index) => (
              <div
                key={colorOption.name}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setEditingMarker(prev => ({ ...prev, color: colorOption.value }))}
              >
                {/* Square container with bg-1x1 */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'url(/bg-1x1.png) center/cover no-repeat',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '0',
                }}>
                  {/* Color square inside */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: colorOption.value,
                    border: '1px solid rgba(255,255,255,0.3)',
                  }} />
                </div>
                
                {/* Selection triangle indicator */}
                {editingMarker.color === colorOption.value && (
                  <div style={{
                    width: '0',
                    height: '0',
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderBottom: '6px solid #dfffff',
                    marginTop: '2px',
                    animation: 'trianglePulse 1.5s ease-in-out infinite alternate',
                  }} />
                )}
              </div>
              ))}
          </div>

          {/* Action buttons - positioned in flow */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <button
              onClick={cancelCreateMarker}
              style={{
                width: '48px',
                height: '48px',
                background: '#152f49',
                border: 'none',
                color: '#9fb8c7',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dfffff';
                e.currentTarget.style.color = '#152f49';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#152f49';
                e.currentTarget.style.color = '#9fb8c7';
              }}
            >
              <FaTimes />
            </button>
            
            <button
              onClick={confirmCreateMarker}
              disabled={!editingMarker.name.trim()}
              style={{
                width: '48px',
                height: '48px',
                background: editingMarker.name.trim() ? '#dfffff' : '#152f49',
                border: 'none',
                color: editingMarker.name.trim() ? '#152f49' : '#9fb8c7',
                fontSize: '20px',
                cursor: editingMarker.name.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: editingMarker.name.trim() ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaCheck />
            </button>
          </div>
        </div>
      )}

      {/* Dark overlay when notification is visible */}
      {viewingMarker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 999,
          }}
          onClick={() => setViewingMarker(null)}
        />
      )}

      {/* Marker View Popup */}
      {viewingMarker && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            zIndex: 1000,
          }}
        >
          {/* Main notification background */}
          <div
            className="bg-notification"
            style={{
              aspectRatio: '310/180',
              minWidth: '465px',
              minHeight: '270px',
              padding: '0',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title area - fixed position */}
            <div style={{
              position: 'absolute',
              top: '1%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '420px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                color: '#dfffff',
                fontSize: '25px',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                letterSpacing: '6px',
                fontFamily: 'Eurostile, sans-serif',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}>
                {viewingMarker.marker.name}
              </div>
            </div>

            {/* Content area - fixed position */}
            <div style={{
              position: 'absolute',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '380px',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
            }}>
              {viewingMarker.marker.description && (
                <div style={{
                  color: '#dfffff',
                  fontSize: '16px',
                  fontWeight: 'normal',
                  textTransform: 'none',
                  letterSpacing: '2px',
                  fontFamily: 'Eurostile, sans-serif',
                  opacity: 0.8,
                  textAlign: 'center',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.4',
                }}>
                  {formatDescription(viewingMarker.marker.description)}
                </div>
              )}
            </div>
            {/* Action buttons on bottom edge of notification */}
            <div style={{
              position: 'absolute',
              bottom: '14%',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              width: '380px',
            }}>
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteMarker(viewingMarker.marker.id);
                  setViewingMarker(null);
                }}
                style={{
                  flex: 1,
                  height: '35px',
                  background: '#ffa955',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#152f49',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'Eurostile, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1001,
                  pointerEvents: 'all',
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                }}
              >
                ELIMINA MARKER
              </button>
              
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  closeViewMarker();
                }}
                style={{
                  flex: 1,
                  height: '35px',
                  background: '#dfffff',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#152f49',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontFamily: 'Eurostile, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1001,
                  pointerEvents: 'all',
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.5';
                }}
              >
                CHIUDI
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function PlanetScene({
  cloudsEnabled,
  gridEnabled,
  markersVisible,
  markerPlacementMode,
  markers,
  onMarkerPlaced,
}: {
  cloudsEnabled: boolean;
  gridEnabled: boolean;
  markersVisible: boolean;
  markerPlacementMode: boolean;
  markers: MapMarker[];
  onMarkerPlaced: (position: THREE.Vector3, screenPos: { x: number; y: number }) => void;
}) {
  // carico texture del pianeta, delle nuvole e dei tile bloccati
  const [planetMap, cloudMap, lockedMap] = useTexture([
    '/planet_diffuse.png',
    '/planet_clouds.png',
    '/planet-locked.png',
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
      markersVisible={markersVisible}
      markerPlacementMode={markerPlacementMode}
      planetMap={planetMap}
      cloudMap={cloudMap}
      lockedMap={lockedMap}
      markers={markers}
      onMarkerPlaced={onMarkerPlaced}
    />
  );
}

// Small Planet component for the topology container - DISABLED
// function SmallPlanet() {
//   const meshRef = useRef<THREE.Mesh>(null);
//   const [textureError, setTextureError] = useState(false);

//   // Load planet texture with error handling
//   const planetTexture = useMemo(() => {
//     try {
//       const loader = new THREE.TextureLoader();
//       const texture = loader.load(
//         '/bg-smallplanet.png',
//         undefined,
//         undefined,
//         () => {
//           console.log('Failed to load bg-smallplanet.png');
//           setTextureError(true);
//         }
//       );
//       texture.wrapS = THREE.RepeatWrapping;
//       texture.wrapT = THREE.RepeatWrapping;
//       return texture;
//     } catch (error) {
//       console.log('Error loading texture:', error);
//       setTextureError(true);
//       return null;
//     }
//   }, []);

//   // Auto rotation only
//   useFrame((state, delta) => {
//     if (!meshRef.current) return;
    
//     // Continuous slow auto rotation
//     meshRef.current.rotation.y += delta * 0.3;
//   });

//   return (
//     <group>
//       {/* Main planet sphere */}
//       <mesh
//         ref={meshRef}
//         position={[0, 0, 0]}
//       >
//         <sphereGeometry args={[0.81, 32, 16]} />
//         <meshLambertMaterial 
//           map={textureError ? null : planetTexture}
//           color={textureError ? "#4a9eff" : "#ffffff"}
//           emissive="#001144"
//           emissiveIntensity={0.05}
//           transparent
//           opacity={1}
//         />
//       </mesh>
//     </group>
//   );
// }

function Planet({
  cloudsEnabled,
  gridEnabled,
  markersVisible,
  markerPlacementMode,
  planetMap,
  cloudMap,
  lockedMap,
  markers,
  onMarkerPlaced,
}: {
  cloudsEnabled: boolean;
  gridEnabled: boolean;
  markersVisible: boolean;
  markerPlacementMode: boolean;
  planetMap: THREE.Texture;
  cloudMap: THREE.Texture;
  lockedMap: THREE.Texture;
  markers: MapMarker[];
  onMarkerPlaced: (position: THREE.Vector3, screenPos: { x: number; y: number }) => void;
}) {
  const planetRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const { user } = useUser();
  const { camera, raycaster, mouse, gl } = useThree();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);
  
  // Handle planet clicks for marker creation (single click when placement mode is active)
  const handlePlanetClick = (event: any) => {
    if (!planetRef.current || !markerPlacementMode) return;
    
    event.stopPropagation();
    
    // Only allow marker creation when placement mode is active
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObject(planetRef.current);
    
    if (intersects.length > 0) {
      const intersectionPoint = intersects[0].point;
      // Normalize to exact sphere surface (radius = 1.0)
      const normalizedPoint = intersectionPoint.normalize();
      
      // Convert to screen coordinates for popup positioning
      const screenPos = normalizedPoint.clone().project(camera);
      const screenX = (screenPos.x * 0.5 + 0.5) * gl.domElement.clientWidth + rect.left;
      const screenY = (-screenPos.y * 0.5 + 0.5) * gl.domElement.clientHeight + rect.top;
      
      onMarkerPlaced(normalizedPoint, { x: screenX, y: screenY });
    }
  };

  // Build reveal mask texture from debug cells
  const revealMask = useMemo(() => {
    const w = REVEAL_COLS,
      h = REVEAL_ROWS;
    const data = new Uint8Array(w * h * 4);
    // Default locked (0)
    for (let i = 0; i < w * h; i++) {
      data[i * 4 + 0] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
    // Mark revealed cells
    const unlockedAreas = user?.unlockedAreas || [];
    
    // Add some default unlocked areas for debugging if none exist
    const defaultAreas = unlockedAreas.length === 0 ? [
      [5, 5], [6, 5], [7, 5],
      [5, 6], [6, 6], [7, 6],
      [5, 7], [6, 7], [7, 7],
      [10, 10], [11, 10], [12, 10],
      [15, 15], [16, 15], [17, 15]
    ] : [];
    
    const allAreas = [...unlockedAreas, ...defaultAreas];
    
    for (const [cx, cy] of allAreas) {
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
        console.log('Revealed cell', cx, cy);
      }
    };
    // Reveal all cells quickly for debugging
    (window as any).revealAll = () => {
      for (let i = 0; i < w * h; i++) {
        data[i * 4 + 0] = 255;
        data[i * 4 + 3] = 255;
      }
      tex.needsUpdate = true;
      console.log('All cells revealed');
    };
    return tex;
  }, [user?.unlockedAreas]);

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
    (holoMaterial.uniforms.uGridIntensity as any).value = gridEnabled
      ? 0.45
      : 0.0;
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
      <mesh 
        ref={planetRef} 
        geometry={new THREE.SphereGeometry(1, 32, 32)}
        onClick={handlePlanetClick}
      >
        <primitive attach='material' object={holoMaterial} />
      </mesh>

      {cloudsEnabled && (
        <mesh ref={cloudRef} geometry={new THREE.SphereGeometry(1.01, 32, 32)}>
          <primitive attach='material' object={cloudsMaterial} />
        </mesh>
      )}

      {/* Render markers conditionally based on visibility */}
      {markersVisible && markers.map((marker) => (
        <MarkerComponent 
          key={marker.id} 
          marker={marker} 
        />
      ))}
    </>
  );
}

// Hexagonal Marker component to display individual markers on the planet
function MarkerComponent({ 
  marker
}: { 
  marker: MapMarker;
}) {
  const markerRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const [isVisible, setIsVisible] = useState(true);
  
  // Calculate stable surface position once
  const stableSurfacePosition = useMemo(() => {
    const direction = marker.position.clone().normalize();
    const planetRadius = 1.0;
    const elevation = 0.0005; // Further reduced for even closer surface adherence
    return direction.multiplyScalar(planetRadius + elevation);
  }, [marker.position]);

  useFrame(() => {
    if (markerRef.current) {
      // Make marker always face the camera
      markerRef.current.lookAt(camera.position);
      
      // Check if marker is on visible side of planet
      const direction = marker.position.clone().normalize();
      const cameraDirection = camera.position.clone().normalize();
      const dotProduct = direction.dot(cameraDirection);
      
      // If dot product > 0, the marker is on the side facing the camera
      const shouldBeVisible = dotProduct > 0;
      setIsVisible(shouldBeVisible);
    }
  });

  const handleMarkerClick = () => {
    // Usa il sistema di eventi globale
    if ((window as any).handleMarkerClick) {
      (window as any).handleMarkerClick(marker.id);
    }
  };

  const handleMouseEnter = () => {
    if ((window as any).setHoveredMarkerId) {
      (window as any).setHoveredMarkerId(marker.id);
    }
  };

  const handleMouseLeave = () => {
    if ((window as any).setHoveredMarkerId) {
      (window as any).setHoveredMarkerId(null);
    }
  };

  return (
    <group ref={markerRef} position={stableSurfacePosition}>
      <Html
        center
        distanceFactor={6}
        style={{
          pointerEvents: 'auto',
          userSelect: 'none',
          opacity: isVisible ? 1 : 0.3,
          transition: 'opacity 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <div
          onDoubleClick={handleMarkerClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            position: 'relative',
          }}
        >
          {/* Circular animated base with concentric rings */}
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Central bright dot */}
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: marker.color,
                borderRadius: '50%',
                position: 'absolute',
                boxShadow: `0 0 15px ${marker.color}, 0 0 30px ${marker.color}60`,
                animation: 'markerPulse 2s ease-in-out infinite',
                zIndex: 3,
              }}
            />
            
            {/* Expanding concentric circles */}
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  border: `2px solid ${marker.color}`,
                  borderRadius: '50%',
                  animation: `markerRipple 3s ease-out infinite`,
                  animationDelay: `${index * 1}s`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
          
          {/* Marker name label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            {/* Main label rectangle */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.85)',
                color: marker.color,
                padding: '4px 12px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: `0 0 8px ${marker.color}`,
                border: `1px solid ${marker.color}`,
              }}
            >
              {marker.name.toUpperCase()}
            </div>
            {/* Thin accent rectangle */}
            <div
              style={{
                width: '3px',
                height: '20px',
                background: marker.color,
                border: `1px solid ${marker.color}`,
              }}
            />
          </div>

          {/* Popup information - appears on hover */}
          {((window as any).hoveredMarkerId === marker.id) && (
            <div
              className="marker-popup"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '10px',
                background: 'linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 0, 0, 0.95))',
                color: '#dfffff',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                maxWidth: '200px',
                boxShadow: `0 0 20px ${marker.color}60, 0 4px 20px rgba(0,0,0,0.9)`,
                border: `1px solid ${marker.color}80`,
                fontFamily: 'Eurostile, sans-serif',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: marker.color,
                marginBottom: '4px',
                textShadow: `0 0 8px ${marker.color}`,
              }}>
                {marker.name.toUpperCase()}
              </div>
              {marker.description && (
                <div style={{
                  fontSize: '11px',
                  color: '#afffff',
                  lineHeight: '1.3',
                }}>
                  {marker.description}
                </div>
              )}
              {/* Small triangle pointer */}
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `6px solid ${marker.color}80`,
              }} />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
