// src/components/monitorwidget.tsx
import React from "react";

interface MonitorWidgetProps {
  healthValue?: number;    // 0..1
  hungerValue?: number;    // 0..1
  thirstValue?: number;    // 0..1
  size?: number;           // px
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  temperature?: number;    // °C
}

export default function MonitorWidget({
  healthValue = 0.65,
  hungerValue = 0.5,
  thirstValue = 0.7,
  size = 200,
  strokeWidth = 10,
  color = "#00ffcc",
  backgroundColor = "#333",
  temperature = 20,
}: MonitorWidgetProps) {
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(healthValue, 0), 1));

  // image placements (relative to svg coordinates)
  const tempHeight = size * 1.2;
  const tempWidth = size * 0.5 * 1.2;
  const tempX = size / 2 - tempWidth + size * 0.01;
  const tempY = size / 2 - tempHeight / 2;

  const stomachHeight = size * 1.2;
  const stomachWidth = stomachHeight / 2;
  const stomachX = size / 2 - stomachWidth / 2 + size * 0.03;
  const stomachY = size / 2 - stomachHeight / 2;
  const correctedHungerValue = 0.27 + 0.45 * hungerValue;

  const dropletHeight = size * 0.3;
  const dropletWidth = dropletHeight * 0.6;
  const dropletX = size / 2 - size * 0.25;
  const dropletY = size / 2 - dropletHeight / 2 - size * 0.13;

  // clamp temperature and compute angle
  const minTemp = -5;
  const maxTemp = 45;
  const clampedTemp = Math.min(Math.max(temperature ?? 20, minTemp), maxTemp);
  const cursorValue = (clampedTemp - minTemp) / (maxTemp - minTemp); // 0..1
  const cursorAngleDeg = -180 + 180 * cursorValue; // degrees, -180..0

  // cursor geometry (scale with size)
  const cursorHeight = Math.max(12, Math.round(size * 0.10));
  const cursorWidth = Math.max(4, Math.round(size * 0.03));
  const cursorDistance = radius * 1.21;
  const cx = size / 2;
  const cy = size / 2;
  const cursorX = cx - cursorWidth / 2;
  const cursorY = cy - cursorDistance - cursorHeight / 2;

  // CSS style for the rotating group:
  // - transformBox: 'view-box' and transformOrigin: '50% 50%' guarantee rotation around SVG center
  // - transition provides smooth interpolation
  const gStyle: React.CSSProperties = {
    transformBox: "view-box",
    transformOrigin: "50% 50%",
    transform: `rotate(${cursorAngleDeg}deg)`,
    transition: "transform 0.18s linear",
    pointerEvents: "none",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* tempround image behind circle */}
      <image href="/tempround.png" x={tempX} y={tempY} width={tempWidth} height={tempHeight} />

      {/* circle background */}
      <circle cx={cx} cy={cy} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} fill="none" />

      {/* health arc */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
      />

      {/* stomach base + fill */}
      <image href="/stomach-base.png" x={stomachX} y={stomachY} width={stomachWidth} height={stomachHeight} />
      <image
        href="/stomach-fill.png"
        x={stomachX}
        y={stomachY}
        width={stomachWidth}
        height={stomachHeight}
        style={{ clipPath: `inset(${(1 - correctedHungerValue) * 100}% 0 0 0)` }}
      />

      {/* droplet base + fill */}
      <image href="/droplet_base.png" x={dropletX} y={dropletY} width={dropletWidth} height={dropletHeight} />
      <image
        href="/droplet_fill.png"
        x={dropletX}
        y={dropletY}
        width={dropletWidth}
        height={dropletHeight}
        style={{ clipPath: `inset(${(1 - thirstValue) * 100}% 0 0 0)` }}
      />

      {/* rotating cursor group: rotate around center of viewBox */}
      <g style={gStyle}>
        <rect x={cursorX} y={cursorY} width={cursorWidth} height={cursorHeight} rx={2} ry={2} fill="#dfffff" />
      </g>
    </svg>
  );
}
