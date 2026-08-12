/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0F172A', // Slate 900
        darkcard: '#1E293B', // Slate 800
        darkborder: '#334155', // Slate 700
      },
    },
  },
  plugins: [],
}
