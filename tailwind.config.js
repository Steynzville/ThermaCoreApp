/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          900: "#1e3a8a",
        },
        green: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#a7f3d0",
          500: "#22c55e",
          600: "#16a34a",
          900: "#064e3b",
        },
        red: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          500: "#ef4444",
          600: "#dc2626",
          900: "#7f1d1d",
        },
        yellow: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fde68a",
          500: "#eab308",
          600: "#ca8a04",
          900: "#78350f",
        },
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          500: "#f97316",
          600: "#ea580c",
          900: "#7c2d12",
        },
        purple: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          500: "#a855f7",
          600: "#9333ea",
          900: "#4c1d95",
        },
      },
    },
  },
  plugins: [],
};
