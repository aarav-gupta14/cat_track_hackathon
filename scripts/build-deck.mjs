// Builds an editable PowerPoint pitch deck: `npm run deck` -> DejaView-Pitch.pptx
import pptxgen from "pptxgenjs";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const asset = (file) => path.join(here, "deck-assets", file);
const OUT = path.resolve(process.argv[2] ?? path.join(here, "..", "DejaView-Pitch.pptx"));

const C = {
  bg: "0B0D10",
  card: "161A20",
  line: "262C35",
  y: "FFCD11",
  ink: "F2F3F5",
  body: "C9CED6",
  sub: "9AA3B0",
  dim: "6B7480",
  green: "34D399",
  red: "F87171",
  blue: "60A5FA",
  purple: "C084FC",
  gray: "94A3B8",
};
const FONT = "Segoe UI";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pptx.title = "DéjàView - DAAP Developers";
const S = pptx.ShapeType;

pptx.defineSlideMaster({
  title: "TITLE",
  background: { color: C.bg },
  objects: [{ rect: { x: 0, y: 7.42, w: 13.333, h: 0.08, fill: { color: C.y } } }],
});
pptx.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.bg },
  objects: [
    { rect: { x: 0.75, y: 7.03, w: 0.14, h: 0.14, fill: { color: C.y } } },
    { text: { text: "DéjàView  ·  DAAP Developers", options: { x: 1.0, y: 6.95, w: 5, h: 0.3, fontFace: FONT, fontSize: 10, color: C.dim, margin: 0 } } },
  ],
  slideNumber: { x: 12.1, y: 6.95, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: C.dim, align: "right" },
});

/* ---------- helpers ---------- */

const iconCache = new Map();
async function icon(name, color) {
  const key = `${name}-${color}`;
  if (!iconCache.has(key)) {
    const svg = readFileSync(path.join(here, "..", "node_modules", "lucide-static", "icons", `${name}.svg`), "utf8")
      .replace(/stroke="currentColor"/g, `stroke="#${color}"`)
      .replace(/stroke-width="[^"]*"/, 'stroke-width="1.8"');
    const png = await sharp(Buffer.from(svg), { density: 1200 }).resize(256, 256).png().toBuffer();
    iconCache.set(key, `image/png;base64,${png.toString("base64")}`);
  }
  return iconCache.get(key);
}

async function iconAt(s, name, x, y, size, color = C.y) {
  s.addImage({ data: await icon(name, color), x, y, w: size, h: size });
}

async function badge(s, name, x, y, color = C.y, size = 0.56) {
  s.addShape(S.roundRect, { x, y, w: size, h: size, rectRadius: 0.1, fill: { color, transparency: 86 }, line: { color, width: 0.75, transparency: 55 } });
  const pad = size * 0.22;
  await iconAt(s, name, x + pad, y + pad, size - pad * 2, color);
}

function text(s, t, x, y, w, h, o = {}) {
  s.addText(t, {
    x, y, w, h,
    fontFace: FONT,
    fontSize: o.size ?? 14,
    color: o.color ?? C.sub,
    bold: o.bold ?? false,
    italic: o.italic ?? false,
    align: o.align ?? "left",
    valign: o.valign ?? "top",
    margin: 0,
    lineSpacingMultiple: o.ls ?? 1.1,
    charSpacing: o.spacing,
  });
}

function card(s, x, y, w, h, o = {}) {
  s.addShape(S.roundRect, {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: o.fill ?? C.card, transparency: o.transparency ?? 0 },
    line: { color: o.line ?? C.line, width: o.lineWidth ?? 1 },
  });
}

function kicker(s, n, label) {
  s.addShape(S.rect, { x: 0.75, y: 0.71, w: 0.35, h: 0.03, fill: { color: C.y }, line: { color: C.y, width: 0 } });
  s.addText(
    [
      { text: `${n}   `, options: { color: C.y, bold: true } },
      { text: label.toUpperCase(), options: { color: C.sub, bold: true } },
    ],
    { x: 1.22, y: 0.56, w: 8, h: 0.32, fontFace: FONT, fontSize: 11, charSpacing: 3, margin: 0, valign: "middle" }
  );
}

function title(s, main, accent, size = 32) {
  const runs = [{ text: main, options: { color: C.ink } }];
  if (accent) runs.push({ text: ` ${accent}`, options: { color: C.y } });
  s.addText(runs, { x: 0.75, y: 0.98, w: 11.8, h: 0.95, fontFace: FONT, fontSize: size, bold: true, margin: 0, valign: "top", lineSpacingMultiple: 0.95 });
}

function label(s, t, x, y, w = 4, color = C.y) {
  text(s, t.toUpperCase(), x, y, w, 0.25, { size: 10, bold: true, color, spacing: 2 });
}

function shot(s, file, x, y, w) {
  const h = (w * 9) / 16;
  s.addShape(S.roundRect, { x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1, rectRadius: 0.08, fill: { color: C.card }, line: { color: C.y, width: 1.25 } });
  s.addImage({ path: asset(file), x, y, w, h });
  return h;
}

async function checks(s, items, x, y, w, rowH = 0.48, color = C.y, size = 14) {
  for (const [i, item] of items.entries()) {
    await iconAt(s, "check", x, y + i * rowH + 0.03, 0.22, color);
    text(s, item, x + 0.36, y + i * rowH, w - 0.36, rowH, { size, color: C.body });
  }
}

function numberDot(s, n, x, y, size = 0.42) {
  s.addShape(S.ellipse, { x, y, w: size, h: size, fill: { color: C.y }, line: { color: C.y, width: 0 } });
  text(s, String(n), x, y, size, size, { size: 14, bold: true, color: "111111", align: "center", valign: "middle" });
}

const add = (master = "CONTENT") => pptx.addSlide({ masterName: master });

/* ---------- slides ---------- */

async function slideTitle() {
  const s = add("TITLE");
  s.addShape(S.ellipse, { x: 7.2, y: -1.6, w: 7.5, h: 7.5, fill: { color: C.y, transparency: 94 }, line: { color: C.y, transparency: 100, width: 0 } });

  s.addShape(S.roundRect, { x: 0.75, y: 1.3, w: 5.15, h: 0.4, rectRadius: 0.2, fill: { color: C.bg, transparency: 100 }, line: { color: C.y, width: 0.75 } });
  text(s, "HACK TO THE FUTURE  ·  CAT TRACK: MEMORY FOR PHYSICAL AI", 0.75, 1.3, 5.15, 0.4, { size: 9.5, bold: true, color: C.y, align: "center", valign: "middle", spacing: 1 });

  s.addText(
    [
      { text: "Déjà", options: { color: C.ink } },
      { text: "View", options: { color: C.y } },
    ],
    { x: 0.7, y: 1.85, w: 6.2, h: 1.45, fontFace: FONT, fontSize: 80, bold: true, margin: 0, valign: "middle", charSpacing: -2 }
  );
  text(
    s,
    "Smart glasses that remember every Caterpillar machine and coach new technicians through repairs, hands-free and in their own language.",
    0.75, 3.4, 5.7, 1.2,
    { size: 19, color: C.body, ls: 1.2 }
  );

  const features = [
    ["scan-line", "Sees the machine"],
    ["history", "Remembers its past"],
    ["refresh-cw", "Learns from every fix"],
  ];
  for (const [i, [ic, t]] of features.entries()) {
    const x = 0.75 + i * 1.95;
    await iconAt(s, ic, x, 4.86, 0.3);
    text(s, t, x + 0.4, 4.86, 1.55, 0.32, { size: 12, color: C.ink, valign: "middle" });
  }

  await badge(s, "users", 0.75, 5.75, C.y, 0.6);
  text(s, "DAAP Developers", 1.55, 5.73, 4, 0.36, { size: 18, bold: true, color: C.ink });
  text(s, "Built for new technicians and operators", 1.55, 6.07, 4, 0.3, { size: 12, color: C.sub });

  label(s, "What the technician sees", 6.95, 1.42, 4);
  shot(s, "glasses-ask.png", 6.95, 1.78, 5.65);
  text(s, "Our working prototype", 6.95, 5.07, 5.65, 0.3, { size: 11, color: C.dim, italic: true });

  s.addNotes(
    "[0:00-0:08] Hi, we're DAAP Developers. This is DéjàView: smart glasses that remember every Caterpillar machine and coach new technicians through repairs, hands-free and in their own language."
  );
}

async function slideUser() {
  const s = add();
  kicker(s, "01", "Meet the user");
  title(s, "Meet Luis.", "Three weeks into his first job as a technician.");

  card(s, 0.75, 2.2, 4.1, 4.4);
  await badge(s, "hard-hat", 1.05, 2.5, C.y, 0.7);
  text(s, "Luis Ortega", 1.05, 3.35, 3.6, 0.42, { size: 22, bold: true, color: C.ink });
  text(s, "New field technician", 1.05, 3.78, 3.6, 0.3, { size: 13, bold: true, color: C.y });
  const facts = [
    ["clock", "3 weeks on the job"],
    ["languages", "Spanish is his first language"],
    ["graduation-cap", "Learning by shadowing senior techs"],
    ["shield-check", "Wants to do it right, and safely"],
  ];
  for (const [i, [ic, t]] of facts.entries()) {
    const y = 4.3 + i * 0.52;
    await iconAt(s, ic, 1.05, y, 0.26, C.sub);
    text(s, t, 1.45, y - 0.02, 3.2, 0.32, { size: 13, color: C.body, valign: "middle" });
  }

  label(s, "Monday, 7:00 AM", 5.25, 2.2);
  const steps = [
    ["A 320 excavator's boom is slow. Fault code 217.", "It's a machine he has never worked on."],
    ["The senior tech who knows it isn't here.", "Strikes and turnover push new people onto machines fast."],
    ["The answer is buried.", "Manuals, fault notes and service records, scattered and mostly in English."],
    ["So he guesses.", "Wrong part, lost hours, and a real safety risk."],
  ];
  for (const [i, [head, sub]] of steps.entries()) {
    const y = 2.62 + i * 1.0;
    numberDot(s, i + 1, 5.25, y);
    text(s, head, 5.9, y - 0.02, 6.6, 0.38, { size: 17, bold: true, color: i === 3 ? C.red : C.ink });
    text(s, sub, 5.9, y + 0.38, 6.6, 0.4, { size: 13, color: C.sub });
  }

  s.addNotes(
    "[0:08-0:20] Meet Luis. He's three weeks into his first technician job. A 320 excavator's boom is slow and it's throwing code 217. He's never seen this machine, the senior tech who knows it isn't here, and the answer is buried in English manuals and old notes. So he guesses."
  );
}

async function slideProblem() {
  const s = add();
  kicker(s, "02", "The problem");
  title(s, "Machine knowledge is scattered,", "and new technicians pay the price.");

  const pains = [
    ["triangle-alert", C.red, "Unfamiliar machines", "Every machine has a past: repeat faults, misdiagnoses, quirks. That history lives in senior techs' heads."],
    ["files", C.y, "Information overload", "Manuals, fault codes, service records and notes live in different places. Cat has 1,000,000+ parts."],
    ["languages", C.blue, "Language barriers", "Documentation and tools are English-first. A big share of the workforce isn't."],
  ];
  for (const [i, [ic, color, head, body]] of pains.entries()) {
    const x = 0.75 + i * 4.015;
    card(s, x, 2.15, 3.8, 2.1);
    await badge(s, ic, x + 0.3, 2.42, color);
    text(s, head, x + 0.3, 3.1, 3.3, 0.36, { size: 17, bold: true, color: C.ink });
    text(s, body, x + 0.3, 3.48, 3.25, 0.72, { size: 12, color: C.sub });
  }

  const stats = [
    ["21,700", "heavy-equipment technician openings every year", "BLS, 2024-34 projections"],
    ["~19%", "of a knowledge worker's week goes to searching for information", "McKinsey Global Institute"],
    ["35%", "of U.S. construction workers are Hispanic or Latino", "BLS, 2024"],
    ["30%", "higher fatal injury rate for Hispanic or Latino workers", "BLS, 2024"],
  ];
  s.addShape(S.line, { x: 0.75, y: 4.5, w: 11.83, h: 0, line: { color: C.line, width: 1 } });
  s.addShape(S.line, { x: 0.75, y: 6.1, w: 11.83, h: 0, line: { color: C.line, width: 1 } });
  for (const [i, [n, l, src]] of stats.entries()) {
    const x = 0.75 + i * 2.96;
    if (i) s.addShape(S.line, { x, y: 4.5, w: 0, h: 1.6, line: { color: C.line, width: 1 } });
    text(s, n, x + 0.25, 4.65, 2.6, 0.55, { size: 30, bold: true, color: C.y });
    text(s, l, x + 0.25, 5.22, 2.55, 0.5, { size: 11.5, color: C.body });
    text(s, src, x + 0.25, 5.76, 2.55, 0.25, { size: 9, color: C.dim });
  }
  s.addText(
    [
      { text: "BARRIERS WE REMOVE   ", options: { color: C.y, bold: true, fontSize: 10, charSpacing: 2 } },
      { text: "Cognitive  ·  Informational  ·  Linguistic", options: { color: C.body, fontSize: 14 } },
    ],
    { x: 0.75, y: 6.28, w: 11.8, h: 0.35, fontFace: FONT, margin: 0, valign: "middle" }
  );

  s.addNotes(
    "[0:20-0:32] This isn't just Luis. Over 21,000 heavy-equipment technician jobs open every year, workers lose about a fifth of their time hunting for information, and a third of the construction workforce is Hispanic or Latino, with a higher fatal injury rate. The knowledge exists, but it's scattered, overwhelming, and English-first."
  );
}

async function slideResearch() {
  const s = add();
  kicker(s, "03", "How we got here");
  title(s, "We talked to Caterpillar", "before writing a line of code.");

  card(s, 0.75, 2.15, 5.8, 3.7);
  await badge(s, "message-square", 1.05, 2.45);
  label(s, "Interview", 1.8, 2.5);
  text(s, "Marcus, Product Owner at Caterpillar", 1.8, 2.74, 4.6, 0.34, { size: 16, bold: true, color: C.ink });
  await checks(s, [
    "Safety is the #1 priority, so any tool has to be foolproof",
    "Strikes and turnover put new people on machines fast",
    "Bringing new technicians up to speed takes a long time",
    "Cat has 1,000,000+ parts; nobody can memorize them",
  ], 1.05, 3.4, 5.25, 0.58);

  card(s, 6.78, 2.15, 5.8, 3.7);
  await badge(s, "search", 7.08, 2.45);
  label(s, "Market research", 7.83, 2.5);
  text(s, "Shops, workforce and existing tools", 7.83, 2.74, 4.6, 0.34, { size: 16, bold: true, color: C.ink });
  await checks(s, [
    "Heavy-equipment shops struggle to hire and train technicians",
    "Expert knowledge retires with senior technicians",
    "Today's tools search manuals; none remember a single machine's history",
    "Field work is hands-busy: phones and tablets get in the way",
  ], 7.08, 3.4, 5.25, 0.58);

  card(s, 0.75, 6.05, 11.83, 0.65, { fill: C.y, transparency: 88, line: C.y });
  await iconAt(s, "sparkles", 1.0, 6.22, 0.3);
  s.addText(
    [
      { text: "Key insight:  ", options: { bold: true, color: C.y } },
      { text: "the answer usually already exists. Someone fixed this before. It just isn't where the technician is.", options: { color: C.ink } },
    ],
    { x: 1.45, y: 6.05, w: 11, h: 0.65, fontFace: FONT, fontSize: 15, margin: 0, valign: "middle" }
  );

  s.addNotes(
    "[0:32-0:42] We started by talking to Marcus, a product owner at Caterpillar. Safety is number one, so it has to be foolproof. Strikes and turnover push new people onto machines, and onboarding is slow. Our research showed the answer usually already exists; someone fixed it before. It just isn't where the technician is."
  );
}

async function slideSolution() {
  const s = add();
  kicker(s, "04", "Our solution");
  title(s, "DéjàView puts the machine's memory", "right in front of the technician.");

  const h = shot(s, "glasses-ask.png", 0.8, 2.2, 6.8);
  text(s, "Working prototype: spoken answer, the machine's history, and safe next steps", 0.8, 2.2 + h + 0.12, 6.8, 0.3, { size: 11, color: C.dim, italic: true });

  const steps = [
    ["eye", "Look", "The glasses recognize the machine from its tag and camera."],
    ["mic", "Ask", "Ask out loud, like \u201chave we seen this before?\u201d, and hear the answer in your language."],
    ["wrench", "Fix and teach", "Follow safe, step-by-step guidance. Say what you fixed, and the machine and the whole fleet learn."],
  ];
  for (const [i, [ic, head, body]] of steps.entries()) {
    const y = 2.2 + i * 1.32;
    await badge(s, ic, 8.0, y, C.y, 0.62);
    text(s, `${i + 1}. ${head}`, 8.85, y - 0.02, 3.8, 0.4, { size: 20, bold: true, color: C.ink });
    text(s, body, 8.85, y + 0.4, 3.75, 0.8, { size: 13, color: C.sub });
  }

  s.addNotes(
    "[0:42-0:52] DéjàView is smart glasses with a memory layer. Luis looks at the machine, asks out loud in Spanish, and hears that machine's history, what was wrongly blamed last time, and safe next steps. When he logs the fix by voice, the machine and the whole fleet learn."
  );
}

async function slideMapping() {
  const s = add();
  kicker(s, "05", "How it solves the problem");
  title(s, "Every pain point has a direct answer.");

  label(s, "Pain point", 0.75, 2.05, 3, C.dim);
  label(s, "What DéjàView does", 4.55, 2.05, 5, C.dim);
  label(s, "Result", 10.25, 2.05, 2.3, C.dim);
  const rows = [
    ["triangle-alert", "Never seen this machine", "Instant history: past faults, what fixed them, and what was wrongly blamed", "No starting from zero"],
    ["files", "Too much information", "One spoken answer and only the relevant steps, safety step first", "Faster, safer diagnosis"],
    ["languages", "English-first tools", "Listens and answers in the technician's language (English and Spanish today)", "Everyone can use it"],
    ["users", "Experts retire or are out", "Every logged fix becomes shared memory for the whole fleet", "Knowledge stays"],
    ["hard-hat", "Hands busy on the job", "Voice and a heads-up display, nothing to hold", "Eyes up, hands free"],
  ];
  for (const [i, [ic, pain, answer, result]] of rows.entries()) {
    const y = 2.4 + i * 0.86;
    s.addShape(S.line, { x: 0.75, y, w: 11.83, h: 0, line: { color: C.line, width: 1 } });
    await iconAt(s, ic, 0.75, y + 0.28, 0.28, C.red);
    text(s, pain, 1.18, y, 3.0, 0.86, { size: 15, bold: true, color: C.ink, valign: "middle" });
    await iconAt(s, "arrow-right", 4.05, y + 0.3, 0.26, C.y);
    text(s, answer, 4.55, y, 5.45, 0.86, { size: 13.5, color: C.body, valign: "middle" });
    await iconAt(s, "circle-check", 10.25, y + 0.3, 0.26, C.green);
    text(s, result, 10.62, y, 2.0, 0.86, { size: 13.5, bold: true, color: C.green, valign: "middle" });
  }
  s.addShape(S.line, { x: 0.75, y: 2.4 + 5 * 0.86, w: 11.83, h: 0, line: { color: C.line, width: 1 } });

  s.addNotes(
    "[0:52-1:00] Each pain point maps to a feature: instant machine history, one answer with safety first, the tech's own language, shared memory so knowledge stays, and a hands-free interface."
  );
}

async function slideHow() {
  const s = add();
  kicker(s, "06", "How it works");
  title(s, "A memory layer that", "learns from every repair.");

  label(s, "Five kinds of memory", 0.75, 2.2);
  const mem = [
    [C.y, "Machine", "Permanent facts: model, hours, parts replaced"],
    [C.blue, "Episodic", "Every fault, repair and inspection, in order"],
    [C.purple, "Human", "Each technician's experience and language"],
    [C.gray, "Procedural", "Repair steps, with the safety step first"],
    [C.green, "Fleet", "Patterns across every machine of a model"],
  ];
  for (const [i, [color, name, desc]] of mem.entries()) {
    const y = 2.6 + i * 0.66;
    s.addShape(S.ellipse, { x: 0.78, y: y + 0.1, w: 0.18, h: 0.18, fill: { color }, line: { color, width: 0 } });
    text(s, name, 1.12, y, 1.5, 0.4, { size: 15, bold: true, color: C.ink });
    text(s, desc, 2.6, y + 0.02, 3.4, 0.4, { size: 12.5, color: C.sub });
  }

  const h = shot(s, "dashboard.png", 6.5, 2.25, 6.05);
  text(s, "Live dashboard: yellow rings mark root causes found, dashed red lines mark parts ruled out", 6.5, 2.25 + h + 0.1, 6.05, 0.3, { size: 10.5, color: C.dim, italic: true });

  card(s, 0.75, 6.12, 11.83, 0.6, { fill: C.bg, line: C.y });
  await iconAt(s, "refresh-cw", 1.0, 6.27, 0.3);
  text(s, "Ask  \u2192  answer from memory  \u2192  fix  \u2192  log it by voice  \u2192  machine and fleet learn  \u2192  better answer next time", 1.45, 6.12, 11, 0.6, { size: 14, bold: true, color: C.ink, valign: "middle" });

  s.addNotes(
    "[1:00-1:06] Under the hood, five kinds of memory feed every answer. Every logged repair writes back, so the next answer is smarter, for this machine and the whole fleet."
  );
}

async function slideDemo() {
  const s = add();
  kicker(s, "07", "Live demo");
  title(s, "See it in action.");

  const beats = [
    ["mic", "Maya asks", "Boom is slow, code 217. Have we seen this before?", "Recalls this machine's history, warns that the valve was wrongly blamed last time, and lists safe steps."],
    ["wrench", "Maya logs the fix", "Sensor's fine. The line fitting was leaking. Replaced it.", "The machine learns it was the fitting, and the fleet pattern updates live on the dashboard."],
    ["languages", "Luis asks in Spanish", "\u00bfQu\u00e9 pas\u00f3 la \u00faltima vez con el c\u00f3digo 217?", "A full spoken answer in Spanish, built on the same shared memory, including Maya's fix."],
  ];
  for (const [i, [ic, head, says, result]] of beats.entries()) {
    const x = 0.75 + i * 4.015;
    card(s, x, 2.15, 3.8, 3.55);
    numberDot(s, i + 1, x + 0.3, 2.45);
    await iconAt(s, ic, x + 3.12, 2.5, 0.34, C.sub);
    text(s, head, x + 0.3, 3.05, 3.3, 0.4, { size: 19, bold: true, color: C.ink });
    text(s, says, x + 0.3, 3.5, 3.25, 0.75, { size: 14, italic: true, color: C.y });
    text(s, result, x + 0.3, 4.35, 3.25, 1.2, { size: 13, color: C.sub });
  }

  await badge(s, "play", 0.75, 6.0, C.y, 0.5);
  s.addText(
    [
      { text: "Switch to the prototype:  ", options: { bold: true, color: C.ink } },
      { text: "glasses view + live dashboard", options: { color: C.sub } },
    ],
    { x: 1.45, y: 6.0, w: 9, h: 0.5, fontFace: FONT, fontSize: 15, margin: 0, valign: "middle" }
  );

  s.addNotes(
    "[1:06-1:36] [Switch to the glasses tab.] Maya asks: boom is slow, code 217, have we seen this before? It recalls the last fix and warns that the valve was wrongly blamed. She logs that the sensor was fine and the line fitting was leaking. On the dashboard, the machine learned and the fleet pattern updated. Now Luis asks in Spanish and gets the whole answer in Spanish, including Maya's fix."
  );
}

async function slideImpact() {
  const s = add();
  kicker(s, "08", "Success criteria");
  title(s, "How we'll know it works.");

  card(s, 0.75, 2.15, 5.6, 3.85, { fill: C.y, transparency: 88, line: C.y });
  await iconAt(s, "target", 1.05, 2.45, 0.36);
  label(s, "Our North Star", 1.55, 2.52);
  text(s, "Fixed right the first time", 1.05, 3.0, 5.0, 0.6, { size: 28, bold: true, color: C.ink });
  text(s, "A new technician diagnoses and repairs an unfamiliar fault correctly on the first visit, and the problem doesn't come back.", 1.05, 3.68, 5.0, 0.9, { size: 14, color: C.body });
  s.addShape(S.line, { x: 1.05, y: 4.7, w: 5.0, h: 0, line: { color: C.y, width: 0.75, transparency: 60 } });
  text(s, "It only happens when the answer is fast, safe and correct, and it gets easier as the memory learns from every fix.", 1.05, 4.85, 5.0, 0.9, { size: 12.5, color: C.sub });

  const criteria = [
    ["shield-check", "Safety", "Every repair starts safe", "The safety step comes first on every job, explained in the technician's own language."],
    ["user-check", "Independence", "New techs work on their own sooner", "They get answers from the machine's memory instead of waiting for a senior tech or digging through manuals."],
  ];
  for (const [i, [ic, tag, head, body]] of criteria.entries()) {
    const y = 2.15 + i * 1.98;
    card(s, 6.6, y, 5.98, 1.85);
    await badge(s, ic, 6.9, y + 0.3, C.green);
    label(s, tag, 7.7, y + 0.3, 4.6);
    text(s, head, 7.7, y + 0.58, 4.7, 0.4, { size: 17, bold: true, color: C.ink });
    text(s, body, 7.7, y + 1.02, 4.7, 0.7, { size: 12.5, color: C.body });
  }

  s.addText(
    [
      { text: "HOW WE'LL MEASURE IT   ", options: { color: C.y, bold: true, fontSize: 10, charSpacing: 2 } },
      { text: "In a pilot, comparing new technicians who use DéjàView with those who don't", options: { color: C.body, fontSize: 12.5 } },
    ],
    { x: 0.75, y: 6.2, w: 11.8, h: 0.4, fontFace: FONT, margin: 0, valign: "middle" }
  );

  s.addNotes(
    "Our North Star is simple: a new technician fixes an unfamiliar machine right the first time. Behind it are two success criteria: every repair starts safe, and new technicians can work on their own sooner. We'll measure all three in a pilot against technicians working without DéjàView."
  );
}

async function slideTradeoffs() {
  const s = add();
  kicker(s, "09", "Tradeoffs");
  title(s, "What we chose, and what we gave up.");

  label(s, "We chose", 0.75, 2.05, 3, C.dim);
  label(s, "Over", 4.35, 2.05, 2, C.dim);
  label(s, "Why", 6.75, 2.05, 3, C.dim);
  const rows = [
    ["Hands-free glasses", "A tablet app", "Eyes up, hands on the machine. Cost: hardware and battery, so our prototype runs in a browser."],
    ["Grounded answers", "Free-form AI", "It only says what's in the records. For safety, accuracy beats creativity."],
    ["Works offline", "AI-only", "Job sites lose signal. Built-in rules work anywhere; AI adds depth when available."],
    ["Structured memories", "Raw transcripts", "Searchable, auditable and small. We give up some nuance."],
    ["One workflow, done well", "Every feature", "Unfamiliar faults are where new technicians struggle most."],
  ];
  for (const [i, [pick, over, why]] of rows.entries()) {
    const y = 2.4 + i * 0.86;
    s.addShape(S.line, { x: 0.75, y, w: 11.83, h: 0, line: { color: C.line, width: 1 } });
    await iconAt(s, "check", 0.75, y + 0.3, 0.26, C.green);
    text(s, pick, 1.15, y, 3.1, 0.86, { size: 16, bold: true, color: C.ink, valign: "middle" });
    text(s, over, 4.35, y, 2.3, 0.86, { size: 14, color: C.dim, valign: "middle" });
    text(s, why, 6.75, y, 5.8, 0.86, { size: 13, color: C.body, valign: "middle" });
  }
  s.addShape(S.line, { x: 0.75, y: 2.4 + 5 * 0.86, w: 11.83, h: 0, line: { color: C.line, width: 1 } });

  s.addNotes(
    "[1:44-1:48] (Optional if short on time.) We chose hands-free over tablets, grounded answers over free-form AI, and an offline fallback because job sites lose signal."
  );
}

async function slideRoadmap() {
  const s = add();
  kicker(s, "10", "Implementation roadmap");
  title(s, "From prototype to every Cat machine.");

  const phases = [
    ["Today", "Working prototype", ["Voice glasses view and live dashboard", "Machine memory with a learning loop", "English and Spanish"], true],
    ["0-3 months", "Pilot", ["One Cat dealer shop, 10-20 new technicians", "Connect real service records and manuals", "Run on Meta AI glasses", "Measure First-Time Fix Rate"], false],
    ["3-12 months", "Scale", ["Search all 1,000,000+ Cat parts", "Live telematics and fault codes", "More languages"], false],
    ["12+ months", "Fleet-wide", ["Every Cat machine has a memory", "Operators and fleet managers too", "AR highlights on the exact part", "Personal coaching agents"], false],
  ];
  s.addShape(S.line, { x: 0.95, y: 2.35, w: 11.4, h: 0, line: { color: C.y, width: 2, transparency: 40 } });
  for (const [i, [when, head, items, done]] of phases.entries()) {
    const x = 0.75 + i * 2.99;
    s.addShape(S.ellipse, { x: x + 0.05, y: 2.17, w: 0.36, h: 0.36, fill: { color: done ? C.y : C.bg }, line: { color: C.y, width: 2 } });
    card(s, x, 2.75, 2.82, 3.5, done ? { line: C.y } : {});
    label(s, when, x + 0.25, 2.98, 2.4);
    text(s, head, x + 0.25, 3.25, 2.4, 0.4, { size: 18, bold: true, color: C.ink });
    s.addText(
      items.map((item) => ({ text: item, options: { bullet: { indent: 12 }, paraSpaceAfter: 12, breakLine: true } })),
      { x: x + 0.25, y: 3.8, w: 2.42, h: 2.35, fontFace: FONT, fontSize: 13, color: C.body, margin: 0, valign: "top" }
    );
  }
  s.addText(
    [
      { text: "TO START THE PILOT WE NEED   ", options: { color: C.y, bold: true, fontSize: 10, charSpacing: 2 } },
      { text: "a dealer partner  ·  access to service records  ·  glasses hardware", options: { color: C.body, fontSize: 13 } },
    ],
    { x: 0.75, y: 6.35, w: 11.8, h: 0.35, fontFace: FONT, margin: 0, valign: "middle" }
  );

  s.addNotes(
    "[1:48-1:56] Today we have a working prototype. Next is a 90-day pilot with one Cat dealer on real service records and Meta glasses. Then we scale to Cat's million-plus parts and live machine data, and finally every Cat machine gets a memory."
  );
}

async function slideClose() {
  const s = add();
  kicker(s, "11", "Next steps");
  title(s, "What's next.");

  const next = [
    ["languages", "More languages", "Beyond English and Spanish, so every crew member is covered"],
    ["user-cog", "Smarter personalization", "Agents adapt their tone, depth and coaching to each technician"],
    ["layers", "Scale to Cat's data", "Handle 1,000,000+ parts, manuals and live machine data"],
  ];
  for (const [i, [ic, head, body]] of next.entries()) {
    const x = 0.75 + i * 4.015;
    card(s, x, 1.95, 3.8, 1.95);
    await badge(s, ic, x + 0.3, 2.22);
    text(s, head, x + 0.3, 2.9, 3.3, 0.36, { size: 17, bold: true, color: C.ink });
    text(s, body, x + 0.3, 3.28, 3.25, 0.55, { size: 12, color: C.sub });
  }

  card(s, 0.75, 4.25, 11.83, 2.4, { fill: C.y, transparency: 88, line: C.y });
  s.addText(
    [
      { text: "Déjà", options: { color: C.ink } },
      { text: "View", options: { color: C.y } },
    ],
    { x: 1.15, y: 4.55, w: 5, h: 0.9, fontFace: FONT, fontSize: 44, bold: true, margin: 0, valign: "middle" }
  );
  text(s, "Every machine remembers.\nEvery technician benefits.", 1.15, 5.5, 6, 0.9, { size: 18, color: C.body, ls: 1.2 });
  text(s, "Thank you", 7.8, 4.75, 4.4, 0.7, { size: 36, bold: true, color: C.ink, align: "right" });
  text(s, "DAAP Developers  ·  Questions?", 7.8, 5.5, 4.4, 0.4, { size: 15, color: C.sub, align: "right" });

  s.addNotes(
    "[1:56-2:02] Next: more languages, smarter personalization, and scaling to all of Cat's data. DéjàView: every machine remembers, and every technician benefits. Thank you!"
  );
}

for (const build of [
  slideTitle,
  slideUser,
  slideProblem,
  slideResearch,
  slideSolution,
  slideMapping,
  slideHow,
  slideDemo,
  slideImpact,
  slideTradeoffs,
  slideRoadmap,
  slideClose,
]) {
  await build();
}

await pptx.writeFile({ fileName: OUT });
console.log(`Wrote ${OUT}`);
