import "./globals.css";

export const metadata = {
  title: "NUKNU · Pulso — Estado del equipo",
  description: "Todo el equipo al día: quién está en qué, ahora mismo.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1115",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
