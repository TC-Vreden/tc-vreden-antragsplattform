import "./globals.css";
import type { Metadata } from "next";
import { Bowlby_One_SC, PT_Sans } from "next/font/google";

const headingFont = Bowlby_One_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading"
});

const bodyFont = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "TC Vreden Antragsplattform",
  description: "Digitaler Prototyp fuer Mitgliedsantraege und interne Vereinsverwaltung."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
