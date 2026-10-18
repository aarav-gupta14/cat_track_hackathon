import { aiEnabled, generateJSON, parseDataUrl } from "./ai";
import { addLog, loadStore, newId, recomputeInsights, saveStore } from "./store";
import {
  COMPONENTS,
  analyzeLog,
  capitalize,
  componentDef,
  describeCondition,
  detectFaultCode,
  detectSystems,
  findComponents,
  isRelated,
  pastTense,
  similarity,
  spanishVerbToEnglish,
  spokenWhen,
  type ClauseInfo,
} from "./text";
import {
  SYSTEM_ES,
  actionEs,
  causeEs,
  componentName,
  docStepsEs,
  insightTextEs,
  looksSpanish,
  ofComponent,
  outcomeEs,
  spokenWhenEs,
  summaryEs,
  theComponent,
  toComponent,
  typeName,
  withArticleEs,
  type Lang,
} from "./i18n";
import type {
  AskResult,
  DocChunk,
  EventType,
  Insight,
  LogEntry,
  Machine,
  MemoryEvent,
  Recommendation,
  RememberResult,
  Store,
  UserProfile,
} from "./types";

const COMPONENT_NAMES = COMPONENTS.map((c) => c.name);
const RECOMMENDATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Context {
  machine: Machine;
  user: UserProfile;
  faultCode?: string;
  systems: string[];
  components: string[];
  history: MemoryEvent[];
  related: MemoryEvent[];
  fleet: MemoryEvent[];
  insight?: Insight;
  doc?: DocChunk;
}

function byDateDesc(a: MemoryEvent, b: MemoryEvent) {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getEntities(store: Store, machineId: string, userId: string) {
  const machine = store.machines.find((m) => m.id === machineId);
  const user = store.users.find((u) => u.id === userId);
  if (!machine) throw new Error(`Unknown machine ${machineId}`);
  if (!user) throw new Error(`Unknown user ${userId}`);
  return { machine, user };
}

function userName(store: Store, id: string) {
  return store.users.find((u) => u.id === id)?.name ?? id;
}

function latestRecommendation(store: Store, machineId: string) {
  const rec = [...store.recommendations].reverse().find((r) => r.machineId === machineId);
  if (!rec || Date.now() - new Date(rec.at).getTime() > RECOMMENDATION_TTL_MS) return undefined;
  return rec;
}

// ---------- Read path ----------

function retrieve(store: Store, machine: Machine, user: UserProfile, query: string): Context {
  const faultCode = detectFaultCode(query);
  const systems = detectSystems(query);
  const components = findComponents(query).map((f) => f.def.name);
  const lowerQuery = query.toLowerCase();

  const score = (e: MemoryEvent) => {
    let s = 0;
    if (faultCode && e.faultCode === faultCode) s += 5;
    if (components.includes(e.component) || lowerQuery.includes(e.component)) s += 3;
    const sys = componentDef(e.component)?.system;
    if (sys && systems.includes(sys)) s += 2;
    s += similarity(query, `${e.summary} ${e.actualCause ?? ""} ${e.action ?? ""}`) * 2;
    return s;
  };

  const scored = store.events
    .filter((e) => e.machineId === machine.id)
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s >= 2);

  const history = scored.filter((x) => x.e.type !== "observation").map((x) => x.e).sort(byDateDesc).slice(0, 6);
  const related = scored.filter((x) => x.e.type === "observation").map((x) => x.e).sort(byDateDesc).slice(0, 3);

  const fleetIds = new Set(store.machines.filter((m) => m.model === machine.model && m.id !== machine.id).map((m) => m.id));
  const fleet = store.events
    .filter((e) => fleetIds.has(e.machineId) && e.actualCause)
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e)
    .slice(0, 5);

  const effectiveCode = faultCode ?? history.find((e) => e.faultCode)?.faultCode;
  const insight = effectiveCode
    ? store.insights.find((i) => i.model === machine.model && i.faultCode === effectiveCode)
    : undefined;
  const doc =
    (effectiveCode && store.docs.find((d) => d.faultCode === effectiveCode)) ||
    store.docs.find((d) => d.components.some((c) => components.includes(c))) ||
    undefined;

  return { machine, user, faultCode: effectiveCode, systems, components, history, related, fleet, insight, doc };
}

function recommend(ctx: Context): string | undefined {
  const scores = new Map<string, number>();
  const bump = (c: string, n: number) => scores.set(c, (scores.get(c) ?? 0) + n);
  ctx.insight?.causes.forEach((c) => bump(c.component, c.count));
  const latestResolved = ctx.history.find((e) => e.actualCause);
  if (latestResolved) bump(latestResolved.component, 2);
  const recentObs = ctx.related.find((e) => Date.now() - new Date(e.date).getTime() < 120 * 864e5);
  if (recentObs) bump(recentObs.component, 1.5);
  ctx.components.forEach((c) => bump(c, 1));
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? ctx.doc?.components[0];
}

function orderSteps(doc: DocChunk | undefined, component: string | undefined, experience: UserProfile["experience"], lang: Lang = "en") {
  if (!doc) return [];
  const terms = component ? componentDef(component)?.terms ?? [component] : [];
  const translated = lang === "es" ? docStepsEs(doc.id) : undefined;
  const steps = doc.steps.map((en, i) => ({ en, out: translated?.[i] ?? en }));
  const mentions = (s: { en: string }) => terms.some((t) => s.en.toLowerCase().includes(t));
  const [first, ...rest] = steps;
  const prioritized = [first, ...rest.filter(mentions), ...rest.filter((s) => !mentions(s))].map((s) => s.out);
  return experience === "senior" ? prioritized.slice(0, 2) : prioritized;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const speakable = (s: string) => s.replace(/\s*\(.*?\)/g, "").replace(/\s+-\s+/g, ", ").replace(/~/g, "about ").replace(/\.$/, "");
const withArticle = (s: string) => (/^(a|an|the)\s/i.test(s) ? s : `${/^[aeiou]/i.test(s) ? "an" : "a"} ${s}`);

// Spanish TTS reads "1,240" as a decimal, so thousands separators are dropped.
const speakableEs = (s: string) => s.replace(/\s*\(.*?\)/g, "").replace(/(\d),(\d{3})/g, "$1$2").replace(/\.$/, "");

function demoAnswerEs(store: Store, ctx: Context) {
  const { machine, history, user } = ctx;
  const senior = user.experience === "senior";
  const code = ctx.faultCode;
  const label = code ? `el código ${code.replace("FC-", "")}` : "esto";
  const faults = history.filter((e) => e.type === "fault");
  const resolved = history.filter((e) => e.type === "repair" || e.type === "diagnosis");
  const isMe = (id: string) => id === user.id;
  const firstName = (id: string) => userName(store, id).split(" ")[0];
  const rec = recommend(ctx);
  const parts: string[] = [];

  const n = faults.length || resolved.length;
  if (n) {
    const times = n === 1 ? "una vez" : `${["dos", "tres", "cuatro", "cinco"][n - 2] ?? n} veces`;
    const seen = code ? `ha mostrado ${label} ${times}` : `ha tenido este problema ${times}`;
    parts.push(senior ? `Sí, esta máquina ${seen}.` : `Sí, ya hemos visto esto. La ${machine.id} ${seen}.`);

    const latest = resolved[0];
    if (latest) {
      const me = isMe(latest.technicianId);
      const action = actionEs(latest, me);
      const did = action ? `${me ? "Tú" : firstName(latest.technicianId)} ${action}` : summaryEs(latest, (id) => userName(store, id));
      parts.push(`La última reparación fue ${spokenWhenEs(latest.date)}. ${speakableEs(did)}.`);
      const outcome = outcomeEs(latest);
      if (outcome) {
        const held = /normal|no recurrence|working|passed/i.test(latest.outcome ?? "");
        const failed = /returned|not fixed|recur/i.test(latest.outcome ?? "") && !held;
        const o = speakableEs(outcome);
        parts.push(held ? `Esa reparación funcionó: ${o}.` : failed ? `Pero ${o}.` : `Estado: ${o}.`);
      }
    }

    const miss = resolved.find((e) => e.hypothesis && e.actualCause && e.hypothesis !== e.component);
    const missCause = miss && causeEs(miss);
    if (miss && missCause) {
      const cause = withArticleEs({ ...missCause, text: speakableEs(missCause.text) });
      parts.push(
        senior
          ? `Primero se culpó ${toComponent(miss.hypothesis!)}, pero era ${cause}.`
          : `Un aviso: ${spokenWhenEs(miss.date)} parecía ser ${theComponent(miss.hypothesis!)}, pero resultó ser ${cause}.`
      );
    }
  } else {
    parts.push(
      senior
        ? `No hay historial de ${label} en esta máquina.`
        : `Todavía no tengo ningún registro de ${label} en la ${machine.id}, así que esto es nuevo. Sigamos el procedimiento estándar.`
    );
  }

  const top = ctx.insight?.causes[0];
  if (top && ctx.insight) {
    parts.push(`En toda la flota, ha resultado ser ${theComponent(top.component)} ${top.count} de ${ctx.insight.total} veces.`);
  }

  const obs = ctx.related[0];
  if (obs) {
    const note = speakableEs(summaryEs(obs, (id) => userName(store, id)).replace(/^inspección diaria:\s*/i, ""));
    const who = isMe(obs.technicianId) ? "tú reportaste" : `${firstName(obs.technicianId)} reportó`;
    parts.push(`${senior ? "También" : "Ah, y"} ${who} algo ${spokenWhenEs(obs.date)}: ${note.charAt(0).toLowerCase() + note.slice(1)}.${senior ? "" : " Vale la pena revisarlo."}`);
  }

  if (rec) {
    parts.push(senior ? `Yo empezaría por ${theComponent(rec)}.` : `Yo empezaría por ${theComponent(rec)}. Los pasos están en tu pantalla y podemos hacerlos uno por uno.`);
  } else if (!senior && !n) {
    parts.push("Los pasos están en tu pantalla.");
  }

  return { answer: parts.join(" "), steps: orderSteps(ctx.doc, rec, user.experience, "es"), recommendedComponent: rec };
}

function demoAnswer(store: Store, ctx: Context) {
  if (ctx.user.language === "es") return demoAnswerEs(store, ctx);
  const { machine, history, user } = ctx;
  const senior = user.experience === "senior";
  const code = ctx.faultCode;
  const label = code ? `code ${code.replace("FC-", "")}` : "this";
  const faults = history.filter((e) => e.type === "fault");
  const resolved = history.filter((e) => e.type === "repair" || e.type === "diagnosis");
  const who = (id: string) => (id === user.id ? "you" : userName(store, id).split(" ")[0]);
  const rec = recommend(ctx);
  const parts: string[] = [];

  const n = faults.length || resolved.length;
  if (n) {
    const times = n === 1 ? "once" : n === 2 ? "twice" : `${["three", "four", "five"][n - 3] ?? n} times`;
    const seen = code ? `thrown ${label} ${times}` : `had this issue ${times}`;
    parts.push(senior ? `Yep, this machine's ${seen}.` : `Yeah, we've seen this one before. ${machine.id} has ${seen}.`);

    const latest = resolved[0];
    if (latest) {
      const action = speakable(latest.action ?? latest.summary).replace(/^([a-z]+ed)\s+(?!(the|a|an|it|both|all)\b)/i, "$1 the ");
      const isVerb = /^[a-z]+ed\b/i.test(action);
      const byWho = isVerb ? `${who(latest.technicianId)} ${lowerFirst(action)}` : lowerFirst(action);
      const outcome = latest.outcome ? lowerFirst(speakable(latest.outcome)) : "";
      const held = /normal|no recurrence|working|passed/i.test(outcome);
      const failed = /returned|not fixed|recur/i.test(outcome);
      if (senior) {
        parts.push(`Last fix was ${spokenWhen(latest.date)}, ${byWho}${failed ? `, but ${outcome}` : ""}.`);
      } else {
        parts.push(`The last fix was ${spokenWhen(latest.date)}. ${capitalize(byWho)}.`);
        if (outcome) parts.push(held ? `That fix held, ${outcome}.` : failed ? `But ${outcome}.` : `Status: ${outcome}.`);
      }
    }

    const miss = resolved.find((e) => e.hypothesis && e.actualCause && e.hypothesis !== e.component);
    if (miss) {
      const cause = lowerFirst(speakable(miss.actualCause!));
      parts.push(
        senior
          ? `The ${miss.hypothesis} got blamed first, but it was ${withArticle(cause)}.`
          : `One heads-up: ${spokenWhen(miss.date)}, it looked like the ${miss.hypothesis}, but it turned out to be ${withArticle(cause)}.`
      );
    }
  } else {
    parts.push(
      senior
        ? `No history of ${label} on this machine.`
        : `I don't have any record of ${label} on ${machine.id} yet, so this one's new. Let's go by the standard procedure.`
    );
  }

  const top = ctx.insight?.causes[0];
  if (top && ctx.insight) {
    parts.push(
      senior
        ? `Fleet-wide it's the ${top.component} ${top.count} out of ${ctx.insight.total}.`
        : `Across the fleet, it's turned out to be the ${top.component} ${top.count} out of ${ctx.insight.total} times.`
    );
  }

  const obs = ctx.related[0];
  if (obs) {
    const note = lowerFirst(speakable(obs.summary.replace(/^daily walkaround:\s*/i, "")));
    const obsWho = who(obs.technicianId);
    parts.push(
      senior
        ? `${capitalize(obsWho)} also flagged something ${spokenWhen(obs.date)}: ${note}.`
        : `Oh, and ${obsWho} flagged something ${spokenWhen(obs.date)}: ${note}. Worth a look.`
    );
  }

  if (rec) {
    parts.push(senior ? `I'd start with the ${rec}.` : `I'd start with the ${rec}. The steps are on your screen, and we can take them one at a time.`);
  } else if (!senior && !n) {
    parts.push("The steps are on your screen.");
  }

  return { answer: parts.join(" "), steps: orderSteps(ctx.doc, rec, user.experience), recommendedComponent: rec };
}

const ASK_SYSTEM = `You are DéjàView, a hands-free memory assistant speaking through smart glasses to a technician working on a Caterpillar machine.
Answer ONLY from the provided machine memory, fleet memory, insight, and procedure. Never invent repairs or dates.
Rules:
- "answer" is spoken aloud by text-to-speech: under 70 words. Talk like a friendly, experienced coworker on the radio: contractions, short natural sentences, no lists, no markdown, no parentheses, no abbreviations like "FC-" (say "code 217"). Say dates naturally ("back on March 9th").
- If memory shows a past misdiagnosis (hypothesis differs from actual cause), warn about it.
- If a related recent observation exists (e.g. from a walkaround), mention it.
- Personalize: for "new" technicians be warm and encouraging, explain plainly, and offer to walk through steps; for "senior" be brief and technical, like talking to a peer.
- Write "answer" and "steps" in the user's language ("en" = English, "es" = Spanish).
- "recommendedComponent": use one of these when it fits: ${COMPONENT_NAMES.join(", ")}. Otherwise a short lowercase part name.
- If a photo is attached, identify the visible component and its condition in "photoCaption" (English), otherwise null.
Return JSON: {"answer": string, "steps": string[] (max 5), "recommendedComponent": string, "citedEventIds": string[], "photoCaption": string | null}`;

function compactEvent(store: Store, e: MemoryEvent) {
  return {
    id: e.id, machine: e.machineId, date: e.date, type: e.type, component: e.component, faultCode: e.faultCode,
    summary: e.summary, hypothesis: e.hypothesis, actualCause: e.actualCause, action: e.action, outcome: e.outcome,
    conditions: e.conditions, technician: userName(store, e.technicianId),
  };
}

export async function ask(input: { machineId: string; userId: string; question: string; image?: string }): Promise<AskResult> {
  const store = loadStore();
  const { machine, user } = getEntities(store, input.machineId, input.userId);
  const ctx = retrieve(store, machine, user, input.question);
  const image = parseDataUrl(input.image);
  const written: LogEntry[] = [];

  written.push(
    addLog(store, "retrieve", machine.id,
      `Retrieved ${ctx.history.length} machine, ${ctx.related.length} observation, ${ctx.fleet.length} fleet memories${ctx.insight ? " + 1 insight" : ""}`,
      `Recuperé ${ctx.history.length} recuerdos de la máquina, ${ctx.related.length} de observaciones y ${ctx.fleet.length} de la flota${ctx.insight ? " + 1 patrón" : ""}`)
  );

  type AIAnswer = { answer: string; steps: string[]; recommendedComponent: string; citedEventIds: string[]; photoCaption: string | null };
  let ai: AIAnswer | null = null;
  if (aiEnabled()) {
    const payload = {
      question: input.question,
      user: { name: user.name, experience: user.experience, years: user.years, language: user.language, preferences: user.preferences },
      machine: { id: machine.id, model: machine.model, type: machine.type, hours: machine.hours, environment: machine.environment, facts: machine.facts.map((f) => f.text) },
      machineHistory: ctx.history.map((e) => compactEvent(store, e)),
      recentObservations: ctx.related.map((e) => compactEvent(store, e)),
      fleetMemory: ctx.fleet.map((e) => compactEvent(store, e)),
      fleetInsight: ctx.insight?.text,
      procedure: ctx.doc ? { title: ctx.doc.title, steps: ctx.doc.steps } : null,
    };
    ai = await generateJSON<AIAnswer>(ASK_SYSTEM, JSON.stringify(payload), image);
  }

  const demo = demoAnswer(store, ctx);
  const recommended = ai?.recommendedComponent?.trim().toLowerCase() || demo.recommendedComponent;
  const allEvents = [...ctx.history, ...ctx.related];
  const cited = ai?.citedEventIds?.length
    ? allEvents.filter((e) => ai!.citedEventIds.includes(e.id))
    : allEvents.slice(0, 4);

  const reportsSymptom = /\b(seeing|getting|showing|throwing|slow|warning|alarm|again|leak\w*|tengo|aparece)\b/i.test(input.question);
  if (ctx.faultCode && detectFaultCode(input.question) && reportsSymptom) {
    const ev: MemoryEvent = {
      id: newId("ev"), machineId: machine.id, date: today(), type: "fault", component: recommended ?? "engine",
      faultCode: ctx.faultCode, summary: `Reported by ${user.name}: "${input.question}"`, technicianId: user.id,
      source: "live", createdAt: new Date().toISOString(),
    };
    store.events.push(ev);
    written.push(addLog(store, "add", machine.id, `ADD fault ${ctx.faultCode} reported by ${user.name}`,
      `NUEVO: falla ${ctx.faultCode} reportada por ${user.name}`));
  }

  const photoCaption = image ? ai?.photoCaption ?? "Photo captured during inspection (AI captioning off)" : undefined;
  if (image) {
    store.events.push({
      id: newId("ev"), machineId: machine.id, date: today(), type: "observation",
      component: (photoCaption && findComponents(photoCaption)[0]?.def.name) || recommended || "engine",
      summary: `Photo: ${photoCaption}`, photo: input.image, photoCaption, technicianId: user.id,
      source: "live", createdAt: new Date().toISOString(),
    });
    written.push(addLog(store, "add", machine.id, `ADD photo memory: ${photoCaption}`, `NUEVO: foto guardada${ai?.photoCaption ? `: ${ai.photoCaption}` : ""}`));
  }

  for (const system of ctx.systems) {
    const count = (user.interests[system] = (user.interests[system] ?? 0) + 1);
    written.push(addLog(store, "user", machine.id, `${user.name}: asked about ${system} systems ${count}x`,
      `${user.name}: preguntó sobre ${SYSTEM_ES[system] ?? system} ${count === 1 ? "1 vez" : `${count} veces`}`));
  }

  if (recommended) {
    store.recommendations.push({ machineId: machine.id, component: recommended, faultCode: ctx.faultCode, at: new Date().toISOString() });
  }
  saveStore(store);

  return {
    answer: ai?.answer ?? demo.answer,
    steps: ai?.steps?.length ? ai.steps : demo.steps,
    recommendedComponent: recommended,
    cited,
    fleet: ctx.fleet,
    insight: ctx.insight,
    photoCaption: image && !ai?.photoCaption && user.language === "es" ? "Foto tomada durante la inspección" : photoCaption,
    written,
    mode: ai ? "ai" : "demo",
  };
}

// ---------- Write path ----------

interface Extracted {
  events: {
    type: EventType;
    component: string;
    faultCode?: string | null;
    summary: string;
    hypothesis?: string | null;
    actualCause?: string | null;
    action?: string | null;
    outcome?: string | null;
  }[];
  userMemory?: string | null;
  machineFact?: string | null;
  photoCaption?: string | null;
}

function ruleExtract(text: string, rec?: Recommendation): Extracted {
  const clauses = analyzeLog(text);
  const summary = capitalize(text.trim());
  const primary = (c: ClauseInfo) => c.components[0];
  const ruledOut = clauses.filter((c) => c.status === "ok" && !c.carried && c.components.length).map((c) => primary(c).name);
  const badClauses = clauses.filter((c) => c.status === "bad" && c.components.length);
  const badNames = badClauses.map((c) => primary(c).name);
  const workingAfter = clauses.some((c) => c.status === "ok" && c.carried);
  const repairs = clauses.filter((c) => c.verb?.kind === "repair" && c.components.length);
  const repairedNames = [...new Set(repairs.map((c) => primary(c).name))].filter((n) => !ruledOut.includes(n) || badNames.includes(n));
  const firstComponent = clauses.find((c) => c.components.length)?.components[0].name;
  const fallback = firstComponent ?? rec?.component ?? "general";
  const month = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const spanish = looksSpanish(text);
  // Spanish notes are stored with English part names so the dashboard stays in one language.
  const causeTerm = (c: ClauseInfo) => (spanish ? primary(c).name : primary(c).term);

  if (repairedNames.length) {
    let machineFact: string | null = null;
    const events = repairedNames.map((name, i) => {
      const clause = repairs.find((c) => primary(c).name === name)!;
      const badClause = badClauses.find((c) => primary(c).name === name);
      const fixesOpenFault = i === 0 && rec?.faultCode && isRelated(name, rec.component);
      const term = primary(clause).term;
      const partLabel = !spanish && term.includes(" ") ? term : name;
      const verbEn = spanish ? spanishVerbToEnglish(clause.verb!.word) ?? "serviced" : undefined;
      const past = verbEn ?? pastTense(clause.verb!.word);
      if (past && !machineFact) machineFact = `${capitalize(partLabel)} ${past} (${month})`;
      return {
        type: "repair" as EventType,
        component: name,
        summary: i === 0 ? summary : capitalize(clause.text),
        hypothesis: i === 0 ? ruledOut.find((n) => n !== name) ?? null : null,
        actualCause: badClause
          ? describeCondition(badClause.text, causeTerm(badClause))
          : fixesOpenFault
            ? describeCondition(clause.text, name)
            : null,
        action: verbEn
          ? capitalize(`${verbEn} ${partLabel}`)
          : clause.carried
            ? capitalize(`${clause.verb!.word.toLowerCase()} ${partLabel}`)
            : capitalize(clause.text),
        outcome: workingAfter ? "Working normally after repair" : "Repair completed - monitoring",
      };
    });
    return { events, machineFact, userMemory: null };
  }

  const one = (type: EventType, component: string, extra: Partial<Extracted["events"][number]> = {}): Extracted => ({
    events: [{ type, component, summary, ...extra }],
    machineFact: null,
    userMemory: null,
  });

  if (badClauses.length && ruledOut.some((n) => !badNames.includes(n))) {
    const bad = badClauses[0];
    return one("diagnosis", primary(bad).name, {
      hypothesis: ruledOut.find((n) => n !== primary(bad).name),
      actualCause: describeCondition(bad.text, causeTerm(bad)),
    });
  }
  if (clauses.some((c) => c.fault) || detectFaultCode(text)) {
    const faultClause = clauses.find((c) => c.fault && c.components.length);
    return one("fault", faultClause ? primary(faultClause).name : fallback);
  }
  if (badClauses.length || clauses.some((c) => c.verb?.kind === "observe")) {
    return one("observation", badClauses[0] ? primary(badClauses[0]).name : fallback);
  }
  if (clauses.some((c) => c.verb?.kind === "inspect")) {
    return one("inspection", fallback, { outcome: ruledOut.length || workingAfter ? "Passed" : "Checked" });
  }
  return one("note", fallback);
}

const EXTRACT_SYSTEM = `You extract structured maintenance memories from a technician's spoken note about a specific machine.
Notes may be in English or Spanish; always write output fields in English.
Only extract what the technician actually said. Do not save small talk.
For "component" and "hypothesis", use one of these when it fits: ${COMPONENT_NAMES.join(", ")}. Otherwise use a short lowercase part name (e.g. "alternator bracket").
Create one event per distinct part that was repaired. Types: "repair" = anything done to a part (replace, fix, clean, adjust, grease, top off); "inspection" = checked with nothing wrong; "observation" = noticed a problem but did nothing; "diagnosis" = ruled one part out and found another; "fault" = a symptom or code.
If the technician says a previously suspected component was fine, set "hypothesis" to that component.
Set "actualCause" only if a root cause was identified (short phrase), otherwise null.
"userMemory" is a durable fact about the technician (skill, preference) or null. "machineFact" is a permanent fact about the machine (e.g. a part replaced) or null.
If a photo is attached, describe the visible component and condition in "photoCaption", otherwise null.
Return JSON: {"events": [{"type": "repair"|"inspection"|"observation"|"diagnosis"|"fault"|"note", "component": string, "faultCode": string|null, "summary": string, "hypothesis": string|null, "actualCause": string|null, "action": string|null, "outcome": string|null}], "userMemory": string|null, "machineFact": string|null, "photoCaption": string|null}`;

export async function remember(input: { machineId: string; userId: string; text: string; image?: string }): Promise<RememberResult> {
  const store = loadStore();
  const { machine, user } = getEntities(store, input.machineId, input.userId);
  const rec = latestRecommendation(store, machine.id);
  const image = parseDataUrl(input.image);
  const written: LogEntry[] = [];

  let aiExtracted: Extracted | null = null;
  if (aiEnabled()) {
    const prompt = JSON.stringify({
      note: input.text,
      machine: { id: machine.id, model: machine.model, type: machine.type },
      lastSystemRecommendation: rec ? { component: rec.component, faultCode: rec.faultCode } : null,
    });
    aiExtracted = await generateJSON<Extracted>(EXTRACT_SYSTEM, prompt, image);
  }
  const mode = aiExtracted?.events?.length ? "ai" : "demo";
  const extracted: Extracted = aiExtracted?.events?.length ? aiExtracted : ruleExtract(input.text, rec);

  const created: MemoryEvent[] = [];
  const es = user.language === "es";
  let learned: string | undefined;
  let learnedEs: string | undefined;
  let spokenLearned: string | undefined;
  const insightBefore = new Map(store.insights.map((i) => [i.id, i.text]));

  for (const x of extracted.events) {
    const component = x.component?.trim().toLowerCase() || rec?.component || "general";
    const inheritsFault = rec && isRelated(component, rec.component);
    const faultCode = x.faultCode || detectFaultCode(input.text) || (inheritsFault ? rec?.faultCode : undefined);
    const ev: MemoryEvent = {
      id: newId("ev"), machineId: machine.id, date: today(), type: x.type, component,
      faultCode: faultCode || undefined, summary: x.summary,
      hypothesis: x.hypothesis || undefined, actualCause: x.actualCause || undefined,
      action: x.action || undefined, outcome: x.outcome || undefined, technicianId: user.id,
      source: "live", createdAt: new Date().toISOString(),
    };
    if (input.image) {
      ev.photo = input.image;
      ev.photoCaption = extracted.photoCaption ?? "Photo attached to note";
    }

    if (ev.actualCause && rec && (inheritsFault || ev.hypothesis === rec.component)) {
      const senior = user.experience === "senior";
      const cause = lowerFirst(speakable(ev.actualCause));
      const causePhrase = causeEs(ev)!;
      const causeSpokenEs = withArticleEs({ ...causePhrase, text: speakableEs(causePhrase.text) });
      const recEs = theComponent(rec.component);
      if (ev.component !== rec.component) {
        ev.hypothesis = ev.hypothesis ?? rec.component;
        learned = `Learned: DéjàView suggested the ${rec.component}, but the actual cause was ${ev.actualCause.toLowerCase()}. Future recommendations updated.`;
        learnedEs = `Aprendido: DéjàView sugirió ${recEs}, pero la causa real fue ${withArticleEs(causePhrase)}. Recomendaciones futuras actualizadas.`;
        spokenLearned = es
          ? senior
            ? `Anotado, era ${causeSpokenEs}, no ${recEs}. Actualicé el patrón de la flota.`
            : `¡Buen hallazgo! Yo sugerí ${recEs}, pero en realidad era ${causeSpokenEs}. Lo recordaré la próxima vez, y actualicé el patrón de la flota para que todo el equipo se beneficie.`
          : senior
            ? `Noted, it was ${withArticle(cause)}, not the ${rec.component}. I've updated the fleet pattern.`
            : `Good catch! I suggested the ${rec.component}, but it was actually ${withArticle(cause)}. I'll remember that next time, and I've updated the fleet pattern so the whole crew benefits.`;
      } else {
        learned = `Confirmed: the ${rec.component} recommendation was correct. Confidence increased.`;
        learnedEs = `Confirmado: la recomendación (${componentName(rec.component, "es")}) era correcta. Mayor confianza.`;
        spokenLearned = es
          ? senior
            ? `Confirmado, era ${recEs}. Anotado.`
            : `Perfecto, entonces sí era ${recEs}. Lo anoté, así tendré más confianza la próxima vez.`
          : senior
            ? `Confirmed, it was the ${rec.component}. Noted.`
            : `Nice, so it was the ${rec.component} after all. I've noted that, so I'll be even more confident next time.`;
      }
    }

    const duplicate = store.events.find(
      (e) => e.machineId === ev.machineId && e.component === ev.component && e.type === ev.type && e.date === ev.date && similarity(e.summary, ev.summary) > 0.6
    );
    if (duplicate) {
      Object.assign(duplicate, Object.fromEntries(Object.entries(ev).filter(([k, v]) => v !== undefined && k !== "id" && k !== "createdAt")));
      created.push(duplicate);
      written.push(addLog(store, "update", machine.id, `UPDATE ${duplicate.type} memory on ${duplicate.component}`,
        `ACTUALIZADO: ${typeName(duplicate.type, "es")} en ${theComponent(duplicate.component)}`));
    } else {
      store.events.push(ev);
      created.push(ev);
      const evCause = causeEs(ev);
      written.push(addLog(store, "add", machine.id, `ADD ${ev.type} on ${ev.component}${ev.actualCause ? ` - cause: ${ev.actualCause}` : ""}`,
        `NUEVO: ${typeName(ev.type, "es")} en ${theComponent(ev.component)}${evCause ? `, causa: ${evCause.text}` : ""}`));
    }
  }

  if (extracted.machineFact && !machine.facts.some((f) => similarity(f.text, extracted!.machineFact!) > 0.8)) {
    machine.facts.unshift({ id: newId("fact"), text: extracted.machineFact, createdAt: new Date().toISOString() });
    const factPart = created[0]?.component;
    written.push(addLog(store, "add", machine.id, `ADD machine fact: ${extracted.machineFact}`,
      `NUEVO dato de la máquina${factPart ? `: trabajo en ${theComponent(factPart)}` : ""}`));
  }
  if (extracted.userMemory) {
    user.memories.unshift({ id: newId("mem"), text: extracted.userMemory, createdAt: new Date().toISOString() });
    written.push(addLog(store, "user", machine.id, `${user.name}: ${extracted.userMemory}`));
  }

  if (learned) {
    written.push(addLog(store, "learn", machine.id, learned, learnedEs));
    store.recommendations = store.recommendations.filter((r) => r !== rec);
  }
  recomputeInsights(store);
  for (const ins of store.insights) {
    if (insightBefore.get(ins.id) !== ins.text) {
      written.push(addLog(store, "learn", machine.id, `Fleet insight updated: ${ins.text}`, `Patrón de la flota actualizado: ${insightTextEs(ins)}`));
    }
  }
  saveStore(store);

  const ev0 = created[0];
  const senior = user.experience === "senior";
  let saved: string;
  if (es) {
    const what = ev0
      ? ev0.type === "repair"
        ? `la reparación ${ofComponent(ev0.component)}`
        : ev0.type === "diagnosis"
          ? "ese diagnóstico"
          : `esa ${typeName(ev0.type, "es")}`
      : "eso";
    saved = senior
      ? `Listo, registré ${what} en la ${machine.id}.`
      : `Listo, guardé ${what} en el historial de la ${machine.id}, así quien trabaje en ella después lo sabrá.`;
  } else {
    const what = ev0 ? (ev0.type === "repair" ? `the ${ev0.component} repair` : `that ${ev0.type}`) : "that";
    saved = senior
      ? `Got it, logged ${what} on ${machine.id}.`
      : `Got it, I've saved ${what} to ${machine.id}'s history, so whoever works on it next will know.`;
  }
  const reply = [saved, spokenLearned].filter(Boolean).join(" ");
  return { reply, events: created, learned: es ? learnedEs ?? learned : learned, written, mode };
}

// ---------- Snapshot for the dashboard ----------

export function snapshot(machineId: string) {
  const store = loadStore();
  const machine = store.machines.find((m) => m.id === machineId) ?? store.machines[0];
  return {
    machine,
    machines: store.machines.map((m) => ({ id: m.id, model: m.model, type: m.type })),
    events: store.events.filter((e) => e.machineId === machine.id).sort(byDateDesc),
    insights: store.insights.filter((i) => i.model === machine.model),
    users: store.users,
    log: store.log.filter((l) => l.machineId === machine.id).slice(-40).reverse(),
    aiEnabled: aiEnabled(),
  };
}

export function listEntities() {
  const store = loadStore();
  return {
    machines: store.machines.map((m) => ({ id: m.id, model: m.model, type: m.type, site: m.site })),
    users: store.users.map((u) => ({ id: u.id, name: u.name, role: u.role, experience: u.experience, language: u.language })),
    aiEnabled: aiEnabled(),
  };
}
