import type { Metadata } from "next";
import { Poppins, Nunito_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Funding Guide — Pangaea Youth Network",
  description: "Funding call discovery and fit scoring for Pangaea Youth Network",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${nunitoSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">{children}</body>
    </html>
  );
}
