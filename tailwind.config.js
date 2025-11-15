/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#009fd6',
        'primary-green': '#87b433',
        'accent-mustard': '#D4A017',
        'neutral-light-gray': '#E5E5E5',
        'neutral-anthracite': '#2B2B2B',
      },
      maxWidth: {
        'content': '830px',
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      borderRadius: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
      },
    },
  },
  plugins: [],
}
