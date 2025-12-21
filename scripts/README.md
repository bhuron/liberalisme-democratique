# Ghost to Astro Import Script

This script converts Ghost blog exports to Astro-compatible markdown files for the `liberalisme-democratique` blog.

## Overview

The script parses a Ghost JSON export file and converts each post to a markdown file with frontmatter matching the blog schema defined in `src/content.config.ts`.

## Prerequisites

1. **Ghost Export**: Export your Ghost content from Ghost Admin:
   - Go to Settings > Labs > Export
   - Click "Export"
   - Save the JSON file as `ghost-export.json` in the project root

2. **Images**: Ghost images are referenced by URL in the export. You'll need to:
   - Download images from your Ghost site
   - Place them in `public/images/` directory
   - Or update image paths after import

## Usage

### Basic Import

```bash
npm run import:ghost
```

This will:
1. Read `ghost-export.json` from the project root
2. Convert each published post to markdown
3. Save files to `src/content/blog/` with slugs as filenames

### Manual Execution

```bash
node scripts/import-ghost.js
```

## Output Format

Each post is converted to a markdown file with:

```yaml
---
title: 'Post Title'
description: 'Post excerpt or description'
pubDate: 'YYYY-MM-DD'
updatedDate: 'YYYY-MM-DD' # Optional
author: 'Author Name'
image:
  src: '/images/filename.jpg'
  alt: 'Image description'
tags: ['tag1', 'tag2']
draft: false
---
```

## Content Conversion

The script handles content conversion in this order:

1. **MobileDoc** (Ghost's rich editor format) - if available
2. **HTML** - fallback if MobileDoc parsing fails
3. **Plaintext** - final fallback

### Conversion Limitations

- **Basic HTML to Markdown**: The built-in converter handles common tags (h1-h3, strong, em, a, code, pre, ul, ol, p)
- **Complex Content**: For complex HTML (tables, nested lists, etc.), you may need to:
  - Install `turndown` library: `npm install turndown`
  - Modify the `convertHtmlToMarkdown` function
- **Images**: Image URLs are preserved as-is. You may need to download and host images locally.

## Customization

### Modify the Script

Key functions to customize:

1. `convertMobileDocToMarkdown()` - MobileDoc conversion
2. `convertHtmlToMarkdown()` - HTML conversion
3. `getFeaturedImage()` - Image path handling
4. `generateSlug()` - URL slug generation

### Advanced HTML Conversion with Turndown

For better HTML to Markdown conversion:

1. Install turndown:
   ```bash
   npm install turndown
   ```

2. Update `scripts/import-ghost.js`:
   ```javascript
   import TurndownService from 'turndown';

   function convertHtmlToMarkdown(html) {
     const turndownService = new TurndownService();
     return turndownService.turndown(html);
   }
   ```

## Troubleshooting

### "File not found: ghost-export.json"
- Ensure you've exported from Ghost and saved as `ghost-export.json` in the project root
- Check file permissions

### "Invalid Ghost export format"
- Ensure you're using the JSON export from Ghost Admin (not the backup format)
- The expected format is `{ db: [{ data: { posts: [], tags: [], ... } }] }`

### Content formatting issues
- Review the generated markdown files
- Adjust conversion functions for your specific content
- Consider using the Turndown library for better HTML conversion

### Images not displaying
- Download images from your Ghost site
- Place in `public/images/`
- Update image paths in frontmatter if needed
- Consider using Astro's Image component for optimization

## Post-Import Steps

1. **Review Content**: Check a few imported posts for formatting issues
2. **Test Build**: Run `npm run build` to ensure no errors
3. **Images**: Handle image hosting and paths
4. **Cleanup**: Remove `ghost-export.json` if it contains sensitive data
5. **Git**: Add imported posts to version control

## Schema Compatibility

The import script matches the blog collection schema in `src/content.config.ts`:

| Ghost Field | Astro Schema Field | Notes |
|-------------|-------------------|-------|
| `title` | `title` | Required |
| `custom_excerpt` / `meta_description` | `description` | Fallback to excerpt |
| `published_at` | `pubDate` | Date of publication |
| `updated_at` | `updatedDate` | Optional |
| `author.name` | `author` | Defaults to "Benoît Huron" |
| `feature_image` | `image.src` | Path to `/images/` |
| `feature_image_alt` | `image.alt` | Alt text |
| `tags[*].name` | `tags` | Array of tag names |
| `status` | `draft` | `status !== 'published'` |

## Notes

- Only **published** posts are imported by default
- Existing files with the same slug are skipped
- The script preserves original publish dates
- French language content should remain intact
- Consider backing up existing content before import