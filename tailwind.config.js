/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          sidebar: '#252526',
          bg: '#1e1e1e',
          border: '#333333',
          accent: '#d16a6a',
          accentHover: '#c05b5b',
          input: '#3c3c3c'
        }
      }
    },
  },
  plugins: [],
}
