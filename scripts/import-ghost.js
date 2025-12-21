#!/usr/bin/env node

/**
 * Ghost to Astro Blog Importer
 *
 * This script converts Ghost JSON export files to Astro-compatible markdown files.
 *
 * Usage:
 * 1. Export your Ghost content from Ghost Admin: Settings > Labs > Export
 * 2. Save the JSON file as `ghost-export.json` in the project root
 * 3. Run: node scripts/import-ghost.js
 *
 * The script will:
 * - Parse the Ghost export JSON
 * - Convert posts to markdown files with frontmatter matching the blog schema
 * - Save files to `src/content/blog/`
 * - Handle images (requires manual copy of images to `src/assets/ghost-images/`)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined'
});

// Configuration
const GHOST_EXPORT_PATH = path.join(projectRoot, 'ghost-export.json');
const OUTPUT_DIR = path.join(projectRoot, 'src/content/blog');

// Ghost URL configuration
// Replace with your actual Ghost site URL (e.g., 'https://yourblog.ghost.io')
// This replaces __GHOST_URL__ placeholders in the export
const GHOST_URL = 'https://www.liberalisme-democratique.fr'; // Leave empty if you don't have a Ghost URL

// Image handling options
const IMAGE_HANDLING = 'remote'; // 'remote', 'local', or 'hybrid'
// For 'local': images will be referenced as ../../assets/ghost-images/filename.jpg
// For 'remote': original Ghost image URLs will be kept
// For 'hybrid': try to download images automatically (requires additional setup)

const IMAGE_BASE_URL = '../../assets/ghost-images/'; // Used only if IMAGE_HANDLING is 'local'
// const ASSETS_IMAGES_DIR = path.join(projectRoot, 'src/assets/ghost-images'); // Unused for now

/**
 * Replace __GHOST_URL__ placeholders with actual Ghost URL
 */
function replaceGhostUrl(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  if (!GHOST_URL) {
    // If no Ghost URL provided, warn and keep placeholder
    // This will cause build errors but allows user to fix later
    return text;
  }

  // Replace __GHOST_URL__ with actual URL
  return text.replace(/__GHOST_URL__/g, GHOST_URL);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse Ghost export JSON
 */
function parseGhostExport() {
  try {
    const data = fs.readFileSync(GHOST_EXPORT_PATH, 'utf8');
    const exportData = JSON.parse(data);

    // Ghost export structure: { db: [{ data: { posts: [], tags: [], posts_tags: [] } }] }
    const db = exportData.db?.[0]?.data;
    if (!db) {
      throw new Error('Invalid Ghost export format. Expected { db: [{ data: { ... } }] }');
    }

    return {
      posts: db.posts || [],
      tags: db.tags || [],
      postsTags: db.posts_tags || [],
      users: db.users || []
    };
  } catch (error) {
    console.error('Error reading Ghost export:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`\nFile not found: ${GHOST_EXPORT_PATH}`);
      console.error('Please export your Ghost content and save it as ghost-export.json in the project root.');
    }
    process.exit(1);
  }
}

/**
 * Get tags for a post
 */
function getPostTags(postId, tags, postsTags) {
  const postTagRelations = postsTags.filter(pt => pt.post_id === postId);
  return postTagRelations
    .map(pt => tags.find(tag => tag.id === pt.tag_id))
    .filter(tag => tag)
    .map(tag => tag.name)
    .filter(name => name && name !== '#'); // Filter out empty or "#" tags
}

/**
 * Get author name for a post
 */
function getPostAuthor(post, users) {
  const author = users.find(user => user.id === post.author_id);
  return author ? author.name : 'Benoît Huron'; // Default to site author
}

/**
 * Convert Ghost HTML/mobiledoc to markdown
 * Note: This is a basic conversion. You may need to enhance this for complex content.
 */
function convertContentToMarkdown(post) {
  // Prefer mobiledoc if available (Ghost's rich editor format)
  if (post.mobiledoc) {
    try {
      const mobiledoc = JSON.parse(post.mobiledoc);
      return replaceGhostUrl(convertMobileDocToMarkdown(mobiledoc));
    } catch (error) {
      console.warn(`Failed to parse mobiledoc for post "${post.title}", falling back to HTML`);
    }
  }

  // Fallback to HTML content
  if (post.html) {
    return replaceGhostUrl(convertHtmlToMarkdown(post.html));
  }

  // Fallback to plain text
  return replaceGhostUrl(post.plaintext || '');
}

/**
 * Basic MobileDoc to Markdown conversion
 * This handles common card types. You may need to extend this.
 */
function convertMobileDocToMarkdown(mobiledoc) {
  const { cards: _cards, sections } = mobiledoc;
  let markdown = '';

  for (const section of sections) {
    if (Array.isArray(section)) {
      const [type, tagIndex, markers] = section;

      if (type === 1) { // Markup section
        const tag = mobiledoc.markups[tagIndex]?.[0] || 'p';
        let content = '';

        for (const marker of markers) {
          const [textIndex, , markups] = marker;
          let text = mobiledoc.atoms?.[textIndex] || mobiledoc.cards?.[textIndex] || '';

          // Apply markups (bold, italic, etc.)
          if (markups && markups.length > 0) {
            for (const markupIndex of markups) {
              const markup = mobiledoc.markups[markupIndex];
              if (markup) {
                if (markup[0] === 'strong') text = `**${text}**`;
                if (markup[0] === 'em') text = `*${text}*`;
              }
            }
          }

          content += text;
        }

        if (tag === 'h1') markdown += `# ${content}\n\n`;
        else if (tag === 'h2') markdown += `## ${content}\n\n`;
        else if (tag === 'h3') markdown += `### ${content}\n\n`;
        else if (tag === 'blockquote') markdown += `> ${content}\n\n`;
        else markdown += `${content}\n\n`;
      }
    }
  }

  return markdown.trim();
}

/**
 * HTML to Markdown conversion using Turndown
 */
function convertHtmlToMarkdown(html) {
  try {
    return turndownService.turndown(html);
  } catch (error) {
    console.warn('Turndown conversion failed, falling back to basic conversion:', error.message);
    // Fallback to basic conversion
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_match, content) =>
        content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n')
      .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_match, content) =>
        content.replace(/<li[^>]*>(.*?)<\/li>/gi, (_match, item, index) => `${index + 1}. ${item}\n`) + '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

/**
 * Generate slug from title or use Ghost slug
 */
function generateSlug(post) {
  // Use Ghost slug if available, otherwise generate from title
  if (post.slug) {
    return post.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  return post.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Handle featured image based on IMAGE_HANDLING mode
 */
function getFeaturedImage(post) {
  if (!post.feature_image) {
    return null;
  }

  const alt = post.feature_image_alt || post.title || 'Article image';
  const imageUrl = replaceGhostUrl(post.feature_image);

  switch (IMAGE_HANDLING) {
    case 'remote':
      // Keep original Ghost image URL (with __GHOST_URL__ replaced)
      return {
        src: imageUrl,
        alt: alt
      };

    case 'local':
      // Use local path in /images/ directory
      const filename = path.basename(post.feature_image);
      return {
        src: `${IMAGE_BASE_URL}${filename}`,
        alt: alt
      };

    case 'hybrid':
      // Try to download image (placeholder - would need implementation)
      console.warn(`⚠️  Hybrid mode not fully implemented for "${post.title}". Using remote URL.`);
      return {
        src: imageUrl,
        alt: alt
      };

    default:
      console.warn(`⚠️  Unknown IMAGE_HANDLING: ${IMAGE_HANDLING}. Using remote URL.`);
      return {
        src: imageUrl,
        alt: alt
      };
  }
}

/**
 * Convert Ghost post to Astro markdown frontmatter and content
 */
function convertPostToMarkdown(post, tags, postsTags, users) {
  const slug = generateSlug(post);
  const postTags = getPostTags(post.id, tags, postsTags);
  const author = getPostAuthor(post, users);
  const featuredImage = getFeaturedImage(post);
  const content = convertContentToMarkdown(post);

  // Frontmatter according to src/content.config.ts schema
  const frontmatter = {
    title: post.title || 'Untitled',
    description: post.custom_excerpt || post.meta_description || post.excerpt || '',
    pubDate: post.published_at || post.created_at,
    updatedDate: post.updated_at || undefined,
    author: author,
    draft: post.status !== 'published',
    ...(postTags.length > 0 && { tags: postTags }),
    ...(featuredImage && { image: featuredImage })
  };

  // Build markdown file
  let markdown = '---\n';
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined) {
      if (typeof value === 'string') {
        // Escape single quotes in strings for YAML
        const escapedValue = value.replace(/'/g, "''");
        markdown += `${key}: '${escapedValue}'\n`;
      } else if (value instanceof Date) {
        markdown += `${key}: '${value.toISOString().split('T')[0]}'\n`;
      } else if (Array.isArray(value)) {
        markdown += `${key}: [${value.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')}]\n`;
      } else if (typeof value === 'object') {
        markdown += `${key}:\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          markdown += `  ${subKey}: '${String(subValue).replace(/'/g, "''")}'\n`;
        }
      } else {
        markdown += `${key}: ${value}\n`;
      }
    }
  }
  markdown += '---\n\n';
  markdown += content;

  return { slug, markdown };
}

/**
 * Main import function
 */
async function main() {
  console.log('📥 Ghost to Astro Import Script');
  console.log('================================\n');

  // Warn about empty GHOST_URL
  if (!GHOST_URL) {
    console.warn('⚠️  GHOST_URL is empty. __GHOST_URL__ placeholders will NOT be replaced.');
    console.warn('   This will cause build errors. Set GHOST_URL in the script to your Ghost site URL.');
    console.warn('   Example: const GHOST_URL = \'https://yourblog.ghost.io\';\n');
  }

  // Parse Ghost export
  console.log('📋 Parsing Ghost export...');
  const { posts, tags, postsTags, users } = parseGhostExport();

  console.log(`📊 Found: ${posts.length} posts, ${tags.length} tags, ${users.length} users`);

  // Filter to published posts if desired
  const publishedPosts = posts.filter(post => post.status === 'published');
  console.log(`📄 Processing ${publishedPosts.length} published posts...\n`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const post of publishedPosts) {
    try {
      const { slug, markdown } = convertPostToMarkdown(post, tags, postsTags, users);
      const outputPath = path.join(OUTPUT_DIR, `${slug}.md`);

      // Check if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`⚠️  Skipping "${post.title}" - file already exists: ${slug}.md`);
        skippedCount++;
        continue;
      }

      // Write markdown file
      fs.writeFileSync(outputPath, markdown);
      console.log(`✅ Imported "${post.title}" -> ${slug}.md`);
      importedCount++;

    } catch (error) {
      console.error(`❌ Failed to import "${post.title}":`, error.message);
      skippedCount++;
    }
  }

  console.log('\n================================');
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${importedCount} posts`);
  console.log(`   ⚠️  Skipped: ${skippedCount} posts`);
  console.log(`   📁 Output: ${OUTPUT_DIR}`);

  // Instructions for images
  console.log('\n📸 Image Handling:');
  console.log(`   Mode: ${IMAGE_HANDLING.toUpperCase()}`);

  if (IMAGE_HANDLING === 'remote') {
    console.log('   1. Images are using original Ghost URLs');
    console.log('   2. Configure Astro for remote image optimization (see docs)');
    console.log('   3. Or run image download script later if needed');
  } else if (IMAGE_HANDLING === 'local') {
    console.log('   1. Copy your Ghost images to src/assets/ghost-images/');
    console.log('   2. Image paths in frontmatter reference ../../assets/ghost-images/filename.jpg');
    console.log('   3. Astro Image component will optimize local images');
  } else {
    console.log('   1. Hybrid mode - using remote URLs as fallback');
    console.log('   2. Consider running image download script');
  }

  // Instructions for content review
  console.log('\n🔍 Next Steps:');
  console.log('   1. Review imported markdown files for formatting issues');
  console.log('   2. Run `npm run build` to test the imported content');
  console.log('   3. Adjust the conversion functions if needed for your content');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});