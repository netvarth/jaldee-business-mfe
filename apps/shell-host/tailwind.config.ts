export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
  safelist: [
    'grid-cols-4',
    'md:grid-cols-4',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};