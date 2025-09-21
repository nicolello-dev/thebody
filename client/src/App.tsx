// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import HomePage from "./components/homepage";
import MonitorWidget from "./components/monitorwidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faCompress } from "@fortawesome/free-solid-svg-icons";
import "./components/homepage.css";

export default function App() {
  // valori base
  const [healthValue] = useState(0.6);
  const [hungerValue] = useState(0.5);
  const [thirstValue] = useState(0.4);

  // stato di clima e temperatura
  const [climate, setClimate] = useState<-2 | -1 | 0 | 1 | 2>(0);
  const [temperature, setTemperature] = useState<number>(20);

  // fullscreen tracking
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // oscillazione
  const dirRef = useRef<number>(Math.random() > 0.5 ? 1 : -1);
  const transitioningRef = useRef(false);

  const ranges: Record<number, [number, number]> = {
    [-2]: [-5, 5],
    [-1]: [5, 15],
    [0]: [15, 25],
    [1]: [25, 35],
    [2]: [35, 45],
  };

  // logica temperatura
  useEffect(() => {
    const [min, max] = ranges[climate] ?? [15, 25];
    let target = min + Math.random() * (max - min);
    transitioningRef.current = true;

    const tick = 150; // ms
    const oscDelta = Math.max(0.08, (max - min) * 0.005);
    const transDelta = Math.max(0.2, (max - min) * 0.05);

    const id = window.setInterval(() => {
      setTemperature((prev) => {
        if (transitioningRef.current) {
          // transizione rapida
          let step = transDelta * (target > prev ? 1 : -1);
          let next = prev + step;

          if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
            next = target;
            transitioningRef.current = false;
          }
          return next;
        } else {
          // oscillazione casuale
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

  // fullscreen toggle
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
      {/* MonitorWidget overlay */}
      <div className="monitor-widget-fixed" aria-hidden={false}>
        <MonitorWidget
          healthValue={healthValue}
          hungerValue={hungerValue}
          thirstValue={thirstValue}
          temperature={temperature}
          size={200}
          strokeWidth={12}
          color="#dfffff"
          backgroundColor="#10233d"
        />
      </div>

      {/* pulsante fullscreen */}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 4000,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            zIndex: 4500,
          }}
        >
          <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
        </button>
      </div>

      {/* pulsanti temporanei per cambiare clima */}
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

      {/* pagina principale */}
      <HomePage />
    </div>
  );
}
