export interface ImageInput {
  mimeType: string;
  data: string;
}

export function aiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function parseDataUrl(dataUrl?: string): ImageInput | undefined {
  if (!dataUrl) return undefined;
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  return m ? { mimeType: m[1], data: m[2] } : undefined;
}

export async function generateJSON<T>(system: string, prompt: string, image?: ImageInput): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    });
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    console.error("Gemini request failed", err);
    return null;
  }
}
