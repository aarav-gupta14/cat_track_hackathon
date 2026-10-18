import { findComponents } from "./text";
import type { Insight, MemoryEvent } from "./types";

export type Lang = "en" | "es";
type Gender = "m" | "f";

const COMPONENT_ES: Record<string, [string, Gender, boolean?]> = {
  "pressure sensor": ["sensor de presión", "m"],
  "hydraulic control valve": ["válvula de control hidráulica", "f"],
  "hydraulic line": ["línea hidráulica", "f"],
  "hydraulic pump": ["bomba hidráulica", "f"],
  "hydraulic cylinder": ["cilindro hidráulico", "m"],
  "hydraulic oil": ["aceite hidráulico", "m"],
  "coolant pump": ["bomba de refrigerante", "f"],
  "temperature sensor": ["sensor de temperatura", "m"],
  "cooling system": ["sistema de enfriamiento", "m"],
  "fan belt": ["correa del ventilador", "f"],
  engine: ["motor", "m"],
  "engine oil": ["aceite del motor", "m"],
  "air filter": ["filtro de aire", "m"],
  filters: ["filtros", "m", true],
  turbocharger: ["turbocompresor", "m"],
  exhaust: ["escape", "m"],
  "fuel system": ["sistema de combustible", "m"],
  battery: ["batería", "f"],
  alternator: ["alternador", "m"],
  starter: ["motor de arranque", "m"],
  "wiring harness": ["arnés de cables", "m"],
  lights: ["luces", "f", true],
  "cab display": ["pantalla de la cabina", "f"],
  undercarriage: ["tren de rodaje", "m"],
  "final drive": ["mando final", "m"],
  "swing system": ["sistema de giro", "m"],
  transmission: ["transmisión", "f"],
  brakes: ["frenos", "m", true],
  tires: ["llantas", "f", true],
  cab: ["cabina", "f"],
  bucket: ["cucharón", "m"],
  "pins and bushings": ["pasadores y bujes", "m", true],
  general: ["general", "m"],
};

function comp(name: string): [string, Gender, boolean] {
  const entry = COMPONENT_ES[name];
  return entry ? [entry[0], entry[1], Boolean(entry[2])] : [name, "m", false];
}

export function componentName(name: string, lang: Lang) {
  return lang === "es" ? comp(name)[0] : name;
}

/** "el sensor", "la válvula", "los frenos" */
export function theComponent(name: string) {
  const [es, g, pl] = comp(name);
  return `${pl ? (g === "f" ? "las" : "los") : g === "f" ? "la" : "el"} ${es}`;
}

/** "del sensor", "de la válvula" */
export function ofComponent(name: string) {
  const the = theComponent(name);
  return the.startsWith("el ") ? `del ${the.slice(3)}` : `de ${the}`;
}

/** "al sensor", "a la válvula" */
export function toComponent(name: string) {
  const the = theComponent(name);
  return the.startsWith("el ") ? `al ${the.slice(3)}` : `a ${the}`;
}

const TYPE_ES: Record<string, string> = {
  fault: "falla",
  repair: "reparación",
  inspection: "inspección",
  observation: "observación",
  diagnosis: "diagnóstico",
  note: "nota",
};

export function typeName(type: string, lang: Lang) {
  return lang === "es" ? TYPE_ES[type] ?? type : type;
}

export const SYSTEM_ES: Record<string, string> = {
  hydraulic: "el sistema hidráulico",
  cooling: "el sistema de enfriamiento",
  engine: "el motor",
  fuel: "el combustible",
  electrical: "el sistema eléctrico",
  undercarriage: "el tren de rodaje",
  drivetrain: "el tren motriz",
  cab: "la cabina",
  attachment: "los implementos",
};

// ---------- Conditions ----------

const CONDITIONS: [RegExp, string][] = [
  [/leak/i, "con fuga"],
  [/corro|rust/i, "corroído"],
  [/crack/i, "agrietado"],
  [/chafe/i, "rozado"],
  [/worn/i, "desgastado"],
  [/loose/i, "suelto"],
  [/broken|torn|frayed/i, "roto"],
  [/failed/i, "en falla"],
  [/damaged/i, "dañado"],
  [/clogged|plugged/i, "tapado"],
  [/dirty|contaminated/i, "contaminado"],
  [/\blow\b/i, "bajo"],
  [/seized|stuck/i, "atascado"],
  [/bent|dented/i, "doblado"],
  [/dead/i, "descargado"],
  [/missing/i, "faltante"],
  [/blown|burn/i, "quemado"],
];

function agree(adj: string, g: Gender, plural: boolean) {
  if (!/o$/.test(adj)) return adj;
  const base = g === "f" ? adj.replace(/o$/, "a") : adj;
  return plural ? `${base}s` : base;
}

export interface SpanishPhrase {
  text: string;
  gender: Gender;
  plural: boolean;
}

/** "Leaking line fitting" -> "línea hidráulica con fuga" */
export function translateCause(cause: string): SpanishPhrase {
  const match = findComponents(cause)[0];
  const name = match?.def.name ?? cause.toLowerCase();
  const [es, g, pl] = comp(name);
  const adj = CONDITIONS.find(([re]) => re.test(cause))?.[1] ?? "defectuoso";
  return { text: `${es} ${agree(adj, g, pl)}`, gender: g, plural: pl };
}

export function withArticleEs(p: SpanishPhrase) {
  return `${p.plural ? (p.gender === "f" ? "unas" : "unos") : p.gender === "f" ? "una" : "un"} ${p.text}`;
}

// ---------- Seed translations ----------

interface SeedEs {
  summary: string;
  action?: string;
  outcome?: string;
  cause?: SpanishPhrase;
}

const m = (text: string): SpanishPhrase => ({ text, gender: "m", plural: false });
const f = (text: string): SpanishPhrase => ({ text, gender: "f", plural: false });

const SEED_ES: Record<string, SeedEs> = {
  e1: { summary: "Bomba hidráulica reemplazada durante la reparación general programada a las 6,200 horas.", action: "reemplazó la bomba hidráulica", outcome: "operación normal" },
  e2: { summary: "Sobrecalentamiento del motor con carga pesada a 38 °C." },
  e3: { summary: "El nivel de refrigerante estaba bien. Falló el rodamiento de la bomba de refrigerante.", action: "reemplazó la bomba de refrigerante", outcome: "sin recurrencia durante más de 600 horas", cause: m("rodamiento de la bomba de refrigerante en falla") },
  e4: { summary: "Pluma lenta, la presión hidráulica fluctúa con carga." },
  e5: { summary: "Se sospechó de una válvula de control desgastada y se reemplazó.", action: "reemplazó la válvula de control hidráulica", outcome: "la falla regresó después de unas 300 horas, la causa raíz no se resolvió" },
  e6: { summary: "El código 217 regresó durante operación a alta temperatura. Pluma lenta otra vez." },
  e7: { summary: "La válvula se inspeccionó y estaba intacta. El arnés del sensor de presión rozaba contra el soporte de la pluma y dañó el sensor.", action: "reemplazó el sensor de presión y reacomodó el arnés", outcome: "operación normal durante 1,240 horas desde entonces", cause: m("sensor de presión dañado (arnés rozado)") },
  e8: { summary: "Inspección diaria: corrosión leve en la conexión de la línea hidráulica de la pluma. Sin fuga por ahora, en observación." },
  e9: { summary: "Servicio de 500 horas completado. Se cambiaron fluidos y filtros.", outcome: "aprobado" },
  e10: { summary: "Anomalía de presión con el calor de la tarde, respuesta lenta de la pluma." },
  e11: { summary: "La lectura del sensor no coincidía con el manómetro de prueba. Se reemplazó el sensor de presión.", action: "reemplazó el sensor de presión", outcome: "operación normal", cause: m("sensor de presión dañado") },
  e12: { summary: "Un conector del sensor agrietado por el calor causaba lecturas de presión intermitentes.", action: "reemplazó el sensor de presión y el conector", outcome: "operación normal", cause: m("conector del sensor de presión agrietado por el calor") },
  e13: { summary: "Carrete de la válvula de control desgastado, confirmado con prueba de flujo.", action: "reemplazó la válvula de control hidráulica", outcome: "operación normal", cause: m("carrete de la válvula de control desgastado") },
  e14: { summary: "Sobrecalentamiento causado por una bomba de refrigerante en falla.", action: "reemplazó la bomba de refrigerante", outcome: "operación normal", cause: f("bomba de refrigerante en falla") },
  e15: { summary: "Tensión de oruga baja en el lado izquierdo. Se ajustó y se inspeccionó la rueda guía.", action: "ajustó la tensión de la oruga", outcome: "operación normal", cause: f("tensión de oruga baja") },
  e16: { summary: "Restricción de admisión de aire por filtro primario tapado en condiciones de arena.", action: "reemplazó el filtro de aire primario", outcome: "operación normal", cause: m("filtro de aire tapado") },
};

const DOC_STEPS_ES: Record<string, string[]> = {
  d1: [
    "Estaciona en terreno nivelado, baja todos los implementos y libera la presión hidráulica.",
    "Revisa el nivel de aceite hidráulico y busca fugas en líneas y conexiones.",
    "Inspecciona el conector y el arnés del sensor de presión por roces o daño por calor.",
    "Compara la lectura del sensor con un manómetro de prueba calibrado en el puerto de prueba.",
    "Si el sensor lee correctamente, prueba la respuesta de la válvula de control con una prueba de flujo.",
  ],
  d2: [
    "Deja que el motor se enfríe antes de abrir el sistema de enfriamiento.",
    "Revisa el nivel y la condición del refrigerante.",
    "Inspecciona los núcleos del radiador por obstrucciones.",
    "Revisa la bomba de refrigerante por fugas en el orificio de drenaje y juego en el rodamiento.",
    "Verifica el funcionamiento del ventilador y la tensión de la correa.",
  ],
  d3: [
    "Camina alrededor de la máquina y busca fugas, daños y piezas sueltas.",
    "Revisa las líneas y conexiones hidráulicas por desgaste, corrosión o goteo.",
    "Revisa la tensión de la oruga y el desgaste del tren de rodaje.",
    "Revisa los niveles de aceite del motor, refrigerante y aceite hidráulico.",
    "Revisa el indicador de restricción del filtro de aire.",
  ],
  d4: [
    "Estaciona en terreno nivelado y mueve la máquina hacia adelante para tensar la oruga.",
    "Mide la holgura de la oruga en el punto medio entre el rodillo superior y la rueda guía.",
    "Agrega grasa en la conexión del ajustador hasta que la holgura esté dentro de especificación.",
    "Inspecciona la rueda guía y el resorte de retroceso por daños.",
  ],
};

export function docStepsEs(docId: string): string[] | undefined {
  return DOC_STEPS_ES[docId];
}

// ---------- Event text ----------

const VERBS_ES: [RegExp, string, string][] = [
  [/^(replac|reemplaz)/i, "reemplazó", "reemplazaste"],
  [/^(swap|cambi|chang)/i, "cambió", "cambiaste"],
  [/^repair|^repar/i, "reparó", "reparaste"],
  [/^fix|^arregl/i, "arregló", "arreglaste"],
  [/^install|^instal/i, "instaló", "instalaste"],
  [/^rebuil/i, "reconstruyó", "reconstruiste"],
  [/^overhaul/i, "reacondicionó", "reacondicionaste"],
  [/^weld|^sold/i, "soldó", "soldaste"],
  [/^clean|^limpi/i, "limpió", "limpiaste"],
  [/^adjust|^ajust/i, "ajustó", "ajustaste"],
  [/^tighten|^apret/i, "apretó", "apretaste"],
  [/^greas|^engras/i, "engrasó", "engrasaste"],
  [/^lubricat|^lubric/i, "lubricó", "lubricaste"],
  [/^top|^refill|^fill|^rellen/i, "rellenó", "rellenaste"],
  [/^flush|^purg/i, "purgó", "purgaste"],
  [/^calibrat/i, "calibró", "calibraste"],
  [/^servic/i, "le dio servicio a", "le diste servicio a"],
];

const OUTCOME_ES: Record<string, string> = {
  "Repair completed - monitoring": "reparación completada, en observación",
  "Working normally after repair": "funcionando normalmente después de la reparación",
  Passed: "aprobada",
  Checked: "revisado",
  "Normal operation": "operación normal",
};

export function looksSpanish(text: string) {
  if (/[áéíóúñ¿¡]/i.test(text)) return true;
  return (text.toLowerCase().match(/\b(el|la|los|las|de|del|que|está|estaba|con|una|por|pero|tenía)\b/g)?.length ?? 0) >= 2;
}

/** Past-tense action phrase without subject, e.g. "reemplazó el sensor de presión". */
export function actionEs(e: MemoryEvent, secondPerson = false): string | undefined {
  const seed = SEED_ES[e.id];
  if (seed?.action) return seed.action;
  if (!e.action) return undefined;
  if (looksSpanish(e.action)) return e.action.charAt(0).toLowerCase() + e.action.slice(1);
  const verb = VERBS_ES.find(([re]) => re.test(e.action!.trim()));
  if (!verb) return `trabajó en ${theComponent(e.component)}`;
  return `${secondPerson ? verb[2] : verb[1]} ${theComponent(e.component)}`;
}

export function outcomeEs(e: MemoryEvent): string | undefined {
  const seed = SEED_ES[e.id];
  if (seed?.outcome) return seed.outcome;
  if (!e.outcome) return undefined;
  return OUTCOME_ES[e.outcome] ?? e.outcome;
}

export function causeEs(e: MemoryEvent): SpanishPhrase | undefined {
  if (!e.actualCause) return undefined;
  return SEED_ES[e.id]?.cause ?? (looksSpanish(e.actualCause) ? m(e.actualCause.toLowerCase()) : translateCause(e.actualCause));
}

export function summaryEs(e: MemoryEvent, nameOf: (id: string) => string = (id) => id): string {
  const seed = SEED_ES[e.id];
  if (seed) return seed.summary;
  if (looksSpanish(e.summary)) return e.summary;
  const reported = e.summary.match(/^Reported by ([^:]+): "(.*)"$/);
  if (reported) return `Reportado por ${reported[1]}: "${reported[2]}"`;
  if (e.summary.startsWith("Photo:")) return `Foto: ${e.photoCaption ?? ""}`;
  const parts = [`${capitalizeEs(typeName(e.type, "es"))} en ${theComponent(e.component)}`];
  const cause = causeEs(e);
  if (cause) parts.push(`causa: ${cause.text}`);
  const action = actionEs(e);
  if (action && !action.startsWith("trabajó")) parts.push(`se ${action}`);
  return `${parts.join(", ")}. (Registrado por ${nameOf(e.technicianId)})`;
}

export function capitalizeEs(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function insightTextEs(ins: Insight) {
  const [top, ...rest] = ins.causes;
  const others = rest.map((c) => `${componentName(c.component, "es")} ${c.count}`).join(", ");
  return (
    `En máquinas ${ins.model}, el código ${ins.faultCode.replace("FC-", "")} se debió ${toComponent(top.component)} en ${top.count} de ${ins.total} casos resueltos` +
    (others ? ` (también: ${others}).` : ".")
  );
}

export function spokenWhenEs(iso: string) {
  const day = iso.slice(0, 10);
  const now = new Date();
  if (day === now.toISOString().slice(0, 10)) return "hoy más temprano";
  const d = new Date(`${day}T12:00:00`);
  const month = d.toLocaleDateString("es-MX", { month: "long" });
  const yearsAgo = now.getFullYear() - d.getFullYear();
  return `el ${d.getDate()} de ${month}${yearsAgo === 0 ? "" : yearsAgo === 1 ? " del año pasado" : ` de ${d.getFullYear()}`}`;
}

export function fmtDateEs(iso: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
