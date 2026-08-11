import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Masthead } from "@/components/Masthead";

// The serif of record + the mono of data. Loaded self-hosted by next/font so
// there is no external request at runtime.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Founder Workbench",
  description:
    "A case-file workbench that takes one business idea from intake to a first sale — or a written kill — through evidence-gated stages. Not a chat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Committed dark: a private counsel's study. Print forces paper white.
    <html
      lang="en"
      data-theme="dark"
      className={`${newsreader.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Masthead />
        <main className="mx-auto max-w-case px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
