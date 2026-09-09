/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        line: 'var(--line)',
        ink: {
          DEFAULT: 'var(--ink)',
          dim: 'var(--ink-dim)',
        },
        blue: {
          DEFAULT: 'var(--blue)',
          soft: 'var(--blue-soft)',
          line: 'var(--blue-line)',
        },
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', 'Georgia', 'serif'],
        sans: ['-apple-system', '"Inter"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        frame: '0 1px 3px rgba(0,0,0,0.03)',
        'orb-glow': '0 0 50px rgba(62,99,221,0.22)',
      },
      borderRadius: {
        frame: '12px',
        card: '10px',
        btn: '8px',
        bubble: '14px',
        pill: '20px',
      },
    },
  },
  plugins: [],
}
