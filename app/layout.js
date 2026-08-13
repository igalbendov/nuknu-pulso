import "./globals.css";

export const metadata = {
  title: "NUKNU · Pulso",
  description: "El equipo NUKNU, al día: novedades, rendiciones y minutas.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F1EB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
