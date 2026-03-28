import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#07131f",
        surface: "#102233",
        panel: "#16324a",
        accent: "#f1b24a",
        mint: "#53d3a1",
        rose: "#f16f79",
        fog: "#a8bdd1"
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(83, 211, 161, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
