"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmtDate } from "@/lib/text";
import { causeEs, componentName, fmtDateEs, insightTextEs, outcomeEs, summaryEs, typeName, type Lang } from "@/lib/i18n";
import type { AskResult, LogEntry, MemoryEvent, RememberResult } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    BarcodeDetector?: any;
  }
}

interface Entities {
  machines: { id: string; model: string; type: string; site: string }[];
  users: { id: string; name: string; role: string; experience: string; language: Lang }[];
  aiEnabled: boolean;
}

interface Card {
  id: string;
  kind: "memory" | "warn" | "learn" | "write" | "steps";
  title: string;
  body: ReactNode;
}

type Mode = "ask" | "log";

const UI = {
  en: {
    intro: "Point at a machine tag or pick one, then ask what happened last time.",
    searching: "Searching machine memory...",
    saving: "Saving to machine memory...",
    ask: "Ask",
    log: "Log",
    askPlaceholder: "Ask about this machine...",
    logPlaceholder: "Describe what you found or fixed...",
    fleetMemory: "Fleet memory",
    fleetUpdated: "Fleet memory updated",
    nextSteps: "Next steps",
    startWith: (c: string) => `Next steps · start with ${c}`,
    memoryUpdated: "Memory updated",
    machineLearned: "Machine learned",
    saved: "Saved",
    photoSaved: "Photo saved to memory",
    cause: "Cause",
    technician: (senior: boolean) => `${senior ? "Senior" : "New"} technician`,
    scan: "⌖ Scan tag",
    showFrame: "Show frame",
    hideFrame: "Hide frame",
    voiceAuto: "Voice: auto",
    aimAtTag: "Aim at machine tag",
    scanningTag: "Scanning for machine tag...",
    identified: (id: string) => `Machine ${id} identified. Memory loaded.`,
    identifiedSpoken: (id: string) => `Machine ${id} identified.`,
    working: "Working...",
    listening: "Listening...",
    aiMode: "AI mode (Gemini)",
    demoMode: "Demo mode (no API key)",
    error: (m: string) => `Something went wrong: ${m}`,
    preview: "Hey, it's DéjàView. What are we working on today?",
    status: {
      noHttps: "Camera needs HTTPS or localhost - using simulated view",
      noCamera: "Camera unavailable - using simulated view",
      noQr: "QR scanning isn't available here - pick the machine from the list",
      noTag: "No machine tag found",
      noVoice: "Voice input isn't supported in this browser - type instead (Chrome or Edge work best)",
      voiceError: "Voice error",
    },
    prompts: [
      { mode: "ask", text: "Boom is slow and I'm seeing code 217. Have we seen this before?" },
      { mode: "log", text: "Pressure sensor checks out fine. The boom line fitting was leaking where the corrosion was. Replaced the fitting." },
      { mode: "ask", text: "What should I check on my walkaround today?" },
    ] as { mode: Mode; text: string }[],
  },
  es: {
    intro: "Apunta a la etiqueta de una máquina o elige una, y pregunta qué pasó la última vez.",
    searching: "Buscando en la memoria de la máquina...",
    saving: "Guardando en la memoria de la máquina...",
    ask: "Preguntar",
    log: "Registrar",
    askPlaceholder: "Pregunta sobre esta máquina...",
    logPlaceholder: "Describe lo que encontraste o reparaste...",
    fleetMemory: "Memoria de la flota",
    fleetUpdated: "Memoria de la flota actualizada",
    nextSteps: "Siguientes pasos",
    startWith: (c: string) => `Siguientes pasos · empieza por ${c}`,
    memoryUpdated: "Memoria actualizada",
    machineLearned: "La máquina aprendió",
    saved: "Guardado",
    photoSaved: "Foto guardada en la memoria",
    cause: "Causa",
    technician: (senior: boolean) => `Técnico ${senior ? "sénior" : "nuevo"}`,
    scan: "⌖ Escanear",
    showFrame: "Mostrar marco",
    hideFrame: "Ocultar marco",
    voiceAuto: "Voz: auto",
    aimAtTag: "Apunta a la etiqueta",
    scanningTag: "Buscando la etiqueta de la máquina...",
    identified: (id: string) => `Máquina ${id} identificada. Memoria cargada.`,
    identifiedSpoken: (id: string) => `Máquina ${id} identificada.`,
    working: "Procesando...",
    listening: "Escuchando...",
    aiMode: "Modo IA (Gemini)",
    demoMode: "Modo demo (sin clave de API)",
    error: (m: string) => `Algo salió mal: ${m}`,
    preview: "Hola, soy DéjàView. ¿En qué estamos trabajando hoy?",
    status: {
      noHttps: "La cámara necesita HTTPS o localhost - usando vista simulada",
      noCamera: "Cámara no disponible - usando vista simulada",
      noQr: "El escaneo QR no está disponible aquí - elige la máquina de la lista",
      noTag: "No se encontró ninguna etiqueta",
      noVoice: "Este navegador no admite voz - escribe tu pregunta (Chrome o Edge funcionan mejor)",
      voiceError: "Error de voz",
    },
    prompts: [
      { mode: "ask", text: "La pluma está lenta y tengo el código 217. ¿Ya hemos visto esto?" },
      { mode: "log", text: "El sensor de presión está bien. La conexión de la línea de la pluma tenía fuga donde estaba la corrosión. Cambié la conexión." },
      { mode: "ask", text: "¿Qué pasó la última vez con el código 217?" },
    ] as { mode: Mode; text: string }[],
  },
};

type StatusKey = keyof (typeof UI)["en"]["status"];

function voiceScore(v: SpeechSynthesisVoice, lang: string) {
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 4;
  if (/google/i.test(v.name)) s += 2;
  if (/online/i.test(v.name)) s += 1;
  if (/aria|jenny|guy|ava|andrew|emma|brian|dalia|jorge|elvira|alvaro/i.test(v.name)) s += 1;
  if (v.lang === lang) s += 1;
  return s;
}

function shortVoiceName(name: string) {
  return name.replace(/^Microsoft\s+/, "").replace(/\s+-\s+.*$/, "");
}

function memoryCard(e: MemoryEvent, lang: Lang, nameOf: (id: string) => string): Card {
  const es = lang === "es";
  const cause = es ? causeEs(e)?.text : e.actualCause;
  const outcome = es ? outcomeEs(e) : e.outcome;
  return {
    id: e.id,
    kind: e.hypothesis && e.actualCause && e.hypothesis !== e.component ? "warn" : "memory",
    title: `${es ? fmtDateEs(e.date) : fmtDate(e.date)} · ${typeName(e.type, lang)} · ${componentName(e.component, lang)}`,
    body: (
      <>
        <div>{es ? summaryEs(e, nameOf) : e.summary}</div>
        {cause && <div className="cause">{UI[lang].cause}: {cause}</div>}
        {outcome && <div className="muted">{outcome}</div>}
        {e.photo && <img src={e.photo} alt={e.photoCaption ?? "Memory photo"} />}
      </>
    ),
  };
}

const logText = (w: LogEntry, lang: Lang) => (lang === "es" && w.textEs) || w.text;

export default function GlassesPage() {
  const [entities, setEntities] = useState<Entities | null>(null);
  const [machineId, setMachineId] = useState("CAT-4821");
  const [userId, setUserId] = useState("u-maya");
  const [mode, setMode] = useState<Mode>("ask");
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [caption, setCaption] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [attach, setAttach] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<{ key: StatusKey; detail?: string } | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("auto");
  const [showFrame, setShowFrame] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recogRef = useRef<any>(null);
  const finalRef = useRef("");
  const submitRef = useRef<(input: string) => void>(() => {});

  const machine = entities?.machines.find((m) => m.id === machineId);
  const user = entities?.users.find((u) => u.id === userId);
  const uiLang: Lang = user?.language === "es" ? "es" : "en";
  const t = UI[uiLang];
  const lang = uiLang === "es" ? "es-US" : "en-US";
  const nameOf = (id: string) => entities?.users.find((u) => u.id === id)?.name ?? id;
  const langVoices = voices
    .filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
  const voice = (voiceName !== "auto" && langVoices.find((v) => v.name === voiceName)) || langVoices[0];

  useEffect(() => {
    fetch("/api/entities").then((r) => r.json()).then(setEntities);
    setMachineId(localStorage.getItem("ct-machine") ?? "CAT-4821");
    setUserId(localStorage.getItem("ct-user") ?? "u-maya");
    setShowFrame(localStorage.getItem("ct-frame") === "on");
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    setVoiceName(localStorage.getItem(`ct-voice-${lang}`) ?? "auto");
  }, [lang]);

  useEffect(() => {
    setCaption(null);
    setTranscript("");
    setCards([]);
  }, [uiLang]);

  useEffect(() => {
    localStorage.setItem("ct-machine", machineId);
    localStorage.setItem("ct-user", userId);
  }, [machineId, userId]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus({ key: "noHttps" });
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      })
      .catch(() => setStatus({ key: "noCamera" }));
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function captureFrame(): string | undefined {
    const video = videoRef.current;
    if (!cameraOn || !video || !video.videoWidth) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * 512);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  }

  function speak(message: string) {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const natural = voice && /natural|neural|google/i.test(voice.name);
    const sentences = message.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [message];
    for (const sentence of sentences) {
      const utter = new SpeechSynthesisUtterance(sentence);
      utter.lang = voice?.lang ?? lang;
      if (voice) utter.voice = voice;
      utter.rate = natural ? 1 : 0.95;
      utter.pitch = 1;
      synth.speak(utter);
    }
  }

  function chooseVoice(name: string) {
    setVoiceName(name);
    localStorage.setItem(`ct-voice-${lang}`, name);
  }

  function toggleFrame() {
    setShowFrame((on) => {
      localStorage.setItem("ct-frame", on ? "off" : "on");
      return !on;
    });
  }

  async function scan() {
    if (!window.BarcodeDetector || !cameraOn || !entities) {
      setStatus({ key: "noQr" });
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    setScanning(true);
    const started = Date.now();
    const timer = setInterval(async () => {
      try {
        const codes = await detector.detect(videoRef.current);
        const raw: string | undefined = codes?.[0]?.rawValue;
        const found = raw && entities.machines.find((m) => raw.toUpperCase().includes(m.id));
        if (found) {
          clearInterval(timer);
          setScanning(false);
          setMachineId(found.id);
          setCaption(t.identified(found.id));
          speak(t.identifiedSpoken(found.id));
        } else if (Date.now() - started > 15000) {
          clearInterval(timer);
          setScanning(false);
          setStatus({ key: "noTag" });
        }
      } catch {
        clearInterval(timer);
        setScanning(false);
      }
    }, 400);
  }

  async function submit(input: string) {
    const question = input.trim();
    if (!question || busy) return;
    setBusy(true);
    setTranscript(question);
    setText("");
    setCaption(mode === "ask" ? t.searching : t.saving);
    const image = attach ? captureFrame() : undefined;

    try {
      if (mode === "ask") {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ machineId, userId, question, image }),
        });
        const data: AskResult & { error?: string } = await res.json();
        if (data.error) throw new Error(data.error);
        setCaption(data.answer);
        speak(data.answer);
        const next: Card[] = [];
        if (data.photoCaption) next.push({ id: "photo", kind: "write", title: t.photoSaved, body: data.photoCaption });
        if (data.insight) {
          next.push({ id: "insight", kind: "warn", title: t.fleetMemory, body: uiLang === "es" ? insightTextEs(data.insight) : data.insight.text });
        }
        data.cited.slice(0, 3).forEach((e) => next.push(memoryCard(e, uiLang, nameOf)));
        if (data.steps.length) {
          next.push({
            id: "steps",
            kind: "steps",
            title: data.recommendedComponent ? t.startWith(componentName(data.recommendedComponent, uiLang)) : t.nextSteps,
            body: <ol>{data.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>,
          });
        }
        const writes = data.written.filter((w) => w.kind === "add" || w.kind === "user");
        if (writes.length) {
          next.push({ id: "writes", kind: "write", title: t.memoryUpdated, body: writes.map((w) => <div key={w.id}>{logText(w, uiLang)}</div>) });
        }
        setCards(next);
      } else {
        const res = await fetch("/api/remember", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ machineId, userId, text: question, image }),
        });
        const data: RememberResult & { error?: string } = await res.json();
        if (data.error) throw new Error(data.error);
        setCaption(data.reply);
        speak(data.reply);
        const next: Card[] = [];
        if (data.learned) next.push({ id: "learned", kind: "learn", title: t.machineLearned, body: data.learned });
        data.events.forEach((e) =>
          next.push({
            ...memoryCard(e, uiLang, nameOf),
            kind: "write",
            title: `${t.saved} · ${typeName(e.type, uiLang)} · ${componentName(e.component, uiLang)}`,
          })
        );
        data.written
          .filter((w) => w.text.startsWith("Fleet insight"))
          .forEach((w) =>
            next.push({ id: w.id, kind: "warn", title: t.fleetUpdated, body: logText(w, uiLang).replace(/^(Fleet insight updated|Patrón de la flota actualizado): /, "") })
          );
        setCards(next);
        setMode("ask");
      }
    } catch (err) {
      setCaption(t.error((err as Error).message));
    } finally {
      setBusy(false);
    }
  }
  submitRef.current = submit;

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus({ key: "noVoice" });
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    const recog = new SR();
    recog.lang = lang;
    recog.interimResults = true;
    recog.continuous = false;
    finalRef.current = "";
    recog.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) finalRef.current += final;
      setText(finalRef.current + interim);
    };
    recog.onerror = (e: any) => setStatus({ key: "voiceError", detail: e.error });
    recog.onend = () => {
      setListening(false);
      if (finalRef.current) submitRef.current(finalRef.current);
      finalRef.current = "";
    };
    recogRef.current = recog;
    recog.start();
    setListening(true);
  }

  const statusText = status ? `${t.status[status.key]}${status.detail ? `: ${status.detail}` : ""}` : "";

  return (
    <div className="hud">
      <video ref={videoRef} autoPlay playsInline muted />
      <div className="hud-overlay">
        <div className="hud-top">
          <div className="hud-tag">
            <b>{machine?.id ?? machineId}</b> · {machine ? `${machine.model} ${machine.type}` : "..."}
            <br />
            <span className="muted">{machine?.site}</span>
            {user && (
              <>
                <br />
                <span>👷 {user.name} · {t.technician(user.experience === "senior")}</span>
              </>
            )}
          </div>
          <div className="hud-controls-top">
            <button className="btn" onClick={scan}>{t.scan}</button>
            <button className="btn" onClick={toggleFrame}>{showFrame ? t.hideFrame : t.showFrame}</button>
            <select className="select" value={voiceName} onChange={(e) => chooseVoice(e.target.value)} title="Voice">
              <option value="auto">{t.voiceAuto}{langVoices[0] ? ` (${shortVoiceName(langVoices[0].name)})` : ""}</option>
              {langVoices.map((v) => (
                <option key={v.name} value={v.name}>{shortVoiceName(v.name)}</option>
              ))}
            </select>
            <button className="btn" title="Preview voice" onClick={() => speak(t.preview)}>
              🔊
            </button>
            <select className="select" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              {entities?.machines.map((m) => (
                <option key={m.id} value={m.id}>{m.id} · {m.model}</option>
              ))}
            </select>
            <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {entities?.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.experience}, {u.language})</option>
              ))}
            </select>
            <a className="btn" href="/dashboard" target="_blank" rel="noreferrer">Dashboard ↗</a>
          </div>
        </div>

        <div className="hud-middle">
          {(showFrame || scanning) && (
            <div className={`reticle ${scanning ? "scanning" : ""}`}>
              <span className="reticle-label">{scanning ? t.scanningTag : t.aimAtTag}</span>
            </div>
          )}
          <div className="hud-cards">
            {cards.map((c) => (
              <div key={c.id} className={`hud-card ${c.kind}`}>
                <h4>{c.title}</h4>
                {c.body}
              </div>
            ))}
          </div>
        </div>

        <div className="hud-bottom">
          <div className="caption">
            {transcript && <div className="you">🎙 {transcript}</div>}
            {caption ?? t.intro}
          </div>
          <div className="hud-input-row">
            <div className="mode-toggle">
              <button className={mode === "ask" ? "active" : ""} onClick={() => setMode("ask")}>{t.ask}</button>
              <button className={mode === "log" ? "active" : ""} onClick={() => setMode("log")}>{t.log}</button>
            </div>
            <input
              className="input"
              value={text}
              placeholder={mode === "ask" ? t.askPlaceholder : t.logPlaceholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(text)}
              disabled={busy}
            />
            <label className="btn" title="Attach what the camera sees">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> 📷
            </label>
            <button className={`mic ${listening ? "listening" : ""}`} onClick={toggleMic} disabled={busy} aria-label="Talk">
              🎙
            </button>
          </div>
          <div className="hud-status">
            {busy ? t.working : listening ? t.listening : statusText}
            {entities && ` · ${entities.aiEnabled ? t.aiMode : t.demoMode}`}
          </div>
          <div>
            {t.prompts.map((p) => (
              <button
                key={p.text}
                className="chip"
                onClick={() => {
                  setMode(p.mode);
                  setText(p.text);
                }}
              >
                {p.mode === "ask" ? t.ask : t.log}: {p.text.length > 48 ? `${p.text.slice(0, 48)}...` : p.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
