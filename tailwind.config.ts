import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        /* ── shadcn/ui CSS variable colors ── */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },

        /* ── Stitch Design System: MD3 Token Colors ── */
        // Primary Indigo spectrum
        "indigo": {
          DEFAULT: "#4F46E5",
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Secondary Violet spectrum
        "violet": {
          DEFAULT: "#7C3AED",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },
        // Emerald for success
        "emerald": {
          DEFAULT: "#10B981",
          500: "#10B981",
          600: "#059669",
        },
        // Amber for warnings
        "amber": {
          DEFAULT: "#F59E0B",
          500: "#F59E0B",
          600: "#D97706",
        },
        // Rose for destructive
        "rose": {
          DEFAULT: "#F43F5E",
          500: "#F43F5E",
          600: "#E11D48",
        },

        /* ── MD3 Surface Hierarchy Tokens ── */
        "surface": {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          tint: "#4d44e3",
          variant: "#d3e4fe",
        },
        "surface-container": {
          lowest: "#ffffff",
          low: "#eff4ff",
          DEFAULT: "#e5eeff",
          high: "#dce9ff",
          highest: "#d3e4fe",
        },

        /* ── MD3 On-Surface & Content Tokens ── */
        "on-surface": {
          DEFAULT: "#0b1c30",
          variant: "#464555",
        },
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",

        /* ── MD3 Outline Tokens ── */
        "outline": {
          DEFAULT: "#777587",
          variant: "#c7c4d8",
        },

        /* ── MD3 Container & Fixed Tokens ── */
        "primary-container": "#4f46e5",
        "secondary-container": "#8a4cfc",
        "primary-fixed": {
          DEFAULT: "#e2dfff",
          dim: "#c3c0ff",
        },
        "secondary-fixed": {
          DEFAULT: "#eaddff",
          dim: "#d2bbff",
        },
        "on-primary-container": "#dad7ff",
        "on-secondary-container": "#fffbff",

        /* ── MD3 Inverse Tokens ── */
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        "inverse-primary": "#c3c0ff",

        /* ── MD3 Error Tokens ── */
        "error": {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        /* ── MD3 Tertiary Tokens ── */
        "tertiary": {
          DEFAULT: "#7e3000",
          container: "#a44100",
        },

        /* ── Legacy brand aliases (backwards compat) ── */
        navy: {
          DEFAULT: "#0B0F3F",
          50: "#E8E9F4",
          100: "#C5C8E3",
          200: "#9EA4D1",
          300: "#777FBF",
          400: "#5A63B2",
          500: "#3D47A5",
          600: "#2F3894",
          700: "#202980",
          800: "#141B67",
          900: "#0B0F3F",
        },
        "brand-blue": {
          DEFAULT: "#4F46E5",
          50: "#EEF2FF",
          500: "#4F46E5",
          600: "#4338CA",
        },
        "brand-purple": {
          DEFAULT: "#7C3AED",
          light: "#8B5CF6",
          dark: "#6D28D9",
        },
        "brand-cyan": {
          DEFAULT: "#4FD1FF",
          light: "#4FD1FF",
          dark: "#0077FF",
        },
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        "ambient": "0px 20px 50px rgba(11, 28, 48, 0.06)",
        "ambient-md": "0px 10px 30px rgba(11, 28, 48, 0.08)",
        "ambient-lg": "0px 25px 60px rgba(11, 28, 48, 0.12)",
        "glow-primary": "0 0 20px rgba(79, 70, 229, 0.15)",
        "glow-violet": "0 0 20px rgba(124, 58, 237, 0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
