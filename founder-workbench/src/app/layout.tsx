import type { Metadata } from "next";
import "./globals.css";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = {
  title: "Founder Workbench",
  description:
    "A case-file workbench that takes one business idea from intake to a first sale — or a written kill — through evidence-gated stages. Not a chat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Masthead />
        <main className="mx-auto max-w-case px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
