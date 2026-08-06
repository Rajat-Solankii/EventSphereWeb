/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-text': '#081317',
        'theme-bg': '#f8fcfd',
        'theme-primary': '#4fb2c0',
        'theme-secondary': '#97a1da',
        'theme-accent': '#7172cc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
