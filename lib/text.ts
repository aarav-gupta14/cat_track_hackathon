export interface ComponentDef {
  name: string;
  system: string;
  terms: string[];
}

export const COMPONENTS: ComponentDef[] = [
  // Hydraulic
  { name: "pressure sensor", system: "hydraulic", terms: ["pressure sensor", "pressure transducer", "sensor", "transducer"] },
  { name: "hydraulic control valve", system: "hydraulic", terms: ["control valve", "relief valve", "valve", "spool"] },
  { name: "hydraulic line", system: "hydraulic", terms: ["hydraulic line", "hydraulic hose", "line fitting", "fitting", "hose", "line"] },
  { name: "hydraulic pump", system: "hydraulic", terms: ["hydraulic pump", "main pump"] },
  { name: "hydraulic cylinder", system: "hydraulic", terms: ["hydraulic cylinder", "boom cylinder", "stick cylinder", "bucket cylinder", "cylinder", "seal kit"] },
  { name: "hydraulic oil", system: "hydraulic", terms: ["hydraulic oil", "hydraulic fluid", "hydraulic filter", "hydraulic tank"] },
  // Cooling
  { name: "coolant pump", system: "cooling", terms: ["coolant pump", "water pump"] },
  { name: "temperature sensor", system: "cooling", terms: ["temperature sensor", "temp sensor"] },
  { name: "cooling system", system: "cooling", terms: ["cooling system", "cooling", "radiator hose", "coolant hose", "radiator", "coolant", "thermostat", "overheat", "overheating"] },
  { name: "fan belt", system: "cooling", terms: ["fan belt", "serpentine belt", "drive belt", "belt", "fan"] },
  // Engine and fuel
  { name: "engine", system: "engine", terms: ["engine", "motor"] },
  { name: "engine oil", system: "engine", terms: ["engine oil", "oil filter", "oil change", "oil"] },
  { name: "air filter", system: "engine", terms: ["air filter", "air intake", "air cleaner"] },
  { name: "filters", system: "engine", terms: ["filter"] },
  { name: "turbocharger", system: "engine", terms: ["turbocharger", "turbo"] },
  { name: "exhaust", system: "engine", terms: ["exhaust", "muffler", "dpf"] },
  { name: "fuel system", system: "fuel", terms: ["fuel filter", "fuel injector", "injector", "fuel pump", "fuel line", "fuel tank", "fuel"] },
  // Electrical
  { name: "battery", system: "electrical", terms: ["battery", "batteries"] },
  { name: "alternator", system: "electrical", terms: ["alternator"] },
  { name: "starter", system: "electrical", terms: ["starter motor", "starter"] },
  { name: "wiring harness", system: "electrical", terms: ["wiring harness", "wiring", "harness", "wire", "connector", "fuse", "relay"] },
  { name: "lights", system: "electrical", terms: ["work light", "headlight", "lights", "beacon"] },
  { name: "cab display", system: "electrical", terms: ["display", "monitor", "screen", "camera"] },
  // Undercarriage and drivetrain
  { name: "undercarriage", system: "undercarriage", terms: ["track tension", "track shoe", "track pad", "track", "undercarriage", "idler", "roller", "sprocket"] },
  { name: "final drive", system: "drivetrain", terms: ["final drive"] },
  { name: "swing system", system: "drivetrain", terms: ["swing motor", "swing bearing", "swing drive", "swing"] },
  { name: "transmission", system: "drivetrain", terms: ["transmission", "gearbox", "torque converter"] },
  { name: "brakes", system: "drivetrain", terms: ["parking brake", "brake"] },
  { name: "tires", system: "drivetrain", terms: ["tire", "tyre"] },
  // Cab and attachments
  { name: "cab", system: "cab", terms: ["seat belt", "seatbelt", "seat", "wiper", "mirror", "door", "window", "air conditioning", "hvac", "cab"] },
  { name: "bucket", system: "attachment", terms: ["bucket teeth", "teeth", "tooth", "cutting edge", "bucket", "blade", "quick coupler", "coupler"] },
  { name: "pins and bushings", system: "attachment", terms: ["grease fitting", "zerk", "pin", "bushing"] },
];

const SPANISH_TERMS: Record<string, string[]> = {
  "pressure sensor": ["sensor de presión"],
  "hydraulic control valve": ["válvula de control", "válvula"],
  "hydraulic line": ["línea hidráulica", "manguera hidráulica", "manguera", "conexión", "conexiones", "línea"],
  "hydraulic pump": ["bomba hidráulica"],
  "hydraulic cylinder": ["cilindro"],
  "hydraulic oil": ["aceite hidráulico"],
  "coolant pump": ["bomba de agua", "bomba de refrigerante"],
  "temperature sensor": ["sensor de temperatura"],
  "cooling system": ["sistema de enfriamiento", "radiador", "refrigerante", "sobrecalentamiento", "termostato"],
  "fan belt": ["correa", "banda", "ventilador"],
  "engine oil": ["aceite del motor", "aceite"],
  "air filter": ["filtro de aire"],
  filters: ["filtro"],
  "fuel system": ["combustible", "inyector"],
  battery: ["batería", "baterías"],
  alternator: ["alternador"],
  starter: ["motor de arranque", "arranque"],
  "wiring harness": ["arnés", "cable", "cables"],
  lights: ["luces"],
  "cab display": ["pantalla"],
  undercarriage: ["tren de rodaje", "oruga", "rodillo", "rueda guía"],
  "swing system": ["giro"],
  transmission: ["transmisión"],
  brakes: ["freno"],
  tires: ["llanta", "neumático"],
  cab: ["cabina", "espejo", "asiento", "cinturón"],
  bucket: ["cucharón", "dientes", "cuchilla"],
  "pins and bushings": ["pasador", "buje"],
};
for (const c of COMPONENTS) c.terms.push(...(SPANISH_TERMS[c.name] ?? []));

export const FAULT_CODES: Record<string, { label: string; system: string }> = {
  "FC-217": { label: "Hydraulic pressure anomaly", system: "hydraulic" },
  "FC-110": { label: "Engine coolant temperature high", system: "cooling" },
  "FC-305": { label: "Track tension low", system: "undercarriage" },
  "FC-412": { label: "Air intake restriction", system: "engine" },
};

const SYSTEM_TERMS: Record<string, string[]> = {
  hydraulic: ["hydraulic", "boom", "stick", "pressure", "slow", "hidráulico", "hidráulica", "pluma", "presión", "lento", "lenta"],
  cooling: ["temperature", "hot", "heat", "temperatura", "calor"],
  undercarriage: ["tracks"],
  engine: ["power", "smoke"],
  electrical: ["electrical", "won't start", "no start", "dead"],
};

const STOPWORDS = new Set(
  "the a an is are was were be been to of and or in on at for with this that it its i we you my our me what why how did do does have has had seen before last time machine there here so but".split(" ")
);

function escape(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  ta.forEach((t) => tb.has(t) && overlap++);
  return overlap / Math.min(ta.size, tb.size);
}

export interface ComponentMatch {
  def: ComponentDef;
  term: string;
  index: number;
}

export function findComponents(text: string): ComponentMatch[] {
  const lower = text.toLowerCase();
  const claimed: [number, number][] = [];
  const found: ComponentMatch[] = [];
  const candidates = COMPONENTS.flatMap((def) => def.terms.map((term) => ({ def, term }))).sort(
    (a, b) => b.term.length - a.term.length
  );
  for (const { def, term } of candidates) {
    const re = new RegExp(`\\b${escape(term)}s?\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower))) {
      const start = m.index;
      const end = start + m[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);
      if (!found.some((f) => f.def.name === def.name)) found.push({ def, term, index: start });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

export function componentDef(name: string): ComponentDef | undefined {
  return COMPONENTS.find((c) => c.name === name);
}

export function isRelated(a: string, b: string) {
  if (a === b) return true;
  const sa = componentDef(a)?.system;
  const sb = componentDef(b)?.system;
  return Boolean(sa && sb && sa === sb);
}

export function detectSystems(text: string): string[] {
  const lower = text.toLowerCase();
  const systems = new Set(findComponents(text).map((f) => f.def.system));
  for (const [system, terms] of Object.entries(SYSTEM_TERMS)) {
    if (terms.some((t) => new RegExp(`\\b${escape(t)}\\b`).test(lower))) systems.add(system);
  }
  const code = detectFaultCode(text);
  if (code && FAULT_CODES[code]) systems.add(FAULT_CODES[code].system);
  return [...systems];
}

export function detectFaultCode(text: string): string | undefined {
  const m = text.match(/\b(?:fc[\s-]?|code\s*|c[oó]digo\s*)(\d{3})\b/i);
  return m ? `FC-${m[1]}` : undefined;
}

// ---------- Log understanding (demo mode) ----------

const OK_NEGATED_RE = /\b(no (leaks?|damage|issues?|problems?|wear|cracks?)|not (leaking|damaged|worn|cracked)|sin (fugas?|daños?|problemas?|desgaste))\b/i;
const OK_RE =
  /\b(fine|ok|okay|good|checks? out|checked out|intact|no issues?|normal|normally|working|passed|within spec|bien|funciona|funcionando|en buen estado|correcto|correcta|normalmente)\b/i;
const BAD_RE =
  /\b(damaged|broken|leak|leaks|leaking|leaked|crack|cracks|cracked|corroded|corrosion|rust|rusted|failed|worn|faulty|bad|chafed|loose|torn|frayed|missing|bent|clogged|plugged|dirty|low|contaminated|seized|stuck|blown|burnt|burned|dead|dented|culprit|cause|dañad[oa]s?|rot[oa]s?|fugas?|gotea\w*|agrietad[oa]s?|desgastad[oa]s?|corroíd[oa]s?|oxidad[oa]s?|suelt[oa]s?|tapad[oa]s?|quemad[oa]s?|defectuos[oa]s?|culpable|causa)\b/i;
const NOT_WORKING_RE = /\b(not|isn'?t|doesn'?t|won'?t|stopped)\s+(work\w*|start\w*|run\w*)\b|\bno\s+(funciona|arranca|enciende|prende)\b/i;
const FAULT_RE =
  /\b(won'?t start|not starting|no start|stall\w*|died|shut ?down|overheat\w*|warning|alarm|alert|fault|error|code|smok\w*|noise|grinding|squeal\w*|vibrat\w*|slow|weak|no power|lost power|not working|stopped working|doesn'?t work|isn'?t working|no arranca|alarma|advertencia|ruido|lent[oa]|humo|falla|c[oó]digo)\b/i;

export type VerbKind = "repair" | "inspect" | "observe";

const VERBS: [VerbKind, RegExp][] = [
  [
    "repair",
    /\b(replac\w*|swapp?\w*|install\w*|repair\w*|fix\w*|rebuil\w*|overhaul\w*|weld\w*|patch\w*|reseal\w*|rewir\w*|re-?rout\w*|tighten\w*|adjust\w*|clean\w*|flush\w*|lubricat\w*|greas\w*|top(?:ped)? (?:off|up)|refill\w*|filled|chang\w*|torqu\w*|bled|bleed\w*|recharg\w*|calibrat\w*|reset|servic\w*|sharpen\w*|cambi\w*|repar\w*|limpi\w*|reemplac\w*|reemplaz\w*|arregl\w*|instal\w*|ajust\w*|apret\w*|engras\w*|lubric\w*|rellen\w*|sold\w*|purg\w*)\b/i,
  ],
  ["inspect", /\b(inspect\w*|check\w*|test\w*|measur\w*|verif\w*|examin\w*|walk-?around|look(?:ed)? (?:at|over)|diagnos\w*|revis\w*|inspeccion\w*|chequ\w*)\b/i],
  ["observe", /\b(notic\w*|found|saw|spott\w*|observ\w*|heard|smell\w*|discover\w*|encontr\w*|detect\w*|escuch\w*|vi|not(?=é))\b/i],
];

const SKIP_WORDS = new Set(
  "the a an new old both left right front rear my our its his her their some all that this those these up off out down i we they he she there also just el la los las un una unos unas mi su nuevo nueva otro otra yo".split(" ")
);
const STOP_WORDS = new Set(
  "on in at with for because since to from and but after before while so as it them today yesterday again now was is were are be been had has have by of due which that looks look seems seem when where during running runs run works operating well de del en con por para que está estaba es era fue tiene tenía hoy ahora y pero se lo le al".split(" ")
);
const JUNK_PARTS = new Set(["everything", "nothing", "something", "machine", "unit", "issue", "problem", "work", "job", "thing", "stuff"]);

function guessPart(fragment: string): string | undefined {
  const words = fragment.toLowerCase().replace(/[^a-z0-9áéíóúñü\s'-]/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const boundary = STOP_WORDS.has(w) || BAD_RE.test(w) || OK_RE.test(w);
    if (!out.length && (SKIP_WORDS.has(w) || boundary)) continue;
    if (boundary) break;
    out.push(w);
    if (out.length === 3) break;
  }
  const part = out.join(" ");
  return part.length >= 3 && !JUNK_PARTS.has(part) ? part : undefined;
}

export interface ClauseInfo {
  text: string;
  components: { name: string; term: string }[];
  carried: boolean;
  status: "ok" | "bad" | null;
  verb?: { kind: VerbKind; word: string; index: number };
  fault: boolean;
}

function findVerb(clause: string): ClauseInfo["verb"] {
  for (const [kind, re] of VERBS) {
    const m = clause.match(re);
    if (m && m.index !== undefined) return { kind, word: m[0], index: m.index };
  }
  return undefined;
}

export function analyzeLog(text: string): ClauseInfo[] {
  const clauses = text
    .split(/[.;!?¡¿\n]|,|\bbut\b|\band\b|\bthen\b|\bhowever\b|\balso\b|\bpero\b|\by\b|\btambién\b|\bluego\b|\bdespués\b/i)
    .map((c) => c.trim())
    .filter(Boolean);
  let carry: ClauseInfo["components"] = [];

  return clauses.map((clause) => {
    const verb = findVerb(clause);
    const status = OK_NEGATED_RE.test(clause)
      ? "ok"
      : BAD_RE.test(clause) || NOT_WORKING_RE.test(clause)
        ? "bad"
        : OK_RE.test(clause)
          ? "ok"
          : null;
    const fault = FAULT_RE.test(clause);
    let components = findComponents(clause).map((f) => ({ name: f.def.name, term: f.term }));
    let carried = false;

    if (!components.length && (verb || status || fault)) {
      const guess = guessPart(verb ? clause.slice(verb.index + verb.word.length) : clause);
      if (guess) components = [{ name: guess, term: guess }];
      else if (carry.length) {
        components = carry;
        carried = true;
      }
    }
    if (components.length && !carried) carry = components;
    return { text: clause, components, carried, status, verb, fault };
  });
}

const SPANISH_VERBS_EN: [RegExp, string][] = [
  [/^(reemplaz|reemplac|cambi)/, "replaced"],
  [/^instal/, "installed"],
  [/^repar/, "repaired"],
  [/^arregl/, "fixed"],
  [/^limpi/, "cleaned"],
  [/^ajust/, "adjusted"],
  [/^apret/, "tightened"],
  [/^engras/, "greased"],
  [/^lubric/, "lubricated"],
  [/^rellen/, "topped off"],
  [/^sold/, "welded"],
  [/^purg/, "flushed"],
];

/** English past tense for a Spanish repair verb ("cambié" -> "replaced"), or undefined if it isn't Spanish. */
export function spanishVerbToEnglish(verb: string): string | undefined {
  const v = verb.toLowerCase();
  return SPANISH_VERBS_EN.find(([re]) => re.test(v))?.[1];
}

export function pastTense(verb: string): string | undefined {
  const v = verb.toLowerCase();
  if (v.startsWith("replac") || v.startsWith("reemplaz") || v.startsWith("reemplac") || v.startsWith("cambi")) return "replaced";
  if (v.startsWith("instal") && !v.startsWith("install")) return "installed";
  if (v.startsWith("swap")) return "swapped";
  if (v.startsWith("install")) return "installed";
  if (v.startsWith("rebuil")) return "rebuilt";
  if (v.startsWith("overhaul")) return "overhauled";
  return undefined;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDate(iso: string) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function spokenWhen(iso: string) {
  const day = iso.slice(0, 10);
  const now = new Date();
  if (day === now.toISOString().slice(0, 10)) return "earlier today";
  const d = new Date(`${day}T12:00:00`);
  const n = d.getDate();
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const yearsAgo = now.getFullYear() - d.getFullYear();
  return `on ${month} ${n}${suffix}${yearsAgo === 0 ? "" : yearsAgo === 1 ? " last year" : `, ${d.getFullYear()}`}`;
}

const CONDITION_WORDS: [RegExp, string][] = [
  [/\bleak|\bfuga|\bgotea/i, "leaking"],
  [/\bcorro|\brust|\boxidad/i, "corroded"],
  [/\bcrack|\bagrietad/i, "cracked"],
  [/\bchafe|\brozad/i, "chafed"],
  [/\bworn\b|\bdesgastad/i, "worn"],
  [/\bloose\b|\bsuelt[oa]/i, "loose"],
  [/\bbroken\b|\brot[oa]s?\b/i, "broken"],
  [/\bfailed\b/i, "failed"],
  [/\bdamaged\b|\bdañad/i, "damaged"],
  [/\btorn\b|\bfrayed\b/i, "torn"],
  [/\bclogged\b|\bplugged\b|\btapad/i, "clogged"],
  [/\bdirty\b|\bcontaminated\b|\bsuci[oa]|\bcontaminad/i, "contaminated"],
  [/\blow\b|\bbaj[oa]\b/i, "low"],
  [/\bseized\b|\bstuck\b|\batascad/i, "seized"],
  [/\bbent\b|\bdented\b|\bdoblad/i, "bent"],
  [/\bdead\b|\bdescargad/i, "dead"],
  [/\bmissing\b|\bfaltante/i, "missing"],
  [/\bblown\b|\bburn|\bquemad/i, "blown"],
];

export function describeCondition(clause: string, component: string) {
  const word = CONDITION_WORDS.find(([re]) => re.test(clause))?.[1] ?? "faulty";
  return capitalize(`${word} ${component}`);
}
