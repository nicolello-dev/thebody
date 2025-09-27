import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLungs,
  faMoon,
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "../hooks/useUser";

interface MonitorWidgetProps {
  healthValue?: number; // 0..1
  hungerValue?: number; // 0..1
  thirstValue?: number; // 0..1
  oxygenValue?: number; // 0..1
  sleepValue?: number; // 0..1
  condition?: string; // ok | infection.. | etc.
  size?: number; // px (cerchio principale)
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  temperature?: number; // °C
  onCenterChange?: (x: number) => void; // viewport x of circle center
}

export default function MonitorWidget({
  condition = "ok",
  size = 200,
  strokeWidth = 10,
  color = "#dfffff",
  backgroundColor = "#333",
  temperature,
  onCenterChange,
  healthValue: propHealth,
  hungerValue: propHunger,
  thirstValue: propThirst,
  oxygenValue: propOxygen,
  sleepValue: propSleep,
}: MonitorWidgetProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const user = useUser?.(); // if hook exists
  // prefer props, otherwise fallback to user values (if available), otherwise defaults
  const healthValue = typeof propHealth === "number"
    ? propHealth
    : user?.biofeedback ? user.biofeedback / 100 : 0.6;
  const hungerValue = typeof propHunger === "number"
    ? propHunger
    : user?.hunger ? user.hunger / 100 : 0.5;
  const thirstValue = typeof propThirst === "number"
    ? propThirst
    : user?.thirst ? user.thirst / 100 : 0.5;
  const oxygenValue = typeof propOxygen === "number"
    ? propOxygen
    : user?.oxygen ? user.oxygen / 100 : 0.9;
  const sleepValue = typeof propSleep === "number"
    ? propSleep
    : user?.sleep ? user.sleep / 100 : 0.8;

  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(healthValue, 0), 1));

  // temperature cursor
  const minTemp = -5;
  const maxTemp = 45;
  const clampedTemp = Math.min(Math.max((typeof temperature === "number" ? temperature : (user?.temperature ?? 20)), minTemp), maxTemp);
  const cursorValue = (clampedTemp - minTemp) / (maxTemp - minTemp);
  const cursorAngleDeg = -180 + 180 * cursorValue;

  const cursorHeight = Math.max(12, Math.round(size * 0.1));
  const cursorWidth = Math.max(4, Math.round(size * 0.03));
  const cursorDistance = radius * 1.21;
  const cursorX = cx - cursorWidth / 2;
  const cursorY = cy - cursorDistance - cursorHeight / 2;

  const gStyle: React.CSSProperties = {
    transformBox: "view-box",
    transformOrigin: "50% 50%",
    transform: `rotate(${cursorAngleDeg}deg)`,
    transition: "transform 0.18s linear",
    pointerEvents: "none",
  };

  // mini crowns
  const miniSize = size / 3.25;
  const miniStroke = strokeWidth / 3;
  const miniRadius = (miniSize - miniStroke) / 2;
  const miniCirc = 2 * Math.PI * miniRadius;
  const oxygenOffset = miniCirc * (1 - Math.min(Math.max(oxygenValue, 0), 1));
  const sleepOffset = miniCirc * (1 - Math.min(Math.max(sleepValue, 0), 1));

  const isOk = condition === "ok";
  const conditionColor = isOk ? color : "red";
  const conditionIcon = isOk ? faCircleCheck : faTriangleExclamation;

  const spacing = miniSize * 1.7;
  const miniBaseX = size * 1.03;
  const miniBaseY = cy - spacing;

  // measure center in viewport and call onCenterChange
  useEffect(() => {
    if (!svgRef.current) return;
    const update = () => {
      const rect = svgRef.current!.getBoundingClientRect();
      // fraction of svg coordinate
      const fraction = cx / size;
      const centerXViewport = rect.left + rect.width * fraction;
      if (typeof onCenterChange === "function") {
        onCenterChange(Math.round(centerXViewport));
      }
    };

    update();

    const ro = new ResizeObserver(() => window.requestAnimationFrame(update));
    ro.observe(svgRef.current);

    const onScroll = () => window.requestAnimationFrame(update);
    const onResize = () => window.requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [cx, size, onCenterChange]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* goodplacer behind the circle */}
      <image
        href="/goodplacer.png"
        x={cx}
        y={cy - (size * 1.5) / 2}
        height={size * 1.5}
        preserveAspectRatio="xMinYMin meet"
        style={{ pointerEvents: "none" }}
      />

      {/* main ring */}
      <image
        href="/tempround.png"
        x={size / 2 - size * 0.5 * 1.2 + size * 0.01}
        y={size / 2 - size * 1.2 / 2}
        width={size * 0.5 * 1.2}
        height={size * 1.2}
      />

      <circle cx={cx} cy={cy} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} fill="none" />
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

      {/* stomach images */}
      <image
        href="/stomach-base.png"
        x={size / 2 - (size * 1.2) / 2 / 2 + size * 0.03}
        y={size / 2 - size * 1.2 / 2}
        width={(size * 1.2) / 2}
        height={size * 1.2}
      />
      <image
        href="/stomach-fill.png"
        x={size / 2 - (size * 1.2) / 2 / 2 + size * 0.03}
        y={size / 2 - size * 1.2 / 2}
        width={(size * 1.2) / 2}
        height={size * 1.2}
        style={{ clipPath: `inset(${(1 - (0.27 + 0.45 * hungerValue)) * 100}% 0 0 0)` }}
      />

      {/* droplet */}
      <image
        href="/droplet_base.png"
        x={size / 2 - size * 0.25}
        y={size / 2 - (size * 0.3) / 2 - size * 0.13}
        width={size * 0.3 * 0.6}
        height={size * 0.3}
      />
      <image
        href="/droplet_fill.png"
        x={size / 2 - size * 0.25}
        y={size / 2 - (size * 0.3) / 2 - size * 0.13}
        width={size * 0.3 * 0.6}
        height={size * 0.3}
        style={{ clipPath: `inset(${(1 - thirstValue) * 100}% 0 0 0)` }}
      />

      {/* temperature cursor */}
      <g style={gStyle}>
        <rect x={cursorX} y={cursorY} width={cursorWidth} height={cursorHeight} rx={2} ry={2} fill={color} />
      </g>

      {/* mini crowns */}
      <g>
        {/* oxygen */}
        <g transform={`translate(${miniBaseX}, ${miniBaseY})`}>
          <circle cx={0} cy={0} r={miniRadius} stroke="#10233d" strokeWidth={miniStroke} fill="none" />
          <circle
            cx={0}
            cy={0}
            r={miniRadius}
            stroke={color}
            strokeWidth={miniStroke}
            fill="none"
            strokeDasharray={miniCirc}
            strokeDashoffset={oxygenOffset}
            transform="rotate(-90)"
          />
          <foreignObject x={-miniSize / 2} y={-miniSize / 2} width={miniSize} height={miniSize}>
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${miniSize * 0.5}px`,
              lineHeight: 1
            }}>
              <FontAwesomeIcon icon={faLungs} style={{ color, width: "1em", height: "1em" }} />
            </div>
          </foreignObject>
        </g>

        {/* sleep */}
        <g transform={`translate(${miniBaseX * 1.2}, ${miniBaseY + spacing})`}>
          <circle cx={0} cy={0} r={miniRadius} stroke="#10233d" strokeWidth={miniStroke} fill="none" />
          <circle
            cx={0}
            cy={0}
            r={miniRadius}
            stroke={color}
            strokeWidth={miniStroke}
            fill="none"
            strokeDasharray={miniCirc}
            strokeDashoffset={sleepOffset}
            transform="rotate(-90)"
          />
          <foreignObject x={-miniSize / 2} y={-miniSize / 2} width={miniSize} height={miniSize}>
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${miniSize * 0.5}px`,
              lineHeight: 1
            }}>
              <FontAwesomeIcon icon={faMoon} style={{ color, width: "1em", height: "1em" }} />
            </div>
          </foreignObject>
        </g>

        {/* biofeedback */}
        <g transform={`translate(${miniBaseX}, ${miniBaseY + spacing * 2})`}>
          <circle cx={0} cy={0} r={miniRadius} stroke="#10233d" strokeWidth={miniStroke} fill="none" />
          <circle
            cx={0}
            cy={0}
            r={miniRadius}
            stroke={conditionColor}
            strokeWidth={miniStroke}
            fill="none"
            strokeDasharray={miniCirc}
            strokeDashoffset={0}
            transform="rotate(-90)"
          />
          <foreignObject x={-miniSize / 2} y={-miniSize / 2} width={miniSize} height={miniSize}>
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${miniSize * 0.5}px`,
              lineHeight: 1
            }}>
              <FontAwesomeIcon icon={conditionIcon} style={{ color: conditionColor, width: "1em", height: "1em" }} />
            </div>
          </foreignObject>
        </g>
      </g>

    </svg>
  );
}
