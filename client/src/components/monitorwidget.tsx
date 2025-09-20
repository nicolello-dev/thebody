import React from "react";

interface MonitorWidgetProps {
  value?: number;        // percentuale 0-1
  size?: number;         // diametro in px
  strokeWidth?: number;  // spessore arco
  color?: string;        // colore arco
  backgroundColor?: string; // colore sfondo cerchio
}

export default function monitorwidget({
  value = 0.65,
  size = 200,
  strokeWidth = 10,
  color = "#00ffcc",
  backgroundColor = "#333",
}: MonitorWidgetProps) {
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(value, 0), 1));

  return (
    <svg
      width={size}
      height={size}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Sfondo cerchio */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Arco percentuale */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
