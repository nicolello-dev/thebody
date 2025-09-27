import React, { useEffect, useRef, useState } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./components/homepage";
import MonitorWidget from "./components/monitorwidget";
import ScreenRouter from "./components/screenrouter";
import Inventory from "./routes/inventory";
import Database from "./routes/database";
import Crafting from "./routes/crafting";
import MapPage from "./routes/map";
import User from "./routes/user";

// nuove pagine collegate alle icone del Database
import Flora from "./routes/flora";
import Fauna from "./routes/fauna";
import Recipes from "./routes/recipes";
import Dossier from "./routes/dossier";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faCompress } from "@fortawesome/free-solid-svg-icons";
import "./components/homepage.css";

export default function App() {
  // valori globali condivisi
  const [healthValue] = useState(0.6);
  const [hungerValue] = useState(0.5);
  const [thirstValue] = useState(0.4);

  // posizione centro cerchio (for selectbg clip)
  const [circleCenterX, setCircleCenterX] = useState<number | null>(null);

  // temperatura e clima
  const [climate, setClimate] = useState<-2 | -1 | 0 | 1 | 2>(0);
  const [temperature, setTemperature] = useState<number>(20);

  // fullscreen container (unico)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // oscillazione temp
  const dirRef = useRef<number>(Math.random() > 0.5 ? 1 : -1);
  const transitioningRef = useRef(false);

  const ranges: Record<number, [number, number]> = {
    [-2]: [-5, 5],
    [-1]: [5, 15],
    [0]: [15, 25],
    [1]: [25, 35],
    [2]: [35, 45],
  };

  useEffect(() => {
    const [min, max] = ranges[climate] ?? [15, 25];
    let target = min + Math.random() * (max - min);
    transitioningRef.current = true;

    const tick = 150;
    const oscDelta = Math.max(0.08, (max - min) * 0.005);
    const transDelta = Math.max(0.2, (max - min) * 0.05);

    const id = window.setInterval(() => {
      setTemperature((prev) => {
        if (transitioningRef.current) {
          let step = transDelta * (target > prev ? 1 : -1);
          let next = prev + step;
          if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
            next = target;
            transitioningRef.current = false;
          }
          return next;
        } else {
          const jitter = (Math.random() - 0.5) * oscDelta * 0.5;
          let next = prev + dirRef.current * oscDelta + jitter;
          const margin = (max - min) * 0.05;
          if (next > max - margin) {
            next = Math.min(next, max);
            if (Math.random() < 0.8) dirRef.current = -1;
          } else if (next < min + margin) {
            next = Math.max(next, min);
            if (Math.random() < 0.8) dirRef.current = 1;
          } else {
            if (Math.random() < 0.03) dirRef.current *= -1;
          }
          return Math.min(Math.max(next, min), max);
        }
      });
    }, tick);

    return () => window.clearInterval(id);
  }, [climate]);

  // fullscreen handlers
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // state attivo per il menu (può mostrare active icon)
  const [activeSection, setActiveSection] = useState<
    "inventario" | "database" | "crafting" | "mappa" | "utente" | null
  >(null);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* selectbg clip (si aggiorna quando MonitorWidget chiama onCenterChange) */}
      <div
        className="select-overlay-clip"
        style={{ width: circleCenterX ? `${circleCenterX}px` : "50vw", zIndex: 100 }}
        aria-hidden
      >
        <img src="/selectbg.png" alt="Select Background" className="select-overlay" />
      </div>

      {/* MonitorWidget - unico, fisso */}
      <div className="monitor-widget-fixed" aria-hidden={false} style={{ zIndex: 2500 }}>
        <MonitorWidget
          healthValue={healthValue}
          hungerValue={hungerValue}
          thirstValue={thirstValue}
          temperature={temperature}
          size={200}
          strokeWidth={12}
          color="#dfffff"
          backgroundColor="#10233d"
          onCenterChange={(x: number) => setCircleCenterX(x)}
        />
      </div>

      {/* ScreenRouter (toggle + icons) */}
      <div style={{ zIndex: 3000 }}>
        <ScreenRouter activeSection={activeSection as any} setActiveSection={(k) => setActiveSection(k)} />
      </div>

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="fullscreen-toggle"
        style={{ zIndex: 4000 }}
      >
        <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
      </button>

      {/* Climatic quick buttons */}
      <div
        style={{
          position: "fixed",
          bottom: 72,
          right: 12,
          zIndex: 4000,
          display: "flex",
          gap: 6,
        }}
      >
        {([-2, -1, 0, 1, 2] as const).map((c) => (
          <button
            key={c}
            onClick={() => {
              dirRef.current = Math.random() > 0.5 ? 1 : -1;
              setClimate(c);
            }}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: c === climate ? "rgba(255,255,255,0.12)" : "transparent",
              color: "white",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Router */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route
          path="/database"
          element={
            <Database
              healthValue={healthValue}
              hungerValue={hungerValue}
              thirstValue={thirstValue}
              temperature={temperature}
              circleCenterX={circleCenterX}
              onCenterChange={(x: number) => setCircleCenterX(x)}
            />
          }
        />
        <Route path="/crafting" element={<Crafting />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/user" element={<User />} />

        {/* nuove route per icone database */}
        <Route path="/flora" element={<Flora />} />
        <Route path="/fauna" element={<Fauna />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/dossier" element={<Dossier />} />
      </Routes>
    </div>
  );
}
