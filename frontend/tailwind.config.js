/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: { 50: "#f5f7fa", 200: "#e2e8f0", 800: "#172b4d" },
        emerald: { 600: "#15803d" },
        rose: { 600: "#dc2626" },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
}
