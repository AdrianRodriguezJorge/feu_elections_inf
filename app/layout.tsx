import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elecciones FEU · Facultad de Ingeniería Informática (CUJAE)",
  description:
    "Sistema oficial de votación secreta y escrutinio del Secretariado de la Facultad de Ingeniería Informática, FEU - CUJAE.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
