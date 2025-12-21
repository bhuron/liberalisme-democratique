# Product Requirements Document: Astro Static Blog

## Project Overview
Build a modern, performant static blog using Astro with MDX support, optimized for deployment on Vercel or Cloudflare Pages.

**Language**: French (all content, UI text, and metadata)

## Technical Stack
- **Framework**: Astro (latest stable version)
- **Content**: MDX for blog posts
- **Styling**: Tailwind CSS
- **Deployment**: Vercel or Cloudflare Pages
- **Node Version**: 18.x or higher

## Core Requirements

### 1. Project Structure
```
/
├── src/
│   ├── components/
│   │   ├── BlogCard.astro
│   │   ├── CodeBlock.astro
│   │   └── Layout.astro
│   ├── content/
│   │   ├── config.ts
│   │   └── blog/
│   │       ├── post-1.mdx
│   │       └── post-2.mdx
│   ├── pages/
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   └── styles/
│       └── global.css
├── public/
│   └── images/
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

### 2. Content Management

#### Blog Post Schema (content/config.ts)
Define a collection schema with the following frontmatter fields:
- `title` (string, required) - in French
- `description` (string, required) - in French
- `pubDate` (date, required)
- `author` (string, optional, default: site author)
- `image` (object with src and alt, optional)
- `tags` (array of strings, optional) - in French
- `draft` (boolean, optional, default: false)

#### MDX Configuration
- Enable MDX integration via `@astrojs/mdx`
- Support for embedding custom React/Astro components within posts
- Configure remark and rehype plugins for enhanced markdown processing

### 3. Pages

#### Home Page (/)
- Hero section with site title and tagline (in French)
- Featured posts section showing 3-6 most recent posts
- Call-to-action to view all blog posts (e.g., "Voir tous les articles")
- Responsive layout using Tailwind

#### Blog Listing Page (/blog)
- Display all published posts (exclude drafts)
- Each post card should show:
  - Featured image (if available)
  - Title
  - Description/excerpt
  - Publication date (formatted in French, e.g., "21 décembre 2025")
  - Tags (if available)
  - Read time estimate (optional enhancement, e.g., "5 min de lecture")
- Sort posts by date (newest first)
- Responsive grid layout (1 column mobile, 2-3 columns desktop)
- Clean, minimal design with good typography
- French UI labels (e.g., "Articles", "Publié le", "Étiquettes")

#### Individual Post Page (/blog/[slug])
- Full post content rendered from MDX
- Post metadata header (title, date, author, tags)
- Featured image (if available)
- Table of contents with French heading (optional enhancement, e.g., "Table des matières")
- Previous/Next post navigation with French labels (e.g., "Article précédent", "Article suivant")
- Responsive typography optimized for reading
- Proper semantic HTML structure

### 4. Syntax Highlighting

**Requirements:**
- Syntax highlighting for code blocks in MDX posts
- Use Shiki (built into Astro) or Prism
- Support multiple languages (JavaScript, TypeScript, Python, HTML, CSS, etc.)
- Include line numbers option
- Theme: Choose a modern theme (e.g., GitHub Dark, Dracula, Nord, or One Dark Pro)
- Copy-to-clipboard button for code blocks (optional enhancement)

**Configuration:**
- Set up in `astro.config.mjs`
- Ensure proper styling integration with Tailwind

### 5. Image Optimization

**Requirements:**
- Use Astro's built-in `<Image />` component
- Automatic image optimization and responsive images
- Support for common formats (JPG, PNG, WebP)
- Lazy loading by default
- Proper alt text for accessibility

**Implementation:**
- Featured images for blog posts
- Inline images within MDX content
- Configure image paths in `astro.config.mjs`

### 6. Styling with Tailwind CSS

**Setup:**
- Install and configure Tailwind CSS via `@astrojs/tailwind`
- Create `tailwind.config.mjs` with custom theme if needed
- Use Tailwind Typography plugin (`@tailwindcss/typography`) for prose styling
- Responsive design breakpoints: mobile-first approach

**Design Guidelines:**
- Clean, minimal aesthetic
- Good contrast and readability
- Consistent spacing and typography scale
- Smooth transitions and hover states
- Dark mode support (optional enhancement)

### 7. SEO & Meta Tags

**Requirements:**
- Dynamic meta tags for each page
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URLs
- Sitemap generation (use `@astrojs/sitemap`)
- RSS feed (use Astro's RSS helper)
- HTML `lang` attribute set to `fr`
- French metadata and descriptions

**Implementation:**
- Create reusable SEO component
- Pull metadata from frontmatter for blog posts
- Configure site-wide defaults
- Ensure all meta descriptions are in French
- Use proper French date formatting in structured data

### 8. Performance Requirements

- Lighthouse score targets:
  - Performance: 95+
  - Accessibility: 95+
  - Best Practices: 95+
  - SEO: 95+
- Fast page loads (< 2s on 3G)
- Minimal JavaScript shipped to client
- Optimized images and assets

## Deployment

### Vercel Deployment
- Create `vercel.json` if custom configuration needed
- Set build command: `npm run build`
- Set output directory: `dist`
- Configure environment variables if needed

### Cloudflare Pages Deployment
- Set build command: `npm run build`
- Set build output directory: `dist`
- Configure Node.js version in settings

### Build Configuration
Ensure `astro.config.mjs` includes:
- Output mode: `static`
- Adapter configuration (if using SSR features)
- Base URL configuration for correct asset paths

## Development Workflow

### Initial Setup Commands
```bash
npm create astro@latest
npm install
npm install @astrojs/mdx @astrojs/tailwind
npm install -D tailwindcss @tailwindcss/typography
npm install @astrojs/sitemap
```

### Development Scripts
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro add` - Add integrations

## Content Creation Workflow

### Adding New Blog Posts
1. Create new `.mdx` file in `src/content/blog/`
2. Add required frontmatter
3. Write content using Markdown/MDX
4. Add images to `public/images/` or co-locate with content
5. Preview locally with `npm run dev`
6. Commit and deploy

### Example Post Template
```mdx
---
title: "Le titre de votre article"
description: "Une brève description de votre article"
pubDate: 2024-12-21
author: "Votre Nom"
image:
  src: "/images/post-image.jpg"
  alt: "Description de l'image"
tags: ["astro", "développement-web"]
draft: false
---

Le contenu de votre article ici...
```

## Optional Enhancements (Future Considerations)

1. **Search Functionality**: Client-side search using Pagefind or Fuse.js
2. **Tag Filtering**: Filter posts by tags on blog listing page
3. **Pagination**: For blog listing if post count grows large
4. **Dark Mode**: Theme toggle with persistence
5. **Comments**: Integration with service like Giscus or Utterances
6. **Analytics**: Privacy-friendly analytics (Plausible, Fathom)
7. **Newsletter**: Email subscription integration
8. **Reading Progress Bar**: Visual indicator on post pages
9. **Related Posts**: Show related content at end of posts
10. **Draft Preview**: Environment-based draft visibility

## Acceptance Criteria

- [ ] Astro project initialized with correct dependencies
- [ ] Tailwind CSS properly configured and working
- [ ] MDX integration working with sample posts
- [ ] Blog listing page displays all posts correctly
- [ ] Individual post pages render MDX content
- [ ] Code syntax highlighting working with chosen theme
- [ ] Images optimized and loading properly
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] SEO meta tags present on all pages
- [ ] Sitemap generated at `/sitemap.xml`
- [ ] Build completes successfully without errors
- [ ] Site deploys successfully to Vercel or Cloudflare Pages
- [ ] All lighthouse scores meet targets

## Success Metrics

- Build time < 30 seconds for initial site
- Page load time < 2 seconds
- Core Web Vitals in "Good" range
- Zero accessibility violations
- Successful deployment on first try

## Notes for Implementation

- Start with 2-3 sample blog posts to test all features
- Use semantic HTML throughout for better accessibility
- Keep components simple and reusable
- Follow Astro best practices (islands architecture, minimal JS)
- Optimize for developer experience and content creation workflow
- Test thoroughly on multiple devices and browsers before deployment