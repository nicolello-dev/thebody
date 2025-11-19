import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useUser } from '../context/user';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTemperatureHalf,
  faDroplet,
  faUtensils,
  faLungs,
  faMoon,
  faHeartPulse,
  faRotateLeft,
  faBan,
} from '@fortawesome/free-solid-svg-icons';
import ScannerEffect from '../components/scannerEffect';
// import MonitorWidget from "../components/monitorwidget"; // non usato qui, mostriamo soli valori

// Minimal re-use of inventory item types and helpers (aligned with inventory/crafting)
type InvItemKind = 'alimento' | 'arma' | 'risorsa';
type InvItem = {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: InvItemKind;
  description: string;
  tier: 1 | 2 | 3;
};
type InventoriesStore = Record<string, InvItem[]>;

const INV_STORE_KEY = 'thebody.inventories';
const EQUIP_STORE_KEY = 'thebody.equipment';
const GRID_COLS = 10;
const GRID_ROWS = 7;

type EquipmentStore = {
  leftHand?: InvItem | null;
  rightHand?: InvItem | null;
  outfit?: InvItem | null;
};

function loadInventories(): InventoriesStore {
  try {
    const raw = localStorage.getItem(INV_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { zaino: [] };
}
function saveInventories(inv: InventoriesStore) {
  try {
    localStorage.setItem(INV_STORE_KEY, JSON.stringify(inv));
  } catch {}
}
function loadEquip(): EquipmentStore {
  try {
    const raw = localStorage.getItem(EQUIP_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}
function saveEquip(eq: EquipmentStore) {
  try {
    localStorage.setItem(EQUIP_STORE_KEY, JSON.stringify(eq));
  } catch {}
}

const rectsOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) =>
  !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );

function findPlacement(
  zaino: InvItem[],
  w: number,
  h: number,
): { x: number; y: number } | null {
  outer: for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const rect = { x, y, w, h };
      const collision = zaino.some(it =>
        rectsOverlap(rect, { x: it.x, y: it.y, w: it.w, h: it.h }),
      );
      if (!collision) return { x, y };
    }
  }
  return null;
}

export default function User({
  temperature: propTemperature,
  isRobot = false,
}: {
  temperature?: number;
  isRobot?: boolean;
}) {
  const { user } = useUser();
  const [inventories, setInventories] = useState<InventoriesStore>(() =>
    loadInventories(),
  );
  const [equip, setEquip] = useState<EquipmentStore>(() => loadEquip());

      // Layout constants
  const LEFT_CONTAINER_DISTANCE = 19; // Percentage from left (increased spacing)
  const RIGHT_CONTAINER_DISTANCE = 5.85; // Percentage from right (increased spacing)
  const CENTER_CONTAINER_LEFT = '57.25%'; // Center container horizontal position
  const CENTER_CONTAINER_TOP = '4%'; // Center container vertical position
  const BODYSCAN_CONTAINER_LEFT = '55%'; // Bodyscan container horizontal position
  const BODYSCAN_CONTAINER_TOP = '3%'; // Bodyscan container vertical position (same as center)
  const LEFT_CONTAINER_TOP = 5; // Left container vertical position
  const BIOSCAN_CONTAINER_TOP = '3%'; // Bioscan container vertical position
  const RIGHT_CONTAINER_TOP = '4%'; // Right container vertical position
  
    
  // Container dimensions
  const SIDE_CONTAINER_WIDTH = 500; // Fixed width for left and right containers
  const CENTER_CONTAINER_WIDTH = 425; // Width matching scan-organs
  const BODYSCAN_CONTAINER_SIZE = 300; // Width and height for the square bodyscan container
  const BIOSCAN_CONTAINER_SIZE = '55vh'; // Size for the bioscan container (viewport height based)
  const BIOSCAN_CONTAINER_DISTANCE = 15.85; // Percentage from left for bioscan container

  // Add CSS for slider styling and asset preloading
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        height: 18px;
        width: 18px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #2fd0ff;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(47, 208, 255, 0.5);
      }

      input[type="range"]::-moz-range-thumb {
        height: 18px;
        width: 18px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #2fd0ff;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(47, 208, 255, 0.5);
        border: none;
      }

      input[type="range"]::-webkit-slider-track {
        height: 20px;
        border-radius: 10px;
        outline: none;
      }

      input[type="range"]::-moz-range-track {
        height: 20px;
        border-radius: 10px;
        outline: none;
        border: none;
      }
    `;
    document.head.appendChild(style);
    
    // Preload critical assets to prevent disappearing issues
    const preloadAssets = [
      '/scan-organs.png',
      '/encefaloanalisilive.png',
      '/encefaloanalisidead.png',
      '/bg.png'
    ];
    
    preloadAssets.forEach(src => {
      const img = new Image();
      img.src = src + '?preload=' + Date.now();
    });
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [picker, setPicker] = useState<null | {
    slot: 'left' | 'right' | 'outfit';
  }>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug picker state changes
  useEffect(() => {
    // Picker state management
  }, [picker]);

  // Simple picker function
  const openPicker = useCallback((slot: 'left' | 'right' | 'outfit') => {
    setPicker({ slot });
  }, []);

  // Initialize inventory with sample items if empty
  useEffect(() => {
    if (inventories.zaino.length === 0) {
      const sampleItems: InvItem[] = [
        {
          id: 'test-weapon-1',
          name: 'Pistola Laser',
          icon: '/roccia.png', // Using available image as placeholder
          kind: 'arma',
          x: 0,
          y: 0,
          w: 2,
          h: 1,
          description: "Un'arma laser compatta",
          tier: 2,
        },
        {
          id: 'test-weapon-2',
          name: 'Fucile Plasma',
          icon: '/cassa.png',
          kind: 'arma',
          x: 2,
          y: 0,
          w: 3,
          h: 1,
          description: 'Potente fucile al plasma',
          tier: 3,
        },
        {
          id: 'test-outfit-1',
          name: 'Tuta Spaziale',
          icon: '/zaino.png',
          kind: 'risorsa',
          x: 0,
          y: 1,
          w: 2,
          h: 2,
          description: 'Protezione completa per lo spazio',
          tier: 2,
        },
        {
          id: 'test-outfit-2',
          name: 'Armatura',
          icon: '/pelle.png',
          kind: 'risorsa',
          x: 2,
          y: 1,
          w: 2,
          h: 2,
          description: 'Armatura da combattimento',
          tier: 3,
        },
      ];

      const newInventories = { zaino: sampleItems };
      setInventories(newInventories);
      saveInventories(newInventories);
      console.log('Added sample items to inventory');
    }
  }, []);

  const zaino = inventories.zaino || [];
  const weapons = useMemo(() => zaino.filter(i => i.kind === 'arma'), [zaino]);
  const outfits = useMemo(
    () => zaino.filter(i => i.kind === 'risorsa'),
    [zaino],
  );
  const usedTiles = useMemo(
    () => zaino.reduce((s, it) => s + it.w * it.h, 0),
    [zaino],
  );
  const totalTiles = GRID_COLS * GRID_ROWS;

  // Inventory monitoring
  useEffect(() => {
    // Monitor inventory changes
  }, [zaino, weapons, outfits]);

  function persist(inv: InventoriesStore, eq: EquipmentStore) {
    saveInventories(inv);
    saveEquip(eq);
  }

  function equipItem(slot: 'left' | 'right' | 'outfit', item: InvItem) {
    setError(null);
    // validate kind for slot
    if (slot === 'outfit' && item.kind !== 'risorsa') {
      setError('Solo risorse compatibili possono essere equipaggiate nello slot Outfit.');
      return;
    }
    if ((slot === 'left' || slot === 'right') && item.kind !== 'arma') {
      setError('Solo armi possono essere equipaggiate nelle mani.');
      return;
    }
    setInventories(prev => {
      const nextInv: InventoriesStore = {
        ...prev,
        zaino: [...(prev.zaino || [])],
      };
      // Remove item from zaino by id
      const idx = nextInv.zaino.findIndex(z => z.id === item.id);
      if (idx >= 0) nextInv.zaino.splice(idx, 1);
      setEquip(prevEq => {
        const nextEq: EquipmentStore = { ...prevEq };
        if (slot === 'left') nextEq.leftHand = item;
        if (slot === 'right') nextEq.rightHand = item;
        if (slot === 'outfit') nextEq.outfit = item;
        persist(nextInv, nextEq);
        return nextEq;
      });
      return nextInv;
    });
    setPicker(null);
  }

  function unequipItem(slot: 'left' | 'right' | 'outfit') {
    setError(null);
    setEquip(prevEq => {
      const item =
        slot === 'left'
          ? prevEq.leftHand
          : slot === 'right'
          ? prevEq.rightHand
          : prevEq.outfit;
      if (!item) return prevEq;
      // Try to return item to zaino
      setInventories(prev => {
        const next: InventoriesStore = {
          ...prev,
          zaino: [...(prev.zaino || [])],
        };
        const pos = findPlacement(next.zaino, item.w, item.h);
        if (!pos) {
          setError("Spazio insufficiente nello zaino per riporre l'oggetto.");
          return prev;
        }
        next.zaino.push({ ...item, x: pos.x, y: pos.y });
        const newEq: EquipmentStore = {
          ...prevEq,
          [slot === 'left'
            ? 'leftHand'
            : slot === 'right'
            ? 'rightHand'
            : 'outfit']: null,
        };
        setEquip(newEq);
        persist(next, newEq);
        return next;
      });
      return prevEq; // actual state was set above
    });
  }

  // UI helpers
  // Temperature smoothing (update displayed temp once per second)
  // Use oscillating temperature from App.tsx instead of static user.temperature
  const actualTemperature =
    typeof propTemperature === 'number' ? propTemperature : user.temperature;
  const [tempDisplay, setTempDisplay] = useState<number>(actualTemperature);
  const latestTempRef = useRef<number>(actualTemperature);
  const [waveTime, setWaveTime] = useState(0);
  const waveCanvasRef1 = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef2 = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef3 = useRef<HTMLCanvasElement>(null);
  const [debugHealth, setDebugHealth] = useState<number | null>(null);
  
  // Scanner rotation state
  const [scannerImageIndex, setScannerImageIndex] = useState(0);
  const scannerImages = ['scan-organs.png', 'scan-skeleton.png', 'scan-muscles.png'];
  const [scannerKey, setScannerKey] = useState(0); // Key to force re-render of animation

  // Update ref immediately when actualTemperature changes
  useEffect(() => {
    latestTempRef.current = actualTemperature;
    // Also update display immediately if this is the first change
    if (Math.abs(tempDisplay - actualTemperature) > 0.1) {
      setTempDisplay(actualTemperature);
    }
  }, [actualTemperature, tempDisplay]);

  // Update display every second to smooth out rapid changes
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.abs(tempDisplay - latestTempRef.current) > 0.01) {
        setTempDisplay(latestTempRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [tempDisplay]);

  // Wave animation - optimized
  useEffect(() => {
    const animate = () => {
      setWaveTime(prev => prev + 0.01); // Reduced from 0.02
    };
    const animationId = setInterval(animate, 33); // Reduced from 16ms to 33ms (~30fps)
    return () => clearInterval(animationId);
  }, []);

  // Scanner rotation effect - rotates image every scanner cycle (2 seconds)
  useEffect(() => {
    const rotateScanner = () => {
      setScannerImageIndex(prev => (prev + 1) % scannerImages.length);
      setScannerKey(prev => prev + 1); // Force re-render of animation
    };
    
    // Scanner completes a cycle every 2 seconds
    const scannerId = setInterval(rotateScanner, 2000);
    return () => clearInterval(scannerId);
  }, [scannerImages.length]);

  // Health calculation using biofeedback from user data
  const currentHealth = user.biofeedback;
  const maxHealth = 100; // Biofeedback is typically 0-100
  const healthPercentage = (currentHealth / maxHealth) * 100;
  
  // Wave mode based on health
  const healthThreshold = Math.floor(maxHealth * 0.50); // 50% della salute massima
  const waveMode = currentHealth <= 0 ? 'morto' : currentHealth <= healthThreshold ? 'agitato' : 'rilassato';

  // Draw waves on canvases - optimized
  useEffect(() => {
    const drawWave = (canvas: HTMLCanvasElement | null, waveFunction: (x: number, t: number) => number, color: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvas.width = 250;
      const height = canvas.height = 50;
      const centerY = height / 2;
      
      // Clear canvas and add grid background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);
      
      // Enhanced grid background
      ctx.strokeStyle = 'rgba(223, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      
      // Horizontal grid lines
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 1; i < 8; i++) {
        const x = (width / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Reduced sampling for better performance
      for (let x = 0; x < width; x += 2) { // Step by 2 instead of 1
        const normalizedX = (x / width) * 8;
        const y = centerY - waveFunction(normalizedX, waveTime) * (height * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();
    };
    
    // Wave functions with three variants - simplified
    const heartbeat = (x: number, t: number) => {
      if (waveMode === 'morto') return 0;
      const phase = (x + t * (waveMode === 'agitato' ? 3 : 2)) % (2 * Math.PI);
      return Math.sin(phase) * (waveMode === 'agitato' ? 0.8 : 0.6);
    };
    
    // Breathing wave - simplified
    const breathing = (x: number, t: number) => {
      if (waveMode === 'morto') return 0;
      const speed = waveMode === 'agitato' ? 1.5 : 1;
      return Math.sin((x + t) * speed) * 0.7;
    };
    
    // Neural activity wave - simplified
    const neural = (x: number, t: number) => {
      if (waveMode === 'morto') return Math.sin(x * 0.1) * 0.02;
      const activity = waveMode === 'agitato' ? 1.2 : 0.8;
      return Math.sin((x + t) * 4 * activity) * 0.4 + Math.sin((x + t) * 8 * activity) * 0.1;
    };
    
    drawWave(waveCanvasRef1.current, heartbeat, '#dfffff');
    drawWave(waveCanvasRef2.current, breathing, '#dfffff'); 
    drawWave(waveCanvasRef3.current, neural, '#dfffff');
  }, [waveTime, waveMode]);
  
  // Get display values based on wave mode
  const getDisplayValues = () => {
    switch(waveMode) {
      case 'morto': return { heartRate: '0 BPM', breathing: '0 RPM', neural: 'PIATTO' };
      case 'agitato': return { heartRate: '120 BPM', breathing: '24 RPM', neural: 'IPERATTIVO' };
      default: return { heartRate: '72 BPM', breathing: '16 RPM', neural: 'NORMALE' };
    }
  };
  const displayValues = getDisplayValues();

  // Circular progress bar component
  function CircularBar({
    icon,
    label,
    value,
    unit = '%',
    color = '#7fd2ff',
    size = 80,
  }: {
    icon: any;
    label: string;
    value: number;
    unit?: string;
    color?: string;
    size?: number;
  }) {
    const percentage = Math.max(0, Math.min(100, value));
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeOffset = circumference - (percentage / 100) * circumference;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#152f49"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div style={{ color: '#3e6388ff', fontSize: 20, textAlign: 'center', marginBottom: 4, fontFamily: 'Varino, sans-serif' }}>
              {Math.round(value)}
            </div>
          </div>
        </div>
        <div style={{ color: '#3e6388ff', fontSize: 12, letterSpacing: '2px', textAlign: 'center' }}>
          {label}
        </div>
      </div>
    );
  }
  function TemperatureBar({
    value,
    min = -5,
    max = 45,
  }: {
    value: number;
    min?: number;
    max?: number;
  }) {
    const clamped = Math.max(min, Math.min(max, value));
    const pct = Math.round(((clamped - min) / (max - min)) * 100);
    // color glow from blue to red
    const t = pct / 100;
    const r = Math.round(47 + (255 - 47) * t);
    const g = Math.round(208 + (80 - 208) * t);
    const b = Math.round(255 + (80 - 255) * t);
    const glow = `rgba(${r},${g},${b},0.45)`;
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '22px 120px 1fr 60px',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FontAwesomeIcon
          icon={faTemperatureHalf}
          style={{ color: '#7fd2ff' }}
        />
        <div style={{ color: '#9fb8c7' }}>Temperatura</div>
        <div
          style={{
            position: 'relative',
            height: 12,
            background: 'rgba(10,30,50,0.75)',
            border: '1px solid rgba(223,255,255,0.12)',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, #2fb3ff, #7fe2ff, #ffd06e, #ff8a4a, #ff5050)',
              transition: 'width .2s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${pct}%`,
              height: '100%',
              background: glow,
              filter: 'blur(6px)',
              opacity: 0.8,
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ textAlign: 'right', color: '#dfffff' }}>
          {value.toFixed(1)}°C
        </div>
      </div>
    );
  }

  function HealthBar({ current, max }: { current: number; max: number }) {
    const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '22px 120px 1fr 80px',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FontAwesomeIcon icon={faHeartPulse} style={{ color: '#ff8aa0' }} />
        <div style={{ color: '#9fb8c7' }}>SALUTE</div>
        <div
          style={{  
            height: 10,
            background: 'rgba(10,30,50,0.7)',
            border: '1px solid rgba(223,255,255,0.12)',
            borderRadius: 5,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(255,138,160,0.7), rgba(255,80,80,0.8))',
            }}
          />
        </div>
        <div style={{ textAlign: 'right', color: '#dfffff' }}>
          {current} / {max}
        </div>
      </div>
    );
  }
  function EnergyBar({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '22px 120px 1fr 60px',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ color: '#9fb8c7' }}>Energia</div>
        <div
          style={{
            gridColumn: '3 / 4',
            height: 10,
            background: 'rgba(10,30,50,0.7)',
            border: '1px solid rgba(223,255,255,0.12)',
            borderRadius: 5,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(127,226,255,0.7), rgba(47,208,255,0.9))',
            }}
          />
        </div>
        <div style={{ textAlign: 'right', color: '#dfffff' }}>{pct}%</div>
      </div>
    );
  }
  function StatRow({
    icon,
    label,
    value,
    unit,
    max = 100,
  }: {
    icon: any;
    label: string;
    value: number;
    unit?: string;
    max?: number;
  }) {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '22px 120px 1fr 60px',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <FontAwesomeIcon icon={icon} style={{ color: '#7fd2ff' }} />
        <div style={{ color: '#9fb8c7' }}>{label}</div>
        <div
          style={{
            height: 8,
            background: 'rgba(10,30,50,0.7)',
            border: '1px solid rgba(223,255,255,0.12)',
            borderRadius: 4,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(47,208,255,0.6), rgba(47,208,255,0.15))',
            }}
          />
        </div>
        <div style={{ textAlign: 'right', color: '#dfffff' }}>
          {value}
          {unit ?? ''}
        </div>
      </div>
    );
  }

  // Slot view
  function Slot({
    label,
    item,
    onPick,
    onUnequip,
    kind,
  }: {
    label: string;
    item?: InvItem | null;
    onPick: () => void;
    onUnequip: () => void;
    kind: 'arma' | 'risorsa';
  }) {
    return (
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 160,
          borderRadius: 1000,
          background: 'transparent',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          marginTop: 4,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `url(/bg-1x1.png) center/contain no-repeat`,
            opacity: 0.2,
            pointerEvents: 'none',
          }}
          aria-hidden
        />
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 14,
            color: '#dfffff',
            textTransform: 'uppercase',
            letterSpacing: 1,
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
        {item ? (
          <>
            <img
              src={item.icon}
              alt=''
              width={80}
              height={80}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 8px rgba(47,208,255,0.35))',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                fontSize: 14,
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              {item.name}
            </div>
            <div
              onMouseUp={e => {
                e.preventDefault();
                e.stopPropagation();
                onUnequip();
              }}
              title='Riponi nello zaino'
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                cursor: 'pointer',
                background: 'rgba(47,208,255,0.1)',
                border: '1px solid rgba(47,208,255,0.35)',
                color: '#dfffff',
                padding: '6px 8px',
                borderRadius: 6,
                zIndex: 1000,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </div>
          </>
        ) : (
          <>

            <div
              onMouseUp={e => {
                e.preventDefault();
                e.stopPropagation();
                onPick();
              }}
              onMouseDown={e => {
                e.preventDefault();
              }}
              style={{
                cursor: 'pointer',
                backgroundImage: 'url(/bg-2x1.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid rgba(223,255,255,0.18)',
                color: '#dfffff',
                padding: '10px 16px',
                borderRadius: 0,
                zIndex: 99999,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '60px',
                minHeight: '36px',
                pointerEvents: 'auto',
                position: 'relative',
              }}
            >
              Scegli
            </div>
          </>
        )}
      </div>
    );
  }

  // Picker modal
  const showPicker = picker !== null;
  const pickerItems: InvItem[] = useMemo(() => {
    if (!picker) return [];
    if (picker.slot === 'outfit') return outfits;
    return weapons;
  }, [picker, weapons, outfits]);

  // Layout
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        color: '#dfffff',
        overflow: 'hidden',
      }}
    >
      {/* bg */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'url(/bg.png) center/cover no-repeat',
          zIndex: 0,
        }}
      />

      {/* Left Container - Parametri Vitali */}
      <div
        style={{
          position: 'fixed',
          left: `${LEFT_CONTAINER_DISTANCE}%`,
          top: `${LEFT_CONTAINER_TOP}%`,
          width: `${SIDE_CONTAINER_WIDTH}px`,
          height: 'calc(100vh - 48px)',
          overflow: 'auto',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
          {/* Medical dashboard with 1.25x scale */}
          <div
            style={{
              border: 'none', 
              padding: 0,
              flex: 'none',
              height: 'auto',
              transform: 'scale(1.1)',
              transformOrigin: 'top left',
              mixBlendMode: 'screen',
            }}
          >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              transform: 'scale(0.8)',
              transformOrigin: 'left',
              mixBlendMode: 'screen',
            }}
          >
          </div>
          {/* Se isRobot=false: mostra tutti i parametri; se isRobot=true: mostra solo salute ed energia */}
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {/* Redesigned circular stats layout */}
            {!isRobot ? (
                            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 20,
                padding: '20px 0',
                width: '100%',
                marginLeft: '-2.5%'
              }}>
                {/* Left column: Hunger & Thirst */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <CircularBar
                    icon={faUtensils}
                    value={user.hunger}
                    label="FAME"
                    color="#3e6388ff"
                  />
                  <CircularBar
                    icon={faDroplet}
                    label="SETE"
                    value={user.thirst}
                    color="#3e6388ff"
                  />
                </div>

                {/* Center: Health (larger) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative', width: 120, height: 120 }}>
                    <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx={60}
                        cy={60}
                        r={54}
                        stroke="#152f49"
                        strokeWidth={8}
                        fill="none"
                      />
                      <circle
                        cx={60}
                        cy={60}
                        r={54}
                        stroke="#dfffff"
                        strokeWidth={8}
                        fill="none"
                        strokeDasharray={339.29}
                        strokeDashoffset={339.29 - (healthPercentage / 100) * 339.29}
                        strokeLinecap="butt"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ color: '#dfffff', fontSize: 36, textAlign: 'center', marginBottom:6,fontFamily: 'Varino, sans-serif' }}>
                        {currentHealth}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: '#9fb8c7', fontSize: 14, letterSpacing: '0.05em', textAlign: 'center' }}>
                    SALUTE
                  </div>
                </div>

                {/* Right column: Oxygen & Sleep */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <CircularBar
                    icon={faLungs}
                    label="OSSIGENO"
                    value={user.oxygen}
                    color="#3e6388ff"
                  />
                  <CircularBar
                    icon={faMoon}
                    label="SONNO"
                    value={user.sleep}
                    color="#3e6388ff"
                  />
                </div>
              </div>
            ) : (
              <EnergyBar value={user.energy} />
            )}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {/* ECG Tracce */}
            <div style={{ 
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Heartbeat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '40px'}}>NEURALE</div>
                <canvas 
                  ref={waveCanvasRef1}
                  style={{ border: '1px solid #3e6388ff' }}
                />
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '80px' }}>{displayValues.heartRate}</div>
              </div>
              
              {/* Breathing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '40px'}}>NEURALE</div>
                <canvas 
                  ref={waveCanvasRef2}
                  style={{ border: '1px solid #3e6388ff' }}
                />
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '80px' }}>{displayValues.breathing}</div>
              </div>
              
                
              
              
              {/* Neural */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '40px'}}>NEURALE</div>
                <canvas 
                  ref={waveCanvasRef3}
                  style={{ border: '1px solid #3e6388ff' }}
                />
                <div style={{ color: '#3e6388ff', fontSize: '12px', letterSpacing: 2, minWidth: '80px' }}>{displayValues.neural}</div>
              </div>
              
              {/* Debug controls */}
              {/* Debug controls removed per user request */}
            </div>
          </div>

          </div>
        </div>
      </div>

      {/* Center Container - Scan Organs */}
      <div
        style={{
          position: 'fixed',
          top: CENTER_CONTAINER_TOP,
          transform: 'translateX(-50%)',
          left: CENTER_CONTAINER_LEFT,
          width: `${CENTER_CONTAINER_WIDTH}px`,
          height: '625px',
          zIndex: 2000,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }}
      >
        <div
          style={{
            background: 'transparent',
            borderRadius: 8,
            padding: 0,
            position: 'relative',
            width: '350px',
            height: '625px',
            overflow: 'hidden',
            mixBlendMode: 'screen',
          }}
        >
          {/* Background image */}
          <img
            src={`/${scannerImages[scannerImageIndex]}`}
            alt={`Scan ${scannerImages[scannerImageIndex].replace('.png', '').replace('scan-', '')}`}
            style={{
              width: '350px',
              height: '585px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          
          {/* Lightweight scanning line - azzurro */}
          <div
            key={scannerKey} // Force re-render for smooth animation restart
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #dfffff, transparent)',
              boxShadow: '0 0 10px #dfffff',
              animation: 'scanLine 2s ease-in-out infinite',
              zIndex: 1,
            }}
          />
          
          {/* CSS Animation */}
          <style>
            {`
              @keyframes scanLine {
                0% { top: 10px; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 510px; opacity: 0; }
              }
            `}
          </style>
        </div>
      </div>

      {/* Bodyscan Container - Below Center Container */}
      <div
        style={{
          position: 'fixed',
          left: BODYSCAN_CONTAINER_LEFT,
          top: BODYSCAN_CONTAINER_TOP,
          transform: 'translateX(-50%)',
          width: `55vh`,
          height: `55vh`,
          zIndex: 1500,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          opacity: 1,
        }}
      >
        <div
          style={{
            background: 'transparent',
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <img
            src="/bg-bodyscan.png"
            alt="Body Scan Background"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Right Container Background - Schema Medico bioscan background */}
      <div
        style={{
          position: 'fixed',
          right: `${RIGHT_CONTAINER_DISTANCE}%`,
          top: BIOSCAN_CONTAINER_TOP,
          width: BIOSCAN_CONTAINER_SIZE,
          height: BIOSCAN_CONTAINER_SIZE,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'url(/bg-gearscan.png) center/contain no-repeat',
          mixBlendMode: 'screen',
        }}
      />

      {/* Right Container - Schema Medico */}
      <div
        style={{
          position: 'fixed',
          right: `${RIGHT_CONTAINER_DISTANCE}%`,
          top: 24,
          width: `${SIDE_CONTAINER_WIDTH}px`,
          height: 'calc(100vh - 48px)',
          overflow: 'auto',
          zIndex: 100,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: 'transparent',
            borderRadius: 8,
            padding: 16,
            height: '100%',
            overflow: 'visible',
          }}
        >
          {/* Equipment slots - vertically aligned */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              paddingTop: 20,
            }}
          >
            {/* All slots in column */}
            <Slot
              label='Outfit'
              kind='risorsa'
              item={equip.outfit}
              onPick={() => openPicker('outfit')}
              onUnequip={() => unequipItem('outfit')}
            />
            
            <Slot
              label='Mano SX'
              kind='arma'
              item={equip.leftHand}
              onPick={() => openPicker('left')}
              onUnequip={() => unequipItem('left')}
            />
            
            <Slot
              label='Mano DX'
              kind='arma'
              item={equip.rightHand}
              onPick={() => openPicker('right')}
              onUnequip={() => unequipItem('right')}
            />
          </div>

          {error && (
            <div style={{ marginTop: 20, color: '#ff8a8a', textAlign: 'center' }}>{error}</div>
          )}
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div
          role='dialog'
          aria-modal='true'
          onClick={() => setPicker(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '92vw',
              background: 'rgba(10,30,50,0.92)',
              border: '1px solid rgba(223,255,255,0.18)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <strong>
                Seleziona{' '}
                {picker!.slot === 'outfit' ? 'una risorsa' : "un'arma"}
              </strong>
              <button
                onClick={() => setPicker(null)}
                style={{ cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            {pickerItems.length === 0 ? (
              <div style={{ color: '#9fb8c7' }}>
                Nessun oggetto disponibile nello zaino.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 360,
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                {pickerItems.map((it, index) => (
                  <div
                    key={`${it.id}-${index}`}
                    style={{
                      background: 'rgba(10,30,50,0.65)',
                      border: '1px solid rgba(223,255,255,0.12)',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(5,16,36,0.55)',
                        borderRadius: 4,
                      }}
                    >
                      <img
                        src={it.icon}
                        alt=''
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>{it.name}</div>
                    <button
                      onClick={() => equipItem(picker!.slot, it)}
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(47,208,255,0.14)',
                        border: '1px solid rgba(47,208,255,0.35)',
                        color: '#dfffff',
                        padding: '6px 8px',
                        borderRadius: 4,
                      }}
                    >
                      Equipaggia
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Encefalogramma container - separate from vital parameters */}
      <div
        style={{
          position: 'fixed',
          bottom: '2%',
          left: '18%',
          width: '40vw',
          height: '40vh',
          zIndex: 1000,
          pointerEvents: 'none',
          mixBlendMode: 'screen'
        }}
      >
        <img
          src={currentHealth === 0 ? '/encefaloanalisidead.png' : '/encefaloanalisilive.png'}
          alt={currentHealth === 0 ? 'Encefalogramma morto' : 'Encefalogramma vivo'}
          onError={(e) => {
            // Enhanced error handling with multiple retry attempts
            const img = e.target as HTMLImageElement;
            const retryCount = parseInt(img.dataset.retryCount || '0');
            if (retryCount < 3) {
              img.dataset.retryCount = (retryCount + 1).toString();
              setTimeout(() => {
                const currentSrc = img.src;
                const baseUrl = currentSrc.split('?')[0];
                img.src = baseUrl + '?v=' + Date.now() + '&retry=' + retryCount;
              }, 500 * retryCount); // Progressive delay
            }
          }}
          onLoad={(e) => {
            // Reset retry count on successful load
            const img = e.target as HTMLImageElement;
            img.dataset.retryCount = '0';
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
      
      {/* Bioscan Container - Outside all containers for proper blend mode */}
      <div
        style={{
          position: 'fixed',
          left: `${BIOSCAN_CONTAINER_DISTANCE}%`,
          top: BIOSCAN_CONTAINER_TOP,
          width: BIOSCAN_CONTAINER_SIZE,
          height: BIOSCAN_CONTAINER_SIZE,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'url(/bg-bioscan.png) center/contain no-repeat',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}