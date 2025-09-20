import React, { useRef, useState, useEffect } from "react";
import HomePage from "./components/homepage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faCompress } from "@fortawesome/free-solid-svg-icons";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen().catch((err) => console.error(err));
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch((err) => console.error(err));
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
        height: "100vh",
        width: "100vw",
        background: "url('/bg.png') no-repeat center center",
        backgroundSize: "cover",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Toggle fullscreen button */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          zIndex: 1000,
          background: "rgba(0,0,0,0.3)",
          border: "none",
          borderRadius: "50%",
          padding: "10px",
          cursor: "pointer",
          color: "white",
        }}
      >
        <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
      </button>

      <HomePage />
    </div>
  );
}
