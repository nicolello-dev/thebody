import React from "react";
import "./homepage.css";
import TerminalLogs from "./terminallogs";
import BootLogs from "./bootlogs";
import CommandStream from "./commandstream";

export default function HomePage() {
  return (
    <div className="homepage-container" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Header centrale in alto in stile Database */}
      <div className="database-header" style={{ position: "fixed", top: 32, left: "50%", transform: "translateX(-50%)", zIndex: 3500 }}>
        _SELEZIONA MODULO OPERATIVO//
      </div>
  {/* Terminal logs attorno al logo (standard) */}
  <div style={{ position: "absolute", top: 200, right: 200, '--safe-x': '400px', '--safe-y': '400px' } as React.CSSProperties}><TerminalLogs killzone /></div>
  <div style={{ position: "absolute", bottom: 200, right: 200, '--safe-x': '400px', '--safe-y': '400px' } as React.CSSProperties}><TerminalLogs killzone /></div>
  {/* Boot logs (avvio PDA) più rapidi/lunghi */}
  <div style={{ position: "absolute", top: 200, left: 200, '--safe-x': '400px', '--safe-y': '400px' } as React.CSSProperties}><BootLogs killzone /></div>
  <div style={{ position: "absolute", bottom: 200, right: 200, '--safe-x': '400px', '--safe-y': '400px' } as React.CSSProperties}><BootLogs killzone /></div>

      {/* Logo TARS dark — raddoppiato, senza glow, 3D rotate Y */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: 1200 }}>
        <div
          style={{
            width: 560, // aumentato in Home
            height: 560,
            position: "relative",
            transformStyle: "preserve-3d",
            animation: "tars-rotate 8s linear infinite",
            filter: "brightness(1.15) contrast(1.1)",
          }}
        >
          <img
            src="/tarsdark.png"
            alt="TARS"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: 1,
              filter: "none",
              transform: "translateZ(10px)",
            }}
          />
        </div>
      </div>

      {/* keyframes locali per rotazione 3D */}
      <style>
        {`
          @keyframes tars-rotate {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
          }
        `}
      </style>

      {/* Stream di comandi rapidi che appaiono e scompaiono */}
      <CommandStream />
    </div>
  );
}
