/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9ecff', 200: '#bcdfff', 300: '#8ecbff',
          400: '#59acff', 500: '#338bff', 600: '#1c6bf5', 700: '#1554e1',
          800: '#1844b6', 900: '#1a3c8f', 950: '#142656',
        },
      },
    },
  },
  plugins: [],
};
