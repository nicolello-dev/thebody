import React, { useState } from "react";
import ScreenRouter from "./screenrouter";
import "./homepage.css";

type SectionKey = "inventario" | "database" | "crafting" | "mappa" | "utente";

export default function HomePage() {
  const [section, setSection] = useState<SectionKey | null>(null);

  return (
    <div className="homepage-container">
      {/* Menu a tendina */}
      <ScreenRouter activeSection={section} setActiveSection={setSection} />

      {/* Contenuto centrale */}
      <div className="central-content" role="main">
        <img src="/tarsazure.png" alt="TARS Logo" className="logo" />
      </div>
    </div>
  );
}
