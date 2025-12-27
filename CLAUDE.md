# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a French-language political and social blog built with Astro, focusing on liberal democratic perspectives. The site is deployed at `https://liberalisme-democratique.uk` and uses a content-focused architecture with MDX support.

**Tech Stack:**
- Astro 5.x (static site generation)
- MDX for blog content via `@astrojs/mdx`
- Tailwind CSS 4.x with Vite integration
- Math support via `remark-math` and `rehype-katex`
- Sharp for image optimization
- TypeScript throughout

## Common Development Commands

### Core Commands
```bash
npm run dev          # Start local dev server at localhost:4321
npm run build        # Build production site to ./dist/
npm run preview      # Preview production build locally
npm run astro ...    # Run Astro CLI commands
```

### Content Management Scripts
```bash
# Import content from Ghost CMS export
npm run import:ghost

# Download remote Ghost images to local assets
npm run images:download
npm run images:dry-run    # Preview what would be downloaded

# Format/restructure markdown articles
npm run format:articles
npm run format:articles:dry-run
```

## Architecture

### Content Collections

Blog posts are managed through Astro's Content Collections system, configured in `src/content.config.ts`:

**Schema Fields:**
- `title` (required) - Post title in French
- `description` (required) - Short description/excerpt
- `pubDate` (required) - Publication date (auto-coerced to Date)
- `updatedDate` (optional) - Last update date
- `author` (optional, default: "Benoît Huron")
- `image` (optional) - Object with `src` and `alt` properties
- `tags` (optional) - Array of tag names
- `draft` (optional, default: false)

Blog posts are stored in `src/content/blog/` as `.md` or `.mdx` files. Each file's slug is derived from its filename.

### Page Structure

**Dynamic Routes:**
- `src/pages/index.astro` - Homepage with hero and recent posts
- `src/pages/blog/index.astro` - Blog listing page (all published posts, sorted by date desc)
- `src/pages/blog/[...slug].astro` - Individual blog post pages
- `src/pages/about.astro` - About page
- `src/pages/rss.xml.js` - RSS feed generation

**Blog Post Rendering:**
The `[...slug].astro` page uses `getStaticPaths()` to:
1. Fetch all blog collection entries
2. Sort by `pubDate` descending
3. Pass `prevPost` and `nextPost` for navigation
4. Render content through `BlogPost` layout

### Layout Architecture

**BlogPost Layout** (`src/layouts/BlogPost.astro`):
- Receives post data + navigation props
- Renders featured image using Astro's `<Image />` component
- Displays tags as badges
- Shows publication date and author
- Includes previous/next post navigation with icons
- Uses Tailwind Typography (`prose` class) for content styling

**Key Components:**
- `Header.astro` - Site navigation with responsive links
- `HeaderLink.astro` - Navigation link with active state styling
- `Footer.astro` - Site footer
- `BaseHead.astro` - SEO meta tags and OpenGraph data
- `FormattedDate.astro` - French date formatting
- `YoutubeEmbed.astro` - YouTube video embed component for MDX

### Content Import Pipeline

The project includes custom scripts for migrating from Ghost CMS:

**Ghost Import** (`scripts/import-ghost.js`):
- Parses Ghost JSON export files
- Converts posts to markdown with frontmatter
- Supports MobileDoc, HTML, and plaintext content
- Configurable image handling modes (remote/local/hybrid)
- Preserves original publication dates and metadata

**Image Download Script** (`scripts/download-ghost-images.js`):
- Scans markdown files for remote image URLs
- Downloads images to `src/assets/`
- Updates frontmatter with local paths
- Supports dry-run mode

**Markdown Reformatter** (`scripts/reformat-markdown.js`):
- Restructures markdown files
- Controls text wrapping
- Promotes heading levels
- Batch processing with `--all` flag

### Styling Approach

**Tailwind CSS 4.x Configuration:**
- Uses Vite plugin integration (not the older Astro integration)
- Configured in `astro.config.ts` under `vite.plugins`
- Typography plugin for prose styling (`@tailwindcss/typography`)

**Design Patterns:**
- Mobile-first responsive breakpoints
- Max-width containers (`max-w-4xl`) for readability
- Minimal aesthetic with good contrast
- French-language UI text throughout
- Hover states and transitions for interactivity

### Math & Code Support

**Math Rendering:**
- `remark-math` for parsing LaTeX syntax in markdown
- `rehype-katex` for rendering to HTML
- Configured for both MDX and standard markdown
- Supports inline (`$...$`) and block (`$$...$$`) math

**Syntax Highlighting:**
- Shiki with GitHub Dark theme
- Configured in `astro.config.ts`
- Supports: JavaScript, TypeScript, Python, HTML, CSS, Bash, JSON

### Image Optimization

**Configuration:**
- Astro's built-in `<Image />` component
- Sharp service for optimization
- Remote image patterns for Ghost-hosted images (`*.ghost.io`, `liberalisme-democratique.uk`)
- Local images stored in `src/assets/`
- Lazy loading by default (except for featured images which use `loading="eager"`)

**Image Paths in Frontmatter:**
Images in `src/assets/` are referenced relative to the markdown file location. For a blog post in `src/content/blog/post.md`, an image in `src/assets/image.jpg` would be referenced as `../../assets/image.jpg`.

### SEO & Metadata

**Site Configuration** (`src/consts.ts`):
```
SITE_TITLE = 'Libéralisme Démocratique'
SITE_DESCRIPTION = 'Perspectives politiques et sociales'
SITE_AUTHOR = 'Benoît Huron'
SITE_LANG = 'fr'
SITE_URL = 'https://liberalisme-democratique.uk'
```

**Features:**
- Canonical URLs via `site` config
- Automatic sitemap generation (`@astrojs/sitemap`)
- RSS feed at `/rss.xml`
- OpenGraph tags for social sharing
- French language metadata
- Semantic HTML structure

## Language & Content Conventions

### Language
- All content is in **French**
- UI labels, metadata, and user-facing text must be in French
- Date formatting follows French conventions (e.g., "21 décembre 2025")
- Code comments and technical documentation can use English or French

### Content Structure
Blog posts can embed Astro components via MDX imports, for example:
```astro
import YoutubeEmbed from '../../components/YoutubeEmbed.astro';

<YoutubeEmbed url="https://youtu.be/..." title="..." />
```

## Development Workflow

### Adding New Blog Posts
1. Create `.md` or `.mdx` file in `src/content/blog/`
2. Add frontmatter matching the schema
3. Write content in Markdown/MDX
4. Test locally: `npm run dev`
5. Build to verify: `npm run build`

### Migrating from Ghost
1. Export content from Ghost Admin (JSON format)
2. Save as `ghost-export.json` in project root
3. Run `npm run import:ghost`
4. Handle images via `npm run images:download`
5. Review imported content
6. Format if needed: `npm run format:articles`

### Image Management
- **Local images**: Place in `src/assets/`
- **Remote images**: Configure patterns in `astro.config.ts`
- **Featured images**: Reference in frontmatter with relative path from markdown file (e.g., `../../assets/image.jpg`)
- **Inline images**: Use standard markdown syntax or Astro `<Image />` component

## Build Output

- Static site generation to `./dist/`
- No server-side rendering
- Minimal JavaScript shipped to client
- Optimized assets and images
- Ready for deployment to Vercel, Cloudflare Pages, or any static host

## Key Dependencies

**Core:**
- `astro` - Framework
- `@astrojs/mdx` - MDX support
- `@astrojs/sitemap` - Sitemap generation
- `@astrojs/rss` - RSS feed generation

**Styling:**
- `tailwindcss` - Utility-first CSS
- `@tailwindcss/vite` - Vite integration
- `@tailwindcss/typography` - Prose styling

**Content Processing:**
- `remark-math` - LaTeX parsing
- `rehype-katex` - Math rendering
- `turndown` - HTML to markdown conversion (Ghost import)

**Images:**
- `sharp` - Image optimization

**Development:**
- `glob` - File pattern matching (scripts)
- `yaml` - YAML parsing (scripts)
