import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaStar, FaBreadSlice, FaDrumstickBite, FaCandyCane, FaLeaf, FaBeer, FaCapsules } from "react-icons/fa";

type InventoryKey =
  | "zaino"
  | "cassa_a"
  | "cassa_b"
  | "cassa_demolecolatore"
  | "zaino_5x5"
  | "zaino_g1"
  | "zaino_g4";

type ItemKind = "alimento" | "indumento" | "arma" | "generico";
type BaseMeta = { description: string; tier: 1 | 2 | 3; kind: ItemKind };
type FoodMeta = BaseMeta & {
  kind: "alimento";
  isGluten?: boolean;
  isSugar?: boolean;
  isMeat?: boolean;
  isVegetable?: boolean;
  isAlcohol?: boolean;
  isDrugs?: boolean;
  // Modalità di consumo: mangiare (stomaco) o bere (droplet)
  consumption?: "mangiare" | "bere";
  // Percentuale di fame o sete ripristinata (0-100)
  effectPercent?: number;
};
type ClothingMeta = BaseMeta & { kind: "indumento"; protezione?: number; effect?: string };
type DamageType = "contundente" | "chimico" | "termico" | "perforante";
type WeaponMeta = BaseMeta & { kind: "arma"; danno?: number; munizioni?: number; damageType?: DamageType };
type GenericMeta = BaseMeta & { kind: "generico" };

type Item = {
  id: string;
  name: string;
  icon: string; // path under public/
  // computed detail image: slugify(name) -> /<slug>.png (same asset set)
  image?: string;
  x: number; // 0-based column
  y: number; // 0-based row
  w: number; // width in cells
  h: number; // height in cells
} & (FoodMeta | ClothingMeta | WeaponMeta | GenericMeta);

// Icon assets are PNGs from /public

// slugify utility for image filenames
const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// map damage type to public icon
const damageIconFor = (t?: DamageType) => {
  switch (t) {
    case "contundente":
      return "/cont.png";
    case "chimico":
      return "/chim.png";
    case "termico":
      return "/temp.png";
    case "perforante":
      return "/perf.png";
    default:
      return null;
  }
};

export default function Inventory() {
  // Specifiche inventari e dimensioni (tile 50px)
  const TILE = 50;
  // Layout variables to easily reposition both inventories together
  const UI_PADDING_TOP = 300;
  const UI_PADDING_RIGHT = 200;
  const UI_PADDING_BOTTOM = 24;
  const UI_PADDING_LEFT = 310;
  const UI_GAP_BETWEEN_COLUMNS = 0; // distance between the two inventories
  const UI_ALIGN_VERTICAL: "start" | "center" | "end" = "start"; // top/center/bottom alignment
  const UI_ALIGN_HORIZONTAL: "start" | "center" | "end" = "center"; // left/center/right alignment within each column
  const UI_GROUP_SHIFT_X = 0; // global horizontal shift (px)
  const UI_GROUP_SHIFT_Y = 0; // global vertical shift (px)
  const UI_GAP_5x5_BELOW_ZAINO = 100; // distanza tra Zaino e la griglia 5x5
  const UI_AUX_BG_SCALE = 1.35; // scala dell'immagine di sfondo del container destro (1 = uguale alla griglia)
  type ContainerCategory = "zaino" | "cassa";
  const INV_SPECS: Record<InventoryKey, { cols: number; rows: number; label: string; icon: string; category: ContainerCategory }> = {
    zaino: { cols: 10, rows: 7, label: "ZAINO", icon: "/zaino.png", category: "zaino" },
    cassa_a: { cols: 12, rows: 12, label: "CASSA 1", icon: "/cassa.png", category: "cassa" },
    cassa_b: { cols: 12, rows: 12, label: "CASSA 2", icon: "/cassa.png", category: "cassa" },
    cassa_demolecolatore: { cols: 9, rows: 9, label: "CASSA + DEMOLECOLATORE", icon: "/cassa.png", category: "cassa" },
    zaino_5x5: { cols: 5, rows: 5, label: "SLOT 5x5", icon: "/zaino.png", category: "zaino" },
    zaino_g1: { cols: 10, rows: 7, label: "ZAINO GIOCATORE 1", icon: "/zaino.png", category: "zaino" },
    zaino_g4: { cols: 10, rows: 7, label: "ZAINO GIOCATORE 4", icon: "/zaino.png", category: "zaino" },
  };

  const initialInventories: Record<InventoryKey, Item[]> = useMemo(
    () => ({
      zaino: [
        { id: "ossa-1", name: "Ossa", icon: "/ossa.png", image: "/" + slugify("Ossa") + ".png", x: 3, y: 2, w: 1, h: 1, kind: "generico", description: "Frammenti scheletrici utili in lavorazione grezza.", tier: 1 },
  { id: "bastoneacuminato-1", name: "Bastone Acuminato", icon: "/bastoneacuminato.png", image: "/" + slugify("Bastone Acuminato") + ".png", x: 6, y: 1, w: 1, h: 5, kind: "arma", description: "Asta di legno affilata per colpi perforanti.", tier: 2, danno: 10, munizioni: 0, damageType: "perforante" },
      ],
      cassa_a: [
        { id: "pelle-1", name: "Pelle", icon: "/pelle.png", image: "/" + slugify("Pelle") + ".png", x: 2, y: 2, w: 1, h: 1, kind: "indumento", description: "Strato dermico trattato, utile per protezione base.", tier: 1, protezione: 2, effect: "Isolamento" },
  { id: "roccia-1", name: "Roccia", icon: "/roccia.png", image: "/" + slugify("Roccia") + ".png", x: 4, y: 4, w: 2, h: 2, kind: "arma", description: "Pietra pesante, improvvisata per impatto.", tier: 1, danno: 6, munizioni: 0, damageType: "contundente" },
      ],
      cassa_b: [],
      cassa_demolecolatore: [],
      zaino_5x5: [
        { id: "slot-item-1", name: "Campione", icon: "/pelle.png", image: "/" + slugify("Campione") + ".png", x: 2, y: 2, w: 1, h: 1, kind: "alimento", description: "Campione organico commestibile.", tier: 1, isGluten: false, isSugar: false, isMeat: false, isVegetable: true, isAlcohol: false, isDrugs: false, consumption: "mangiare", effectPercent: 20 },
      ],
      zaino_g1: [],
      zaino_g4: [],
    }),
    []
  );
  const [inventories, setInventories] = useState<Record<InventoryKey, Item[]>>(initialInventories);

  const [auxInv, setAuxInv] = useState<Exclude<InventoryKey, "zaino">>("cassa_a");

  // Drag & Drop state
  const leftGridRef = useRef<HTMLDivElement | null>(null);
  const rightGridRef = useRef<HTMLDivElement | null>(null);
  const fiveGridRef = useRef<HTMLDivElement | null>(null);
  type DragState = {
    id: string;
    srcInv: InventoryKey;
    icon: string;
    name: string;
    start: { x: number; y: number }; // starting cell
    pos: { x: number; y: number }; // pointer relative to source grid
    client: { x: number; y: number }; // pointer in viewport coords
    srcRect: { left: number; top: number; width: number; height: number };
    srcCellW: number;
    srcCellH: number;
    itemW: number;
    itemH: number;
  };
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<{ inv: InventoryKey; x: number; y: number } | null>(null);
  const [hoverValid, setHoverValid] = useState<boolean | null>(null);
  const lastHoverRef = useRef<{ inv: InventoryKey; x: number; y: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  // Centro del background del contenitore ausiliario (ancorato al centro della griglia)
  const [auxBgCenter, setAuxBgCenter] = useState<{ left: number; top: number } | null>(null);

  // Auto-select the first available item so the detail panel is visible by default
  useEffect(() => {
    if (selectedItem) return;
    const order: InventoryKey[] = ["zaino", auxInv, "zaino_5x5"]; // priority order
    for (const key of order) {
      const list = inventories[key];
      if (list && list.length > 0) {
        setSelectedItem(list[0]);
        break;
      }
    }
  }, [inventories, auxInv, selectedItem]);

  const getGridInfo = (inv: InventoryKey) => {
    const ref = inv === "zaino" ? leftGridRef.current : inv === "zaino_5x5" ? fiveGridRef.current : rightGridRef.current;
    if (!ref) return null;
    const rect = ref.getBoundingClientRect();
    const { cols, rows } = INV_SPECS[inv];
    const cellW = rect.width / cols;
    const cellH = rect.height / rows;
    return { rect, cols, rows, cellW, cellH };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const srcInfo = getGridInfo(drag.srcInv);
      if (srcInfo) {
        const relX = e.clientX - srcInfo.rect.left;
        const relY = e.clientY - srcInfo.rect.top;
        const x = Math.max(0, Math.min(srcInfo.rect.width, relX));
        const y = Math.max(0, Math.min(srcInfo.rect.height, relY));
        setDrag((d) => (d ? { ...d, pos: { x, y }, client: { x: e.clientX, y: e.clientY } } : d));
      }

      // Hover su 5x5
      const fiveInfo = getGridInfo("zaino_5x5");
      let currentHover: { inv: InventoryKey; x: number; y: number } | null = null;
      if (fiveInfo) {
        const inside5 = e.clientX >= fiveInfo.rect.left && e.clientX <= fiveInfo.rect.right && e.clientY >= fiveInfo.rect.top && e.clientY <= fiveInfo.rect.bottom;
        if (inside5) {
          const cx = Math.max(0, Math.min(fiveInfo.cols - drag.itemW, Math.floor((e.clientX - fiveInfo.rect.left) / fiveInfo.cellW)));
          const cy = Math.max(0, Math.min(fiveInfo.rows - drag.itemH, Math.floor((e.clientY - fiveInfo.rect.top) / fiveInfo.cellH)));
          currentHover = { inv: "zaino_5x5", x: cx, y: cy };
        }
      }

      // Hover su zaino
      const leftInfo = getGridInfo("zaino");
      if (!currentHover && leftInfo) {
        const insideL = e.clientX >= leftInfo.rect.left && e.clientX <= leftInfo.rect.right && e.clientY >= leftInfo.rect.top && e.clientY <= leftInfo.rect.bottom;
        if (insideL) {
          const cx = Math.max(0, Math.min(leftInfo.cols - drag.itemW, Math.floor((e.clientX - leftInfo.rect.left) / leftInfo.cellW)));
          const cy = Math.max(0, Math.min(leftInfo.rows - drag.itemH, Math.floor((e.clientY - leftInfo.rect.top) / leftInfo.cellH)));
          currentHover = { inv: "zaino", x: cx, y: cy };
        }
      }
      // Hover su contenitore destro
      const rightInfo = getGridInfo(auxInv);
      if (!currentHover && rightInfo) {
        const insideR = e.clientX >= rightInfo.rect.left && e.clientX <= rightInfo.rect.right && e.clientY >= rightInfo.rect.top && e.clientY <= rightInfo.rect.bottom;
        if (insideR) {
          const cx = Math.max(0, Math.min(rightInfo.cols - drag.itemW, Math.floor((e.clientX - rightInfo.rect.left) / rightInfo.cellW)));
          const cy = Math.max(0, Math.min(rightInfo.rows - drag.itemH, Math.floor((e.clientY - rightInfo.rect.top) / rightInfo.cellH)));
          currentHover = { inv: auxInv, x: cx, y: cy };
        }
      }
      setHover(currentHover);
      if (currentHover) lastHoverRef.current = currentHover;

      if (currentHover) {
        const others = (inventories[currentHover.inv] ?? []).filter((i) => !(currentHover!.inv === drag.srcInv && i.id === drag.id));
        const overlaps = others.some((it) =>
          !(currentHover!.x + drag.itemW <= it.x || it.x + it.w <= currentHover!.x || currentHover!.y + drag.itemH <= it.y || it.y + it.h <= currentHover!.y)
        );
        setHoverValid(!overlaps);
      } else {
        setHoverValid(null);
      }
    };
    const onUp = () => {
      setInventories((prev) => {
        if (!drag) return prev;
        const target = hover ?? lastHoverRef.current;
        if (!target) return prev;
        const { cols, rows } = INV_SPECS[target.inv];
        const clamped = {
          x: Math.max(0, Math.min(cols - drag.itemW, target.x)),
          y: Math.max(0, Math.min(rows - drag.itemH, target.y)),
        };
        const others = (prev[target.inv] ?? []).filter((i) => !(target.inv === drag.srcInv && i.id === drag.id));
        const collision = others.some((it) =>
          !(clamped.x + drag.itemW <= it.x || it.x + it.w <= clamped.x || clamped.y + drag.itemH <= it.y || it.y + it.h <= clamped.y)
        );
        if (collision) return prev;

        const next = { ...prev } as Record<InventoryKey, Item[]>;
        if (target.inv === drag.srcInv) {
          next[target.inv] = (next[target.inv] ?? []).map((it) => (it.id === drag.id ? { ...it, x: clamped.x, y: clamped.y } : it));
        } else {
          next[drag.srcInv] = (next[drag.srcInv] ?? []).filter((it) => it.id !== drag.id);
          const draggedItem = (prev[drag.srcInv] ?? []).find((it) => it.id === drag.id);
          if (draggedItem) {
            next[target.inv] = [...(next[target.inv] ?? []), { ...draggedItem, x: clamped.x, y: clamped.y }];
          }
        }
        return next;
      });
      setDrag(null);
      setHover(null);
      setHoverValid(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, hover, auxInv, inventories]);

  // Aggiorna la posizione del background rispetto al centro della griglia aux
  useEffect(() => {
    const update = () => {
      const el = rightGridRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAuxBgCenter({ left: rect.left + rect.width / 2, top: rect.top + rect.height / 2 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [auxInv, inventories]);

  return (
    <div
      style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Background fullscreen */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "url(/bg.png) center/cover no-repeat", zIndex: 0 }}
      />

      {/* Etichetta in alto a sinistra a 300px dal bordo sinistro */}
      <div
        aria-hidden
        style={{ position: "absolute", top: 36, left: 300, color: "#0d1d33", fontFamily: "Eurostile, sans-serif", letterSpacing: 3, fontWeight: 700, fontSize: 30, textTransform: "uppercase", zIndex: 2 }}
      >
        _INVENTARIO//
      </div>

      {/* Layout principale: colonna sinistra (Zaino + 5x5). Il contenitore destro viene reso altrove (in basso a destra). */}
      <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            // rimuove l'obbligo di stessa altezza, permettendo allineamenti indipendenti
            alignItems: 'start',
            justifyItems: 'stretch',
            gap: UI_GAP_BETWEEN_COLUMNS,
            padding: `${UI_PADDING_TOP}px ${UI_PADDING_RIGHT}px ${UI_PADDING_BOTTOM}px ${UI_PADDING_LEFT}px`,
            transform: `translate(${UI_GROUP_SHIFT_X}px, ${UI_GROUP_SHIFT_Y}px)`,
            zIndex: 1,
            pointerEvents: "none",
          }}
      >
        {/* Sinistra: Zaino */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div style={{ position: "relative" }}>
            {/* Immagine di sfondo statica dietro lo Zaino: usa zaino.png */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "38%",
                mixBlendMode: "multiply",
                left: "48%",
                width: "230%",
                height: "230%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0.7,
              }}
            >
              <img
                src="/zaino.png"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/inventory_container.png"; }}
              />
            </div>
            <div
              ref={leftGridRef}
              role="region"
              aria-label="Zaino"
              style={{
                width: `${INV_SPECS.zaino.cols * TILE}px`,
                height: `${INV_SPECS.zaino.rows * TILE}px`,
                position: "relative",
                zIndex: 1,
                backgroundColor: "rgba(16, 35, 61, 0.55)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)",
                backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
                backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
                backgroundRepeat: "repeat",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: `repeat(${INV_SPECS.zaino.cols}, ${TILE}px)`,
                gridTemplateRows: `repeat(${INV_SPECS.zaino.rows}, ${TILE}px)`,
              }}
            >
            {(inventories.zaino ?? []).map((it) => (
              <div
                key={it.id}
                title={it.name}
                style={{
                  gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                  gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  opacity: drag && drag.srcInv === "zaino" && drag.id === it.id ? 0 : 1,
                  pointerEvents: drag && drag.srcInv === "zaino" && drag.id === it.id ? "none" : "auto",
                }}
                onPointerDown={(e) => {
                  if (!leftGridRef.current) return;
                  const rect = leftGridRef.current.getBoundingClientRect();
                  const cellW = rect.width / INV_SPECS.zaino.cols;
                  const cellH = rect.height / INV_SPECS.zaino.rows;
                  const posX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  const posY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                  try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
                  setSelectedItem(it);
                  setDrag({
                    id: it.id,
                    srcInv: "zaino",
                    icon: it.icon,
                    name: it.name,
                    start: { x: it.x, y: it.y },
                    pos: { x: posX, y: posY },
                    client: { x: e.clientX, y: e.clientY },
                    srcRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    srcCellW: cellW,
                    srcCellH: cellH,
                    itemW: it.w,
                    itemH: it.h,
                  });
                  const cx = Math.max(0, Math.min(INV_SPECS.zaino.cols - it.w, Math.floor(posX / cellW)));
                  const cy = Math.max(0, Math.min(INV_SPECS.zaino.rows - it.h, Math.floor(posY / cellH)));
                  const hv = { inv: "zaino" as InventoryKey, x: cx, y: cy };
                  setHover(hv);
                  lastHoverRef.current = hv;
                }}
              >
                {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                  <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`, backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center, center", backgroundSize: "100% 100%, 100% 100%", pointerEvents: "none" }} />
                ) : (
                  <div aria-hidden style={{ position: "absolute", inset: "12%", background: "linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))", boxShadow: "0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)", pointerEvents: "none" }} />
                )}
                <img
                  src={it.icon}
                  alt={it.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "auto", zIndex: 1, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))", userSelect: "none", WebkitUserSelect: "none" }}
                  onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/react.svg"; }}
                  draggable={false}
                />
              </div>
            ))}
            </div>
          </div>
          {/* Griglia aggiuntiva 5x5 sotto lo Zaino - drag-out only */}
          <div
            ref={fiveGridRef}
            role="region"
            aria-label="Griglia 5x5"
            style={{
              marginTop: UI_GAP_5x5_BELOW_ZAINO,
              width: `${5 * TILE}px`,
              height: `${5 * TILE}px`,
              backgroundColor: "rgba(16, 35, 61, 0.55)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)",
              backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
              backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
              backgroundRepeat: "repeat",
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: `repeat(5, ${TILE}px)`,
              gridTemplateRows: `repeat(5, ${TILE}px)`,
            }}
          >
            {(inventories.zaino_5x5 ?? []).map((it) => (
              <div
                key={it.id}
                title={it.name}
                style={{
                  gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                  gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  opacity: drag && drag.srcInv === "zaino_5x5" && drag.id === it.id ? 0 : 1,
                  pointerEvents: drag && drag.srcInv === "zaino_5x5" && drag.id === it.id ? "none" : "auto",
                }}
                onPointerDown={(e) => {
                  if (!fiveGridRef.current) return;
                  const rect = fiveGridRef.current.getBoundingClientRect();
                  const cellW = rect.width / 5;
                  const cellH = rect.height / 5;
                  const posX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                  const posY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                  try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
                  setSelectedItem(it);
                  setDrag({
                    id: it.id,
                    srcInv: "zaino_5x5",
                    icon: it.icon,
                    name: it.name,
                    start: { x: it.x, y: it.y },
                    pos: { x: posX, y: posY },
                    client: { x: e.clientX, y: e.clientY },
                    srcRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    srcCellW: cellW,
                    srcCellH: cellH,
                    itemW: it.w,
                    itemH: it.h,
                  });
                  const cx = Math.max(0, Math.min(5 - it.w, Math.floor(posX / cellW)));
                  const cy = Math.max(0, Math.min(5 - it.h, Math.floor(posY / cellH)));
                  const hv = { inv: "zaino_5x5" as InventoryKey, x: cx, y: cy };
                  setHover(hv);
                  lastHoverRef.current = hv;
                }}
              >
                {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                  <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`, backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center, center", backgroundSize: "100% 100%, 100% 100%", pointerEvents: "none" }} />
                ) : (
                  <div aria-hidden style={{ position: "absolute", inset: "12%", background: "linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))", boxShadow: "0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)", pointerEvents: "none" }} />
                )}
                <img
                  src={it.icon}
                  alt={it.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "auto", zIndex: 1, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))", userSelect: "none", WebkitUserSelect: "none" }}
                  onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/react.svg"; }}
                  draggable={false}
                />
              </div>
            ))}
          </div>
            <div style={{ color: "#10233d", fontSize: 24, marginTop: 8 }}>_INPUT//</div>
        </div>

        {/* Colonna destra non usata: il contenitore ausiliario è riposizionato in basso a destra */}
        <div />
      </div>

      {/* Pannello centrale rimosso in favore dei due inventari affiancati */}

      {/* Menu a tendina spostato in basso a destra con apertura verso l'alto */}
      <div style={{ position: "absolute", right: 24, bottom: 24, zIndex: 3000, pointerEvents: "auto" }}>
        <AuxSelect specs={INV_SPECS} value={auxInv as Exclude<InventoryKey, "zaino">} onChange={setAuxInv} />
      </div>

      {/* Contenitore ausiliario: centrato in un box 650x650 a 100px da bottom/right */}
      <div
        style={{ position: "absolute", right: 100, bottom: 100, width: 650, height: 650, overflow: "visible", zIndex: 2000, pointerEvents: "auto" }}
        aria-label="Area contenitore ausiliario"
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div style={{ position: "relative" }}>
            <div
              ref={rightGridRef}
              role="region"
              aria-label="Contenitore ausiliario"
              style={{
                width: `${INV_SPECS[auxInv].cols * TILE}px`,
                height: `${INV_SPECS[auxInv].rows * TILE}px`,
                position: "relative",
                zIndex: 1,
                backgroundColor: "rgba(16, 35, 61, 0.55)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)",
                backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
                backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
                backgroundRepeat: "repeat",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: `repeat(${INV_SPECS[auxInv].cols}, ${TILE}px)`,
                gridTemplateRows: `repeat(${INV_SPECS[auxInv].rows}, ${TILE}px)`,
              }}
            >
              {(inventories[auxInv] ?? []).map((it) => (
                <div
                  key={it.id}
                  title={it.name}
                  style={{
                    gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                    gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    opacity: drag && drag.srcInv === auxInv && drag.id === it.id ? 0 : 1,
                    pointerEvents: drag && drag.srcInv === auxInv && drag.id === it.id ? "none" : "auto",
                  }}
                  onPointerDown={(e) => {
                    if (!rightGridRef.current) return;
                    const rect = rightGridRef.current.getBoundingClientRect();
                    const cellW = rect.width / INV_SPECS[auxInv].cols;
                    const cellH = rect.height / INV_SPECS[auxInv].rows;
                    const posX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                    const posY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
                    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
                    setSelectedItem(it);
                    setDrag({
                      id: it.id,
                      srcInv: auxInv,
                      icon: it.icon,
                      name: it.name,
                      start: { x: it.x, y: it.y },
                      pos: { x: posX, y: posY },
                      client: { x: e.clientX, y: e.clientY },
                      srcRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                      srcCellW: cellW,
                      srcCellH: cellH,
                      itemW: it.w,
                      itemH: it.h,
                    });
                    const cx = Math.max(0, Math.min(INV_SPECS[auxInv].cols - it.w, Math.floor(posX / cellW)));
                    const cy = Math.max(0, Math.min(INV_SPECS[auxInv].rows - it.h, Math.floor(posY / cellH)));
                    const hv = { inv: auxInv as InventoryKey, x: cx, y: cy };
                    setHover(hv);
                    lastHoverRef.current = hv;
                  }}
                >
                  {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                    <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`, backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center, center", backgroundSize: "100% 100%, 100% 100%", pointerEvents: "none" }} />
                  ) : (
                    <div aria-hidden style={{ position: "absolute", inset: "12%", background: "linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))", boxShadow: "0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)", pointerEvents: "none" }} />
                  )}
                  <img
                    src={it.icon}
                    alt={it.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "auto", zIndex: 1, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))", userSelect: "none", WebkitUserSelect: "none" }}
                    onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/react.svg"; }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dettaglio Item: titolo testuale (bold, 30px) + descrizione e slot affiancati al 75% della dimensione originale (senza deformazione) */}
      {selectedItem && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: Math.max(24, UI_PADDING_RIGHT - 40),
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          {/* Titolo testuale */}
          <div style={{ color: "#dfffff", fontFamily: "Eurostile, sans-serif", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700, fontSize: 30 }}>
            {selectedItem.name}
          </div>

          {(() => {
            const SCALE = 0.75;
            const BASE_W = 491;
            const W = Math.round(BASE_W * SCALE); // ~368
            const PAD = Math.round(23 * SCALE); // ~17
            const LABEL_FS = 18.6 * SCALE; // ~14
            const VALUE_FS = 18.6 * SCALE; // ~14
            const ICON_SIZE = 16;
            return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: W }}>
                  <Slot label="Tipo" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                    <span style={{ fontWeight: 700 }}>{selectedItem.kind}</span>
                  </Slot>
                  <Slot label="Qualità" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                    {Array.from({ length: selectedItem.tier }).map((_, i) => (
                      <FaStar key={i} color="#dfffff" style={{ marginLeft: 4 }} />
                    ))}
                  </Slot>
                  {selectedItem.kind === "alimento" && (
                    <>
                      <Slot label="Contenuto" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {selectedItem.isGluten ? <FaBreadSlice size={ICON_SIZE} title="Glutine" /> : null}
                          {selectedItem.isMeat ? <FaDrumstickBite size={ICON_SIZE} title="Carne" /> : null}
                          {selectedItem.isSugar ? <FaCandyCane size={ICON_SIZE} title="Zucchero" /> : null}
                          {selectedItem.isVegetable ? <FaLeaf size={ICON_SIZE} title="Vegetale" /> : null}
                          {selectedItem.isAlcohol ? <FaBeer size={ICON_SIZE} title="Alcol" /> : null}
                          {selectedItem.isDrugs ? <FaCapsules size={ICON_SIZE} title="Droghe" /> : null}
                        </div>
                      </Slot>
                      <Slot label="Effetto" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        {typeof selectedItem.effectPercent === 'number' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {selectedItem.consumption === 'bere' ? (
                              <img src="/droplet_fill.png" alt="Sete" width={ICON_SIZE} height={ICON_SIZE} />
                            ) : (
                              <img src="/stomach-fill.png" alt="Fame" width={ICON_SIZE} height={ICON_SIZE} />
                            )}
                            <span style={{ fontWeight: 700 }}>{selectedItem.effectPercent}%</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700 }}>—</span>
                        )}
                      </Slot>
                    </>
                  )}
                  {selectedItem.kind === "indumento" && (
                    <>
                      <Slot label="Protezione" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <span style={{ fontWeight: 700 }}>{selectedItem.protezione ?? 0}</span>
                      </Slot>
                      <Slot label="Effetto" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <span style={{ fontWeight: 700 }}>{selectedItem.effect ?? "—"}</span>
                      </Slot>
                    </>
                  )}
                  {selectedItem.kind === "arma" && (
                    <>
                      <Slot label="Danno" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(() => { const src = damageIconFor(selectedItem.damageType); return src ? (<img src={src} alt={selectedItem.damageType} width={16} height={16} />) : null; })()}
                          <span style={{ fontWeight: 700 }}>{selectedItem.danno ?? 0}</span>
                        </div>
                      </Slot>
                      <Slot label="Munizioni" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <span style={{ fontWeight: 700 }}>{selectedItem.munizioni ?? 0}</span>
                      </Slot>
                    </>
                  )}
                  {selectedItem.kind === "generico" && (
                    <>
                      <Slot label="Info" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <span style={{ fontWeight: 700 }}>—</span>
                      </Slot>
                      <Slot label="Extra" width={W} labelFontSize={LABEL_FS} valueFontSize={VALUE_FS} padding={PAD}>
                        <span style={{ fontWeight: 700 }}>—</span>
                      </Slot>
                    </>
                  )}
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
                  title={selectedItem.description}
                >
                  {selectedItem.description}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Ghost globale per drag cross-inventory */}
      {drag && (
        <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 12000 }}>
          {(() => {
            const srcInfo = getGridInfo(drag.srcInv);
            const hoverInfo = hover ? getGridInfo(hover.inv) : null;
            const cellW = hoverInfo ? hoverInfo.cellW : srcInfo?.cellW ?? TILE;
            const cellH = hoverInfo ? hoverInfo.cellH : srcInfo?.cellH ?? TILE;
            const left = hover && hoverInfo ? hoverInfo.rect.left + hover.x * cellW : drag.client.x - (cellW * drag.itemW) / 2;
            const top = hover && hoverInfo ? hoverInfo.rect.top + hover.y * cellH : drag.client.y - (cellH * drag.itemH) / 2;
            const hasShapeBg = drag.itemW >= 1 && drag.itemW <= 5 && drag.itemH >= 1 && drag.itemH <= 5;
            const isInvalid = hoverValid === false && !!hover;
            return (
              <div
                style={{
                  position: "fixed",
                  left,
                  top,
                  width: cellW * drag.itemW,
                  height: cellH * drag.itemH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: isInvalid ? "2px solid rgba(255,80,80,0.8)" : undefined,
                }}
              >
                {hasShapeBg ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(/bg-${drag.itemW}x${drag.itemH}.png), linear-gradient(180deg, rgba(47,208,255,0.32), rgba(47,208,255,0.18))`,
                      backgroundRepeat: "no-repeat, no-repeat",
                      backgroundPosition: "center, center",
                      backgroundSize: "100% 100%, 100% 100%",
                      opacity: isInvalid ? 0.7 : 1,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: "12%",
                      background: "linear-gradient(180deg, rgba(47,208,255,0.32), rgba(47,208,255,0.18))",
                      boxShadow: "0 10px 26px rgba(47,208,255,0.22), inset 0 0 0 1px rgba(223,255,255,0.35)",
                      opacity: isInvalid ? 0.7 : 1,
                    }}
                  />
                )}
                <img
                  src={drag.icon}
                  alt={drag.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", zIndex: 1, userSelect: "none", WebkitUserSelect: "none", filter: "brightness(1.6)" }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = "/react.svg";
                  }}
                  draggable={false}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Sfondo del contenitore ausiliario ancorato al centro della griglia: dietro la griglia, non contenuto in essa */}
      {auxBgCenter && (() => {
        const gridW = INV_SPECS[auxInv].cols * TILE;
        const gridH = INV_SPECS[auxInv].rows * TILE;
        const isZaino = INV_SPECS[auxInv].category === 'zaino';
        // Emula i vecchi 48% x / 38% y: offset rispetto al centro griglia
        const dx = isZaino ? -0.02 * gridW : 0; // 48% invece di 50% => -2% della larghezza
        const dy = isZaino ? -0.12 * gridH : 0; // 38% invece di 50% => -12% dell'altezza
        // Emula 230% (zaino) e 150% (cassa) di scala rispetto alla griglia
        const baseScale = isZaino ? 2.3 : 1.5;
        const extraScale = isZaino ? 1 : UI_AUX_BG_SCALE; // cassa aveva anche scale(UI_AUX_BG_SCALE)
        const wPx = gridW * baseScale;
        const hPx = gridH * baseScale;
        return (
          <img
            aria-hidden
            src={`/${INV_SPECS[auxInv].category}.png`}
            alt=""
            onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/inventory_container.png"; }}
            style={{
              position: "fixed",
              left: auxBgCenter.left + dx,
              top: auxBgCenter.top + dy,
              transform: `translate(-50%, -50%) scale(${extraScale})`,
              width: `${wPx}px`,
              height: `${hPx}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              objectFit: 'contain',
              pointerEvents: 'none',
              zIndex: 1500,
              // Nessun blend/opacity per evitare che risulti troppo scuro rispetto alle casse
            }}
          />
        );
      })()}
    </div>
  );
}

// Dropdown semplice con icona e nome per selezionare il contenitore ausiliario
function AuxSelect({
  specs,
  value,
  onChange,
}: {
  specs: Record<InventoryKey, { cols: number; rows: number; label: string; icon: string; category: "zaino" | "cassa" }>;
  value: Exclude<InventoryKey, "zaino">;
  onChange: (k: Exclude<InventoryKey, "zaino">) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = ["cassa_a", "cassa_b", "cassa_demolecolatore", "zaino_g1", "zaino_g4"] as const;
  const sel = specs[value];
  return (
    <div style={{ position: "relative", userSelect: "none", zIndex: 2000 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          border: "none",
          boxSizing: "border-box",
          background: "url(/bg-title.png) center/cover no-repeat",
          color: "#dfffff",
          borderRadius: 0,
          cursor: "pointer",
          letterSpacing: "3px",
          fontWeight: 700,
          textTransform: "uppercase",
          fontFamily: 'Eurostile, sans-serif',
          minWidth: 360,
          justifyContent: "space-between",
        }}
      >
        <span>{sel.label}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "110%",
            right: 0,
            left: "auto",
            minWidth: 360,
            background: "url(/bg-slot.png) center/cover no-repeat",
            border: "none",
            borderRadius: 0,
            boxShadow: "none",
            zIndex: 3000,
            padding: 8,
            textAlign: "right",
            pointerEvents: "auto",
            fontFamily: 'Eurostile, sans-serif',
          }}
        >
          {options.map((k) => (
            <button
              key={k}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 14px",
                background: value === k ? "rgba(47,208,255,0.18)" : "transparent",
                color: "#dfffff",
                border: "none",
                borderRadius: 0,
                cursor: "pointer",
                textAlign: "right",
                justifyContent: "flex-end",
                letterSpacing: "3px",
                fontWeight: 700,
                textTransform: "uppercase",
                fontFamily: 'Eurostile, sans-serif',
              }}
            >
              <span>{specs[k].label}</span>
              <span style={{ opacity: 0.6, marginLeft: 10 }}>{specs[k].cols}x{specs[k].rows}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Slot helper: renders a bg-slot with left label and right-aligned content
function Slot({
  label,
  right,
  children,
  width,
  height,
  labelFontSize = 18.6,
  valueFontSize = 18.6,
  padding,
}: {
  label: string;
  right?: boolean;
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
