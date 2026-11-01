import type { Config } from "tailwindcss";

// Tokens follow the shared Mendyr design contract (UPGRADE_CONTRACT.md §2): primary #1262E2,
// teal accent, slate neutrals, page background #F7F9FC, Outfit for headings and Inter for
// body. Static values (Tailwind v3) rather than CSS variables — this portal doesn't re-theme.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EBF2FE",
          100: "#D6E5FD",
          200: "#A3C5FA",
          300: "#63B0F2",
          400: "#3A82E8",
          500: "#1262E2",
          600: "#1262E2",
          700: "#0F4ABF",
          800: "#0C3B98",
          900: "#092C70",
        },
        accent: { 50: "#ECFDFC", 100: "#CCFBF7", 500: "#0EA5A4", 600: "#0D9488", 700: "#0F766E" },
        success: { 50: "#F0FDF4", 100: "#DCFCE7", DEFAULT: "#16A34A", 600: "#16A34A", 700: "#15803D" },
        warning: { 50: "#FFFBEB", 100: "#FEF3C7", DEFAULT: "#F59E0B", 600: "#D97706", 700: "#B45309" },
        danger: { 50: "#FEF2F2", 100: "#FEE2E2", DEFAULT: "#EF4444", 600: "#DC2626", 700: "#B91C1C" },
        destructive: "#EF4444",
        page: "#F7F9FC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        input: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)",
        lift: "0 12px 40px rgba(15, 23, 42, 0.12)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(24px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "none" } },
        "pop-in": { from: { transform: "scale(0.97) translateY(4px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        "toast-in": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-in-left": "slide-in-left 200ms ease-out",
        "pop-in": "pop-in 180ms ease-out",
        "toast-in": "toast-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
