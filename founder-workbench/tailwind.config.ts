import type { Config } from "tailwindcss";

/**
 * The workbench reads as a serious instrument: a warm paper ground, ink text,
 * hairline rules, and a restrained signal palette (verdict green / red / amber).
 * No gradients, no rounded-everything, no purple AI palette.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-raised": "var(--paper-raised)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        rule: "var(--rule)",
        accent: "var(--accent)",
        supports: "var(--supports)",
        contradicts: "var(--contradicts)",
        inconclusive: "var(--inconclusive)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        // deliberately tight; this is an instrument, not a toy
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
      maxWidth: {
        measure: "68ch",
        case: "1080px",
      },
    },
  },
  plugins: [],
};

export default config;
