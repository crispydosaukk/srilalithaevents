/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          primary: '#9B1B30',
          dark: '#7A1526',
          light: '#BD213B',
          muted: 'rgba(155,27,48,0.15)',
        },
        gold: {
          primary: '#C8860A',
          dark: '#A06A05',
          light: '#F0A830',
          muted: 'rgba(200,134,10,0.15)',
          pale: '#FFF8E7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          lighter: '#FAFAFA',
          border: '#E5E7EB',
          text: '#1F2937',
          muted: '#4B5563',
        },
        linen: {
          DEFAULT: '#FFF8E7',
          dark: '#F5EDD0',
        },
        coral: {
          DEFAULT: '#E8834A',
          dark: '#C96830',
          muted: 'rgba(232,131,74,0.15)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      fontSize: {
        '10': '10px',
        '11': '11px',
        '9': '9px',
      },
      letterSpacing: {
        '04': '0.04em',
        '08': '0.08em',
        '16': '0.16em',
        '24': '0.24em',
      },
      borderRadius: {
        'arch': '12rem',
        '3xl': '1.5rem',
      },
      animation: {
        'spin-slow': 'spinSlow 14s linear infinite',
        'marquee': 'marquee 28s linear infinite',
        'honey-pulse': 'honeyPulse 2s ease-in-out infinite',
      },
      keyframes: {
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        honeyPulse: {
          '0%, 100%': { textShadow: '0 0 0px rgba(200,134,10,0)' },
          '50%': { textShadow: '0 0 20px rgba(200,134,10,0.4)' },
        },
      },
      boxShadow: {
        'card-dark': '0 4px 24px rgba(26, 15, 0, 0.4)',
        'card-light': '0 4px 24px rgba(26, 15, 0, 0.08)',
        'honey-glow': '0 0 40px rgba(200, 134, 10, 0.25)',
        'gold-glow': '0 0 30px rgba(212, 160, 23, 0.35)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};