/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d8eaff',
          500: '#1f6feb',
          600: '#0f5fdc',
          700: '#0a4cb5',
        },
      },
    },
  },
  plugins: [],
};
