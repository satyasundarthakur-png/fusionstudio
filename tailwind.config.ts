import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0a0a14",
        saffron:  "#ef9f27",
        magenta:  "#d4538a",
        raga:     "#1a0933",
        ember:    "#ff6b2b",
        gold:     "#f5c842",
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        logo: ["Playfair Display", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gradient-saffron": "linear-gradient(130deg, #f5c842 0%, #ef9f27 55%, #fbbf24 100%)",
        "gradient-magenta": "linear-gradient(130deg, #d4538a 0%, #e879a3 100%)",
        "gradient-hero":    "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(239,159,39,0.09) 0%, transparent 70%)",
      },
      boxShadow: {
        "glow-saffron": "0 0 24px rgba(239, 159, 39, 0.35)",
        "glow-magenta": "0 0 24px rgba(212, 83, 138, 0.35)",
        "card":         "0 4px 24px rgba(0, 0, 0, 0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
} satisfies Config;
