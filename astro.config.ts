import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://liberalisme-democratique.uk',
  // Preserve the pre-Astro 7 whitespace behavior for French typography.
  compressHTML: true,
  integrations: [mdx(), sitemap()],
  server: {
    host: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // Astro 7 defaults to Sätteri; keep the unified pipeline for
    // remark-math and rehype-katex.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { output: 'htmlAndMathml' }]],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
