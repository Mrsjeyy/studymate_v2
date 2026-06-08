import { useState } from "react";
import { toISODate } from "../utils/dates";
import { getWeekActivity } from "../utils/activity";

export default function WeeklyActivityChart({ activityData = {} }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const data = getWeekActivity(activityData, weekOffset);

  const todayStr = toISODate();
  const pastData = data.filter(d => d.date <= todayStr);
  const maxVal = Math.max(...pastData.map(d => d.count), 50);
  const Y_STEP = 10;
  const chartMax = Math.ceil(maxVal / Y_STEP) * Y_STEP;

  const W = 500, H = 160, PL = 30, PR = 12, PT = 12, PB = 22;
  const LABEL_H = 14;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB - LABEL_H;

  const points = data.map((d, i) => ({
    x: PL + (i / 6) * chartW,
    y: PT + LABEL_H + chartH - (d.count / chartMax) * chartH,
    isFuture: d.date > todayStr,
    ...d,
  }));

  const pastPoints = points.filter(p => !p.isFuture);

  const baseY = PT + LABEL_H + chartH;

  const smoothPath = (pts) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    return pts.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cp1x = prev.x + (p.x - (pts[i - 2]?.x ?? prev.x)) / 6;
      const cp1y = Math.min(prev.y + (p.y - (pts[i - 2]?.y ?? prev.y)) / 6, baseY);
      const cp2x = p.x - ((pts[i + 1]?.x ?? p.x) - prev.x) / 6;
      const cp2y = Math.min(p.y - ((pts[i + 1]?.y ?? p.y) - prev.y) / 6, baseY);
      return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p.x} ${p.y}`;
    }).join(" ");
  };

  const pathD = smoothPath(pastPoints);
  const areaD = pastPoints.length > 1
    ? `${pathD} L ${pastPoints[pastPoints.length - 1].x} ${baseY} L ${pastPoints[0].x} ${baseY} Z`
    : "";

  const monday = (() => {
    const today = new Date();
    const d = new Date(today);
    d.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    return d;
  })();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;
  const yTicks = Array.from({ length: chartMax / Y_STEP + 1 }, (_, i) => i * Y_STEP);

  return (
    <div className="sm-panel-soft" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Lernverlauf der letzten Woche</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: "var(--surface-strong)", border: "none", color: "#94a3b8", borderRadius: 6, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontSize: 12, color: "#64748b", minWidth: 100, textAlign: "center" }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset >= 0} style={{ background: "var(--surface-strong)", border: "none", color: weekOffset >= 0 ? "#334155" : "#94a3b8", borderRadius: 6, width: 26, height: 26, cursor: weekOffset >= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }}>
        {yTicks.map(v => {
          const y = PT + LABEL_H + chartH - (v / chartMax) * chartH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--surface-border-soft)" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="8" fill="#475569">{v}</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.01" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={PL} y={PT} width={chartW} height={LABEL_H + chartH} />
          </clipPath>
        </defs>
        {areaD && <path d={areaD} fill="url(#areaGrad)" clipPath="url(#chartClip)" />}
        {pathD && <path d={pathD} fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" clipPath="url(#chartClip)" />}
        {points.map((p, i) => (
          <g key={i}>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill={p.isFuture ? "#2d3748" : "#475569"}>{p.label}</text>
            {!p.isFuture && <circle cx={p.x} cy={p.y} r="3.5" fill="#00d4aa" />}
            {!p.isFuture && p.count > 0 && <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#00d4aa">{p.count}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
