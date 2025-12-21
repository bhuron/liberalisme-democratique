/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson', 'sans-serif'],
      },
      colors: {
        accent: '#2337ff',
        'accent-dark': '#000d8a',
        black: 'rgb(15, 18, 25)',
        gray: {
          DEFAULT: 'rgb(96, 115, 159)',
          light: 'rgb(229, 233, 240)',
          dark: 'rgb(34, 41, 57)',
        },
      },
      backgroundImage: {
        'gradient-gray': 'linear-gradient(rgba(229, 233, 240, 0.5), #fff)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.gray.dark'),
            '--tw-prose-headings': theme('colors.black'),
            '--tw-prose-links': theme('colors.accent'),
            '--tw-prose-bold': theme('colors.black'),
            '--tw-prose-counters': theme('colors.gray'),
            '--tw-prose-bullets': theme('colors.gray'),
            '--tw-prose-hr': theme('colors.gray.light'),
            '--tw-prose-quotes': theme('colors.gray.dark'),
            '--tw-prose-quote-borders': theme('colors.accent'),
            '--tw-prose-captions': theme('colors.gray'),
            '--tw-prose-code': theme('colors.gray.dark'),
            '--tw-prose-pre-code': theme('colors.gray.dark'),
            '--tw-prose-pre-bg': theme('colors.gray.light'),
            '--tw-prose-th-borders': theme('colors.gray.light'),
            '--tw-prose-td-borders': theme('colors.gray.light'),
            maxWidth: 'none',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};