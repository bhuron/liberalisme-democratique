# Agent Guidelines for Libéralisme Démocratique

This is a French-language political blog built with Astro 5.x, TypeScript, and Tailwind CSS 4.x.

## Build Commands

```bash
# Development
npm run dev              # Start dev server at localhost:4321

# Production
npm run build            # Build static site to ./dist/
npm run preview          # Preview production build locally

# Astro CLI
npm run astro ...        # Run Astro CLI commands (e.g., astro check)
```

## Content Management Commands

```bash
# Create new blog post
npm run new "Titre de l'article"

# Import from Ghost CMS
npm run import:ghost
npm run images:download  # Download remote images to local assets
npm run images:dry-run   # Preview image downloads without executing

# Format articles
npm run format:articles
npm run format:articles:dry-run
```

## Code Style Guidelines

### Language & Content
- **All UI text must be in French** (e.g., "Accueil", "À propos", "Publié le")
- Content files are in French
- Code comments can be in English or French

### TypeScript
- Uses strict TypeScript config (`astro/tsconfigs/strict`)
- Enable `strictNullChecks`
- ESM modules only (`"type": "module"` in package.json)
- Use `import`/`export` syntax

### Astro Components
- Use tabs for indentation in `.astro` files
- Component files use PascalCase (e.g., `Header.astro`, `BlogPost.astro`)
- Use type definitions via `type Props = {...}` in component frontmatter
- Import order: Astro built-ins → third-party → local components → types

### Naming Conventions
- **Components**: PascalCase (e.g., `HeaderLink`, `FormattedDate`)
- **Variables/Functions**: camelCase (e.g., `siteTitle`, `getCollection`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `SITE_TITLE`, `SITE_URL`)
- **Files**: kebab-case for pages, PascalCase for components

### Styling (Tailwind CSS)
- Mobile-first responsive design
- Use `max-w-4xl` for content containers
- Use `prose` class for typography content
- French color names in comments: `bg-gray-100`, `text-accent`

### Imports
- Use double quotes for imports
- Prefer named imports: `import { Image } from "astro:assets"`
- Astro content collections: `import { getCollection } from "astro:content"`

### Error Handling
- Use `process.exit(1)` in Node scripts for errors
- Log errors with descriptive messages in French
- Use `console.error()` for errors, `console.log()` for info

### Content Schema
Blog posts use frontmatter with these required fields:
- `title`: string
- `description`: string  
- `pubDate`: date (coerced to Date object)

Optional fields: `updatedDate`, `author`, `image`, `tags`, `draft`

### Scripts
Scripts are in `scripts/` directory and use Node.js with:
- ESM imports
- `import.meta.url` for `__dirname` equivalent
- `fs`, `path` for file operations
- French console output

## Project Structure

```
src/
  components/     # Reusable Astro components
  layouts/        # Page layouts
  pages/          # Route files
  content/blog/   # Blog posts (.md, .mdx)
  consts.ts       # Site constants
  content.config.ts # Content collections schema
public/           # Static assets
scripts/          # Build/utility scripts
```

## Image Handling
- Local images in `src/assets/`
- Reference from markdown: `../../assets/image.jpg`
- Use Astro `<Image />` component for optimization
- Remote images allowed from `*.ghost.io` and `liberalisme-democratique.uk`

## Math Support
- LaTeX via `remark-math` and `rehype-katex`
- Inline math: `$...$`
- Block math: `$$...$$`

## Notes
- No ESLint, Prettier, or testing framework configured
- Build must pass before committing
- Site deployed to `https://liberalisme-democratique.uk`
