import type { DocChunk, Machine, MemoryEvent, Store, UserProfile } from "./types";

const NOW = "2026-10-03T12:00:00.000Z";

function fact(id: string, text: string, createdAt = NOW) {
  return { id, text, createdAt };
}

const machines: Machine[] = [
  {
    id: "CAT-4821",
    model: "320",
    type: "Hydraulic Excavator",
    serial: "DEMO-320-4821",
    hours: 8421,
    site: "Jobsite A - Riverside Quarry",
    environment: ["High ambient temperature", "Heavy digging loads", "Dusty"],
    facts: [
      fact("f1", "Hydraulic pump replaced at 6,200 hrs (Mar 2025)"),
      fact("f2", "Coolant pump replaced (Jun 2025)"),
      fact("f3", "Pressure sensor and harness replaced (Mar 2026)"),
      fact("f4", "Undercarriage at ~60% wear"),
    ],
  },
  {
    id: "CAT-3307",
    model: "320",
    type: "Hydraulic Excavator",
    serial: "DEMO-320-3307",
    hours: 6980,
    site: "Jobsite B - Highway 9 Expansion",
    environment: ["High ambient temperature", "Trenching"],
    facts: [fact("f5", "Pressure sensor replaced (May 2026)")],
  },
  {
    id: "CAT-5102",
    model: "320",
    type: "Hydraulic Excavator",
    serial: "DEMO-320-5102",
    hours: 4215,
    site: "Jobsite A - Riverside Quarry",
    environment: ["Heavy digging loads"],
    facts: [fact("f6", "Hydraulic control valve replaced (Jan 2026)")],
  },
  {
    id: "CAT-2290",
    model: "320",
    type: "Hydraulic Excavator",
    serial: "DEMO-320-2290",
    hours: 11030,
    site: "Jobsite C - Desert Solar Farm",
    environment: ["Extreme heat", "Sand and dust"],
    facts: [fact("f7", "High-hour machine, scheduled for major overhaul")],
  },
  {
    id: "CAT-6610",
    model: "D6",
    type: "Track-Type Tractor (Dozer)",
    serial: "DEMO-D6-6610",
    hours: 5512,
    site: "Jobsite B - Highway 9 Expansion",
    environment: ["Grading", "Wet clay"],
    facts: [],
  },
  {
    id: "CAT-7734",
    model: "950",
    type: "Medium Wheel Loader",
    serial: "DEMO-950-7734",
    hours: 9880,
    site: "Jobsite C - Desert Solar Farm",
    environment: ["Sand and dust", "Load and carry"],
    facts: [],
  },
];

type SeedEvent = Omit<MemoryEvent, "source" | "createdAt">;

const seedEvents: SeedEvent[] = [
  // CAT-4821: the hero machine's life story
  {
    id: "e1", machineId: "CAT-4821", date: "2025-03-10", type: "repair", component: "hydraulic pump",
    summary: "Hydraulic pump replaced during scheduled overhaul at 6,200 hrs.",
    action: "Replaced hydraulic pump", outcome: "Normal operation", technicianId: "u-dave",
  },
  {
    id: "e2", machineId: "CAT-4821", date: "2025-06-14", type: "fault", component: "cooling system", faultCode: "FC-110",
    summary: "Engine overheating under heavy load in 38°C heat.",
    conditions: ["High ambient temperature", "Heavy load"], technicianId: "u-dave",
  },
  {
    id: "e3", machineId: "CAT-4821", date: "2025-06-15", type: "repair", component: "coolant pump", faultCode: "FC-110",
    summary: "Coolant level was fine. Coolant pump bearing had failed.",
    hypothesis: "cooling system", actualCause: "Failed coolant pump bearing",
    action: "Replaced coolant pump", outcome: "No recurrence for 600+ hours", technicianId: "u-dave",
  },
  {
    id: "e4", machineId: "CAT-4821", date: "2025-11-02", type: "fault", component: "hydraulic control valve", faultCode: "FC-217",
    summary: "Boom slow, hydraulic pressure fluctuating under load.",
    conditions: ["Heavy load"], technicianId: "u-dave",
  },
  {
    id: "e5", machineId: "CAT-4821", date: "2025-11-03", type: "repair", component: "hydraulic control valve", faultCode: "FC-217",
    summary: "Suspected worn control valve. Replaced it.",
    hypothesis: "hydraulic control valve", action: "Replaced hydraulic control valve",
    outcome: "Fault returned after ~300 hours - root cause not fixed", technicianId: "u-dave",
  },
  {
    id: "e6", machineId: "CAT-4821", date: "2026-03-08", type: "fault", component: "pressure sensor", faultCode: "FC-217",
    summary: "FC-217 returned during high-temperature operation. Boom slow again.",
    conditions: ["High ambient temperature"], technicianId: "u-dave",
  },
  {
    id: "e7", machineId: "CAT-4821", date: "2026-03-09", type: "repair", component: "pressure sensor", faultCode: "FC-217",
    summary: "Valve inspected and intact. Pressure sensor harness chafed against boom bracket, sensor damaged.",
    hypothesis: "hydraulic control valve", actualCause: "Damaged pressure sensor (chafed harness)",
    action: "Replaced pressure sensor and re-routed harness", outcome: "Normal operation for 1,240 hours since",
    technicianId: "u-dave",
  },
  {
    id: "e8", machineId: "CAT-4821", date: "2026-08-21", type: "observation", component: "hydraulic line",
    summary: "Daily walkaround: light corrosion on boom hydraulic line fitting. No leak yet - monitoring.",
    photoCaption: "Corrosion on boom hydraulic line fitting", technicianId: "u-maya",
  },
  {
    id: "e9", machineId: "CAT-4821", date: "2026-09-30", type: "inspection", component: "engine",
    summary: "500-hour service completed. Fluids and filters changed.", outcome: "Passed", technicianId: "u-dave",
  },

  // Fleet memory: other 320s
  {
    id: "e10", machineId: "CAT-3307", date: "2026-05-11", type: "fault", component: "pressure sensor", faultCode: "FC-217",
    summary: "Pressure anomaly in afternoon heat, boom response slow.", conditions: ["High ambient temperature"],
    technicianId: "u-dave",
  },
  {
    id: "e11", machineId: "CAT-3307", date: "2026-05-12", type: "repair", component: "pressure sensor", faultCode: "FC-217",
    summary: "Sensor reading drifted vs. test gauge. Replaced pressure sensor.",
    hypothesis: "pressure sensor", actualCause: "Damaged pressure sensor", action: "Replaced pressure sensor",
    outcome: "Normal operation", technicianId: "u-dave",
  },
  {
    id: "e12", machineId: "CAT-2290", date: "2026-07-02", type: "repair", component: "pressure sensor", faultCode: "FC-217",
    summary: "Heat-cracked sensor connector caused intermittent pressure readings.",
    hypothesis: "hydraulic control valve", actualCause: "Heat-cracked pressure sensor connector",
    action: "Replaced pressure sensor and connector", outcome: "Normal operation", conditions: ["Extreme heat"],
    technicianId: "u-dave",
  },
  {
    id: "e13", machineId: "CAT-5102", date: "2026-01-20", type: "repair", component: "hydraulic control valve", faultCode: "FC-217",
    summary: "Control valve spool worn, confirmed with flow test.",
    hypothesis: "hydraulic control valve", actualCause: "Worn hydraulic control valve spool",
    action: "Replaced hydraulic control valve", outcome: "Normal operation", technicianId: "u-dave",
  },
  {
    id: "e14", machineId: "CAT-2290", date: "2025-09-10", type: "repair", component: "coolant pump", faultCode: "FC-110",
    summary: "Overheating traced to failed coolant pump.", hypothesis: "cooling system", actualCause: "Failed coolant pump",
    action: "Replaced coolant pump", outcome: "Normal operation", conditions: ["Extreme heat"], technicianId: "u-dave",
  },
  {
    id: "e15", machineId: "CAT-6610", date: "2026-06-18", type: "repair", component: "undercarriage", faultCode: "FC-305",
    summary: "Track tension low on left side. Adjusted and inspected idler.", actualCause: "Low track tension",
    action: "Adjusted track tension", outcome: "Normal operation", technicianId: "u-dave",
  },
  {
    id: "e16", machineId: "CAT-7734", date: "2026-08-02", type: "repair", component: "air filter", faultCode: "FC-412",
    summary: "Air intake restriction from clogged primary filter in sandy conditions.", actualCause: "Clogged air filter",
    action: "Replaced primary air filter", outcome: "Normal operation", conditions: ["Sand and dust"], technicianId: "u-dave",
  },
];

const users: UserProfile[] = [
  {
    id: "u-maya", name: "Maya Lopez", role: "Field Technician", experience: "new", years: 0.25, language: "en",
    preferences: ["Step-by-step explanations", "Show where the part is"],
    interests: { hydraulic: 2 }, memories: [fact("m1", "Started on the Riverside Quarry crew 3 months ago")],
  },
  {
    id: "u-luis", name: "Luis Ortega", role: "Field Technician", experience: "new", years: 0.5, language: "es",
    preferences: ["Explanations in Spanish", "Step-by-step explanations"],
    interests: {}, memories: [fact("m2", "Prefers Spanish; reads English manuals slowly")],
  },
  {
    id: "u-dave", name: "Dave Kowalski", role: "Senior Technician", experience: "senior", years: 22, language: "en",
    preferences: ["Short answers", "Skip the basics"],
    interests: { hydraulic: 9, cooling: 4 }, memories: [fact("m3", "22 years on Cat excavators; mentors new techs")],
  },
];

const ILLUSTRATIVE = "Illustrative procedure for demo - not an official Caterpillar document.";

const docs: DocChunk[] = [
  {
    id: "d1", title: `FC-217 Hydraulic Pressure Anomaly - Diagnostic Procedure. ${ILLUSTRATIVE}`, faultCode: "FC-217",
    components: ["pressure sensor", "hydraulic control valve", "hydraulic line"],
    steps: [
      "Park on level ground, lower all implements, and relieve hydraulic pressure.",
      "Check hydraulic oil level and look for leaks at lines and fittings.",
      "Inspect the pressure sensor connector and harness for chafing or heat damage.",
      "Compare the sensor reading to a calibrated test gauge at the test port.",
      "If the sensor reads correctly, test control valve response with a flow test.",
    ],
  },
  {
    id: "d2", title: `FC-110 Engine Coolant Temperature High. ${ILLUSTRATIVE}`, faultCode: "FC-110",
    components: ["cooling system", "coolant pump"],
    steps: [
      "Let the engine cool before opening the cooling system.",
      "Check coolant level and condition.",
      "Inspect radiator cores for debris blockage.",
      "Check the coolant pump for leaks at the weep hole and bearing play.",
      "Verify fan operation and belt tension.",
    ],
  },
  {
    id: "d3", title: `Daily Walkaround Inspection. ${ILLUSTRATIVE}`,
    components: ["hydraulic line", "undercarriage", "engine", "air filter"],
    steps: [
      "Walk around the machine and look for leaks, damage, and loose parts.",
      "Check hydraulic lines and fittings for wear, corrosion, or weeping.",
      "Check track tension and undercarriage wear.",
      "Check engine oil, coolant, and hydraulic oil levels.",
      "Check the air filter restriction indicator.",
    ],
  },
  {
    id: "d4", title: `FC-305 Track Tension Low. ${ILLUSTRATIVE}`, faultCode: "FC-305",
    components: ["undercarriage"],
    steps: [
      "Park on level ground and move the machine forward to take up slack.",
      "Measure track sag at the midpoint between carrier roller and idler.",
      "Add grease at the adjuster fitting until sag is within spec.",
      "Inspect the idler and recoil spring for damage.",
    ],
  },
];

export function createSeed(): Store {
  return {
    machines: structuredClone(machines),
    events: seedEvents.map((e) => ({ ...e, source: "seed" as const, createdAt: `${e.date}T12:00:00.000Z` })),
    users: structuredClone(users),
    insights: [],
    docs: structuredClone(docs),
    log: [],
    recommendations: [],
  };
}
