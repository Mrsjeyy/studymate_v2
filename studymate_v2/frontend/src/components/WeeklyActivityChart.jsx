import { useState } from "react";
import { toISODate } from "../utils/dates";
import { getWeekActivity } from "../utils/activity";

export default function WeeklyActivityChart({ activityData = {} }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const data = getWeekActivity(activityData, weekOffset);

  const todayStr = toISODate();
  const pastData = data.filter(d => d.date <= todayStr);
  const maxVal = Math.max(...pastData.map(d => d.count), 1);

  const W = 500, H = 140, PL = 36, PR = 16, PT = 12, PB = 28;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const points = data.map((d, i) => ({
    x: PL + (i / 6) * chartW,
    y: PT + chartH - (d.count / maxVal) * chartH,
    isFuture: d.date > todayStr,
    ...d,
  }));

  const pastPoints = points.filter(p => !p.isFuture);

  /** Generates a smooth SVG cubic-bezier path through the given points (Catmull-Rom). */
  const smoothPath = (pts) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    return pts.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cp1x = prev.x + (p.x - (pts[i - 2]?.x ?? prev.x)) / 6;
      const cp1y = prev.y + (p.y - (pts[i - 2]?.y ?? prev.y)) / 6;
      const cp2x = p.x - ((pts[i + 1]?.x ?? p.x) - prev.x) / 6;
      const cp2y = p.y - ((pts[i + 1]?.y ?? p.y) - prev.y) / 6;
      return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p.x} ${p.y}`;
    }).join(" ");
  };

  const pathD = smoothPath(pastPoints);
  const areaD = pastPoints.length > 1
    ? `${pathD} L ${pastPoints[pastPoints.length - 1].x} ${PT + chartH} L ${pastPoints[0].x} ${PT + chartH} Z`
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
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>Lernverlauf der letzten Woche</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: "rgba(255,255,255,.06)", border: "none", color: "#94a3b8", borderRadius: 6, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontSize: 12, color: "#64748b", minWidth: 100, textAlign: "center" }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset >= 0} style={{ background: "rgba(255,255,255,.06)", border: "none", color: weekOffset >= 0 ? "#334155" : "#94a3b8", borderRadius: 6, width: 26, height: 26, cursor: weekOffset >= 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {yTicks.map(v => {
          const y = PT + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}
        {pathD && <path d={pathD} fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
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
