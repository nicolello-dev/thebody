import React, { useEffect, useRef, useState } from "react";
import "./terminallogs.css";

const dummyLogs = [
  "Personal Digital Assistant TARS [Versione 5.12.51326]",
  "(c) TARS Limited. Tutti i diritti riservati.",
  "",
  "Query automatica in esecuzione.",
  "Individuando pianeta corrente...",
  "1 match individuato.",
  "",
  "================",
  "== 24B3B SPICA ==",
  "================",
  "SFDBID: 513451341361",
  "Proper: TARS (reclamato)",
  "Ra/Dec: 01h33m16.0s+16°10'33.6\"",
  "Spec: G5V",
  "Mag: 5.09",
  "",
  "====================",
  "== Sistema stella ==",
  "====================",
  "1 pianeta",
  "4 pianeti maggiori",
  "0 lune",
  "41827 asteroidi",
  "",
  "Lista pianeti in orbita (<2M Gkm):",
  "- Mordocai (SPICA B) - Arido",
  "- Efete (SPICA C) - Subartico (stabile)",
  "- Burgeois (SPICA D) - Gigante gassosa",
  "- Antachia (SPICA E) - Gigante gassosa",
  "",
  "==============================",
  "== Abitabilità ==",
  "==============================",
  "Gravità di superficie: 1 g",
  "Acqua: abbondante (74%)",
  "Atmo comp: N2(72%),O2(24%),Ar(1.5%),H2O(1.5%),CO2(0.4%),Ne(0.3%),etc.",
  "Pressione: 0.7612 atm",
  "Temperatura di superficie: confortevole a 24°C",
  "Popolazione: individuate 1 forme di vita con QI medio: 242",
  "",
  "Stabilimenti principali:",
  "- NULL",
];

export default function TerminalLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentLine >= dummyLogs.length) return;

    const charTimer = setTimeout(() => {
      const line = dummyLogs[currentLine];
      const nextChar = line.slice(0, currentChar + 1);

      setLogs(prev => {
        const updated = [...prev];
        updated[currentLine] = nextChar;
        return updated;
      });

      if (currentChar + 1 >= line.length) {
        // Fine riga: passa alla prossima
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      } else {
        setCurrentChar(prev => prev + 1);
      }

      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 25);

    return () => clearTimeout(charTimer);
  }, [currentChar, currentLine]);

  return (
    <div className="terminal-container" ref={containerRef}>
      {logs.map((log, idx) => (
        <div key={idx} className="terminal-line">
          {log}
          {idx === currentLine && <span className="cursor">|</span>}
        </div>
      ))}
    </div>
  );
}
