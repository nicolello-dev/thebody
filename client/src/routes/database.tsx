import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/homepage.css";
import "../components/database.css";
import DatabaseLogs from "../components/databaselogs.tsx";
import DatabasePopups from "../components/databasepopups.tsx";

interface DatabaseProps {
  healthValue?: number;
  hungerValue?: number;
  thirstValue?: number;
  temperature?: number;
  circleCenterX?: number | null;
  onCenterChange?: (x: number) => void;
}

export default function Database(props: DatabaseProps) {
  const [iconsVisible, setIconsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIconsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const buttons = [
    { src: "/flora.png", label: "_FLORA//", position: "top-left", route: "/flora", type: "flora" },
    { src: "/fauna.png", label: "_FAUNA//", position: "top-right", route: "/fauna", type: "fauna" },
    { src: "/dossier.png", label: "_DOSSIER//", position: "bottom-right", route: "/dossier", type: "dossier" },
  ] as const;
  const btnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <div className="homepage-container">
      {/* ScreenRouter o altri componenti interattivi */}
      <div className="screen-router-container">
        {/* se vuoi mantenere ScreenRouter lo rimetti qui */}
      </div>

      {/* Header centrale in alto */}
      <div className="database-header">_SELEZIONA DIRECTORY//</div>

      {/* GIF centrale, non intercettabile dai click */}
      <div className="database-gif-container">
        <img
          src="/database-searching.gif"
          alt="Database Animation"
          className="database-gif"
        />
      </div>

      {/* Seconda GIF overlay (screen blend, ruotata 90° a destra) */}
      <div className="database-gif2-container" aria-hidden>
        <img
          src="/tensorflow.gif"
          alt="Tensor Overlay"
          className="database-gif2"
        />
      </div>

      {/* Icone pulsanti sopra la GIF */}
      <div className="database-icons-container">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            className={`database-icon-button ${btn.position} ${btn.type} ${
              iconsVisible ? "visible" : ""
            }`}
            ref={(el) => { btnRefs.current[btn.type] = el; }}
            onClick={() => navigate(btn.route)}
            aria-label={`Vai a ${btn.label}`}
          >
            <img src={btn.src} alt={btn.label} className="icon-img" />
            <span className="icon-label">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Terminal logs stile "scientifico" per la pagina Database */}
      <DatabaseLogs />

      {/* Popups terminal-style effimeri attorno alle icone (non sovrapposti e senza bloccare input) */}
      <DatabasePopups
        anchors={{
          flora: btnRefs.current["flora"] || null,
          fauna: btnRefs.current["fauna"] || null,
          dossier: btnRefs.current["dossier"] || null,
        }}
      />
    </div>
  );
}
