import React, { useEffect, useMemo, useState } from "react";

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

export default function Crafting() {
  const [inventories, setInventories] = useState<InventoriesStore>(() => loadInventories());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ItemType | null>(null);
  const [hovered, setHovered] = useState<Craftable | null>(CRAFTABLES[0] || null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCrafted, setLastCrafted] = useState<Craftable | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [toast, setToast] = useState<{ name: string; icon: string } | null>(null);
  const [occFlash, setOccFlash] = useState(false);

  // Persist inventories
  useEffect(() => saveInventories(inventories), [inventories]);

  // UI offset: move main content 200px to the right
  const OFFSET_X = 200;

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

  const canSatisfy = (c: Craftable) =>
    c.recipe.every((r) => countInZainoByName(inventories, r.name) >= r.count);

  const hasSpaceAfterCraft = (c: Craftable) => {
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
    // 3) Apply: remove ingredients from zaino, place crafted item with first-fit
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
      // Find placement and push crafted item
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
      return next;
    });
    setModalOpen(false);
    // Success animations
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
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", color: "#dfffff" }}>
      {/* Background */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "url(/bg.png) center/cover no-repeat" }} />

      {/* Local styles */}
      <style>{`
        @keyframes holoPulse { 0%,100%{box-shadow:0 0 0 1px rgba(223,255,255,0.12),0 0 18px rgba(47,208,255,0.05)} 50%{box-shadow:0 0 0 1px rgba(223,255,255,0.2),0 0 28px rgba(47,208,255,0.14)}}
        .holo-panel{animation:holoPulse 3s ease-in-out infinite}
        .card{transition:transform .15s ease, box-shadow .2s ease}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,0.35),0 0 0 1px rgba(223,255,255,0.18) inset}
        .badge{position:absolute;top:8px;left:8px;padding:2px 6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;border:1px solid rgba(223,255,255,0.22)}

        /* Craft success burst */
        @keyframes ringBurst { 0%{transform:translate(-50%,-50%) scale(0.6);opacity:.75} 70%{opacity:.25} 100%{transform:translate(-50%,-50%) scale(1.6);opacity:0} }
        @keyframes glowPop { 0%{transform:translate(-50%,-50%) scale(.9);opacity:0} 50%{transform:translate(-50%,-50%) scale(1.1);opacity:1} 100%{transform:translate(-50%,-50%) scale(1.0);opacity:.85} }
        .burst-ring{position:absolute;left:50%;top:50%;width:120px;height:120px;border:2px solid rgba(47,208,255,0.7);border-radius:999px;filter:drop-shadow(0 0 10px rgba(47,208,255,0.4));animation:ringBurst .7s ease-out forwards;pointer-events:none}
        .burst-glow{position:absolute;left:50%;top:50%;width:64px;height:64px;background:radial-gradient(circle, rgba(47,208,255,0.35), rgba(47,208,255,0.0) 70%);border-radius:999px;filter:blur(1px);animation:glowPop .45s ease-out forwards;pointer-events:none}
        .burst-icon{position:absolute;left:50%;top:50%;width:42px;height:42px;transform:translate(-50%,-50%);filter:drop-shadow(0 0 8px rgba(47,208,255,0.6));animation:glowPop .5s ease-out forwards;pointer-events:none}
        .center-burst{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:12000}
        .center-burst .hexbg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:220px;height:220px;opacity:.22;filter:drop-shadow(0 0 12px rgba(47,208,255,0.22))}

        /* Toast */
        @keyframes toastIn { from{transform:translateX(24px);opacity:0} to{transform:translateX(0);opacity:1} }
        .toast{display:flex;align-items:center;gap:10px;background:rgba(10,30,50,0.85);border:1px solid rgba(223,255,255,0.18);padding:10px 14px;border-radius:6px}
        .toast-in{animation:toastIn .25s ease-out forwards}

        /* Occupancy flash */
        @keyframes occFlash { 0%{box-shadow:0 0 0 0 rgba(47,208,255,0.0)} 50%{box-shadow:0 0 0 2px rgba(47,208,255,0.35), 0 0 24px rgba(47,208,255,0.18)} 100%{box-shadow:0 0 0 0 rgba(47,208,255,0.0)} }
        .occ-anim{animation:occFlash .6s ease-out}
      `}</style>

      {/* Ricetta in alto a destra */}
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          minWidth: 320,
          maxWidth: 420,
          background: "rgba(10, 30, 50, 0.6)",
          padding: 16,
          borderRadius: 6,
          backdropFilter: "blur(1px)",
          boxShadow: "0 0 0 1px rgba(223,255,255,0.12)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => hovered && setModalOpen(true)}
        title="Clicca per fabbricare"
        className="holo-panel"
      >
        <div style={{ fontFamily: "Eurostile, sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, color: "#9fb8c7" }}>
          Ricetta
        </div>
        {hovered ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <img src={hovered.icon} alt="" style={{ width: 28, height: 28 }} />
              <strong>{hovered.name}</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
                {hovered.recipe.map((r, idx) => {
                  const have = countInZainoByName(inventories, r.name);
                const ok = have >= r.count;
                return (
                  <li key={idx} style={{ color: ok ? "#dfffff" : "#ff8a8a" }}>
                    {r.name} × {r.count} <span style={{ opacity: 0.7 }}>(hai {have})</span>
                  </li>
                );
              })}
            </ul>
            {/* burst moved to center overlay */}
          </div>
        ) : (
          <div style={{ opacity: 0.7 }}>Passa col mouse su un elemento per vedere la ricetta.</div>
        )}
      </div>

      {/* Barra di ricerca + filtri */}
      <div style={{ position: "absolute", top: 24, left: 24 + OFFSET_X, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome..."
          style={{ padding: "8px 10px", width: 280, background: "rgba(5,16,36,0.6)", color: "#dfffff", border: "1px solid rgba(223,255,255,0.12)", outline: "none" }}
        />
        {(["risorsa", "indumento", "arma", "alimento"] as ItemType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter((f) => (f === t ? null : t))}
            style={{
              padding: "8px 10px",
              background: filter === t ? "rgba(223,255,255,0.16)" : "rgba(5,16,36,0.6)",
              color: "#dfffff",
              border: "1px solid rgba(223,255,255,0.12)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => { setQ(""); setFilter(null); }}
          style={{ padding: "8px 10px", background: "rgba(5,16,36,0.6)", color: "#dfffff", border: "1px solid rgba(223,255,255,0.12)", cursor: "pointer" }}
        >
          Reset
        </button>
        {/* Debug controls */}
        <button onClick={fillInventoryForTest} style={{ padding: "8px 10px", background: "rgba(47,208,255,0.16)", color: "#dfffff", border: "1px solid rgba(47,208,255,0.35)", cursor: "pointer" }}>Riempi test</button>
        <button onClick={clearZaino} style={{ padding: "8px 10px", background: "rgba(255,80,80,0.16)", color: "#ffb4b4", border: "1px solid rgba(255,80,80,0.35)", cursor: "pointer" }}>Svuota zaino</button>
      </div>

      {/* Tabella elementi */}
      <div
        style={{
          position: "absolute",
          inset: `80px 24px 24px ${24 + OFFSET_X}px`,
          overflow: "auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {list.map((c) => (
            <div
              key={c.name}
              onMouseEnter={() => setHovered(c)}
              onClick={() => {
                setHovered(c);
                setModalOpen(true);
              }}
              style={{
                background: "rgba(10,30,50,0.55)",
                border: "1px solid rgba(223,255,255,0.12)",
                padding: 12,
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                position: "relative",
              }}
              className="card"
            >
              {(() => {
                const ok = canSatisfy(c) && hasSpaceAfterCraft(c);
                return (
                  <div className="badge" style={{ background: ok ? "rgba(47,208,255,0.18)" : "rgba(255,80,80,0.2)", color: ok ? "#dfffff" : "#ffb4b4" }}>
                    {ok ? "OK" : "KO"}
                  </div>
                );
              })()}
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "rgba(5,16,36,0.5)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {/* bg-wxh decorative shape */}
                <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/bg-${c.w}x${c.h}.png)`, backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "80% 80%", opacity: 0.28, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }} />
                <img src={c.icon} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", position: "relative" }} />
              </div>
              <div style={{ textAlign: "center" }}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Occupazione zaino indicator */}
      <div style={{ position: "absolute", right: 24, top: 24 + 180, color: "#9fb8c7", fontFamily: "Eurostile, sans-serif", letterSpacing: 2 }}>
        <span style={{ opacity: 0.8 }}>Zaino</span>
        <div className={occFlash ? "occ-anim" : undefined} style={{ marginTop: 6, padding: "6px 10px", background: "rgba(10,30,50,0.6)", border: "1px solid rgba(223,255,255,0.12)", borderRadius: 6 }}>
          Occupazione: <strong style={{ color: "#dfffff" }}>{usedTiles}</strong> / {totalTiles}
        </div>
      </div>

      {/* Centered craft success burst */}
      {lastCrafted && (
        <div key={burstKey} className="center-burst" aria-hidden>
          <img className="hexbg" src="/hexbg.png" alt="" />
          <div className="burst-ring" />
          <div className="burst-glow" />
          <img className="burst-icon" src={lastCrafted.icon} alt="" />
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div style={{ position: "absolute", top: 24 + 120, right: 24, zIndex: 9999 }}>
          <div className="toast toast-in">
            <img src={toast.icon} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
            <span>Fatto: <strong style={{ color: '#dfffff' }}>{toast.name}</strong></span>
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
              <strong>Fabbricare: {hovered.name}</strong>
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
                    <li key={idx} style={{ color: ok ? "#dfffff" : "#ff8a8a" }}>
                      {r.name} × {r.count} <span style={{ opacity: 0.7 }}>(hai {have})</span>
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
