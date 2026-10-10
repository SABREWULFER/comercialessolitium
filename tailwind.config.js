/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        solitium: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#00549c', // Solitium Primary Blue
          600: '#00437d',
          700: '#00335e',
          accent: '#e62b1e', // Solitium Red accent
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
