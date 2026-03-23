/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors matching the CSS variables
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
      },
    },
  },
  plugins: [],
}
