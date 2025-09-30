import React, { useEffect, useState } from "react";
import "../components/homepage.css";
import "../components/fauna.css";
import "../components/flora.css";

// Converte il nome risorsa in un filename: spazi -> trattini, minuscole, rimuove accenti/simboli
const slugifyFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const floraData = {
  nome: "MEGATARASSA",
  slotPreDescrizione: [
    { label: "Significato", value: "Fiore dell'Aurora" },
    { label: "Ordine", value: "Rosales" },
    { label: "Famiglia", value: "Rosaceae" },
    { label: "Genus", value: "Rosa" },
    { label: "Tipo di seme", value: "Angiosperma" },
    { label: "Necessità d'acqua", value: "Media" },
    { label: "Necessità d'ossigeno", value: "Media" },
    { label: "Clima", value: "Temperato umido" },
  ],
  // Sezione sopravvivenza (6 elementi in scrollbar)
  resource1: { name: "Semi" },
  resource2: { name: "Foglia" },
  resource3: { name: "Corteccia" },
  resource4: { name: "Linfa" },
  resource5: { name: "Radici" },
  resource6: { name: "Pollini" },
};

export default function Flora() {
  // Overlay immagine come in Fauna
  const OVERLAY = "/megatarassa.png";
  const HOLO_MS = 680; // stessa durata dell'effetto holo di Fauna
  const [overlayHolo, setOverlayHolo] = useState(false);
  // Costante esposta: distanza dal fondo della pagina per la fine della scrollbar (in px)
  const FLORA_SCROLL_BOTTOM_OFFSET = 100;

  useEffect(() => {
    const img = new Image();
    img.src = OVERLAY;
    setOverlayHolo(true);
    const t = setTimeout(() => setOverlayHolo(false), HOLO_MS + 40);
    return () => clearTimeout(t);
  }, []);

  const resources = [
    floraData.resource1,
    floraData.resource2,
    floraData.resource3,
    floraData.resource4,
    floraData.resource5,
    floraData.resource6,
  ];
  const resourcesCount = resources.filter((r) => r).length;

  return (
    <div
      className="fauna-page flora-page"
      aria-live="polite"
      style={{ ["--flora-scroll-bottom-offset" as any]: `${FLORA_SCROLL_BOTTOM_OFFSET}px` }}
    >
      {/* sfondo griglia */}
      <img src="/bg-grid.png" className="fauna-grid" alt="grid overlay" />
      {/* overlay holo come in Fauna, stessa posizione/stile */}
      <img
        src={OVERLAY}
        className={`fauna-grid-overlay ${overlayHolo ? "holo" : ""}`}
        alt="overlay hologram"
      />
      {/* Contenitore principale (usa gli stili della pagina fauna) */}
      <div className="fauna-container">
        {/* Titolo */}
        <div className="fauna-title">
          <div className="title-wrapper">
            <img src="/bg-title.png" alt="title icon" />
            <div className="title-text">
              <h1>{floraData.nome}</h1>
            </div>
          </div>
        </div>

        {/* Lista slot (prima pagina) */}
        <div className="fauna-slots">
          {floraData.slotPreDescrizione.map((slot, idx) => (
            <div className="fauna-slot" key={idx}>
              <img src="/bg-slot.png" className="slot-bg" alt="slot bg" />
              <span className="slot-label">{slot.label.toUpperCase()}</span>
              <span className="slot-value">{String(slot.value).toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Sezione SOPRAVVIVENZA dalla pagina 2 incollata sotto (senza subtitle) */}
        {/* Slot risorse estraibili */}
        <div className="fauna-slots" style={{ marginTop: 5 }}>
          <div className="fauna-slot">
            <img src="/bg-slot.png" className="slot-bg" alt="slot bg" />
            <span className="slot-label">RISORSE ESTRAIBILI</span>
            <span className="slot-value">{resourcesCount}</span>
          </div>
        </div>
        {/* Scrollbar con 6 elementi, isolata tramite flora.css */}
        <div className="fauna-items-scroll">
          {resources.map((res, idx) => {
            const itemBg = res ? "/bg-item.png" : "/bg-noitem.png";
            const itemName = res ? res.name : "";
            const itemImg = res ? `/${slugifyFileName(itemName)}.png` : null;
            return (
              <div key={idx} className="fauna-item-slot">
                <img src={itemBg} className="item-bg" alt={itemName || "risorsa"} />
                {itemImg && <img src={itemImg} alt={itemName} className="item-icon" />}
                <div className="item-name">{itemName}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}