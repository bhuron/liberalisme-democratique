
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://liberalisme-democratique.uk',
  integrations: [
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { output: 'html' }]],
    }),
    sitemap(),
  ],
  server: {
    host: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark',
      langs: ['javascript', 'typescript', 'python', 'html', 'css', 'bash', 'json'] as any[],
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { output: 'html' }]],
  },

  // Image optimization configuration
  image: {
    // Allow remote images from common Ghost hosting platforms
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ghost.io', // Ghost(Pro) hosted blogs
      },
      // Add your Ghost domain here if self-hosted:
      {
        protocol: 'https',
        hostname: 'liberalisme-democratique.uk',
      },
    ],
    // Service configuration
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});