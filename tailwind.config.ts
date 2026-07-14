import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0a0a14",
        saffron: "#ef9f27",
        magenta: "#d4538a",
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        logo: ["Playfair Display", "serif"],
      },
    },
  },
} satisfies Config;
