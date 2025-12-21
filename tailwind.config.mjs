/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Atkinson', 'sans-serif'],
      },
      colors: {
        // Minimal color palette
        accent: {
          DEFAULT: '#2563eb', // Calm blue
          dark: '#1d4ed8',
        },
        black: '#1f2937', // Dark gray instead of pure black
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      backgroundImage: {
        // Remove gradient for minimal design
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.gray.700'),
            '--tw-prose-headings': theme('colors.black'),
            '--tw-prose-links': theme('colors.accent.DEFAULT'),
            '--tw-prose-bold': theme('colors.black'),
            '--tw-prose-counters': theme('colors.gray.600'),
            '--tw-prose-bullets': theme('colors.gray.600'),
            '--tw-prose-hr': theme('colors.gray.200'),
            '--tw-prose-quotes': theme('colors.gray.700'),
            '--tw-prose-quote-borders': theme('colors.accent.DEFAULT'),
            '--tw-prose-captions': theme('colors.gray.600'),
            '--tw-prose-code': theme('colors.gray.700'),
            '--tw-prose-pre-code': theme('colors.gray.700'),
            '--tw-prose-pre-bg': theme('colors.gray.100'),
            '--tw-prose-th-borders': theme('colors.gray.200'),
            '--tw-prose-td-borders': theme('colors.gray.200'),
            maxWidth: '65ch',
            fontSize: '1.125rem',
            lineHeight: '1.75',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};