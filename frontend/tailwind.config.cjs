/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1B1F",
        accent: "#FF5A7A",
        accent2: "#7C3AED"
      },
      backgroundImage: {
        sunset:
          "radial-gradient(900px circle at 15% 10%, rgba(255,122,90,.18), transparent 55%), radial-gradient(800px circle at 85% 0%, rgba(124,58,237,.16), transparent 52%), radial-gradient(700px circle at 70% 85%, rgba(255,90,122,.12), transparent 55%), linear-gradient(180deg, #FFF1E6, #F3E8FF)",
        sunsetDark:
          "radial-gradient(900px circle at 15% 10%, rgba(255,154,122,.14), transparent 58%), radial-gradient(800px circle at 85% 0%, rgba(167,139,250,.14), transparent 54%), radial-gradient(700px circle at 70% 85%, rgba(255,90,122,.10), transparent 60%), linear-gradient(180deg, #070812, #0B1022)"
      }
    }
  },
  plugins: []
};
