import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faDatabase, faHammer, faMap, faUser, faList } from "@fortawesome/free-solid-svg-icons";
import MonitorWidget from "./monitorwidget";
import "./homepage.css";

type SectionKey = "inventario" | "database" | "crafting" | "mappa" | "utente";

export default function HomePage() {
  const [section, setSection] = useState<SectionKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const icons: { key: SectionKey; icon: any }[] = [
    { key: "inventario", icon: faBox },
    { key: "database", icon: faDatabase },
    { key: "crafting", icon: faHammer },
    { key: "mappa", icon: faMap },
    { key: "utente", icon: faUser },
  ];

  const monitorValue = 0.65; // 65% test

  return (
    <div className="homepage-container">
      {/* Toggle menu */}
      <div className="toggle-container">
        <div className="circle toggle-circle" onClick={() => setMenuOpen(!menuOpen)}>
          <FontAwesomeIcon icon={faList} size="2x" />
        </div>

        <div className={`sliding-icons ${menuOpen ? "open" : ""}`}>
          {icons.map(({ key, icon }) => (
            <button
              key={key}
              className={`icon-container ${section === key ? "active" : ""}`}
              onClick={() => {
                setSection(key);   // seleziona la sezione
                setMenuOpen(false); // chiude il menu
              }}
            >
              <FontAwesomeIcon icon={icon} size="2x" />
            </button>
          ))}
        </div>
      </div>

      {/* Monitor circolare a destra */}
      <div className="main-circle-container">
        <MonitorWidget
          value={monitorValue}
          size={200}
          strokeWidth={12}
          color="#00ffcc"
          backgroundColor="#10233d"
        />
      </div>

      {/* Contenuto centrale */}
      <div className="central-content">
        <img src="/tarsazure.png" alt="TARS Logo" className="logo" />
      </div>
    </div>
  );
}
