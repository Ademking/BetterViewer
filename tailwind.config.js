/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./**/*.tsx"],
  plugins: [],
  theme: {
    extend: {
      fontFamily: {
        Inter: ['Inter', 'sans-serif'],
      }
    }
  },
}