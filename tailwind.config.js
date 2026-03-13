/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        gothic: [
          '"MS PGothic"',
          '"ＭＳ Ｐゴシック"',
          '"Meiryo"',
          '"HG丸ゴシックM-PRO"',
          "sans-serif",
        ],
        mincho: ['"MS PMincho"', '"ＭＳ Ｐ明朝"', '"HGS明朝E"', "serif"],
      },
      colors: {
        melon: {
          green: "#00CD3C",
          darkgreen: "#009624",
          bg: "#F5F5F5",
          sidebar: "#2B2B3D",
          header: "#1B1B2F",
          card: "#FFFFFF",
          accent: "#E94560",
          surface: "#FFFFFF",
          text: "#222222",
          muted: "#777777",
          border: "#E0E0E0",
          darkborder: "#3A3A50",
          lightgray: "#FAFAFA",
          tablebg: "#F9F9F9",
          tablerow: "#FFFFFF",
          tablealt: "#F5F5F5",
        },
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        marquee: "marquee 10s linear infinite",
      },
    },
  },
  plugins: [],
};
