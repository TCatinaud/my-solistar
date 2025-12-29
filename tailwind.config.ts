import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        primary: ["var(--font-nunito)", "sans-serif"],
      },
      colors: {
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        'grey-dark': "hsl(var(--grey-dark))",
        'grey-medium': "hsl(var(--grey-medium))",
        'grey-light': "hsl(var(--grey-light))",
        'grey-lighter': "hsl(var(--grey-lighter))",
        black: "hsl(var(--black))",
        white: "hsl(var(--white))",
      },
      container: {
        center: true,
        padding: '1rem'
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
      function ({ addUtilities }: any) {
        const newUtilities = {
          /* Margins */
          '.my-xs': {
            '@apply my-2 lg:my-4': {},
          },
          '.my-sm': {
            '@apply my-4 lg:my-8': {},
          },
          '.my-md': {
            '@apply my-8 lg:my-16': {},
          },
          '.my-lg': {
            '@apply my-16 lg:my-32': {},
          },
          '.mt-xs': {
            '@apply mt-2 lg:mt-4': {},
          },
          '.mt-sm': {
            '@apply mt-4 lg:mt-8': {},
          },
          '.mt-md': {
            '@apply mt-8 lg:mt-16': {},
          },
          '.mt-lg': {
            '@apply mt-16 lg:mt-32': {},
          },
          '.mb-xs': {
            '@apply mb-2 lg:mb-4': {},
          },
          '.mb-sm': {
            '@apply mb-4 lg:mb-8': {},
          },
          '.mb-md': {
            '@apply mb-8 lg:mb-16': {},
          },
          '.mb-lg': {
            '@apply mb-16 lg:mb-32': {},
          },
          /* Padding */
          '.py-xs': {
            '@apply py-2 lg:py-4': {},
          },
          '.py-sm': {
            '@apply py-4 lg:py-8': {},
          },
          '.py-md': {
            '@apply py-8 lg:py-16': {},
          },
          '.py-lg': {
            '@apply py-16 lg:py-32': {},
          },
          '.pt-xs': {
            '@apply pt-2 lg:pt-4': {},
          },
          '.pt-sm': {
            '@apply pt-4 lg:pt-8': {},
          },
          '.pt-md': {
            '@apply pt-8 lg:pt-16': {},
          },
          '.pt-lg': {
            '@apply pt-16 lg:pt-32': {},
          },
          '.pb-xs': {
            '@apply pb-2 lg:pb-4': {},
          },
          '.pb-sm': {
            '@apply pb-4 lg:pb-8': {},
          },
          '.pb-md': {
            '@apply pb-8 lg:pb-16': {},
          },
          '.pb-lg': {
            '@apply pb-16 lg:pb-32': {},
          },
          /* Gap */
          '.gap-xs': {
            '@apply gap-2 lg:gap-4': {},
          },
          '.gap-sm': {
            '@apply gap-4 lg:gap-8': {},
          },
          '.gap-md': {
            '@apply gap-8 lg:gap-16': {},
          },
          '.gap-lg': {
            '@apply gap-16 lg:gap-32': {},
          },
          /* Transitions */
          '.transition-base': {
            '@apply transition-all ease-in-out duration-200': {},
          },
          '.transition-base-colors': {
            '@apply transition-colors ease-in-out duration-200': {},
          },
        };
        addUtilities(newUtilities);
      },
    ],
} satisfies Config

export default config
