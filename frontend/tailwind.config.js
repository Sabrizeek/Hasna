/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandBlue: "#003366",
        brandGold: "#D4AF37",
        brandBg: "#F8FAFC",
        brandText: "#1E293B",
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgba(0, 51, 102, 0.45)",
      },
    },
  },
  plugins: [],
};
