"use client";

import { fmtDate } from "@/lib/text";
import type { Machine, MemoryEvent } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  fault: "#ff6b6b",
  repair: "#3ecf8e",
  inspection: "#4ea1ff",
  observation: "#b28cff",
  diagnosis: "#ffcd11",
  note: "#8a94a3",
};

const W = 640;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const R_COMPONENT = 115;
const R_EVENT = 195;
const SQUASH = 0.82;

function polar(r: number, angle: number) {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) * SQUASH };
}

export default function MemoryMap({ machine, events, freshIds }: { machine: Machine; events: MemoryEvent[]; freshIds: Set<string> }) {
  const components = [...new Set(events.map((e) => e.component))];
  const slice = (2 * Math.PI) / Math.max(components.length, 1);
  const compAngle = new Map(components.map((c, i) => [c, -Math.PI / 2 + i * slice]));
  const compPos = new Map(components.map((c) => [c, polar(R_COMPONENT, compAngle.get(c)!)]));

  const eventNodes = components.flatMap((c) => {
    const group = events.filter((e) => e.component === c).sort((a, b) => a.date.localeCompare(b.date));
    const spread = Math.min(0.24, (slice * 0.8) / Math.max(group.length, 1));
    return group.map((e, j) => ({ e, ...polar(R_EVENT, compAngle.get(c)! + (j - (group.length - 1) / 2) * spread) }));
  });

  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Memory map for ${machine.id}`}>
        {components.map((c) => {
          const p = compPos.get(c)!;
          return <line key={`mc-${c}`} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#262c35" strokeWidth={2} />;
        })}

        {eventNodes.map(({ e, x, y }) => {
          const p = compPos.get(e.component)!;
          return <line key={`ce-${e.id}`} x1={p.x} y1={p.y} x2={x} y2={y} stroke="#262c35" strokeWidth={1} />;
        })}

        {eventNodes
          .filter(({ e }) => e.hypothesis && e.hypothesis !== e.component && compPos.has(e.hypothesis))
          .map(({ e, x, y }) => {
            const h = compPos.get(e.hypothesis!)!;
            return (
              <line key={`h-${e.id}`} x1={x} y1={y} x2={h.x} y2={h.y} stroke="#ff6b6b" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7}>
                <title>Ruled out: {e.hypothesis}</title>
              </line>
            );
          })}

        <circle cx={CX} cy={CY} r={38} fill="#161a20" stroke="#ffcd11" strokeWidth={2.5} />
        <text x={CX} y={CY - 2} textAnchor="middle" fill="#ffcd11" fontSize={13} fontWeight={700} fontFamily="monospace">
          {machine.id}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill="#8a94a3" fontSize={10}>
          {machine.model} · {machine.hours.toLocaleString()} h
        </text>

        {components.map((c) => {
          const p = compPos.get(c)!;
          return (
            <g key={`c-${c}`}>
              <circle cx={p.x} cy={p.y} r={10} fill="#1d222a" stroke="#8a94a3" strokeWidth={1.5} />
              <text x={p.x} y={p.y + 24} textAnchor="middle" fill="#e6e8eb" fontSize={11}>
                {c}
              </text>
            </g>
          );
        })}

        {eventNodes.map(({ e, x, y }) => {
          const fresh = freshIds.has(e.id);
          return (
            <g key={`e-${e.id}`}>
              {fresh && (
                <circle cx={x} cy={y} r={8} fill="none" stroke="#ffcd11" strokeWidth={2}>
                  <animate attributeName="r" from="8" to="22" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="1" to="0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={x}
                cy={y}
                r={e.photo ? 9 : 7}
                fill={TYPE_COLORS[e.type] ?? "#8a94a3"}
                stroke={e.actualCause ? "#ffcd11" : "#0d0f12"}
                strokeWidth={e.actualCause ? 2.5 : 1.5}
              >
                <title>
                  {fmtDate(e.date)} · {e.type} · {e.component}: {e.summary}
                  {e.actualCause ? ` | Cause: ${e.actualCause}` : ""}
                </title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type}>
            <i style={{ background: color }} />
            {type}
          </span>
        ))}
        <span>
          <i style={{ background: "transparent", border: "2px solid #ffcd11" }} />
          root cause found
        </span>
        <span style={{ color: "#ff6b6b" }}>- - ruled out</span>
      </div>
    </div>
  );
}
