/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        'sand': {
          '50': '#fafaf9',
        },
        'turquoise': {
          '400': '#2dd4bf',
          '500': '#14b8a6',
        },
        'purple': {
          '100': '#f3e8ff',
          '600': '#9333ea',
          '700': '#7e22ce',
        },
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [],
} 