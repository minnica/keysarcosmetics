import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        title: ["Libre Baskerville", "serif"],
        body: ["Afacad", "sans-serif"],
      },
      colors: {
        keysar: {
          cream: "#f7f1e8",
          "rose-100": "#e8d8ca",
          "rose-200": "#d7bca8",
          "rose-300": "#c29b82",
          text: "#4a4038",
          gold: "#a9784b",
          gray: "#766c63",
          dark: "#241f1a",
          clay: "#b68668",
          linen: "#fbf8f2",
          sand: "#efe3d6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
