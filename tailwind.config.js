/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '70%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float-up': {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '15%': { transform: 'translateY(0)', opacity: '1' },
          '75%': { transform: 'translateY(-10px)', opacity: '1' },
          '100%': { transform: 'translateY(-22px)', opacity: '0' },
        },
        nudge: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
        /* Gentle hover on the "tap me" badges over each storage counter. */
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18%)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 220ms ease-out',
        'float-up': 'float-up 2200ms ease-out forwards',
        nudge: 'nudge 220ms ease-in-out',
        bob: 'bob 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
