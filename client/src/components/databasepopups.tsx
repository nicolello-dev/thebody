import React, { useEffect, useRef, useState } from "react";
import "./terminallogs.css";

// Micro-log randomici in stile terminale
const MESSAGES = [
  "[SCAN] Bloom filter warmup…",
  "[IDX] Cache shard ε primed",
  "[BIO] Taxon hint: Euphyllia sp.",
  "[IO] DMA lane 3 idle",
  "[SIG] Δnoise 0.004%",
  "[AI] Heuristic update v12",
  "[MEM] Fragmentation < 1.2%",
  "[NET] RTT 3.9 ms",
  "[ANOM] 0 events",
];

type AnchorMap = { flora: HTMLElement | null; fauna: HTMLElement | null; dossier: HTMLElement | null };

type Popup = {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number; // ms
  born: number; // ts
};

export default function DatabasePopups({ anchors }: { anchors: AnchorMap }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const idRef = useRef(1);
  const POPUP_W = 280;
  const POPUP_H = 90;
  const MARGIN = 56; // distanza base dall'icona
  const CENTER_PUSH = 120; // spinta lontano dal centro

  const intersects = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) => {
    return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
  };

  const intersectsAnyAnchor = (x: number, y: number, w: number, h: number) => {
    const list = Object.values(anchors).filter((el): el is HTMLElement => !!el);
    for (const el of list) {
      const r = el.getBoundingClientRect();
      if (intersects(x, y, w, h, r.left, r.top, r.width, r.height)) return true;
    }
    return false;
  };

  // Prova a posizionare un popup vicino all'anchor senza coprirlo né entrare nella killzone centrale
  const placePopup = (el: HTMLElement): { x: number; y: number } | null => {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = vw / 2, cy = vh / 2;
    const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
    let dx = ax - cx, dy = ay - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const baseSides: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
    const order = [0,1,2,3].sort(() => Math.random() - 0.5);
    const killX = cx - 50, killY = cy - 50, killW = 100, killH = 100;
    for (const idx of order) {
      const side = baseSides[idx];
      let x = r.left, y = r.top;
      if (side === "top") {
        x = r.left + r.width / 2 - POPUP_W / 2;
        y = r.top - POPUP_H - MARGIN;
      } else if (side === "right") {
        x = r.right + MARGIN;
        y = r.top + r.height / 2 - POPUP_H / 2;
      } else if (side === "bottom") {
        x = r.left + r.width / 2 - POPUP_W / 2;
        y = r.bottom + MARGIN;
      } else if (side === "left") {
        x = r.left - POPUP_W - MARGIN;
        y = r.top + r.height / 2 - POPUP_H / 2;
      }
      // spingi lontano dal centro dello schermo
      x += dx * CENTER_PUSH;
      y += dy * CENTER_PUSH;
      // clamp
      x = Math.max(8, Math.min(vw - POPUP_W - 8, x));
      y = Math.max(8, Math.min(vh - POPUP_H - 8, y));
      // evita sovrapposizione all'anchor e ad altri anchor
      if (intersects(x, y, POPUP_W, POPUP_H, r.left, r.top, r.width, r.height)) continue;
      if (intersectsAnyAnchor(x, y, POPUP_W, POPUP_H)) continue;
      // evita killzone centrale 100x100
      if (intersects(x, y, POPUP_W, POPUP_H, killX, killY, killW, killH)) continue;
      return { x, y };
    }
    return null;
  };

  // Timer che spawna popups random, con lifetime breve
  useEffect(() => {
  const timer = setInterval(() => {
      const entries = Object.entries(anchors).filter(([, el]) => !!el) as [keyof AnchorMap, HTMLElement][];
      if (entries.length === 0) return;
      const [key, el] = entries[Math.floor(Math.random() * entries.length)];
      const pos = placePopup(el);
      if (!pos) return; // nessuna posizione valida, salta
      const id = idRef.current++;
      const life = 1400 + Math.floor(Math.random() * 1600);
      const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      setPopups((prev) => [...prev, { id, text, x: pos.x, y: pos.y, life, born: Date.now() }]);
    }, 900);
    return () => clearInterval(timer);
  }, [anchors.flora, anchors.fauna, anchors.dossier]);

  // Cleanup dei popup scaduti
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setPopups((prev) => prev.filter((p) => now - p.born < p.life));
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 3600 }}>
      {popups.map((p) => (
        <div
          key={p.id}
          className="terminal-container"
          style={{
            position: "fixed",
            left: p.x,
            top: p.y,
            width: 280,
            maxHeight: 120,
            overflow: "hidden",
            opacity: 0.95,
            pointerEvents: "none",
          }}
        >
          <div className="terminal-line">{p.text}</div>
        </div>
      ))}
    </div>
  );
}
