export type EventType = "fault" | "repair" | "inspection" | "observation" | "diagnosis" | "note";

export interface Fact {
  id: string;
  text: string;
  createdAt: string;
}

export interface Machine {
  id: string;
  model: string;
  type: string;
  serial: string;
  hours: number;
  site: string;
  environment: string[];
  facts: Fact[];
}

export interface MemoryEvent {
  id: string;
  machineId: string;
  date: string;
  type: EventType;
  component: string;
  faultCode?: string;
  summary: string;
  hypothesis?: string;
  actualCause?: string;
  action?: string;
  outcome?: string;
  conditions?: string[];
  technicianId: string;
  photo?: string;
  photoCaption?: string;
  source: "seed" | "live";
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  experience: "new" | "senior";
  years: number;
  language: "en" | "es";
  preferences: string[];
  interests: Record<string, number>;
  memories: Fact[];
}

export interface Insight {
  id: string;
  model: string;
  faultCode: string;
  causes: { component: string; count: number }[];
  total: number;
  text: string;
  updatedAt: string;
}

export interface DocChunk {
  id: string;
  title: string;
  faultCode?: string;
  components: string[];
  steps: string[];
}

export type LogKind = "add" | "update" | "learn" | "retrieve" | "user";

export interface LogEntry {
  id: string;
  at: string;
  kind: LogKind;
  machineId: string;
  text: string;
  textEs?: string;
}

export interface Recommendation {
  machineId: string;
  component: string;
  faultCode?: string;
  at: string;
}

export interface Store {
  machines: Machine[];
  events: MemoryEvent[];
  users: UserProfile[];
  insights: Insight[];
  docs: DocChunk[];
  log: LogEntry[];
  recommendations: Recommendation[];
}

export interface AskResult {
  answer: string;
  steps: string[];
  recommendedComponent?: string;
  cited: MemoryEvent[];
  fleet: MemoryEvent[];
  insight?: Insight;
  photoCaption?: string;
  written: LogEntry[];
  mode: "ai" | "demo";
}

export interface RememberResult {
  reply: string;
  events: MemoryEvent[];
  learned?: string;
  written: LogEntry[];
  mode: "ai" | "demo";
}
