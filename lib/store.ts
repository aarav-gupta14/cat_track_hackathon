import fs from "node:fs";
import path from "node:path";
import { createSeed } from "./seed";
import type { LogEntry, LogKind, Store } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "memory.json");

export function loadStore(): Store {
  if (!fs.existsSync(STORE_PATH)) return resetStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Store;
}

export function saveStore(store: Store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function resetStore(): Store {
  const store = createSeed();
  recomputeInsights(store);
  saveStore(store);
  return store;
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function addLog(store: Store, kind: LogKind, machineId: string, text: string, textEs?: string): LogEntry {
  const entry: LogEntry = { id: newId("log"), at: new Date().toISOString(), kind, machineId, text, textEs };
  store.log.push(entry);
  if (store.log.length > 200) store.log = store.log.slice(-200);
  return entry;
}

export function recomputeInsights(store: Store) {
  const modelOf = new Map(store.machines.map((m) => [m.id, m.model]));
  const groups = new Map<string, Map<string, number>>();
  for (const e of store.events) {
    if (!e.actualCause || !e.faultCode) continue;
    const model = modelOf.get(e.machineId);
    if (!model) continue;
    const key = `${model}|${e.faultCode}`;
    const counts = groups.get(key) ?? new Map<string, number>();
    counts.set(e.component, (counts.get(e.component) ?? 0) + 1);
    groups.set(key, counts);
  }
  const now = new Date().toISOString();
  store.insights = [...groups.entries()].map(([key, counts]) => {
    const [model, faultCode] = key.split("|");
    const causes = [...counts.entries()]
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count);
    const total = causes.reduce((s, c) => s + c.count, 0);
    const top = causes[0];
    const others = causes.slice(1).map((c) => `${c.component} ${c.count}`).join(", ");
    const text =
      `On ${model} machines, ${faultCode} was traced to the ${top.component} in ${top.count} of ${total} resolved case${total === 1 ? "" : "s"}` +
      (others ? ` (also: ${others}).` : ".");
    return { id: `ins-${model}-${faultCode}`, model, faultCode, causes, total, text, updatedAt: now };
  });
}
