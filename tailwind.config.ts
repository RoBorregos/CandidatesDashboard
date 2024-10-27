import { arch } from "os";
import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.tsx", "./r/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        "blue-rbrgs": "#051B72",
        roboblue: "#0A38EF",
        "rbrgs-blue": "#0070F3",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        jersey_25: ["var(--font-jersey-25)"],
        anton: ["var(--font-anton)"],
        archivo: ["var(--font-archivo)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
