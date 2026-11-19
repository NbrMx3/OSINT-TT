/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        slate: "#667085",
        canvas: "#f6f8fb",
        navy: "#101828",
        signal: "#18b6a4",
      },
      boxShadow: {
        panel: "0 12px 32px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};
