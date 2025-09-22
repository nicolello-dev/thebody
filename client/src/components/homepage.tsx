// src/components/homepage.tsx
import React, { useMemo } from "react";
import ScreenRouter from "./screenrouter";
import "./homepage.css";

const cardImages = [
  { key: "inventario", src: "/selectioncardinventory.png" },
  { key: "database", src: "/selectioncarddatabase.png" },
  { key: "crafting", src: "/selectioncardcrafting.png" },
  { key: "mappa", src: "/selectioncardmap.png" },
  { key: "utente", src: "/selectioncarduser.png" },
];

type SectionKey = "inventario" | "database" | "crafting" | "mappa" | "utente";

interface HomePageProps {
  circleCenterX?: number | null;
}

export default function HomePage({ circleCenterX }: HomePageProps) {
  const [section, setSection] = React.useState<SectionKey | null>(null);

  // clamp e fallback: se non abbiamo circleCenterX, fallback 50vw
  const clipWidthStyle = useMemo(() => {
    if (typeof circleCenterX === "number" && !Number.isNaN(circleCenterX)) {
      const clamped = Math.max(0, Math.min(window.innerWidth, Math.round(circleCenterX)));
      return { width: `${clamped}px` };
    } else {
      return { width: "50vw" };
    }
  }, [circleCenterX]);

  return (
    <div className="homepage-container">
      {/* overlay grafico posizionato sopra il background ma sotto i contenuti */}
      <div className="select-overlay-clip" style={clipWidthStyle} aria-hidden>
        <img src="/selectbg.png" alt="Select Background" className="select-overlay" />
      </div>

      {/* Menu a tendina */}
      <ScreenRouter activeSection={section} setActiveSection={setSection} />

      {/* Schede centrali */}
      <div className="selection-overlay">
        <div className="row top">
          {cardImages.slice(0, 3).map(card => (
            <div key={card.key} className="card">
              <img src={card.src} alt={card.key} className="card-bg" />
            </div>
          ))}
        </div>
        <div className="row bottom">
          {cardImages.slice(3).map(card => (
            <div key={card.key} className="card">
              <img src={card.src} alt={card.key} className="card-bg" />
            </div>
          ))}
        </div>
      </div>

      {/* Contenuto centrale */}
      <div className="central-content" role="main">
        <img src="/tarsazure.png" alt="TARS Logo" className="logo" />
      </div>
    </div>
  );
}
