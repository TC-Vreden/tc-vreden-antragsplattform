import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TC Vreden Antragsplattform",
  description: "Digitaler Prototyp fuer Mitgliedsantraege und Vorstandsfreigaben."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
