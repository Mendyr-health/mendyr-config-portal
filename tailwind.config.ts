import type { Config } from "tailwindcss";

// Colors and fonts mirror mendyr-frontend's design tokens (apps/patient/src/app/globals.css
// :root block, apps/patient/src/app/layout.tsx) so this portal reads as the same product,
// not a different one — translated from that repo's Tailwind v4 CSS-variable theme into this
// repo's Tailwind v3 config format (this app predates and is intentionally lighter-weight
// than the v4 setup over there, so the tokens are copied as static values, not re-plumbed
// through CSS variables).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — Deep Blue Theme (same values as mendyr-frontend's --primary/-light/-dark).
        brand: {
          50: "#EBF2FE",
          100: "#D6E5FD",
          200: "#A3C5FA",
          300: "#63B0F2", // --primary-light
          400: "#3A82E8",
          500: "#1262E2", // --primary
          600: "#1262E2",
          700: "#0F4ABF", // --primary-dark
          800: "#0C3B98",
          900: "#092C70",
        },
        accent: "#2165BF",
        success: "#16A34A",
        warning: "#F59E0B",
        destructive: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
