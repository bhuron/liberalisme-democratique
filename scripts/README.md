# Ghost to Astro Import Script

This script converts Ghost blog exports to Astro-compatible markdown files for the `liberalisme-democratique` blog.

## Overview

The script parses a Ghost JSON export file and converts each post to a markdown file with frontmatter matching the blog schema defined in `src/content.config.ts`.

## Prerequisites

1. **Ghost Export**: Export your Ghost content from Ghost Admin:
   - Go to Settings > Labs > Export
   - Click "Export"
   - Save the JSON file as `ghost-export.json` in the project root

2. **Images**: Ghost images are referenced by URL in the export. You have three options:
   - **Remote mode**: Keep original URLs (Astro can optimize them)
   - **Local mode**: Download images manually to `src/assets/ghost-images/`
   - **Auto-download**: Use the image download script after import

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

## Image Handling Modes

The import script supports three image handling modes (configured in `scripts/import-ghost.js`):

### 1. Remote Mode (Default)
- **Setting**: `IMAGE_HANDLING = 'remote'`
- **Behavior**: Keeps original Ghost image URLs
- **Pros**: No manual downloading needed
- **Cons**: Requires Astro remote image configuration
- **Optimization**: Configure `astro.config.ts` for remote image optimization

### 2. Local Mode
- **Setting**: `IMAGE_HANDLING = 'local'`
- **Behavior**: References local paths like `../../assets/ghost-images/filename.jpg`
- **Pros**: Astro optimizes local images automatically
- **Cons**: Need to manually download images to `src/assets/ghost-images/`
- **Use when**: You want full control over images

### 3. Hybrid Mode
- **Setting**: `IMAGE_HANDLING = 'hybrid'`
- **Behavior**: Uses remote URLs with option to download later
- **Use with**: Image download script (`npm run images:download`)

### Changing Modes
Edit `scripts/import-ghost.js` and change the `IMAGE_HANDLING` constant (line ~33).

## Image Download Script

After importing with `IMAGE_HANDLING='remote'`, you can download images later:

### Basic Usage
```bash
# Download all remote images and update frontmatter
npm run images:download

# Dry run - see what would be downloaded
npm run images:dry-run
```

### Options
- `--dry-run`: Show what would be downloaded without changes
- `--output-dir=public/custom-images`: Custom output directory

### How It Works
1. Scans all markdown files in `src/content/blog/`
2. Extracts remote image URLs from frontmatter
3. Downloads images to `src/assets/ghost-images/` (or custom directory)
4. Updates frontmatter with local paths
5. Preserves image alt text and other metadata

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
  src: '../../assets/ghost-images/filename.jpg'
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

#### For Remote Mode:
1. Ensure `astro.config.ts` has remote image patterns configured
2. Check that image URLs are accessible
3. Build may fail if remote images are blocked

#### For Local Mode:
1. Download images from your Ghost site
2. Place in `src/assets/ghost-images/`
3. Update image paths in frontmatter if needed

#### For All Modes:
- Use the image download script: `npm run images:download`
- Check image dimensions in frontmatter if Astro Image complains
- Run `npm run build` to test optimization

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
| `feature_image` | `image.src` | Path to `../../assets/ghost-images/` |
| `feature_image_alt` | `image.alt` | Alt text |
| `tags[*].name` | `tags` | Array of tag names |
| `status` | `draft` | `status !== 'published'` |

## Notes

- Only **published** posts are imported by default
- Existing files with the same slug are skipped
- The script preserves original publish dates
- French language content should remain intact
- Consider backing up existing content before import