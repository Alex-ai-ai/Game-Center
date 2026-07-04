/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        blood: '#ff2a2a',
        'blood-dim': '#a01717',
        warn: '#ff7a18',
        ash: '#0a0a0c',
        dust: '#1a1a1f',
        bone: '#e8e2da',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"Rajdhani"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
