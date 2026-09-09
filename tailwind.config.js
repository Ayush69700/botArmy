/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          gold: '#FFB000',
          orange: '#FF7A00',
          flame: '#E84A27',
          maroon: '#8C1D40',
          cream: '#FFF1D6',
          dark: '#12100E',
          card: '#1A1614',
          border: '#2E2420',
          muted: '#8A7A70',
        },
      },
    },
  },
  plugins: [],
}
