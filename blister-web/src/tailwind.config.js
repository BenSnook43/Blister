/** @type {import('tailwindcss').Config} */
const config = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        colors: {
          'sand': {
            50: '#faf9f7',
            100: '#f5f4f1',
          },
          'turquoise': {
            200: '#97f1e7',
            400: '#40E0D0',
            500: '#2dd4c2',
          },
          'purple': {
            100: '#f3e8ff',
            200: '#e9d5ff',
            600: '#9333ea',
            700: '#7e22ce',
          },
        },
        scale: {
          '102': '1.02',
        },
      },
    },
    plugins: [],
  };

export default config;