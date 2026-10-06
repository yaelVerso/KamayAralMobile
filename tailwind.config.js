/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0BC2D7',
          secondary: '#FFA93C',
          brown: '#694B26',
        },
      },
    },
  },
  plugins: [],
}
