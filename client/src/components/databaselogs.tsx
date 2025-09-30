import React, { useEffect, useRef, useState } from "react";
import "./terminallogs.css";

// Log "super scientifici" per la schermata Database, mantenendo lo stile di TerminalLogs
const staticLogs: string[] = [
  "[DB/BOOT] HyperArchive v4.9 — inizializzazione bus quantico",
  "[DB/MOUNT] Array cristallo‑memristivo — ONLINE • integrità 100%",
  "[IDENT] Archivio: OMEGA-IX • Curatore: TARS • Accesso: Livello 7",
  "[INDICI] 14.3×10^6 tassonomie • 9.1×10^9 esemplari • 4.7 PB metadata",
  "[CHECK] ECC/CRC • rumore: 0.002% • sincronizzazione stabile",
  "[ONTOLOGIE] Flora • Fauna • Dossier — schemi caricati",
  "[RELAZIONI] Grafi semantici: 128 shard • path ottimizzati",
  "[CRITICITÀ] Nessuna anomalia • watchdog: OK",
];

const loopLogs: string[] = [
  "[QUERY] Ricostruzione indice bloom…",
  "[QUERY] Ricostruzione indice bloom… ",
  "[QUERY] Ricostruzione indice bloom… ✓",
  "[ANALISI] Hash multi‑spettro su 1024 campioni • ΔΣ 3.2e‑5",
  "[INGEST] Normalizzazione metadati…",
  "[INGEST] Normalizzazione metadati… ",
  "[INGEST] Normalizzazione metadati… ✓",
  "[CIFRATURA] Canale TLS‑Φ stabilito • latenza 3.8 ms",
  "[REPLICAZIONE] Nodo β‑13 allineato • skew 0.6 ms",
  "[STATUS] Throughput 1.2M doc/s • cache hit 97%",
];

export default function DatabaseLogs() {
  const totalStatic = staticLogs.length;
  const totalLoop = loopLogs.length;
  const [phase, setPhase] = useState<"static" | "loop">("static");
  const [logs, setLogs] = useState<string[]>(Array(totalStatic).fill(""));
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "static" && currentLine >= totalStatic) {
      setLogs([...staticLogs]);
      setPhase("loop");
      setCurrentLine(0);
      setCurrentChar(0);
      return;
    }
    if (phase === "loop" && currentLine >= totalLoop) {
      const resetTimer = setTimeout(() => {
        setLogs([...staticLogs]);
        setCurrentLine(0);
        setCurrentChar(0);
      }, 800);
      return () => clearTimeout(resetTimer);
    }

    const charTimer = setTimeout(() => {
      const source = phase === "static" ? staticLogs : loopLogs;
      const base = phase === "static" ? 0 : totalStatic;
      if (phase === "loop" && logs.length < totalStatic + currentLine + 1) {
        setLogs(prev => {
          const next = [...prev];
          next.length = totalStatic + currentLine + 1;
          for (let i = prev.length; i < next.length; i++) next[i] = "";
          return next;
        });
      }

      const line = source[currentLine] || "";
      const nextChar = line.slice(0, currentChar + 1);

      setLogs(prev => {
        const updated = [...prev];
        updated[base + currentLine] = nextChar;
        return updated;
      });

      if (currentChar + 1 >= line.length) {
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      } else {
        setCurrentChar(prev => prev + 1);
      }

      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, phase === "static" ? 45 : 65);

    return () => clearTimeout(charTimer);
  }, [currentChar, currentLine, phase, logs.length, totalStatic, totalLoop]);

  return (
    <div className="terminal-container" ref={containerRef}>
      {logs.map((log, idx) => {
        const cursorIndex = phase === "static" ? currentLine : totalStatic + currentLine;
        return (
          <div key={idx} className="terminal-line">
            {log}
            {idx === cursorIndex && <span className="cursor">|</span>}
          </div>
        );
      })}
    </div>
  );
}
