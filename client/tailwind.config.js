/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        paper: "#f7f6f2",
        accent: "#256f68"
      }
    }
  },
  plugins: []
};
