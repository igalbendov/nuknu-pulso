/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nota: NO usamos `output: "export"` porque necesitamos la función
  // serverless /api/transcribe (Groq Whisper). Vercel compila Next.js nativo.
};

module.exports = nextConfig;
