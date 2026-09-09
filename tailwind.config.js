/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gpt: {
          bg: '#212121',
          surface: '#181818',
          card: '#2F2F2F',
          border: '#383838',
          subtle: '#424242',
          text: '#ECECEC',
          muted: '#B4B4B4',
        },
        aesthetic: {
          blue: '#2563EB',
          blueLight: '#3B82F6',
          blueHover: '#1D4ED8',
          ice: '#EFF6FF',
          iceBorder: '#BFDBFE',
        }
      },
    },
  },
  plugins: [],
}
