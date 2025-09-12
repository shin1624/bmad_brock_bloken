/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          neon: {
            cyan: '#00ffff',
            magenta: '#ff00ff',
            yellow: '#ffff00',
            dark: '#0a0a0a',
          }
        },
        animation: {
          'glow': 'glow 2s ease-in-out infinite alternate',
        },
        keyframes: {
          glow: {
            '0%': { boxShadow: '0 0 20px #00ffff' },
            '100%': { boxShadow: '0 0 30px #00ffff, 0 0 40px #ff00ff' },
          }
        }
      },
    },
    plugins: [],
  }