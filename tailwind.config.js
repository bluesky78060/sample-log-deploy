/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #3B82F6)',
        'background-light': '#F8FAFC',
        'background-dark': '#18181B',
      },
      fontFamily: {
        display: ['Noto Sans KR', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
