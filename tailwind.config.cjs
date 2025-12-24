/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}', './context/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        yt: {
          black: '#0f0f0f',
          gray: '#272727',
          lightgray: '#f1f1f1',
          red: '#ff0000',
          text: '#f1f1f1',
          textSec: '#aaaaaa',
        },
      },
      screens: {
        xs: '400px',
      },
    },
  },
  plugins: [],
};
