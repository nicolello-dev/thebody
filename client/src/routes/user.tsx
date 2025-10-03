import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useUser } from "../hooks/useUser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTemperatureHalf,
  faDroplet,
  faUtensils,
  faLungs,
  faMoon,
  faHeartPulse,
  faShirt,
  faGun,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
// import MonitorWidget from "../components/monitorwidget"; // non usato qui, mostriamo soli valori

// Minimal re-use of inventory item types and helpers (aligned with inventory/crafting)
type InvItemKind = "alimento" | "indumento" | "arma" | "generico";
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

const INV_STORE_KEY = "thebody.inventories";
const EQUIP_STORE_KEY = "thebody.equipment";
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
  try { localStorage.setItem(INV_STORE_KEY, JSON.stringify(inv)); } catch {}
}
function loadEquip(): EquipmentStore {
  try {
    const raw = localStorage.getItem(EQUIP_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}
function saveEquip(eq: EquipmentStore) {
  try { localStorage.setItem(EQUIP_STORE_KEY, JSON.stringify(eq)); } catch {}
}

const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

function findPlacement(zaino: InvItem[], w: number, h: number): { x: number; y: number } | null {
  outer: for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      const rect = { x, y, w, h };
      const collision = zaino.some((it) => rectsOverlap(rect, { x: it.x, y: it.y, w: it.w, h: it.h }));
      if (!collision) return { x, y };
    }
  }
  return null;
}

export default function User({ temperature: propTemperature, isRobot = false }: { temperature?: number; isRobot?: boolean }) {
  const user = useUser();
  const [inventories, setInventories] = useState<InventoriesStore>(() => loadInventories());
  const [equip, setEquip] = useState<EquipmentStore>(() => loadEquip());
  const [picker, setPicker] = useState<null | { slot: "left" | "right" | "outfit" }>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug picker state changes
  useEffect(() => {
    // Picker state management
  }, [picker]);

  // Simple picker function
  const openPicker = useCallback((slot: "left" | "right" | "outfit") => {
    setPicker({ slot });
  }, []);

  // Initialize inventory with sample items if empty
  useEffect(() => {
    if (inventories.zaino.length === 0) {
      const sampleItems: InvItem[] = [
        {
          id: "test-weapon-1",
          name: "Pistola Laser",
          icon: "/roccia.png", // Using available image as placeholder
          kind: "arma",
          x: 0, y: 0, w: 2, h: 1,
          description: "Un'arma laser compatta",
          tier: 2
        },
        {
          id: "test-weapon-2", 
          name: "Fucile Plasma",
          icon: "/cassa.png",
          kind: "arma", 
          x: 2, y: 0, w: 3, h: 1,
          description: "Potente fucile al plasma",
          tier: 3
        },
        {
          id: "test-outfit-1",
          name: "Tuta Spaziale",
          icon: "/zaino.png",
          kind: "indumento",
          x: 0, y: 1, w: 2, h: 2,
          description: "Protezione completa per lo spazio",
          tier: 2
        },
        {
          id: "test-outfit-2",
          name: "Armatura",
          icon: "/pelle.png", 
          kind: "indumento",
          x: 2, y: 1, w: 2, h: 2,
          description: "Armatura da combattimento",
          tier: 3
        }
      ];
      
      const newInventories = { zaino: sampleItems };
      setInventories(newInventories);
      saveInventories(newInventories);
      console.log('Added sample items to inventory');
    }
  }, []);

  const zaino = inventories.zaino || [];
  const weapons = useMemo(() => zaino.filter((i) => i.kind === "arma"), [zaino]);
  const outfits = useMemo(() => zaino.filter((i) => i.kind === "indumento"), [zaino]);
  const usedTiles = useMemo(() => zaino.reduce((s, it) => s + it.w * it.h, 0), [zaino]);
  const totalTiles = GRID_COLS * GRID_ROWS;

    // Inventory monitoring
  useEffect(() => {
    // Monitor inventory changes
  }, [zaino, weapons, outfits]);

  function persist(inv: InventoriesStore, eq: EquipmentStore) {
    saveInventories(inv);
    saveEquip(eq);
  }

  function equipItem(slot: "left" | "right" | "outfit", item: InvItem) {
    setError(null);
    // validate kind for slot
    if (slot === "outfit" && item.kind !== "indumento") {
      setError("Solo indumenti possono essere equipaggiati nello slot Outfit.");
      return;
    }
    if ((slot === "left" || slot === "right") && item.kind !== "arma") {
      setError("Solo armi possono essere equipaggiate nelle mani.");
      return;
    }
    setInventories((prev) => {
      const nextInv: InventoriesStore = { ...prev, zaino: [...(prev.zaino || [])] };
      // Remove item from zaino by id
      const idx = nextInv.zaino.findIndex((z) => z.id === item.id);
      if (idx >= 0) nextInv.zaino.splice(idx, 1);
      setEquip((prevEq) => {
        const nextEq: EquipmentStore = { ...prevEq };
        if (slot === "left") nextEq.leftHand = item;
        if (slot === "right") nextEq.rightHand = item;
        if (slot === "outfit") nextEq.outfit = item;
        persist(nextInv, nextEq);
        return nextEq;
      });
      return nextInv;
    });
    setPicker(null);
  }

  function unequipItem(slot: "left" | "right" | "outfit") {
    setError(null);
    setEquip((prevEq) => {
      const item = slot === "left" ? prevEq.leftHand : slot === "right" ? prevEq.rightHand : prevEq.outfit;
      if (!item) return prevEq;
      // Try to return item to zaino
      setInventories((prev) => {
        const next: InventoriesStore = { ...prev, zaino: [...(prev.zaino || [])] };
        const pos = findPlacement(next.zaino, item.w, item.h);
        if (!pos) {
          setError("Spazio insufficiente nello zaino per riporre l'oggetto.");
          return prev;
        }
        next.zaino.push({ ...item, x: pos.x, y: pos.y });
        const newEq: EquipmentStore = { ...prevEq, [slot === "left" ? "leftHand" : slot === "right" ? "rightHand" : "outfit"]: null };
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
  const actualTemperature = typeof propTemperature === "number" ? propTemperature : user.temperature;
  const [tempDisplay, setTempDisplay] = useState<number>(actualTemperature);
  const latestTempRef = useRef<number>(actualTemperature);
  
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

  // Dynamic health model: current x / max
  // Debug constants aligned with MonitorWidget
  const DBG_MAX_HEALTH = 15;
  const DBG_CURRENT_HEALTH = 10;
  // Health calculation: for now use debug constants to ensure x/max reflects 10/15
  const maxHealth = DBG_MAX_HEALTH;
  const currentHealth = Math.max(0, Math.min(DBG_CURRENT_HEALTH, DBG_MAX_HEALTH));

  function TemperatureBar({ value, min = -5, max = 45 }: { value: number; min?: number; max?: number }) {
    const clamped = Math.max(min, Math.min(max, value));
    const pct = Math.round(((clamped - min) / (max - min)) * 100);
    // color glow from blue to red
    const t = pct / 100;
    const r = Math.round(47 + (255 - 47) * t);
    const g = Math.round(208 + (80 - 208) * t);
    const b = Math.round(255 + (80 - 255) * t);
    const glow = `rgba(${r},${g},${b},0.45)`;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "22px 120px 1fr 60px", alignItems: "center", gap: 8 }}>
        <FontAwesomeIcon icon={faTemperatureHalf} style={{ color: "#7fd2ff" }} />
        <div style={{ color: "#9fb8c7" }}>Temperatura</div>
        <div style={{ position: "relative", height: 12, background: "rgba(10,30,50,0.75)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #2fb3ff, #7fe2ff, #ffd06e, #ff8a4a, #ff5050)", transition: "width .2s ease" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, height: "100%", background: glow, filter: "blur(6px)", opacity: 0.8, pointerEvents: "none" }} />
        </div>
        <div style={{ textAlign: "right", color: "#dfffff" }}>{value.toFixed(1)}°C</div>
      </div>
    );
  }

  function HealthBar({ current, max }: { current: number; max: number }) {
    const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "22px 120px 1fr 80px", alignItems: "center", gap: 8 }}>
        <FontAwesomeIcon icon={faHeartPulse} style={{ color: "#ff8aa0" }} />
        <div style={{ color: "#9fb8c7" }}>Salute</div>
        <div style={{ height: 10, background: "rgba(10,30,50,0.7)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 5 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(255,138,160,0.7), rgba(255,80,80,0.8))" }} />
        </div>
        <div style={{ textAlign: "right", color: "#dfffff" }}>{current} / {max}</div>
      </div>
    );
  }
  function EnergyBar({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "22px 120px 1fr 60px", alignItems: "center", gap: 8 }}>
        <div style={{ color: "#9fb8c7" }}>Energia</div>
        <div style={{ gridColumn: "3 / 4", height: 10, background: "rgba(10,30,50,0.7)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 5 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(127,226,255,0.7), rgba(47,208,255,0.9))" }} />
        </div>
        <div style={{ textAlign: "right", color: "#dfffff" }}>{pct}%</div>
      </div>
    );
  }
  function StatRow({ icon, label, value, unit, max = 100 }: { icon: any; label: string; value: number; unit?: string; max?: number }) {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return (
      <div style={{ display: "grid", gridTemplateColumns: "22px 120px 1fr 60px", alignItems: "center", gap: 8 }}>
        <FontAwesomeIcon icon={icon} style={{ color: "#7fd2ff" }} />
        <div style={{ color: "#9fb8c7" }}>{label}</div>
        <div style={{ height: 8, background: "rgba(10,30,50,0.7)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, rgba(47,208,255,0.6), rgba(47,208,255,0.15))" }} />
        </div>
        <div style={{ textAlign: "right", color: "#dfffff" }}>{value}{unit ?? ""}</div>
      </div>
    );
  }

  // Slot view
  function Slot({ label, item, onPick, onUnequip, kind }: { label: string; item?: InvItem | null; onPick: () => void; onUnequip: () => void; kind: "arma" | "indumento" }) {
    return (
      <div 
        style={{ 
          position: "relative", 
          width: 180,
          height: 180,
          borderRadius: 12,
          background: "rgba(10,30,50,0.6)", 
          border: "1px solid rgba(223,255,255,0.12)", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: 10,
          zIndex: 10
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `url(/bg-slot.png) center/contain no-repeat`, opacity: 0.2, pointerEvents: "none" }} aria-hidden />
        <div style={{ position: "absolute", top: 10, left: 10, fontSize: 14, color: "#9fb8c7", textTransform: "uppercase", letterSpacing: 1, pointerEvents: "none" }}>{label}</div>
        {item ? (
          <>
            <img src={item.icon} alt="" width={80} height={80} style={{ objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(47,208,255,0.35))", pointerEvents: "none" }} />
            <div style={{ fontSize: 14, textAlign: "center", pointerEvents: "none" }}>{item.name}</div>
            <div 
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUnequip();
              }}
              title="Riponi nello zaino" 
              style={{ 
                position: "absolute", 
                bottom: 10, 
                right: 10, 
                cursor: "pointer", 
                background: "rgba(47,208,255,0.1)", 
                border: "1px solid rgba(47,208,255,0.35)", 
                color: "#dfffff", 
                padding: "6px 8px", 
                borderRadius: 6,
                zIndex: 1000,
                userSelect: "none",
                WebkitUserSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </div>
          </>
        ) : (
          <>
            <div aria-hidden style={{ opacity: 0.65, color: "#9fb8c7", pointerEvents: "none", fontSize: 24 }}>
              <FontAwesomeIcon icon={kind === "arma" ? faGun : faShirt} />
            </div>
            <div 
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              style={{ 
                cursor: "pointer", 
                background: "rgba(10,30,50,0.8)", 
                border: "1px solid rgba(223,255,255,0.18)", 
                color: "#dfffff", 
                padding: "10px 16px",
                borderRadius: 6,
                zIndex: 99999,
                userSelect: "none",
                WebkitUserSelect: "none",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "60px",
                minHeight: "36px",
                pointerEvents: "auto",
                position: "relative"
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
    if (picker.slot === "outfit") return outfits;
    return weapons;
  }, [picker, weapons, outfits]);

  // Layout
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", color: "#dfffff", overflow: "hidden" }}>
      {/* bg */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "url(/bg.png) center/cover no-repeat" }} />

      {/* panels */}
      <div style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 24, display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, transform: "translateX(300px)" }}>
        {/* Left: medical dashboard */}
        <div style={{ background: "rgba(10,30,50,0.65)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: "Eurostile, sans-serif", letterSpacing: 2, textTransform: "uppercase", color: "#9fb8c7" }}>Monitor (valori)</div>
            <div style={{ fontSize: 12, color: "#9fb8c7" }}>
              Modalità: {isRobot ? "Robot" : "Umano"}
            </div>
          </div>
          {/* Se isRobot=false: mostra tutti i parametri; se isRobot=true: mostra solo salute ed energia */}
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {/* In questa pagina mostriamo i valori, il widget grafico rimane altrove */}
            <HealthBar current={currentHealth} max={maxHealth} />
            {!isRobot && (
              <>
                <TemperatureBar value={tempDisplay} />
                <StatRow icon={faHeartPulse} label="Biofeedback" value={user.biofeedback} unit="%" />
                <StatRow icon={faLungs} label="Ossigeno" value={user.oxygen} unit="%" />
                <StatRow icon={faDroplet} label="Idratazione" value={user.thirst} unit="%" />
                <StatRow icon={faUtensils} label="Nutrizione" value={user.hunger} unit="%" />
                <StatRow icon={faMoon} label="Sonno" value={user.sleep} unit="%" />
              </>
            )}
            {isRobot && (
              <>
                <EnergyBar value={0.75} />
                {/* altri parametri robot-specific potranno essere aggiunti qui */}
              </>
            )}
          </div>
          <div style={{ fontFamily: "Eurostile, sans-serif", letterSpacing: 2, textTransform: "uppercase", color: "#9fb8c7", margin: "4px 0 8px" }}>Parametri Vitali</div>
          <div style={{ display: "grid", gap: 10 }}>
            {/* Sezione già sopra riporta i parametri principali */}
          </div>

          {/* zaino occupancy quick view */}
          <div style={{ marginTop: 16, padding: 10, borderTop: "1px solid rgba(223,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#9fb8c7" }}>Zaino</div>
            <div>Occupazione: <strong style={{ color: "#dfffff" }}>{usedTiles}</strong> / {totalTiles}</div>
          </div>
        </div>

        {/* Right: body silhouette + equip slots */}
        <div style={{ position: "relative", background: "rgba(10,30,50,0.55)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 8, padding: 16, width: "50%", height: "80%", overflow: "visible" }}>
          <div style={{ fontFamily: "Eurostile, sans-serif", letterSpacing: 2, textTransform: "uppercase", color: "#9fb8c7", marginBottom: 12 }}>Schema Medico</div>
          
          {/* Equipment slots positioned absolutely outside the flex container */}
          {/* outfit slot */}
          <div style={{ position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
            <Slot label="Outfit" kind="indumento" item={equip.outfit} onPick={() => openPicker("outfit")} onUnequip={() => unequipItem("outfit")} />
          </div>

          {/* hands slots */}
          <div style={{ position: "absolute", top: 200, left: 50, zIndex: 100 }}>
            <Slot label="Mano SX" kind="arma" item={equip.leftHand} onPick={() => openPicker("left")} onUnequip={() => unequipItem("left")} />
          </div>
          <div style={{ position: "absolute", top: 200, right: 50, zIndex: 100 }}>
            <Slot label="Mano DX" kind="arma" item={equip.rightHand} onPick={() => openPicker("right")} onUnequip={() => unequipItem("right")} />
          </div>

          {error && <div style={{ marginTop: 12, color: "#ff8a8a" }}>{error}</div>}
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div role="dialog" aria-modal="true" onClick={() => setPicker(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: "rgba(10,30,50,0.92)", border: "1px solid rgba(223,255,255,0.18)", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>Seleziona {picker!.slot === "outfit" ? "un indumento" : "un'arma"}</strong>
              <button onClick={() => setPicker(null)} style={{ cursor: "pointer" }}>✕</button>
            </div>
            {pickerItems.length === 0 ? (
              <div style={{ color: "#9fb8c7" }}>Nessun oggetto disponibile nello zaino.</div>
            ) : (
              <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {pickerItems.map((it, index) => (
                  <div key={`${it.id}-${index}`} style={{ background: "rgba(10,30,50,0.65)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: "100%", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(5,16,36,0.55)", borderRadius: 4 }}>
                      <img src={it.icon} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                    <div style={{ textAlign: "center" }}>{it.name}</div>
                    <button onClick={() => equipItem(picker!.slot, it)} style={{ cursor: "pointer", background: "rgba(47,208,255,0.14)", border: "1px solid rgba(47,208,255,0.35)", color: "#dfffff", padding: "6px 8px", borderRadius: 4 }}>Equipaggia</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
