import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Professional Theme
        background:  "#0a0a0a",
        foreground:  "#f5f5f5",
        card:        "#111111",
        "card-foreground": "#f5f5f5",
        border:      "#222222",
        input:       "#1a1a1a",
        muted:       "#1a1a1a",
        "muted-foreground": "#888888",
        // Gold Accent
        gold:        "#c9a84c",
        "gold-light": "#e8c96a",
        "gold-dark": "#a07830",
        "gold-muted": "#c9a84c20",
        // Semantic
        primary:     "#c9a84c",
        "primary-foreground": "#0a0a0a",
        secondary:   "#1a1a1a",
        "secondary-foreground": "#f5f5f5",
        destructive: "#ef4444",
        "destructive-foreground": "#f5f5f5",
        accent:      "#1a1a1a",
        "accent-foreground": "#f5f5f5",
        popover:     "#111111",
        "popover-foreground": "#f5f5f5",
        ring:        "#c9a84c",
        // Heat Status
        heat: {
          hot:  "#ef4444",
          warm: "#f59e0b",
          cold: "#3b82f6",
          dead: "#6b7280",
        },
        // Status
        success:  "#22c55e",
        warning:  "#f59e0b",
        info:     "#3b82f6",
      },
      fontFamily: {
        sans:    ["DM Sans", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        gold:     "0 0 20px rgba(201, 168, 76, 0.15)",
        "gold-sm": "0 0 10px rgba(201, 168, 76, 0.1)",
        card:     "0 1px 3px rgba(0, 0, 0, 0.5)",
        elegant:  "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease-in-out",
        "slide-up":  "slideUp 0.4s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "brain":     "brain 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(201, 168, 76, 0.1)" },
          "50%":      { boxShadow: "0 0 25px rgba(201, 168, 76, 0.3)" },
        },
        brain: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%":      { transform: "scale(1.05)", opacity: "0.8" },
        },
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #c9a84c, #a07830)",
        "gradient-dark": "linear-gradient(135deg, #111111, #0a0a0a)",
        "gradient-card": "linear-gradient(135deg, #1a1a1a, #111111)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
    },
  },
  plugins: [animate],
};

export default config;
