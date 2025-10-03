import React, { useEffect, useRef, useState } from 'react';
import {
  FaStar,
  FaBreadSlice,
  FaDrumstickBite,
  FaCandyCane,
  FaLeaf,
  FaBeer,
  FaCapsules,
} from 'react-icons/fa';

import { BACKEND_IP, BACKEND_PORT } from '../common';
import { useUser } from '../context/user';

type ItemKind = 'alimento' | 'risorsa' | 'arma';
type BaseMeta = { description: string; kind: ItemKind; tier?: 1 | 2 | 3 };
type FoodMeta = BaseMeta & {
  kind: 'alimento';
  isGluten?: boolean;
  isSugar?: boolean;
  isMeat?: boolean;
  isVegetable?: boolean;
  isAlcohol?: boolean;
  isDrugs?: boolean;
  isFood?: boolean;
  isDrink?: boolean;
  effectPercent?: number;
};
type DamageType = 'contundente' | 'chimico' | 'termico' | 'perforante';
type WeaponMeta = BaseMeta & {
  kind: 'arma';
  danno?: number;
  projectiles?: string;
  damageType?: DamageType;
};
type ResourceMeta = BaseMeta & { kind: 'risorsa' };

type Item = {
  id: string;
  name: string;
  icon: string;
  image?: string;
  x: number;
  y: number;
  w: number;
  h: number;
} & (FoodMeta | WeaponMeta | ResourceMeta);

// ---- dynamic specs for "others" coming from backend ----
type InvCategory = 'zaino' | 'cassa';
type InvSpec = {
  cols: number;
  rows: number;
  label: string;
  icon: string;
  category: InvCategory;
};

// assets/util
const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const damageIconFor = (t?: DamageType) => {
  switch (t) {
    case 'contundente':
      return '/cont.png';
    case 'chimico':
      return '/chim.png';
    case 'termico':
      return '/temp.png';
    case 'perforante':
      return '/perf.png';
    default:
      return null;
  }
};

export default function Inventory() {
  const user = useUser();

  // ---- layout/specs (user + client 5x5) ----
  const TILE = 50;
  const UI_PADDING_TOP = 300;
  const UI_PADDING_RIGHT = 200;
  const UI_PADDING_BOTTOM = 24;
  const UI_PADDING_LEFT = 310;
  const UI_GAP_BETWEEN_COLUMNS = 0;
  const UI_GAP_5x5_BELOW_ZAINO = 100;
  const UI_AUX_BG_SCALE = 1.35;

  // keeps your local user/backpack and 5x5 unchanged
  const INV_SPECS_USER = {
    cols: 10,
    rows: 7,
    label: 'ZAINO',
    icon: '/zaino.png',
    category: 'zaino' as const,
  };
  const INV_SPECS_GRID5 = {
    cols: 5,
    rows: 5,
    label: 'SLOT 5x5',
    icon: '/zaino.png',
    category: 'zaino' as const,
  };

  // ---- STATE (now dynamic for "others") ----
  const [userInv, setUserInv] = useState<Item[]>([]);
  const [others, setOthers] = useState<Record<string, Item[]>>({});
  const [otherSpecs, setOtherSpecs] = useState<Record<string, InvSpec>>({});
  const [grid5, setGrid5] = useState<Item[]>([]); // client-only

  // currently selected aux inventory key (dynamic)
  const [auxInv, setAuxInv] = useState<string>('');

  // select a default aux when backend data arrives
  useEffect(() => {
    const keys = Object.keys(otherSpecs);
    if (!auxInv && keys.length > 0) setAuxInv(keys[0]);
    if (auxInv && !(auxInv in otherSpecs) && keys.length > 0)
      setAuxInv(keys[0]);
  }, [otherSpecs, auxInv]);

  // ---- DnD plumbing (unchanged) ----
  const leftGridRef = useRef<HTMLDivElement | null>(null);
  const rightGridRef = useRef<HTMLDivElement | null>(null);
  const fiveGridRef = useRef<HTMLDivElement | null>(null);

  type HoverKey = 'zaino' | 'grid5x5' | string;
  type DragState = {
    id: string;
    srcInv: HoverKey;
    icon: string;
    name: string;
    start: { x: number; y: number };
    pos: { x: number; y: number };
    client: { x: number; y: number };
    srcRect: { left: number; top: number; width: number; height: number };
    srcCellW: number;
    srcCellH: number;
    itemW: number;
    itemH: number;
  };
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hover, setHover] = useState<{
    inv: HoverKey;
    x: number;
    y: number;
  } | null>(null);
  const [hoverValid, setHoverValid] = useState<boolean | null>(null);
  const lastHoverRef = useRef<{ inv: HoverKey; x: number; y: number } | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [auxBgCenter, setAuxBgCenter] = useState<{
    left: number;
    top: number;
  } | null>(null);

  // ----- BACKEND IO -----
  // Robustly parse response which may be: raw string, {inventory: string}, or parsed object
  function parseInventoryResponse(text: string): any {
    try {
      const parsed = JSON.parse(text);
      // already object?
      if (parsed && typeof parsed === 'object') {
        if (typeof (parsed as any).inventory === 'string') {
          return JSON.parse((parsed as any).inventory);
        }
        return parsed;
      }
      // was a JSON string result of JSON.stringify(string)
      if (typeof parsed === 'string') return JSON.parse(parsed);
    } catch {
      // not JSON? maybe text is the JSON string
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
  }

  // shape we expect to store/load
  type BackendPayload = {
    user: Item[];
    others: Array<InvSpec & { inventory: Item[] }>;
  };

  const buildURL = (uname: string) =>
    `http://${BACKEND_IP}:${BACKEND_PORT}/inventories?name=${encodeURIComponent(
      uname,
    )}`;

  // Load on user.name
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (!user?.name) return;
      try {
        const res = await fetch(buildURL(user.name), {
          signal: controller.signal,
        });
        const raw = await res.text();
        const data = parseInventoryResponse(raw) as BackendPayload;

        if (data === null) return;

        // sane fallbacks
        const loadedUser = data?.user ?? [];
        const loadedOthers: Array<InvSpec & { inventory: Item[] }> =
          data.others ?? [];

        // ensure items have image fallback
        const fixImgs = (items: Item[]) =>
          items.map(i => ({
            ...i,
            image: i.image ?? `/${slugify(i.name)}.png`,
          }));

        setUserInv(fixImgs(loadedUser));
        // make sure every others[] array exists
        const safeOthers: Record<string, Item[]> = {};
        for (const k of loadedOthers) {
          safeOthers[k.label] = fixImgs(k.inventory ?? []);
        }
        setOthers(safeOthers);

        // ensure every others spec exists (fallback: 10x10 cassa)
        const specsWithFallbacks: Record<string, InvSpec> = {};
        const otherKeys = Object.values(loadedOthers).map(i => i.label);
        for (const k of otherKeys) {
          specsWithFallbacks[k] =
            loadedOthers.find(spec => spec.label === k) ??
            ({
              cols: 10,
              rows: 10,
              label: k.replace(/_/g, ' ').toUpperCase(),
              icon: '/cassa.png',
              category: 'cassa',
            } as InvSpec);
        }

        setOtherSpecs(specsWithFallbacks);
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          console.error('Failed to load inventories:', e);
        }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user.revision]);

  // Debounced SAVE (PATCH) when userInv/others change
  useEffect(() => {
    if (!user?.name) return;

    // Build the plan object the backend expects
    const planOut = { user: userInv, ...others };

    const body = JSON.stringify(planOut);

    const t = setTimeout(() => {
      if (!user?.name) return;
      fetch(buildURL(user.name), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(e => console.error('Failed to save inventories:', e));
    }, 500); // debounce

    return () => clearTimeout(t);
  }, [userInv, others, user?.name]);

  // Auto-select: user → aux → grid5
  useEffect(() => {
    if (selectedItem) return;
    const candidates: Item[] = [
      ...(userInv ?? []),
      ...((auxInv && others[auxInv]) || []),
      ...(grid5 ?? []),
    ];
    if (candidates.length) setSelectedItem(candidates[0]);
  }, [userInv, others, grid5, auxInv, selectedItem]);

  // resolve grid metrics by key
  const getGridInfo = (inv: HoverKey) => {
    if (inv === 'zaino') {
      const ref = leftGridRef.current;
      if (!ref) return null;
      const rect = ref.getBoundingClientRect();
      const { cols, rows } = INV_SPECS_USER;
      return {
        rect,
        cols,
        rows,
        cellW: rect.width / cols,
        cellH: rect.height / rows,
      };
    }
    if (inv === 'grid5x5') {
      const ref = fiveGridRef.current;
      if (!ref) return null;
      const rect = ref.getBoundingClientRect();
      const { cols, rows } = INV_SPECS_GRID5;
      return {
        rect,
        cols,
        rows,
        cellW: rect.width / cols,
        cellH: rect.height / rows,
      };
    }
    if (inv === auxInv) {
      const ref = rightGridRef.current;
      if (!ref) return null;
      const rect = ref.getBoundingClientRect();
      const spec = otherSpecs[auxInv] ?? {
        cols: 10,
        rows: 10,
        category: 'cassa',
        label: auxInv,
        icon: '/cassa.png',
      };
      return {
        rect,
        cols: spec.cols,
        rows: spec.rows,
        cellW: rect.width / spec.cols,
        cellH: rect.height / spec.rows,
      };
    }
    return null;
  };

  // helpers to read lists by key (from current state)
  const listFor = (key: HoverKey): Item[] => {
    if (key === 'zaino') return userInv ?? [];
    if (key === 'grid5x5') return grid5 ?? [];
    return others[key as string] ?? [];
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
        setDrag(d =>
          d
            ? { ...d, pos: { x, y }, client: { x: e.clientX, y: e.clientY } }
            : d,
        );
      }

      let currentHover: { inv: HoverKey; x: number; y: number } | null = null;

      const fiveInfo = getGridInfo('grid5x5');
      if (fiveInfo) {
        const inside =
          e.clientX >= fiveInfo.rect.left &&
          e.clientX <= fiveInfo.rect.right &&
          e.clientY >= fiveInfo.rect.top &&
          e.clientY <= fiveInfo.rect.bottom;
        if (inside) {
          const cx = Math.max(
            0,
            Math.min(
              fiveInfo.cols - drag.itemW,
              Math.floor((e.clientX - fiveInfo.rect.left) / fiveInfo.cellW),
            ),
          );
          const cy = Math.max(
            0,
            Math.min(
              fiveInfo.rows - drag.itemH,
              Math.floor((e.clientY - fiveInfo.rect.top) / fiveInfo.cellH),
            ),
          );
          currentHover = { inv: 'grid5x5', x: cx, y: cy };
        }
      }

      const leftInfo = getGridInfo('zaino');
      if (!currentHover && leftInfo) {
        const inside =
          e.clientX >= leftInfo.rect.left &&
          e.clientX <= leftInfo.rect.right &&
          e.clientY >= leftInfo.rect.top &&
          e.clientY <= leftInfo.rect.bottom;
        if (inside) {
          const cx = Math.max(
            0,
            Math.min(
              leftInfo.cols - drag.itemW,
              Math.floor((e.clientX - leftInfo.rect.left) / leftInfo.cellW),
            ),
          );
          const cy = Math.max(
            0,
            Math.min(
              leftInfo.rows - drag.itemH,
              Math.floor((e.clientY - leftInfo.rect.top) / leftInfo.cellH),
            ),
          );
          currentHover = { inv: 'zaino', x: cx, y: cy };
        }
      }

      const rightInfo = getGridInfo(auxInv);
      if (!currentHover && rightInfo) {
        const inside =
          e.clientX >= rightInfo.rect.left &&
          e.clientX <= rightInfo.rect.right &&
          e.clientY >= rightInfo.rect.top &&
          e.clientY <= rightInfo.rect.bottom;
        if (inside) {
          const cx = Math.max(
            0,
            Math.min(
              rightInfo.cols - drag.itemW,
              Math.floor((e.clientX - rightInfo.rect.left) / rightInfo.cellW),
            ),
          );
          const cy = Math.max(
            0,
            Math.min(
              rightInfo.rows - drag.itemH,
              Math.floor((e.clientY - rightInfo.rect.top) / rightInfo.cellH),
            ),
          );
          currentHover = { inv: auxInv, x: cx, y: cy };
        }
      }

      setHover(currentHover);
      if (currentHover) lastHoverRef.current = currentHover;

      if (currentHover) {
        const othersHere = listFor(currentHover.inv).filter(
          i => !(currentHover.inv === drag.srcInv && i.id === drag.id),
        );
        const overlaps = othersHere.some(
          it =>
            !(
              currentHover.x + drag.itemW <= it.x ||
              it.x + it.w <= currentHover.x ||
              currentHover.y + drag.itemH <= it.y ||
              it.y + it.h <= currentHover.y
            ),
        );
        setHoverValid(!overlaps);
      } else {
        setHoverValid(null);
      }
    };

    const onUp = () => {
      if (!drag) return cleanup();

      const target = hover ?? lastHoverRef.current;
      if (!target) return cleanup();

      const info = getGridInfo(target.inv);
      if (!info) return cleanup();

      const clamped = {
        x: Math.max(0, Math.min(info.cols - drag.itemW, target.x)),
        y: Math.max(0, Math.min(info.rows - drag.itemH, target.y)),
      };

      const read = (k: HoverKey) => listFor(k);
      const write = (k: HoverKey, next: Item[]) => {
        if (k === 'zaino') setUserInv(next);
        else if (k === 'grid5x5') setGrid5(next);
        else setOthers(prev => ({ ...prev, [k as string]: next }));
      };

      const srcKey = drag.srcInv;
      const dstKey = target.inv;

      const srcList = read(srcKey);
      const dstList = read(dstKey);

      const draggedItem = srcList.find(i => i.id === drag.id);
      if (!draggedItem) return cleanup();

      const dstOthers = dstList.filter(
        i => !(dstKey === srcKey && i.id === drag.id),
      );
      const collision = dstOthers.some(
        it =>
          !(
            clamped.x + drag.itemW <= it.x ||
            it.x + it.w <= clamped.x ||
            clamped.y + drag.itemH <= it.y ||
            it.y + it.h <= clamped.y
          ),
      );
      if (collision) return cleanup();

      if (dstKey === srcKey) {
        const updated = srcList.map(it =>
          it.id === drag.id ? { ...it, x: clamped.x, y: clamped.y } : it,
        );
        write(srcKey, updated);
      } else {
        const srcNext = srcList.filter(it => it.id !== drag.id);
        const dstNext = [
          ...dstList,
          { ...draggedItem, x: clamped.x, y: clamped.y },
        ];
        write(srcKey, srcNext);
        write(dstKey, dstNext);
      }

      cleanup();
    };

    const cleanup = () => {
      setDrag(null);
      setHover(null);
      setHoverValid(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, hover, auxInv, userInv, grid5, others]);

  // center bg for aux
  useEffect(() => {
    const update = () => {
      const el = rightGridRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAuxBgCenter({
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [auxInv, userInv, grid5, others]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'url(/bg.png) center/cover no-repeat',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 36,
          left: 300,
          color: '#0d1d33',
          fontFamily: 'Eurostile, sans-serif',
          letterSpacing: 3,
          fontWeight: 700,
          fontSize: 30,
          textTransform: 'uppercase',
          zIndex: 2,
        }}
      >
        _INVENTARIO//
      </div>

      {/* main layout (left: user zaino + grid5) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'start',
          justifyItems: 'stretch',
          gap: UI_GAP_BETWEEN_COLUMNS,
          padding: `${UI_PADDING_TOP}px ${UI_PADDING_RIGHT}px ${UI_PADDING_BOTTOM}px ${UI_PADDING_LEFT}px`,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {/* LEFT: USER INVENTORY */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '38%',
                mixBlendMode: 'multiply',
                left: '48%',
                width: '230%',
                height: '230%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.7,
              }}
            >
              <img
                src='/zaino.png'
                alt=''
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
                onError={e => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  if (img.src !== '/inventory_container.png')
                    img.src = '/inventory_container.png';
                }}
              />
            </div>
            <div
              ref={leftGridRef}
              role='region'
              aria-label='Zaino'
              style={{
                width: `${INV_SPECS_USER.cols * TILE}px`,
                height: `${INV_SPECS_USER.rows * TILE}px`,
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'rgba(16, 35, 61, 0.55)',
                boxShadow:
                  '0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)',
                backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
                backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
                backgroundRepeat: 'repeat',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: `repeat(${INV_SPECS_USER.cols}, ${TILE}px)`,
                gridTemplateRows: `repeat(${INV_SPECS_USER.rows}, ${TILE}px)`,
              }}
            >
              {userInv.map(it => (
                <div
                  key={it.id}
                  title={it.name}
                  style={{
                    gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                    gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    opacity:
                      drag && drag.srcInv === 'zaino' && drag.id === it.id
                        ? 0
                        : 1,
                    pointerEvents:
                      drag && drag.srcInv === 'zaino' && drag.id === it.id
                        ? 'none'
                        : 'auto',
                  }}
                  onPointerDown={e => {
                    if (!leftGridRef.current) return;
                    const rect = leftGridRef.current.getBoundingClientRect();
                    const cellW = rect.width / INV_SPECS_USER.cols;
                    const cellH = rect.height / INV_SPECS_USER.rows;
                    const posX = Math.max(
                      0,
                      Math.min(rect.width, e.clientX - rect.left),
                    );
                    const posY = Math.max(
                      0,
                      Math.min(rect.height, e.clientY - rect.top),
                    );
                    try {
                      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                    } catch {}
                    setSelectedItem(it);
                    setDrag({
                      id: it.id,
                      srcInv: 'zaino',
                      icon: it.icon,
                      name: it.name,
                      start: { x: it.x, y: it.y },
                      pos: { x: posX, y: posY },
                      client: { x: e.clientX, y: e.clientY },
                      srcRect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      },
                      srcCellW: cellW,
                      srcCellH: cellH,
                      itemW: it.w,
                      itemH: it.h,
                    });
                    const cx = Math.max(
                      0,
                      Math.min(
                        INV_SPECS_USER.cols - it.w,
                        Math.floor(posX / cellW),
                      ),
                    );
                    const cy = Math.max(
                      0,
                      Math.min(
                        INV_SPECS_USER.rows - it.h,
                        Math.floor(posY / cellH),
                      ),
                    );
                    const hv = { inv: 'zaino' as HoverKey, x: cx, y: cy };
                    setHover(hv);
                    lastHoverRef.current = hv;
                  }}
                >
                  {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`,
                        backgroundRepeat: 'no-repeat, no-repeat',
                        backgroundPosition: 'center, center',
                        backgroundSize: '100% 100%, 100% 100%',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: '12%',
                        background:
                          'linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))',
                        boxShadow:
                          '0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <img
                    src={it.icon}
                    alt={it.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      imageRendering: 'auto',
                      zIndex: 1,
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onError={e => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = '/react.svg';
                    }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* GRID 5x5 (client-only) */}
          <div
            ref={fiveGridRef}
            role='region'
            aria-label='Griglia 5x5'
            style={{
              marginTop: UI_GAP_5x5_BELOW_ZAINO,
              width: `${INV_SPECS_GRID5.cols * TILE}px`,
              height: `${INV_SPECS_GRID5.rows * TILE}px`,
              backgroundColor: 'rgba(16, 35, 61, 0.55)',
              boxShadow:
                '0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)',
              backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
              backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
              backgroundRepeat: 'repeat',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: `repeat(${INV_SPECS_GRID5.cols}, ${TILE}px)`,
              gridTemplateRows: `repeat(${INV_SPECS_GRID5.rows}, ${TILE}px)`,
            }}
          >
            {grid5.map(it => (
              <div
                key={it.id}
                title={it.name}
                style={{
                  gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                  gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  opacity:
                    drag && drag.srcInv === 'grid5x5' && drag.id === it.id
                      ? 0
                      : 1,
                  pointerEvents:
                    drag && drag.srcInv === 'grid5x5' && drag.id === it.id
                      ? 'none'
                      : 'auto',
                }}
                onPointerDown={e => {
                  if (!fiveGridRef.current) return;
                  const rect = fiveGridRef.current.getBoundingClientRect();
                  const cellW = rect.width / INV_SPECS_GRID5.cols;
                  const cellH = rect.height / INV_SPECS_GRID5.rows;
                  const posX = Math.max(
                    0,
                    Math.min(rect.width, e.clientX - rect.left),
                  );
                  const posY = Math.max(
                    0,
                    Math.min(rect.height, e.clientY - rect.top),
                  );
                  try {
                    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                  } catch {}
                  setSelectedItem(it);
                  setDrag({
                    id: it.id,
                    srcInv: 'grid5x5',
                    icon: it.icon,
                    name: it.name,
                    start: { x: it.x, y: it.y },
                    pos: { x: posX, y: posY },
                    client: { x: e.clientX, y: e.clientY },
                    srcRect: {
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    },
                    srcCellW: cellW,
                    srcCellH: cellH,
                    itemW: it.w,
                    itemH: it.h,
                  });
                  const cx = Math.max(
                    0,
                    Math.min(
                      INV_SPECS_GRID5.cols - it.w,
                      Math.floor(posX / cellW),
                    ),
                  );
                  const cy = Math.max(
                    0,
                    Math.min(
                      INV_SPECS_GRID5.rows - it.h,
                      Math.floor(posY / cellH),
                    ),
                  );
                  const hv = { inv: 'grid5x5' as HoverKey, x: cx, y: cy };
                  setHover(hv);
                  lastHoverRef.current = hv;
                }}
              >
                {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`,
                      backgroundRepeat: 'no-repeat, no-repeat',
                      backgroundPosition: 'center, center',
                      backgroundSize: '100% 100%, 100% 100%',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: '12%',
                      background:
                        'linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))',
                      boxShadow:
                        '0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <img
                  src={it.icon}
                  alt={it.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    imageRendering: 'auto',
                    zIndex: 1,
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onError={e => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/react.svg';
                  }}
                  draggable={false}
                />
              </div>
            ))}
          </div>
          <div style={{ color: '#10233d', fontSize: 24, marginTop: 8 }}>
            _INPUT//
          </div>
        </div>

        {/* RIGHT column unused; actual aux lives bottom-right */}
        <div />
      </div>

      {/* AUX selector */}
      <div
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          zIndex: 3000,
          pointerEvents: 'auto',
        }}
      >
        <AuxSelect specs={otherSpecs} value={auxInv} onChange={setAuxInv} />
      </div>

      {/* AUX container (current other) */}
      <div
        style={{
          position: 'absolute',
          right: 100,
          bottom: 100,
          width: 650,
          height: 650,
          overflow: 'visible',
          zIndex: 2000,
          pointerEvents: 'auto',
        }}
        aria-label='Area contenitore ausiliario'
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              ref={rightGridRef}
              role='region'
              aria-label='Contenitore ausiliario'
              style={{
                width: `${(otherSpecs[auxInv]?.cols ?? 10) * TILE}px`,
                height: `${(otherSpecs[auxInv]?.rows ?? 10) * TILE}px`,
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'rgba(16, 35, 61, 0.55)',
                boxShadow:
                  '0 10px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(223,255,255,0.12)',
                backgroundImage: `linear-gradient(to right, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px), linear-gradient(to bottom, rgba(223,255,255,0.18) 1px, rgba(0,0,0,0) 1px)`,
                backgroundSize: `${TILE}px 100%, 100% ${TILE}px`,
                backgroundRepeat: 'repeat',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: `repeat(${
                  otherSpecs[auxInv]?.cols ?? 10
                }, ${TILE}px)`,
                gridTemplateRows: `repeat(${
                  otherSpecs[auxInv]?.rows ?? 10
                }, ${TILE}px)`,
              }}
            >
              {(others[auxInv] ?? []).map(it => (
                <div
                  key={it.id}
                  title={it.name}
                  style={{
                    gridColumn: `${it.x + 1} / ${it.x + it.w + 1}`,
                    gridRow: `${it.y + 1} / ${it.y + it.h + 1}`,
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    opacity:
                      drag && drag.srcInv === auxInv && drag.id === it.id
                        ? 0
                        : 1,
                    pointerEvents:
                      drag && drag.srcInv === auxInv && drag.id === it.id
                        ? 'none'
                        : 'auto',
                  }}
                  onPointerDown={e => {
                    if (!rightGridRef.current) return;
                    const rect = rightGridRef.current.getBoundingClientRect();
                    const cols = otherSpecs[auxInv]?.cols ?? 10;
                    const rows = otherSpecs[auxInv]?.rows ?? 10;
                    const cellW = rect.width / cols;
                    const cellH = rect.height / rows;
                    const posX = Math.max(
                      0,
                      Math.min(rect.width, e.clientX - rect.left),
                    );
                    const posY = Math.max(
                      0,
                      Math.min(rect.height, e.clientY - rect.top),
                    );
                    try {
                      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                    } catch {}
                    setSelectedItem(it);
                    setDrag({
                      id: it.id,
                      srcInv: auxInv,
                      icon: it.icon,
                      name: it.name,
                      start: { x: it.x, y: it.y },
                      pos: { x: posX, y: posY },
                      client: { x: e.clientX, y: e.clientY },
                      srcRect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      },
                      srcCellW: cellW,
                      srcCellH: cellH,
                      itemW: it.w,
                      itemH: it.h,
                    });
                    const cx = Math.max(
                      0,
                      Math.min(cols - it.w, Math.floor(posX / cellW)),
                    );
                    const cy = Math.max(
                      0,
                      Math.min(rows - it.h, Math.floor(posY / cellH)),
                    );
                    const hv = { inv: auxInv as HoverKey, x: cx, y: cy };
                    setHover(hv);
                    lastHoverRef.current = hv;
                  }}
                >
                  {it.w >= 1 && it.w <= 5 && it.h >= 1 && it.h <= 5 ? (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(/bg-${it.w}x${it.h}.png), linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))`,
                        backgroundRepeat: 'no-repeat, no-repeat',
                        backgroundPosition: 'center, center',
                        backgroundSize: '100% 100%, 100% 100%',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: '12%',
                        background:
                          'linear-gradient(180deg, rgba(47,208,255,0.28), rgba(47,208,255,0.14))',
                        boxShadow:
                          '0 8px 22px rgba(47,208,255,0.15), inset 0 0 0 1px rgba(223,255,255,0.25)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <img
                    src={it.icon}
                    alt={it.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      imageRendering: 'auto',
                      zIndex: 1,
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                    onError={e => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = '/react.svg';
                    }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* details panel (unchanged except it reads selectedItem) */}
      {selectedItem && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: Math.max(24, UI_PADDING_RIGHT - 40),
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              color: '#dfffff',
              fontFamily: 'Eurostile, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 3,
              fontWeight: 700,
              fontSize: 30,
            }}
          >
            {selectedItem.name}
          </div>
          {(() => {
            const SCALE = 0.75;
            const BASE_W = 491;
            const W = Math.round(BASE_W * SCALE);
            const PAD = Math.round(23 * SCALE);
            const LABEL_FS = 18.6 * SCALE;
            const VALUE_FS = 18.6 * SCALE;
            const ICON_SIZE = 16;
            return (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    width: W,
                  }}
                >
                  <Slot
                    label='Tipo'
                    width={W}
                    labelFontSize={LABEL_FS}
                    valueFontSize={VALUE_FS}
                    padding={PAD}
                  >
                    <span style={{ fontWeight: 700 }}>{selectedItem.kind}</span>
                  </Slot>
                  <Slot
                    label='Qualità'
                    width={W}
                    labelFontSize={LABEL_FS}
                    valueFontSize={VALUE_FS}
                    padding={PAD}
                  >
                    {selectedItem.tier ? (
                      Array.from({ length: selectedItem.tier }).map((_, i) => (
                        <FaStar
                          key={i}
                          color='#dfffff'
                          style={{ marginLeft: 4 }}
                        />
                      ))
                    ) : (
                      <span style={{ fontWeight: 700 }}>—</span>
                    )}
                  </Slot>
                  {selectedItem.kind === 'alimento' && (
                    <>
                      <Slot
                        label='Contenuto'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          {selectedItem.isGluten ? (
                            <FaBreadSlice size={ICON_SIZE} title='Glutine' />
                          ) : null}
                          {selectedItem.isMeat ? (
                            <FaDrumstickBite size={ICON_SIZE} title='Carne' />
                          ) : null}
                          {selectedItem.isSugar ? (
                            <FaCandyCane size={ICON_SIZE} title='Zucchero' />
                          ) : null}
                          {selectedItem.isVegetable ? (
                            <FaLeaf size={ICON_SIZE} title='Vegetale' />
                          ) : null}
                          {selectedItem.isAlcohol ? (
                            <FaBeer size={ICON_SIZE} title='Alcol' />
                          ) : null}
                          {selectedItem.isDrugs ? (
                            <FaCapsules size={ICON_SIZE} title='Droghe' />
                          ) : null}
                        </div>
                      </Slot>
                      <Slot
                        label='Effetto'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        {typeof selectedItem.effectPercent === 'number' ? (
                          (() => {
                            const drink = selectedItem.isDrink ?? false;
                            const food = selectedItem.isFood ?? false;
                            const hasIcon = drink || food;
                            const iconSrc = drink
                              ? '/droplet_fill.png'
                              : '/stomach-fill.png';
                            const iconAlt = drink ? 'Sete' : 'Fame';
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                {hasIcon ? (
                                  <img
                                    src={iconSrc}
                                    alt={iconAlt}
                                    width={ICON_SIZE}
                                    height={ICON_SIZE}
                                  />
                                ) : null}
                                <span style={{ fontWeight: 700 }}>
                                  {selectedItem.effectPercent}%
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span style={{ fontWeight: 700 }}>—</span>
                        )}
                      </Slot>
                    </>
                  )}
                  {selectedItem.kind === 'arma' && (
                    <>
                      <Slot
                        label='Danno'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {(() => {
                            const src = damageIconFor(selectedItem.damageType);
                            return src ? (
                              <img
                                src={src}
                                alt={selectedItem.damageType}
                                width={16}
                                height={16}
                              />
                            ) : null;
                          })()}
                          <span style={{ fontWeight: 700 }}>
                            {selectedItem.danno ?? 0}
                          </span>
                        </div>
                      </Slot>
                      <Slot
                        label='Proiettili'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        <span style={{ fontWeight: 700 }}>
                          {selectedItem.projectiles ?? '—'}
                        </span>
                      </Slot>
                    </>
                  )}
                  {selectedItem.kind === 'risorsa' && (
                    <>
                      <Slot
                        label='Info'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        <span style={{ fontWeight: 700 }}>—</span>
                      </Slot>
                      <Slot
                        label='Extra'
                        width={W}
                        labelFontSize={LABEL_FS}
                        valueFontSize={VALUE_FS}
                        padding={PAD}
                      >
                        <span style={{ fontWeight: 700 }}>—</span>
                      </Slot>
                    </>
                  )}
                </div>
                <div
                  style={{
                    width: W,
                    color: '#dfffff',
                    fontFamily: 'Eurostile, sans-serif',
                    fontSize: 16,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
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

      {/* drag ghost */}
      {drag && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 12000,
          }}
        >
          {(() => {
            const srcInfo = getGridInfo(drag.srcInv);
            const hoverInfo = hover ? getGridInfo(hover.inv) : null;
            const cellW = hoverInfo ? hoverInfo.cellW : srcInfo?.cellW ?? TILE;
            const cellH = hoverInfo ? hoverInfo.cellH : srcInfo?.cellH ?? TILE;
            const left =
              hover && hoverInfo
                ? hoverInfo.rect.left + hover.x * cellW
                : drag.client.x - (cellW * drag.itemW) / 2;
            const top =
              hover && hoverInfo
                ? hoverInfo.rect.top + hover.y * cellH
                : drag.client.y - (cellH * drag.itemH) / 2;
            const hasShapeBg =
              drag.itemW >= 1 &&
              drag.itemW <= 5 &&
              drag.itemH >= 1 &&
              drag.itemH <= 5;
            const isInvalid = hoverValid === false && !!hover;
            return (
              <div
                style={{
                  position: 'fixed',
                  left,
                  top,
                  width: cellW * drag.itemW,
                  height: cellH * drag.itemH,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: isInvalid
                    ? '2px solid rgba(255,80,80,0.8)'
                    : undefined,
                }}
              >
                {hasShapeBg ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(/bg-${drag.itemW}x${drag.itemH}.png), linear-gradient(180deg, rgba(47,208,255,0.32), rgba(47,208,255,0.18))`,
                      backgroundRepeat: 'no-repeat, no-repeat',
                      backgroundPosition: 'center, center',
                      backgroundSize: '100% 100%, 100% 100%',
                      opacity: isInvalid ? 0.7 : 1,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '12%',
                      background:
                        'linear-gradient(180deg, rgba(47,208,255,0.32), rgba(47,208,255,0.18))',
                      boxShadow:
                        '0 10px 26px rgba(47,208,255,0.22), inset 0 0 0 1px rgba(223,255,255,0.35)',
                      opacity: isInvalid ? 0.7 : 1,
                    }}
                  />
                )}
                <img
                  src={drag.icon}
                  alt={drag.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    filter: 'brightness(1.6)',
                  }}
                  onError={e => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/react.svg';
                  }}
                  draggable={false}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* aux bg */}
      {auxBgCenter &&
        (() => {
          const spec = otherSpecs[auxInv];
          const gridW = (spec?.cols ?? 10) * TILE;
          const gridH = (spec?.rows ?? 10) * TILE;
          const isZaino = (spec?.category ?? 'cassa') === 'zaino';
          const dx = isZaino ? -0.02 * gridW : 0;
          const dy = isZaino ? -0.12 * gridH : 0;
          const baseScale = isZaino ? 2.3 : 1.5;
          const extraScale = isZaino ? 1 : UI_AUX_BG_SCALE;
          const wPx = gridW * baseScale;
          const hPx = gridH * baseScale;
          return (
            <img
              aria-hidden
              src={`/${spec?.category ?? 'cassa'}.png`}
              alt=''
              onError={e => {
                const img = e.currentTarget as HTMLImageElement;
                img.onerror = null;
                if (img.src !== '/inventory_container.png')
                  img.src = '/inventory_container.png';
              }}
              style={{
                position: 'fixed',
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
              }}
            />
          );
        })()}
    </div>
  );
}

// ------- Aux select (dynamic) -------
function AuxSelect({
  specs,
  value,
  onChange,
}: {
  specs: Record<string, InvSpec>;
  value: string;
  onChange: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = Object.keys(specs);
  const sel = value && specs[value] ? specs[value] : undefined;

  if (options.length === 0) {
    return null; // no "others" inventories available
  }

  const shown = sel ?? specs[options[0]];

  return (
    <div style={{ position: 'relative', userSelect: 'none', zIndex: 2000 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          border: 'none',
          boxSizing: 'border-box',
          background: 'url(/bg-title.png) center/cover no-repeat',
          color: '#dfffff',
          borderRadius: 0,
          cursor: 'pointer',
          letterSpacing: '3px',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontFamily: 'Eurostile, sans-serif',
          minWidth: 360,
          justifyContent: 'space-between',
        }}
      >
        <span>{shown.label}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '110%',
            right: 0,
            left: 'auto',
            minWidth: 360,
            background: 'url(/bg-slot.png) center/cover no-repeat',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            zIndex: 3000,
            padding: 8,
            textAlign: 'right',
            pointerEvents: 'auto',
            fontFamily: 'Eurostile, sans-serif',
          }}
        >
          {options.map(k => (
            <button
              key={k}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 14px',
                background:
                  value === k ? 'rgba(47,208,255,0.18)' : 'transparent',
                color: '#dfffff',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                textAlign: 'right',
                justifyContent: 'flex-end',
                letterSpacing: '3px',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontFamily: 'Eurostile, sans-serif',
              }}
            >
              <span>{specs[k].label}</span>
              <span style={{ opacity: 0.6, marginLeft: 10 }}>
                {specs[k].cols}x{specs[k].rows}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------- Slot (unchanged) -------
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
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: width ?? 'auto',
        height: height ?? 'auto',
        minWidth: 0,
      }}
    >
      <img
        src='/bg-slot.png'
        alt='slot'
        style={{
          display: 'block',
          width: width ?? 'auto',
          height: height ?? 'auto',
          maxWidth: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: padding ?? 23,
          transform: 'translateY(-50%)',
          color: '#99afc6',
          fontFamily: 'Eurostile, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: 3,
          fontSize: labelFontSize,
        }}
      >
        {label.toUpperCase()}
      </span>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: padding ?? 23,
          transform: 'translateY(-41.3%)',
          color: '#dfffff',
          fontFamily: 'Eurostile, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: 3,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: valueFontSize,
        }}
      >
        {children}
      </div>
    </div>
  );
}
