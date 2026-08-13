// Función serverless: recibe un audio y lo transcribe con Whisper vía Groq.
// La API key vive como variable de entorno GROQ_API_KEY en Vercel (segura,
// nunca se expone al navegador). Groq tiene plan gratuito.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return Response.json(
      { error: "Falta configurar GROQ_API_KEY en Vercel (Settings → Environment Variables)." },
      { status: 500 }
    );
  }
  let file;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch (e) {
    return Response.json({ error: "No se pudo leer el audio." }, { status: 400 });
  }
  if (!file) return Response.json({ error: "No llegó audio." }, { status: 400 });

  const fd = new FormData();
  fd.append("file", file, "audio.webm");
  fd.append("model", "whisper-large-v3-turbo"); // rápido y preciso; en el plan gratis de Groq
  fd.append("language", "es");
  fd.append("response_format", "json");

  try {
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return Response.json(
        { error: (data && data.error && data.error.message) || "Error de transcripción." },
        { status: 502 }
      );
    }
    return Response.json({ text: (data && data.text) || "" });
  } catch (e) {
    return Response.json({ error: "No se pudo contactar el servicio de transcripción." }, { status: 502 });
  }
}
