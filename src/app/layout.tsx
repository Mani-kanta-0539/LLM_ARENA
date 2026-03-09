import type { Metadata } from "next";
import { Orbitron, Inter, Bangers } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bangers = Bangers({
  weight: "400",
  variable: "--font-bangers",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLM Arena",
  description: "An AI-powered pixel-art neon arena for LLM debates, learning, and automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${orbitron.variable} ${bangers.variable} antialiased bg-dark-bg text-gray-100 selection:bg-neon-pink selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
