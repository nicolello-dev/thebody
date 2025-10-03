import React, { useEffect, useRef, useState } from "react";

const COMMANDS = [
  "exec /usr/bin/pda-shell --bootstrap",
  "load service renderer --profile=warp16",
  "mount /db botanica.fauna.recipes --journal=WAL",
  "start sensord --calibrate",
  "netctl up link0 --ipv6",
  "shadercache warmup --level=full",
  "uiact attach input stack",
  "security enforce selinux",
  "hmi start compositor",
  "biofeedback subscribe --rate=120hz",
  "map preload tiles --region=efete",
  "telemetry enable --burst",
  "pda boot-complete",
];

type Item = { id: number; text: string; createdAt: number };

export default function CommandStreamRight() {
  const [items, setItems] = useState<Item[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const push = () => {
      const text = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
      const id = ++idRef.current;
      setItems(prev => {
        const next = [{ id, text, createdAt: Date.now() }, ...prev];
        return next.slice(0, 12); // massimo 12 visibili
      });
    };
    const interval = setInterval(push, 120); // rapidissimi
    const purge = setInterval(() => {
      const now = Date.now();
      setItems(prev => prev.filter(it => now - it.createdAt < 1000)); // scompaiono dopo ~1s
    }, 100);
    return () => { clearInterval(interval); clearInterval(purge); };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        right: 0, // Allineato completamente a destra
        bottom: 24,
        left: "auto", // Rimuovo il constraint sinistro
        minWidth: "300px", // Larghezza minima
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "none",
      }}
    >
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            color: "#0d1d33",
            fontSize: 24,
            fontFamily: "Eurostile, sans-serif",
            letterSpacing: 1,
            textShadow: "0 0 1px rgba(13,29,51,0.65)",
            opacity: 0.9,
            textAlign: "right", // Allineamento testo a destra
          }}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}