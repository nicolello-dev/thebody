import React, { useEffect, useRef, useState } from 'react';
import './terminallogs.css';

// Sezione statica: dati pianeta recuperati dal vecchio log, resi in chiave sci‑fi
const staticLogs: string[] = [
  '[SCANCORE] Console di studio planetario — online',
  '[IDENT] 24B3B SPICA • SFDBID 513451341361 • Proprietà: TARS (reclamato)',
  '[ASTROMETRIA] RA/DEC 01h33m16.0s +16°10\'33.6" • Spec G5V • Mag 5.09',
  '[SISTEMA] 1 pianeta • 4 pianeti maggiori • 0 lune • 41827 asteroidi',
  '[ORBITALI] Mordocai (arido) • Efete (subartico/stabile) • Burgeois (GG) • Antachia (GG)',
  '[AMBIENTE] g=1.00 • P=0.7612 atm • T=24°C • H2O=74%',
  '[ATMOSFERA] N2 72% • O2 24% • Ar 1.5% • H2O 1.5% • CO2 0.4% • Ne 0.3% • etc.',
  '[BIOSEGNALI] Popolazione aliena identificata: 1 forma di vita • QI medio: 242',
  '[OSSEVAZIONE] Rete sensori coerente — sincronizzata',
];

// Sezione in loop: solo status/telemetria/rendering che ha senso ciclare
const loopLogs: string[] = [
  '[RENDER] Pipeline in esecuzione — fotoni sintetici: ◐',
  '[RENDER] Pipeline in esecuzione — fotoni sintetici: ◓',
  '[RENDER] Pipeline in esecuzione — fotoni sintetici: ◑',
  '[RENDER] Pipeline in esecuzione — fotoni sintetici: ◒',
  '[TELEMETRIA] Spectrum VIS/NIR/TIR — Δnoise: 0.03% — lock',
  '[SCANSIONE] Topologia • Texture • Atmosfera — flusso stabile',
  '[BARRA] ████░░░░░ 40%',
  '[BARRA] ██████░░░ 60%',
  '[BARRA] ████████░ 90%',
  '[STATUS] Frame 60 fps • latenza 4.2 ms',
];

export default function TerminalLogs({
  killzone,
}: { killzone?: boolean } = {}) {
  const totalStatic = staticLogs.length;
  const totalLoop = loopLogs.length;
  const [phase, setPhase] = useState<'static' | 'loop'>('static');
  const [logs, setLogs] = useState<string[]>(Array(totalStatic).fill(''));
  const [currentLine, setCurrentLine] = useState(0); // indice relativo alla fase
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(true);

  // Killzone: evita di renderizzare se il contenitore cade entro 200px dai bordi
  useEffect(() => {
    if (!killzone) {
      setAllowed(true);
      return;
    }
    const check = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 200;
      const nearLeft = r.left < margin;
      const nearTop = r.top < margin;
      const nearRight = window.innerWidth - r.right < margin;
      const nearBottom = window.innerHeight - r.bottom < margin;
      setAllowed(!(nearLeft || nearTop || nearRight || nearBottom));
    };
    const id = requestAnimationFrame(check);
    const onResize = () => requestAnimationFrame(check);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [killzone]);

  useEffect(() => {
    // Sezione statica completata → inizializza sezione loop
    if (phase === 'static' && currentLine >= totalStatic) {
      // blocca la parte statica (completamente stampata)
      setLogs([...staticLogs]);
      setPhase('loop');
      setCurrentLine(0);
      setCurrentChar(0);
      return;
    }
    // Sezione loop completata → ricomincia solo il loop, lasciando intatti i log statici
    if (phase === 'loop' && currentLine >= totalLoop) {
      const resetTimer = setTimeout(() => {
        setLogs([...staticLogs]);
        setCurrentLine(0);
        setCurrentChar(0);
      }, 800);
      return () => clearTimeout(resetTimer);
    }

    const charTimer = setTimeout(
      () => {
        const source = phase === 'static' ? staticLogs : loopLogs;
        const base = phase === 'static' ? 0 : totalStatic; // offset nel vettore logs
        // se siamo in loop e logs non ha ancora spazio per le righe del loop, estendilo
        if (phase === 'loop' && logs.length < totalStatic + currentLine + 1) {
          setLogs(prev => {
            const next = [...prev];
            next.length = totalStatic + currentLine + 1;
            for (let i = prev.length; i < next.length; i++) next[i] = '';
            return next;
          });
        }

        const line = source[currentLine] || '';
        const nextChar = line.slice(0, currentChar + 1);

        setLogs(prev => {
          const updated = [...prev];
          updated[base + currentLine] = nextChar;
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
      },
      phase === 'static' ? 45 : 65,
    );

    return () => clearTimeout(charTimer);
  }, [currentChar, currentLine, phase, logs.length, totalStatic, totalLoop]);

  if (!allowed) return null;
  return (
    <div className='terminal-container' ref={containerRef}>
      {logs.map((log, idx) => {
        const cursorIndex =
          phase === 'static' ? currentLine : totalStatic + currentLine;
        return (
          <div key={idx} className='terminal-line'>
            {log}
            {idx === cursorIndex && <span className='cursor'>|</span>}
          </div>
        );
      })}
    </div>
  );
}
