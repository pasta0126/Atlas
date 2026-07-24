import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía humanista para el contenido leído/escrito (editor, preview);
// el sans-serif de arriba queda para el "chrome" mínimo de la interfaz —
// ver specs/02-design.md §8.
const sourceSerif = Source_Serif_4({
  variable: "--font-content-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas — notas personales sobre Markdown y Git",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
