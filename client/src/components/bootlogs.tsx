import React, { useEffect, useRef, useState } from "react";
import "./terminallogs.css";

type BootLogsProps = {
  style?: React.CSSProperties; // posizione esterna: top/left/right/bottom
  width?: number | string; // override larghezza
  maxHeight?: number | string; // override altezza max
  killzone?: boolean; // non renderizzare se entro 200px dai bordi
};

// Log di avvio PDA — più lunghi, più rapidi, più frequenti
const staticBoot: string[] = [
  "[BOOT] PDA TARS OS v7.3 — inizializzazione...",
  "[SYS] Mem 2048MB • VRAM 512MB • CPU Q3-Neon 3.6GHz",
  "[KERNEL] Caricamento microkernel... ok",
  "[FS] Montaggio / (squashfs) • /data (ext4) • /tmp (ramfs)",
  "[SEC] Verifica firme modulo — trust store aggiornato",
  "[BUS] i2c/spi/uart online — device enumerati: 37",
  "[GPU] Pipeline attivata — compositor warp16",
  "[AUDIO] DSP online — codec AAC/Opus a 96kHz",
  "[NET] Link up 10Gb — IPv6 SLAAC — NAT66",
  "[TIME] TSC synced — drift < 0.2ms",
  "[PDA] Caricamento servizi core...",
  "[PDA] telemetryd • sensord • uieventd • renderer • ok",
];

const loopBoot: string[] = [
  "[PDA] Avvio app: PDA Shell...",
  "[PDA] Avvio app: HMI Renderer...",
  "[PDA] Avvio app: BioFeedback Monitor...",
  "[PDA] Avvio app: Cartografia...",
  "[DB] Attach database botanica.fauna.recipes — journal: WAL",
  "[RENDER] Shader cache warmup... 10%",
  "[RENDER] Shader cache warmup... 22%",
  "[RENDER] Shader cache warmup... 41%",
  "[RENDER] Shader cache warmup... 67%",
  "[RENDER] Shader cache warmup... 93%",
  "[RENDER] Shader cache warmup... 100%",
  "[UI] Font atlas generato — 2048x2048 — mipmap",
  "[UI] Registrazione input — gesture/penna/voce",
  "[TELEMETRIA] Link stabile • pacchetti 60/s • perdita 0.0%",
  "[SENS] calibrazione termica... ok",
  "[SENS] calibrazione igrometro... ok",
  "[SENS] calibrazione spettrometro... ok",
  "[CTL] profilo energia: dinamico",
  "[SEC] sandbox app isolate — SELinux enforcing",
  "[PDA] Tutte le app core pronte",
];

export default function BootLogs({ style, width, maxHeight, killzone }: BootLogsProps) {
  const [phase, setPhase] = useState<"static" | "loop">("static");
  const [logs, setLogs] = useState<string[]>(Array(staticBoot.length).fill(""));
  const [line, setLine] = useState(0);
  const [ch, setCh] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = phase === "static" ? staticBoot : loopBoot;
    const total = source.length;
    const base = phase === "static" ? 0 : staticBoot.length; // offset nel buffer

    // Sezione completata
    if (line >= total) {
      if (phase === "static") {
        setLogs([...staticBoot]);
        setPhase("loop");
        setLine(0);
        setCh(0);
      } else {
        // Loop: ricomincia velocemente mantenendo gli statici
        const t = setTimeout(() => {
          setLogs([...staticBoot]);
          setLine(0);
          setCh(0);
        }, 200);
        return () => clearTimeout(t);
      }
      return;
    }

    if (phase === "loop" && logs.length < staticBoot.length + line + 1) {
      setLogs(prev => {
        const next = [...prev];
        next.length = staticBoot.length + line + 1;
        for (let i = prev.length; i < next.length; i++) next[i] = "";
        return next;
      });
    }

    const tick = setTimeout(() => {
      const src = source[line] || "";
      const nextTxt = src.slice(0, ch + 1);
      setLogs(prev => {
        const out = [...prev];
        out[base + line] = nextTxt;
        return out;
      });
      if (ch + 1 >= src.length) {
        setLine(prev => prev + 1);
        setCh(0);
      } else {
        setCh(prev => prev + 1);
      }
      if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, phase === "static" ? 14 : 22); // molto piu rapidi

    return () => clearTimeout(tick);
  }, [phase, line, ch, logs.length]);

  // Limiti: non uscire dal bordo e non andare a <200px dal bordo sinistro
  const safeStyle: React.CSSProperties = {
    left: undefined,
    right: undefined,
    top: undefined,
    bottom: undefined,
    ...style,
  };
  // width e maxWidth sicure
  const w = width ?? "min(520px, calc(100vw - 228px))"; // più larga dei log standard
  const mh = maxHeight ?? "46vh";

  // killzone frame 200px
  const isAllowed = (() => {
    if (!killzone || typeof window === "undefined") return true;
    // We'll approximate after mount; for first render, allow and adjust via layout effect
    return true;
  })();

  useEffect(() => {
    if (!killzone) return;
    const check = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 200;
      const nearLeft = r.left < margin;
      const nearTop = r.top < margin;
      const nearRight = (window.innerWidth - r.right) < margin;
      const nearBottom = (window.innerHeight - r.bottom) < margin;
      if (nearLeft || nearTop || nearRight || nearBottom) {
        el.style.display = "none";
      } else {
        el.style.display = "block";
      }
    };
    const id = requestAnimationFrame(check);
    window.addEventListener("resize", check);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", check);
      window.removeEventListener("scroll", check);
    };
  }, [killzone]);

  return (
    <div
      className="terminal-container"
      ref={ref}
      style={{
        ...safeStyle,
        width: w,
        maxHeight: mh,
        marginLeft: (safeStyle.left !== undefined ? 200 : 0),
        overflowY: "auto",
        display: isAllowed ? undefined : "none",
      }}
    >
      {logs.map((l, i) => (
        <div key={i} className="terminal-line">{l}</div>
      ))}
    </div>
  );
}
