/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",        // genera archivos estáticos en /out para subir arrastrando
  images: { unoptimized: true },
};

module.exports = nextConfig;
