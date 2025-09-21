import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faDatabase,
  faHammer,
  faMap,
  faUser,
  faList,
} from "@fortawesome/free-solid-svg-icons";
import "./homepage.css";
import { useNavigate } from "react-router";

type SectionKey = "inventario" | "database" | "crafting" | "mappa" | "utente";

export default function HomePage() {
  const [section, setSection] = useState<SectionKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const icons: { key: SectionKey; icon: any; href: string }[] = [
    { key: "inventario", icon: faBox, href: "inventory" },
    { key: "database", icon: faDatabase, href: "database" },
    { key: "crafting", icon: faHammer, href: "crafting" },
    { key: "mappa", icon: faMap, href: "map" },
    { key: "utente", icon: faUser, href: "user" },
  ];

  const onIconClick = (key: SectionKey) => {
    setSection(key);
    setMenuOpen(false); // retract menu immediately after selection
    navigate(icons.find((i) => i.key == key)?.href!);
  };

  return (
    <div className="homepage-container">
      {/* Toggle/menu */}
      <div className="toggle-container">
        <button
          className="circle toggle-circle"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          title="Menu"
        >
          <FontAwesomeIcon icon={faList} size="2x" />
        </button>

        <div className={`sliding-icons ${menuOpen ? "open" : ""}`} role="menu">
          {icons.map(({ key, icon }) => (
            <button
              key={key}
              className={`icon-container ${section === key ? "active" : ""}`}
              onClick={() => onIconClick(key)}
              aria-pressed={section === key}
            >
              <FontAwesomeIcon icon={icon} size="2x" />
            </button>
          ))}
        </div>
      </div>

      {/* central content (no "clicked" text) */}
      <div className="central-content" role="main">
        <img src="/tarsazure.png" alt="TARS Logo" className="logo" />
      </div>
    </div>
  );
}
