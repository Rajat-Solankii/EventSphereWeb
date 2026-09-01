/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-text': '#000000',
        'theme-bg': '#FFFFFF',
        'theme-primary': '#6F6F6F',
        'theme-secondary': '#000000',
        'theme-accent': '#6F6F6F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      }
    },
  },
  plugins: [],
}
