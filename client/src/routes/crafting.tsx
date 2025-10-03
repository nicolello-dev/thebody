import React, { useEffect, useMemo, useState, useRef } from "react";
import { FaCubes, FaTshirt, FaFistRaised, FaAppleAlt, FaEraser, FaFillDrip, FaVial, FaSearch, FaCheck, FaSuitcase } from "react-icons/fa";
import CommandStreamRight from "../components/commandstream-right";

// Catalog/recipe types
type ItemType = "risorsa" | "indumento" | "arma" | "alimento";
type RecipePart = { name: string; count: number };
type Craftable = {
  name: string;
  type: ItemType;
  icon: string; // public path
  w: number; // tile width
  h: number; // tile height
  recipe: RecipePart[]; // max 6
};

// Inventory store types (subset aligned with routes/inventory)
type InvItemKind = "alimento" | "indumento" | "arma" | "generico";
type InvItem = {
  id: string;
  name: string;
  icon: string;
  image?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: InvItemKind;
  description: string;
  tier: 1 | 2 | 3;
  // ...other optional fields not used here
};
type InventoriesStore = Record<string, InvItem[]>;

// Zaino grid size (must match inventory.tsx INV_SPECS.zaino)
const GRID_COLS = 10;
const GRID_ROWS = 7;
const INV_STORE_KEY = "thebody.inventories";

// Blacklist per oggetti che non vengono aggiunti all'inventario dopo il crafting
const CRAFTING_BLACKLIST = [
  "tenda-in-pelle",
  "banco-da-lavoro",
];

// Catalogo craftable minimale (icone presenti in /public)
const CRAFTABLES: Craftable[] = [
  {
    name: "Bastone Acuminato",
    type: "arma",
    icon: "/bastoneacuminato.png",
    w: 1,
    h: 5,
    recipe: [
      { name: "Roccia", count: 1 },
      { name: "Ossa", count: 1 },
    ],
  },
  {
    name: "Pelle Rinforzata",
    type: "indumento",
    icon: "/pelle.png",
    w: 2,
    h: 2,
    recipe: [
      { name: "Pelle", count: 3 },
      { name: "Ossa", count: 1 },
    ],
  },
  {
    name: "Fionda di Pietra",
    type: "arma",
    icon: "/roccia.png",
    w: 2,
    h: 2,
    recipe: [
      { name: "Roccia", count: 2 },
      { name: "Pelle", count: 1 },
    ],
  },
  {
    name: "Kit Pronto Soccorso",
    type: "risorsa",
    icon: "/pelle.png",
    w: 1,
    h: 1,
    recipe: [
      { name: "Pelle", count: 1 },
      { name: "Ossa", count: 1 },
    ],
  },
  // Debug items with various sizes
  {
    name: "Armatura Completa",
    type: "indumento", 
    icon: "/pelle.png",
    w: 3,
    h: 4,
    recipe: [
      { name: "Pelle", count: 5 },
      { name: "Ossa", count: 3 },
      { name: "Roccia", count: 2 },
      { name: "Carne Rossa Cruda", count: 1 },
      { name: "Fauna", count: 2 },
      { name: "Flora", count: 1 },
    ],
  },
  {
    name: "Spada Lunga",
    type: "arma",
    icon: "/bastoneacuminato.png",
    w: 1,
    h: 4,
    recipe: [
      { name: "Roccia", count: 3 },
      { name: "Ossa", count: 2 },
    ],
  },
  {
    name: "Scudo Grande",
    type: "indumento",
    icon: "/roccia.png",
    w: 3,
    h: 3,
    recipe: [
      { name: "Roccia", count: 5 },
      { name: "Pelle", count: 2 },
    ],
  },
  {
    name: "Pozione Piccola",
    type: "alimento",
    icon: "/pelle.png",
    w: 1,
    h: 1,
    recipe: [
      { name: "Pelle", count: 1 },
    ],
  },
  {
    name: "Armatura Leggera",
    type: "indumento",
    icon: "/pelle.png",
    w: 2,
    h: 3,
    recipe: [
      { name: "Pelle", count: 4 },
      { name: "Ossa", count: 2 },
    ],
  },
  {
    name: "Lancia Lunga",
    type: "arma",
    icon: "/bastoneacuminato.png",
    w: 1,
    h: 5,
    recipe: [
      { name: "Roccia", count: 2 },
      { name: "Ossa", count: 3 },
    ],
  },
  {
    name: "Zaino Piccolo",
    type: "risorsa",
    icon: "/roccia.png",
    w: 2,
    h: 1,
    recipe: [
      { name: "Pelle", count: 3 },
    ],
  },
  {
    name: "Martello da Guerra",
    type: "arma",
    icon: "/roccia.png",
    w: 2,
    h: 2,
    recipe: [
      { name: "Roccia", count: 4 },
      { name: "Ossa", count: 1 },
    ],
  },
  {
    name: "Cibo Secco",
    type: "alimento",
    icon: "/pelle.png",
    w: 1,
    h: 1,
    recipe: [
      { name: "Pelle", count: 1 },
    ],
  },
  {
    name: "Armatura Pesante",
    type: "indumento",
    icon: "/roccia.png",
    w: 3,
    h: 4,
    recipe: [
      { name: "Roccia", count: 8 },
      { name: "Ossa", count: 3 },
    ],
  },
  {
    name: "Frecce",
    type: "risorsa",
    icon: "/bastoneacuminato.png",
    w: 1,
    h: 2,
    recipe: [
      { name: "Ossa", count: 2 },
      { name: "Roccia", count: 1 },
    ],
  },
  {
    name: "Scudo Medio",
    type: "indumento",
    icon: "/roccia.png",
    w: 2,
    h: 2,
    recipe: [
      { name: "Roccia", count: 3 },
      { name: "Pelle", count: 1 },
    ],
  },
  {
    name: "Pozione Grande",
    type: "alimento",
    icon: "/pelle.png",
    w: 1,
    h: 2,
    recipe: [
      { name: "Pelle", count: 2 },
      { name: "Ossa", count: 1 },
    ],
  },
  {
    name: "Arco",
    type: "arma",
    icon: "/bastoneacuminato.png",
    w: 1,
    h: 3,
    recipe: [
      { name: "Ossa", count: 3 },
      { name: "Pelle", count: 1 },
    ],
  },
  {
    name: "Borsa",
    type: "risorsa",
    icon: "/pelle.png",
    w: 2,
    h: 1,
    recipe: [
      { name: "Pelle", count: 2 },
    ],
  },
  {
    name: "Casco",
    type: "indumento",
    icon: "/roccia.png",
    w: 1,
    h: 1,
    recipe: [
      { name: "Roccia", count: 2 },
    ],
  },
  {
    name: "Torre Scudo",
    type: "indumento",
    icon: "/roccia.png",
    w: 2,
    h: 4,
    recipe: [
      { name: "Roccia", count: 6 },
      { name: "Ossa", count: 2 },
    ],
  },
  // Test items for blacklist functionality
  {
    name: "Tenda in Pelle",
    type: "risorsa",
    icon: "/pelle.png",
    w: 4,
    h: 3,
    recipe: [
      { name: "Pelle", count: 8 },
      { name: "Ossa", count: 4 },
    ],
  },
  {
    name: "Banco da Lavoro",
    type: "risorsa",
    icon: "/roccia.png",
    w: 3,
    h: 2,
    recipe: [
      { name: "Roccia", count: 6 },
      { name: "Pelle", count: 2 },
      { name: "Ossa", count: 3 },
    ],
  },
];

// utilities
const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mapTypeToKind = (t: ItemType): InvItemKind => (t === "risorsa" ? "generico" : (t as InvItemKind));

const loadInventories = (): InventoriesStore => {
  try {
    const raw = localStorage.getItem(INV_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { zaino: [] };
};

const saveInventories = (inv: InventoriesStore) => {
  try { localStorage.setItem(INV_STORE_KEY, JSON.stringify(inv)); } catch {}
};

const countInZainoByName = (inv: InventoriesStore, name: string) => (
  (inv.zaino || []).filter((it) => it.name === name).length
);

const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

function findPlacement(zaino: InvItem[], w: number, h: number): { x: number; y: number } | null {
  // Simple first-fit scan across grid
  outer: for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const rect = { x, y, w, h };
      const collision = zaino.some((it) => rectsOverlap(rect, { x: it.x, y: it.y, w: it.w, h: it.h }));
      if (!collision) return { x, y };
    }
  }
  return null;
}

// Slot helper component (matching inventory.tsx)
function Slot({
  label,
  children,
  width,
  height,
  labelFontSize = 18.6,
  valueFontSize = 18.6,
  padding,
}: {
  label: string;
  children?: React.ReactNode;
  width?: number;
  height?: number;
  labelFontSize?: number;
  valueFontSize?: number;
  padding?: number;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block", width: width ?? "auto", height: height ?? "auto", minWidth: 0 }}>
      <img src="/bg-slot.png" alt="slot" style={{ display: "block", width: width ?? "auto", height: height ?? "auto", maxWidth: "none" }} />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: padding ?? 23,
          transform: "translateY(-50%)",
          color: "#99afc6",
          fontFamily: "Eurostile, sans-serif",
          textTransform: "uppercase",
          letterSpacing: 3,
          fontSize: labelFontSize,
        }}
      >
        {label.toUpperCase()}
      </span>
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: padding ?? 23,
          transform: "translateY(-41.3%)",
          color: "#dfffff",
          fontFamily: "Eurostile, sans-serif",
          textTransform: "uppercase",
          letterSpacing: 3,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: valueFontSize,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function Crafting() {
  const [inventories, setInventories] = useState<InventoriesStore>(() => loadInventories());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ItemType | null>(null);

  // State per le barre di comando
  const [commandItems, setCommandItems] = useState<Array<{id: number, text: string, createdAt: number}>>([]);
  const commandIdRef = useRef(0);
  
  const SURVIVAL_COMMANDS = [
    "exec /usr/bin/survival-monitor --bootstrap",
    "load service craft-analyzer --profile=fast",
    "mount /db recipes.survival --journal=WAL", 
    "start resource-tracker --scan",
    "craftctl check ingredients --verbose",
    "survival-cache warmup --level=full",
    "resource-scanner attach input stack",
    "algorithm enforce survival-protocol",
    "hmi start craft-interface",
    "biofeedback monitor --rate=60hz",
    "inventory preload items --region=crafting",
    "telemetry enable --craft-burst",
    "survival-algorithm status:online",
  ];
  const [hovered, setHovered] = useState<Craftable | null>(CRAFTABLES[0] || null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCrafted, setLastCrafted] = useState<Craftable | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [toast, setToast] = useState<{ name: string; icon: string } | null>(null);
  const [occFlash, setOccFlash] = useState(false);

  // Persist inventories
  useEffect(() => saveInventories(inventories), [inventories]);

  // useEffect per le barre di comando
  useEffect(() => {
    const push = () => {
      const text = SURVIVAL_COMMANDS[Math.floor(Math.random() * SURVIVAL_COMMANDS.length)];
      const id = ++commandIdRef.current;
      setCommandItems(prev => {
        const next = [{ id, text, createdAt: Date.now() }, ...prev];
        return next.slice(0, 8); // massimo 8 visibili
      });
    };
    const interval = setInterval(push, 150); // Leggermente più lenti del homepage
    const purge = setInterval(() => {
      const now = Date.now();
      setCommandItems(prev => prev.filter(it => now - it.createdAt < 1200)); // scompaiono dopo ~1.2s
    }, 150);
    return () => { clearInterval(interval); clearInterval(purge); };
  }, [SURVIVAL_COMMANDS]);

  // UI offset: move main content 500px to the right (200 + 300)
  const OFFSET_X = 300;

  // Mapping delle icone per ogni tipo di item
  const getIconForType = (type: ItemType) => {
    switch (type) {
      case "risorsa": return <FaCubes />;
      case "indumento": return <FaTshirt />;
      case "arma": return <FaFistRaised />;
      case "alimento": return <FaAppleAlt />;
      default: return <FaCubes />;
    }
  };

  const usedTiles = useMemo(() => (inventories.zaino || []).reduce((s, it) => s + it.w * it.h, 0), [inventories]);
  const totalTiles = GRID_COLS * GRID_ROWS;

  // Debug helpers: fill inventory with test items to try crafting
  function addItemToZaino(next: InventoriesStore, name: string, icon: string, w: number, h: number, kind: InvItemKind = "generico") {
    const pos = findPlacement(next.zaino || [], w, h);
    if (!pos) return false;
    const id = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
    const item: InvItem = {
      id,
      name,
      icon,
      image: `/${slugify(name)}.png`,
      x: pos.x,
      y: pos.y,
      w,
      h,
      kind,
      description: "Inserito per test.",
      tier: 1,
    };
    next.zaino = [...(next.zaino || []), item];
    return true;
  }

  function fillInventoryForTest() {
    setInventories((prev) => {
      const next: InventoriesStore = { ...prev, zaino: [...(prev.zaino || [])] };
      // Try to place a variety of items until near capacity
      const batches: Array<{ name: string; icon: string; w: number; h: number; kind?: InvItemKind; count: number }> = [
        { name: "Roccia", icon: "/roccia.png", w: 2, h: 2, kind: "generico", count: 6 },
        { name: "Pelle", icon: "/pelle.png", w: 1, h: 1, kind: "indumento", count: 8 },
        { name: "Ossa", icon: "/ossa.png", w: 1, h: 1, kind: "generico", count: 6 },
        { name: "Bastone Acuminato", icon: "/bastoneacuminato.png", w: 1, h: 5, kind: "arma", count: 1 },
      ];
      for (const b of batches) {
        for (let i = 0; i < b.count; i++) {
          const placed = addItemToZaino(next, b.name, b.icon, b.w, b.h, b.kind);
          if (!placed) break;
        }
      }
      return next;
    });
  }

  function clearZaino() {
    setInventories((prev) => ({ ...prev, zaino: [] }));
  }

  const list = useMemo(() => {
    let arr = CRAFTABLES;
    if (filter) arr = arr.filter((c) => c.type === filter);
    if (q.trim()) arr = arr.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
    return arr;
  }, [q, filter]);

  // Layout logic for variable-sized items
  const TILE_SIZE = 90; // Ridotto del 25% (da 120px a 90px)
  const GRID_WIDTH = 10; // Due blocchi 5x5 = 10 colonne per contenere esattamente due 5x5

  const calculateItemPositions = (items: Craftable[]) => {
    const positions: Array<{ item: Craftable; x: number; y: number }> = [];
    const grid: boolean[][] = [];
    
    // Initialize grid with enough height
    const MAX_HEIGHT = 50;
    for (let y = 0; y < MAX_HEIGHT; y++) {
      grid[y] = new Array(GRID_WIDTH).fill(false);
    }

    // Simple first-fit algorithm for better performance
    items.forEach((item) => {
      let placed = false;
      
      for (let y = 0; y < MAX_HEIGHT - item.h && !placed; y++) {
        for (let x = 0; x < GRID_WIDTH - item.w && !placed; x++) {
          // Check if space is available
          let canPlace = true;
          for (let dy = 0; dy < item.h && canPlace; dy++) {
            for (let dx = 0; dx < item.w && canPlace; dx++) {
              if (grid[y + dy][x + dx]) {
                canPlace = false;
              }
            }
          }
          
          if (canPlace) {
            // Mark space as occupied
            for (let dy = 0; dy < item.h; dy++) {
              for (let dx = 0; dx < item.w; dx++) {
                grid[y + dy][x + dx] = true;
              }
            }
            positions.push({ item, x, y });
            placed = true;
          }
        }
      }
    });
    
    return positions;
  };

  const itemPositions = useMemo(() => calculateItemPositions(list), [list]);

  const maxY = itemPositions.reduce((max, pos) => Math.max(max, pos.y + pos.item.h), 0);
  const containerHeight = Math.max(400, maxY * TILE_SIZE + 100);

  const canSatisfy = (c: Craftable) =>
    c.recipe.every((r) => countInZainoByName(inventories, r.name) >= r.count);

  const hasSpaceAfterCraft = (c: Craftable) => {
    // Se l'oggetto è nella blacklist, non occupa spazio nell'inventario
    const slugified = slugify(c.name);
    if (CRAFTING_BLACKLIST.includes(slugified)) {
      return true; // Gli oggetti blacklisted non occupano spazio
    }
    
    // Simulate ingredient removal and try to place the new item in zaino grid
    const zaino = [...(inventories.zaino || [])];
    // remove up to required counts for each ingredient
    for (const r of c.recipe) {
      let need = r.count;
      for (let i = zaino.length - 1; i >= 0 && need > 0; i--) {
        if (zaino[i].name === r.name) {
          zaino.splice(i, 1);
          need--;
        }
      }
      if (need > 0) return false; // not enough, but this should be caught by canSatisfy
    }
    const pos = findPlacement(zaino, c.w, c.h);
    return !!pos;
  };

  function craftSelected() {
    setError(null);
    const sel = hovered;
    if (!sel) return;
    // 1) Check inventory contents
    if (!canSatisfy(sel)) {
      setError("Elementi insufficienti nello zaino.");
      return;
    }
    // 2) Check space
    if (!hasSpaceAfterCraft(sel)) {
      setError("Spazio insufficiente nello zaino.");
      return;
    }
    // 3) Apply: remove ingredients from zaino
    setInventories((prev) => {
      const next: InventoriesStore = { ...prev, zaino: [...(prev.zaino || [])] };
      // Remove ingredients
      for (const r of sel.recipe) {
        let need = r.count;
        for (let i = next.zaino.length - 1; i >= 0 && need > 0; i--) {
          if (next.zaino[i].name === r.name) {
            next.zaino.splice(i, 1);
            need--;
          }
        }
      }
      
      // Check if item is blacklisted
      const slugified = slugify(sel.name);
      const isBlacklisted = CRAFTING_BLACKLIST.includes(slugified);
      
      if (!isBlacklisted) {
        // Find placement and push crafted item only if not blacklisted
        const pos = findPlacement(next.zaino, sel.w, sel.h);
        if (!pos) {
          // revert removal if somehow failed
          return prev;
        }
        const id = `${slugify(sel.name)}-${Math.random().toString(36).slice(2, 8)}`;
        const item: InvItem = {
          id,
          name: sel.name,
          icon: sel.icon,
          x: pos.x,
          y: pos.y,
          w: sel.w,
          h: sel.h,
          kind: mapTypeToKind(sel.type),
          description: "Creato tramite crafting.",
          tier: 1,
        };
        next.zaino.push(item);
      }
      
      return next;
    });
    setModalOpen(false);
    // Success animations (sempre mostrate, anche per oggetti blacklisted)
    if (sel) {
      setLastCrafted(sel);
      setBurstKey((k) => k + 1);
      setToast({ name: sel.name, icon: sel.icon });
      setTimeout(() => setToast(null), 2100);
      setOccFlash(true);
      setTimeout(() => setOccFlash(false), 650);
      setTimeout(() => setLastCrafted(null), 900);
    }
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", color: "#dfffff", userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}>
      {/* Background */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "url(/bg.png) center/cover no-repeat" }} />

      {/* Local styles */}
      <style>{`
        @keyframes holoPulse { 0%,100%{box-shadow:0 0 0 1px rgba(223,255,255,0.12),0 0 18px rgba(47,208,255,0.05)} 50%{box-shadow:0 0 0 1px rgba(223,255,255,0.2),0 0 28px rgba(47,208,255,0.14)}}
        .holo-panel{animation:holoPulse 3s ease-in-out infinite}
        .card{
          transition: all 0.3s ease;
          position: relative;
        }
        .card::before{
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(45deg, rgba(120,180,200,0.2), rgba(180,200,220,0.2), rgba(120,180,200,0.2));
          border-radius: 10px;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        .card:hover{
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 16px rgba(120,180,200,0.2);
        }
        .card:hover::before{
          opacity: 1;
        }

        /* Toast sci-fi styling */
        .filter-button {
          position: relative;
        }
        .filter-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url(/bg-slot.png);
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.5;
          z-index: 0;
        }

        /* Craft success burst */
        @keyframes ringBurst { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:.75} 70%{opacity:.25} 100%{transform:translate(-50%,-50%) scale(1.6);opacity:0} }
        @keyframes glowPop { 0%{transform:translate(-50%,-50%) scale(.9);opacity:0} 50%{transform:translate(-50%,-50%) scale(1.1);opacity:1} 100%{transform:translate(-50%,-50%) scale(1.0);opacity:.85} }
        @keyframes progressFill{0%{stroke-dashoffset:314.16}100%{stroke-dashoffset:0}}
        @keyframes progressFadeOut{0%{opacity:1}100%{opacity:0}}
        @keyframes snapAppear{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}50%{transform:translate(-50%,-50%) scale(1.2);opacity:1}100%{transform:translate(-50%,-50%) scale(1.0);opacity:1}}
        @keyframes snapFadeOut{0%{transform:translate(-50%,-50%) scale(1.0);opacity:1}100%{transform:translate(-50%,-50%) scale(0.8);opacity:0}}
        .burst-ring{position:absolute;left:50%;top:50%;width:120px;height:120px;border:2px solid rgba(47,208,255,0.7);border-radius:999px;filter:drop-shadow(0 0 10px rgba(47,208,255,0.4));animation:ringBurst .7s ease-out forwards;pointer-events:none}
        .burst-glow{position:absolute;left:50%;top:50%;width:64px;height:64px;background:radial-gradient(circle, rgba(47,208,255,0.35), rgba(47,208,255,0.0) 70%);border-radius:999px;filter:blur(1px);animation:glowPop .45s ease-out forwards;pointer-events:none}
        .burst-icon{position:absolute;left:50%;top:50%;width:42px;height:42px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 8px rgba(47,208,255,0.6));animation:glowPop .5s ease-out forwards;pointer-events:none}
        .center-burst{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:12000}

        /* Toast */
        @keyframes toastIn { from{transform:translateX(24px);opacity:0} to{transform:translateX(0);opacity:1} }
        .toast{display:flex;align-items:center;gap:10px;background:rgba(10,30,50,0.85);border:1px solid rgba(223,255,255,0.18);padding:10px 14px;border-radius:6px}
        .toast-in{animation:toastIn .25s ease-out forwards}

        /* Occupancy flash */
        @keyframes occFlash { 0%{box-shadow:0 0 0 0 rgba(47,208,255,0.0)} 50%{box-shadow:0 0 0 2px rgba(47,208,255,0.35), 0 0 24px rgba(47,208,255,0.18)} 100%{box-shadow:0 0 0 0 rgba(47,208,255,0.0)} }
        .occ-anim{animation:occFlash .6s ease-out}
      `}</style>

      {/* Dettaglio Ricetta: identico al layout inventory.tsx */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: Math.max(24, 200 - 40),
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            pointerEvents: "auto",
            cursor: "pointer",
          }}
          onClick={() => setModalOpen(true)}
          title="Clicca per fabbricare"
        >
          {/* Titolo testuale */}
          <div style={{ color: "#dfffff", fontFamily: "Eurostile, sans-serif", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, fontSize: 30 }}>
            {hovered.name}
          </div>

          {(() => {
            const SCALE = 0.75;
            const BASE_W = 491;
            const W = Math.round(BASE_W * SCALE); // ~368
            const PAD = Math.round(23 * SCALE); // ~17
            const LABEL_FS = 18.6 * SCALE; // ~14
            const VALUE_FS = 18.6 * SCALE; // ~14
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: W }}>
                  {hovered.recipe.map((r, idx) => {
                    const have = countInZainoByName(inventories, r.name);
                    const ok = have >= r.count;
                    return (
                      <Slot 
                        key={idx}
                        label={r.name} 
                        width={W} 
                        labelFontSize={LABEL_FS} 
                        valueFontSize={VALUE_FS} 
                        padding={PAD}
                      >
                        <span style={{ 
                          fontWeight: 700, 
                          color: ok ? "#dfffff" : "#ff8a8a",
                          fontFamily: "Varino, monospace"
                        }}>
                          {r.count}
                        </span>
                        <span style={{ 
                          opacity: 0.7, 
                          fontSize: "9px", 
                          fontFamily: "Varino, monospace",
                          color: ok ? "#dfffff" : "#ff8a8a"
                        }}>
                          ({have})
                        </span>
                      </Slot>
                    );
                  })}
                </div>

                {/* Descrizione: una sola riga, allineata a destra, subito sotto gli slot */}
                <div
                  style={{
                    width: W,
                    color: "#dfffff",
                    fontFamily: "Eurostile, sans-serif",
                    fontSize: 16,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`Ricetta per creare ${hovered.name}`}
                >
                  Ricetta per creare {hovered.name}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Animazione loadingpapers.gif spostata più in basso e rimpicciolita */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: "60%", // Spostata da 50% a 60% (più in basso)
          transform: "translateY(-50%)",
          width: "700px", // Aumentata da 600px a 700px (zoom leggero)
          height: "700px", // Aumentata da 600px a 700px (zoom leggero)
          pointerEvents: "none",
          zIndex: 100,
          background: "black",
          mixBlendMode: "screen",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Testo sopra l'animazione - RIMOSSO */}
        
        <img
          src="/loadingpapers.gif"
          alt="Loading animation"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: 0.1, // Ridotta da 0.5 a 0.1
          }}
        />
      </div>

      {/* CommandStreamRight in varie posizioni con 20px offset destro */}
      <div style={{ position: "absolute", top: 200, right: 20 }}><CommandStreamRight /></div>
      <div style={{ position: "absolute", bottom: 200, right: 20 }}><CommandStreamRight /></div>
      <div style={{ position: "absolute", top: 300, right: 20 }}><CommandStreamRight /></div>

      {/* Barre di comando in esecuzione (come in homepage) - allineate a destra */}
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          left: "60%", // Inizia dal 60% della larghezza per allinearsi a destra
          display: "flex",
          flexDirection: "column",
          gap: 6,
          pointerEvents: "none",
          zIndex: 200,
        }}
      >
        {commandItems.map((item) => (
          <div
            key={item.id}
            style={{
              color: "#0d1d33",
              fontSize: 18,
              fontFamily: "Eurostile, monospace",
              letterSpacing: 1,
              textShadow: "0 0 1px rgba(13,29,51,0.65)",
              opacity: 0.8,
              textAlign: "right",
            }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Barra di ricerca + filtri */}
      <div style={{ position: "absolute", top: 24, left: 24 + OFFSET_X, display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            position: "relative",
            padding: "12px 24px",
            width: "480px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Sfondo con opacità */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url(/bg-title.png)",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              opacity: 0.3,
              zIndex: 0,
            }}
          />
          {/* Overlay scuro interno */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              height: "75%",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: "6px",
              zIndex: 1,
            }}
          />
          <FaSearch
            style={{
              color: "#9fb8c7",
              fontSize: "18px",
              zIndex: 2,
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per nome..."
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#dfffff",
              fontSize: "16px",
              outline: "none",
              flex: 1,
              zIndex: 2,
            }}
          />
        </div>
        {(["risorsa", "indumento", "arma", "alimento"] as ItemType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter((f) => (f === t ? null : t))}
            className="filter-button"
            style={{
              padding: "12px",
              width: "60px",
              height: "60px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: filter === t ? "#dfffff" : "#9fb8c7",
              fontSize: "20px",
              opacity: filter === t ? 1 : 0.9,
              transition: "all 0.2s ease",
              backgroundColor: "transparent",
              position: "relative",
              zIndex: 1,
            }}
            title={t}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = filter === t ? "1" : "0.9"}
          >
            {getIconForType(t)}
          </button>
        ))}
        <button
          onClick={() => { setQ(""); setFilter(null); }}
          className="filter-button"
          style={{ 
            padding: "12px",
            width: "60px",
            height: "60px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9fb8c7",
            fontSize: "20px",
            opacity: 0.9,
            transition: "all 0.2s ease",
            backgroundColor: "transparent",
            position: "relative",
            zIndex: 1,
          }}
          title="Reset filtri"
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.9"}
        >
          <FaEraser />
        </button>
        {/* Debug controls */}
        <button 
          onClick={fillInventoryForTest} 
          className="filter-button"
          style={{ 
            padding: "12px",
            width: "60px",
            height: "60px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#47a8bf",
            fontSize: "20px",
            opacity: 0.9,
            transition: "all 0.2s ease",
            backgroundColor: "transparent",
            position: "relative",
            zIndex: 1,
          }}
          title="Riempi inventario per test"
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.9"}
        >
          <FaFillDrip />
        </button>
        <button 
          onClick={clearZaino} 
          className="filter-button"
          style={{ 
            padding: "12px",
            width: "60px",
            height: "60px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#bf4747",
            fontSize: "20px",
            opacity: 0.9,
            transition: "all 0.2s ease",
            backgroundColor: "transparent",
            position: "relative",
            zIndex: 1,
          }}
          title="Svuota zaino"
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.9"}
        >
          <FaVial />
        </button>
      </div>

      {/* Spazio per scritta ALGORITMO-SURVIVAL-STATUS (nascosta) */}
      <div
        style={{
          position: "absolute",
          top: "92px", // Mantiene lo spazio originale
          left: `${24 + OFFSET_X}px`,
          width: "924px",
          height: "30px", // Mantiene l'altezza per lo spazio
          zIndex: 1,
        }}
      >
        {/* Testo rimosso ma spazio mantenuto */}
      </div>

      {/* Tabella elementi in contenitore quadrato con scroll nascosto */}
      <div
        style={{
          position: "absolute",
          top: "130px", // Aumentato da 100px a 130px per far spazio alla scritta più grande
          left: `${24 + OFFSET_X}px`,
          width: "924px", // Forza quadrato: stesso width e height
          height: "924px", // Forza quadrato: stesso width e height
          overflow: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
          borderRadius: "8px",
          background: "transparent",
        }}
        className="custom-scrollbar" // Classe per nascondere webkit scrollbar
        onWheel={(e) => {
          // Scroll con mouse wheel
          e.currentTarget.scrollTop += e.deltaY;
        }}
        onMouseDown={(e) => {
          // Click and drag scroll solo se non si clicca su uno slot
          const target = e.target as HTMLElement;
          if (target.closest('.card')) return; // Non fare scroll se si clicca su una card
          
          const container = e.currentTarget;
          const startY = e.clientY;
          const startScrollTop = container.scrollTop;
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            container.scrollTop = startScrollTop - deltaY;
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div 
          style={{ 
            position: "relative",
            width: "900px", // 10 colonne * 90px = 900px
            height: `${containerHeight}px`,
          }}
        >
          {itemPositions.map(({ item: c, x, y }) => {
            const ok = canSatisfy(c) && hasSpaceAfterCraft(c);
            return (
              <div
                key={c.name}
                onMouseEnter={() => setHovered(c)}
                onClick={() => {
                  setHovered(c);
                  setModalOpen(true);
                }}
                style={{
                  position: "absolute",
                  left: `${x * TILE_SIZE}px`,
                  top: `${y * TILE_SIZE}px`,
                  width: `${c.w * TILE_SIZE}px`,
                  height: `${c.h * TILE_SIZE}px`,
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  opacity: ok ? 1 : 0.3,
                  border: "1px solid rgba(223,255,255,0.1)",
                  borderRadius: "4px",
                  background: "rgba(10,30,50,0.3)",
                  filter: ok ? "brightness(1.1)" : "brightness(0.8)",
                }}
                className="card"
              >
                <div 
                  className="badge" 
                  style={{ 
                    background: ok ? "rgba(223,255,255,0.2)" : "rgba(255,80,80,0.3)", 
                    color: ok ? "#dfffff" : "#ff5050",
                    border: `1px solid ${ok ? "rgba(223,255,255,0.3)" : "rgba(255,80,80,0.5)"}`,
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    padding: "2px 6px",
                    borderRadius: "8px",
                    fontSize: "9px",
                    fontWeight: "bold",
                    fontFamily: "Varino, monospace",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    zIndex: 2,
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  {ok ? "OK" : "KO"}
                </div>
                <img 
                  src={c.icon} 
                  alt={c.name}
                  style={{ 
                    maxWidth: "75%", 
                    maxHeight: "75%", 
                    objectFit: "contain", 
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                    zIndex: 1,
                  }} 
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Occupazione zaino indicator */}
      <div 
        style={{ 
          position: "absolute", 
          left: 180, // Spostato da 150px a 180px (ancora meno a sinistra)
          top: 12, // Spostato da 24px a 12px (più in alto)
          backgroundImage: "url(/bg-slot.png)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          transform: "perspective(300px) rotateX(3deg) scaleY(0.9)",
          transformOrigin: "center bottom",
          padding: "16px 24px", 
          display: "flex",
          flexDirection: "column", // Cambiato da row a column
          alignItems: "center",
          justifyContent: "center",
          gap: "8px", // Ridotto gap per layout verticale
          color: "#9fb8c7", 
          fontFamily: "Eurostile, sans-serif", 
          letterSpacing: 1,
          width: "100px", // Forza quadrato: stessa larghezza e altezza
          height: "100px", // Forza quadrato: stessa larghezza e altezza
          opacity: 0.7, // Aggiunta opacità 0.7
        }}
      >
        <FaSuitcase 
          style={{ 
            fontSize: "36px", 
            color: "#dfffff" 
          }} 
        />
        <div 
          className={occFlash ? "occ-anim" : undefined} 
          style={{ 
            fontWeight: "bold",
            color: "#dfffff",
            textAlign: "center",
            lineHeight: "1.2",
            fontFamily: "Varino, monospace", // Cambiato a Varino
          }}
        >
          <span style={{ fontSize: "18px" }}>{usedTiles}</span>
          <span style={{ fontSize: "14px", margin: "0 4px" }}>/</span>
          <span style={{ fontSize: "16px", color: "#6b8394" }}>{totalTiles}</span>
        </div>
      </div>

      {/* Centered craft success burst */}
      {lastCrafted && (
        <div key={burstKey} className="center-burst" aria-hidden>
          {/* Cerchio di progresso animato */}
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {/* Cerchio di sfondo */}
            <circle
              cx="80"
              cy="80"
              r="50"
              stroke="rgba(223,255,255,0.2)"
              strokeWidth="4"
              fill="none"
            />
            {/* Cerchio di progresso */}
            <circle
              cx="80"
              cy="80"
              r="50"
              stroke="#dfffff"
              strokeWidth="4"
              fill="none"
              strokeDasharray="314.16" // 2 * PI * 50
              strokeDashoffset="314.16"
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{
                animation: "progressFill 0.8s ease-out forwards, progressFadeOut 0.5s ease-in forwards 1.5s",
                filter: "drop-shadow(0 0 8px rgba(223,255,255,0.6))",
              }}
            />
          </svg>
          
          <div className="burst-ring" />
          <div className="burst-glow" />
          
          {/* Snap.png centrato */}
          <img
            src="/snap.png"
            alt=""
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px",
              filter: "drop-shadow(0 0 12px rgba(255,255,255,0.8))",
              animation: "snapAppear 0.4s ease-out forwards 0.1s, snapFadeOut 0.5s ease-in forwards 1.5s",
              pointerEvents: "none",
              opacity: 0,
            }}
          />
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div style={{ position: "absolute", top: 24 + 120, right: 24, zIndex: 9999 }}>
          <div 
            className="toast toast-in"
            style={{
              background: "linear-gradient(135deg, rgba(10,30,50,0.95), rgba(5,16,36,0.95))",
              border: "1px solid rgba(47,208,255,0.5)",
              borderRadius: "8px",
              padding: "12px 16px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(47,208,255,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <img 
              src={toast.icon} 
              alt="" 
              width={24} 
              height={24} 
              style={{ 
                objectFit: 'contain',
                filter: "drop-shadow(0 0 4px rgba(47,208,255,0.6))"
              }} 
            />
            <span 
              style={{
                fontFamily: "Eurostile, monospace",
                color: "#dfffff",
                textShadow: "0 0 8px rgba(47,208,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "2px",
                fontSize: "13px",
              }}
            >
              FATTO: <strong style={{ 
                color: '#2fcfff',
                textShadow: "0 0 8px rgba(47,208,255,0.6)",
                letterSpacing: "3px",
              }}>{toast.name}</strong>
            </span>
          </div>
        </div>
      )}
      {/* aria-live for accessibility */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }} aria-live="polite" aria-atomic="true">
        {toast ? `Oggetto creato: ${toast.name}` : ''}
      </div>

      {/* Popup crafting */}
      {modalOpen && hovered && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 520, maxWidth: "92vw", background: "rgba(10,30,50,0.9)", border: "1px solid rgba(223,255,255,0.18)", padding: 16, borderRadius: 8, position: "relative" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <strong 
                style={{
                  fontFamily: "Eurostile, monospace",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                  color: "#dfffff",
                  textShadow: "0 0 8px rgba(47,208,255,0.5)",
                  fontSize: "16px",
                }}
              >
                FABBRICARE: {hovered.name}
              </strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setModalOpen(false)} style={{ cursor: "pointer" }}>✕</button>
                <button
                  onClick={craftSelected}
                  disabled={!hovered || !canSatisfy(hovered) || !hasSpaceAfterCraft(hovered)}
                  style={{ cursor: (!hovered || !canSatisfy(hovered) || !hasSpaceAfterCraft(hovered)) ? "not-allowed" : "pointer", opacity: (!hovered || !canSatisfy(hovered) || !hasSpaceAfterCraft(hovered)) ? 0.6 : 1 }}
                >
                  ✓
                </button>
              </div>
            </div>
            <div>
              <div style={{ marginBottom: 8, color: "#9fb8c7" }}>Richiede:</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {hovered.recipe.map((r, idx) => {
                  const have = countInZainoByName(inventories, r.name);
                  const ok = have >= r.count;
                  return (
                    <li key={idx} style={{ color: ok ? "#dfffff" : "#ff8a8a", fontFamily: "Varino, monospace" }}>
                      {r.name} × {r.count} <span style={{ opacity: 0.7, fontFamily: "Varino, monospace" }}>(hai {have})</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {error && <div style={{ marginTop: 10, color: "#ff8a8a" }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
