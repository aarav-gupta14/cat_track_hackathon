"use client";

import { useEffect, useRef, useState } from "react";
import MemoryMap from "@/components/MemoryMap";
import { fmtDate } from "@/lib/text";
import type { Insight, LogEntry, Machine, MemoryEvent, UserProfile } from "@/lib/types";

interface Snapshot {
  machine: Machine;
  machines: { id: string; model: string; type: string }[];
  events: MemoryEvent[];
  insights: Insight[];
  users: UserProfile[];
  log: LogEntry[];
  aiEnabled: boolean;
}

const POLL_MS = 1500;
const FRESH_MS = 20000;

export default function DashboardPage() {
  const [machineId, setMachineId] = useState("CAT-4821");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seen = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    setMachineId(localStorage.getItem("ct-machine") ?? "CAT-4821");
  }, []);

  useEffect(() => {
    let cancelled = false;
    seen.current = null;
    async function load() {
      const res = await fetch(`/api/machines/${machineId}`, { cache: "no-store" });
      const data: Snapshot = await res.json();
      if (cancelled) return;
      const now = Date.now();
      const ids = [...data.events.map((e) => e.id), ...data.log.map((l) => l.id), ...data.machine.facts.map((f) => f.id)];
      if (!seen.current) {
        seen.current = new Map(ids.map((id) => [id, 0]));
      } else {
        for (const id of ids) if (!seen.current.has(id)) seen.current.set(id, now);
      }
      setFreshIds(new Set([...seen.current.entries()].filter(([, t]) => now - t < FRESH_MS).map(([id]) => id)));
      setSnap(data);
    }
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [machineId]);

  async function reset() {
    if (!confirm("Reset all memory to the demo seed data?")) return;
    await fetch("/api/reset", { method: "POST" });
    seen.current = null;
  }

  if (!snap) return <main className="landing">Loading machine memory...</main>;
  const { machine, events, insights, users, log } = snap;
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  return (
    <main className="dash">
      <header className="dash-header">
        <h1>
          Déjà<span>View</span> · Machine Memory
        </h1>
        <select
          className="select"
          value={machineId}
          onChange={(e) => {
            setMachineId(e.target.value);
            localStorage.setItem("ct-machine", e.target.value);
          }}
        >
          {snap.machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id} · {m.model} {m.type}
            </option>
          ))}
        </select>
        <span className="chip">{snap.aiEnabled ? "AI mode (Gemini)" : "Demo mode"}</span>
        <div className="spacer" />
        <a className="btn" href="/glasses" target="_blank" rel="noreferrer">
          Open glasses view ↗
        </a>
        <button className="btn" onClick={reset}>
          Reset demo
        </button>
      </header>

      <section className="col">
        <div className="panel">
          <h3>Machine memory</h3>
          <div className="machine-id">{machine.id}</div>
          <div className="stat">
            {machine.model} {machine.type}
          </div>
          <div className="stat">🏗 {machine.hours.toLocaleString()} operating hours</div>
          <div className="stat muted">{machine.site}</div>
          <div style={{ marginTop: 8 }}>
            {machine.environment.map((e) => (
              <span key={e} className="chip">
                {e}
              </span>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Permanent facts</h3>
          <ul className="list">
            {machine.facts.map((f) => (
              <li key={f.id} className={freshIds.has(f.id) ? "feed-item fresh" : undefined}>
                {f.text}
              </li>
            ))}
            {!machine.facts.length && <li className="muted">No facts yet</li>}
          </ul>
        </div>

        <div className="panel">
          <h3>🧠 Fleet memory · {machine.model} machines</h3>
          {insights.map((ins) => (
            <div key={ins.id} className="insight">
              <b>{ins.faultCode}</b>: {ins.text}
              {ins.causes.map((c) => (
                <div key={c.component}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                    <span>{c.component}</span>
                    <span className="muted">
                      {c.count}/{ins.total}
                    </span>
                  </div>
                  <div className="bar">
                    <div style={{ width: `${(c.count / ins.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!insights.length && <div className="muted">No learned patterns yet</div>}
        </div>

        <div className="panel">
          <h3>👷 Human memory</h3>
          {users.map((u) => (
            <div key={u.id} style={{ marginBottom: 12 }}>
              <div>
                <b>{u.name}</b> <span className="muted">· {u.role}</span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {u.experience === "new" ? "New technician" : `${u.years} yrs experience`} · speaks {u.language === "es" ? "Spanish" : "English"}
              </div>
              <div>
                {u.preferences.map((p) => (
                  <span key={p} className="chip">
                    {p}
                  </span>
                ))}
                {Object.entries(u.interests).map(([sys, n]) => (
                  <span key={sys} className="chip">
                    asks about {sys} ×{n}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col">
        <div className="panel">
          <h3>Memory map</h3>
          <MemoryMap machine={machine} events={events} freshIds={freshIds} />
        </div>
        <div className="panel">
          <h3>Episodic memory · life story</h3>
          {events.map((e) => (
            <div key={e.id} className={`timeline-item ${freshIds.has(e.id) ? "live feed-item fresh" : ""}`}>
              <div className="date">
                {fmtDate(e.date)}
                <br />
                <span className={`badge badge-${e.type === "fault" ? "learn" : e.type === "repair" ? "add" : "retrieve"}`}>{e.type}</span>
              </div>
              <div>
                <div>
                  <b>{e.component}</b>
                  {e.faultCode && <span className="muted"> · {e.faultCode}</span>}
                  <span className="muted"> · {nameOf(e.technicianId)}</span>
                </div>
                <div>{e.summary}</div>
                {e.hypothesis && e.hypothesis !== e.component && (
                  <div>
                    Suspected: <span className="ruled-out">{e.hypothesis}</span>
                  </div>
                )}
                {e.actualCause && <div className="cause">Root cause: {e.actualCause}</div>}
                {e.action && <div className="muted">Action: {e.action}</div>}
                {e.outcome && <div className="muted">Outcome: {e.outcome}</div>}
                {e.photo && <img src={e.photo} alt={e.photoCaption ?? "Memory photo"} />}
                {!e.photo && e.photoCaption && <div className="muted">📷 {e.photoCaption}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="col">
        <div className="panel" style={{ flex: 1 }}>
          <h3>Live memory feed</h3>
          {log.map((l) => (
            <div key={l.id} className={`feed-item ${freshIds.has(l.id) ? "fresh" : ""}`}>
              <span className={`badge badge-${l.kind}`}>{l.kind}</span>
              <time>{new Date(l.at).toLocaleTimeString()}</time>
              <div>{l.text}</div>
            </div>
          ))}
          {!log.length && <div className="muted">Ask or log something in the glasses view to watch memories being written here.</div>}
        </div>
      </section>
    </main>
  );
}
