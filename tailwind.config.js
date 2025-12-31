/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors (driven by ThemeContext CSS variables)
        'primary-blue': 'var(--primary-color)',
        'primary-green': 'var(--secondary-color)',
        'accent-mustard': 'var(--accent-color)',
        'danger-red': 'var(--danger-color)',
        'neutral-light-gray': '#E5E5E5',
        'neutral-anthracite': '#2B2B2B',
      },
      maxWidth: {
        'content': '1230px',
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
