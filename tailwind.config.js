/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f7f5',
          100: '#e7ece7',
          200: '#cfd9cf',
          300: '#aec0ae',
          400: '#86a386',
          500: '#638463',
          600: '#2D5A27', // Rainforest Green Anchor
          700: '#24491f',
          800: '#1B3618',
          900: '#122410',
          950: '#091208',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'smooth': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'smooth-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'brand': '0 4px 14px 0 rgba(45, 90, 39, 0.2)',
      },
    },
  },
  plugins: [],
}
