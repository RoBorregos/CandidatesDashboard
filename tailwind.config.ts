import { arch } from "os";
import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "blue-rbrgs": "#051B72",
        roboblue: "#0A38EF",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        jersey_25: ["var(--font-jersey-25)"],
        anton: ["var(--font-anton)"],
        archivo: ["var(--font-archivo)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
