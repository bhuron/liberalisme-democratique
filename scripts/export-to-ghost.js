#!/usr/bin/env node

/**
 * Astro to Ghost Export Script
 *
 * This script converts Astro blog posts to Ghost-compatible JSON format for import.
 *
 * Usage:
 * 1. Optionally: Create a file named `posts-to-export.txt` with one slug per line to export specific posts
 * 2. Run: npm run export:ghost
 * 3. Import the generated `ghost-import.json` in Ghost Admin: Settings > Advanced > Import/Export
 *
 * The script will:
 * - Read all blog posts (or specific ones from posts-to-export.txt)
 * - Convert to Ghost's JSON import format
 * - Preserve frontmatter, tags, authors, and publication status
 * - Handle images (keeps paths, you'll need to upload images separately)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Configuration
const BLOG_DIR = path.join(projectRoot, 'src/content/blog');
const OUTPUT_FILE = path.join(projectRoot, 'ghost-import.json');
const SLUGS_FILE = path.join(projectRoot, 'posts-to-export.txt');

// Ghost configuration
const GHOST_VERSION = '6.0.0';
const DEFAULT_AUTHOR_EMAIL = 'author@example.com'; // Change to your Ghost author email
const SITE_URL = 'https://liberalisme-democratique.uk'; // Your site URL for converting asset paths

/**
 * Convert local asset path to full URL for Ghost
 * Converts ../../assets/filename.ext to https://liberalisme-democratique.uk/assets/filename.ext
 */
function convertAssetPathToUrl(assetPath) {
  if (!assetPath) return assetPath;

  // If it's already a full URL, return as-is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }

  // Convert relative path like ../../assets/filename.ext
  if (assetPath.startsWith('../../assets/')) {
    const filename = path.basename(assetPath);
    return `${SITE_URL}/assets/${filename}`;
  }

  // For any other relative path, just return the filename as URL
  const filename = path.basename(assetPath);
  return `${SITE_URL}/assets/${filename}`;
}

/**
 * Generate a unique ID for Ghost resources
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Convert Astro frontmatter to Ghost post format
 */
function convertPostToGhost(filePath, postId) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  // Get slug from filename
  const slug = path.basename(filePath, path.extname(filePath));

  // Convert markdown to HTML (basic conversion)
  const html = markdownToHtml(content);

  // Handle featured image
  let featureImage = null;
  let featureImageAlt = null;

  if (data.image) {
    if (typeof data.image === 'string') {
      featureImage = convertAssetPathToUrl(data.image);
    } else if (typeof data.image === 'object') {
      featureImage = convertAssetPathToUrl(data.image.src);
      featureImageAlt = data.image.alt || data.title;
    }
  }

  // Determine status
  const status = data.draft === true ? 'draft' : 'published';
  const visibility = data.visibility || 'public';

  // Format dates for Ghost (YYYY-MM-DD HH:mm:ss)
  const formatDate = (date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  };

  const publishedAt = data.draft ? null : (formatDate(data.pubDate) || formatDate(new Date()));

  // Create Ghost post object
  const ghostPost = {
    id: postId,
    title: data.title || 'Untitled',
    slug: slug,
    html: html,
    type: 'post',
    status: status,
    visibility: visibility,
    created_at: formatDate(data.pubDate) || formatDate(new Date()),
    updated_at: formatDate(data.updatedDate) || formatDate(new Date()),
    published_at: publishedAt,
    custom_excerpt: data.description || '',
    feature_image: featureImage
  };

  // Optional posts_meta
  let ghostPostMeta = null;
  if (featureImageAlt) {
    ghostPostMeta = {
      id: generateId(),
      post_id: postId,
      feature_image_alt: featureImageAlt
    };
  }

  return {
    post: ghostPost,
    meta: ghostPostMeta,
    tags: data.tags || []
  };
}

/**
 * Extract import mappings from MDX content
 * Returns object mapping imported variable names to their paths
 */
function extractImportMappings(content) {
  const mappings = {};

  // Match: import something from "path";
  const importRegex = /^import\s+(\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const [, importSpec, path] = match;

    if (importSpec.startsWith('{')) {
      // Destructured import: import { Image } from "astro:assets";
      // We don't need to track these
      continue;
    } else {
      // Default import: import lire from "../../assets/lire.png";
      const varName = importSpec.trim();
      mappings[varName] = path;
    }
  }

  return mappings;
}

/**
 * Remove all import statements from content
 */
function removeImports(content) {
  return content.replace(/^import\s+.*$/gm, '').replace(/^\n$/, '');
}

/**
 * Convert Astro <Image /> components to <img> tags
 */
function convertImageComponents(content, importMappings) {
  // Match <Image src={variable} alt="..." ... />
  // This handles multi-line Image components
  const imageRegex = /<Image\s+([^>]+?)\/>/gs;

  return content.replace(imageRegex, (match, props) => {
    let src = '';
    let alt = '';
    let width = '';
    let height = '';
    let className = '';

    // Parse props - handle both quoted and unquoted/braced values
    const propRegex = /(\w+)=("[^"]*"|'[^']*'|\{[^}]*\})/g;
    let propMatch;

    while ((propMatch = propRegex.exec(props)) !== null) {
      const [, name, value] = propMatch;

      // Remove surrounding quotes or braces
      const cleanValue = value.replace(/^["']|["']$/g, '').replace(/^{|}$/g, '').trim();

      if (name === 'src') {
        // Check if src is a variable reference
        if (importMappings[cleanValue]) {
          src = convertAssetPathToUrl(importMappings[cleanValue]);
        } else {
          src = convertAssetPathToUrl(cleanValue);
        }
      } else if (name === 'alt') {
        alt = cleanValue;
      } else if (name === 'width') {
        width = ` width="${cleanValue}"`;
      } else if (name === 'height') {
        height = ` height="${cleanValue}"`;
      } else if (name === 'class') {
        className = ` class="${cleanValue}"`;
      }
    }

    return `<img src="${src}" alt="${alt}"${width}${height}${className} />`;
  });
}

/**
 * Convert YoutubeEmbed component to iframe
 */
function convertYoutubeEmbed(content) {
  // Match <YoutubeEmbed url="..." title="..." />
  const youtubeRegex = /<YoutubeEmbed\s+([^>]+?)\/>/gs;

  return content.replace(youtubeRegex, (match, props) => {
    let url = '';
    let title = 'YouTube video';

    // Parse props
    const propRegex = /(\w+)=("[^"]*"|'[^']*')/g;
    let propMatch;

    while ((propMatch = propRegex.exec(props)) !== null) {
      const [, name, value] = propMatch;
      const cleanValue = value.replace(/^["']|["']$/g, '');

      if (name === 'url') {
        url = cleanValue;
      } else if (name === 'title') {
        title = cleanValue;
      }
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?/]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';

    if (!videoId) {
      return `<!-- Could not parse YouTube URL: ${url} -->`;
    }

    return `<figure class="kg-card kg-embed-card"><iframe width="480" height="270" src="https://www.youtube.com/embed/${videoId}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>`;
  });
}

/**
 * Basic markdown to HTML conversion
 * This is a simplified conversion - for production use, consider using a proper markdown library
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // 1. Extract import mappings before removing them
  const importMappings = extractImportMappings(html);

  // 2. Remove import statements
  html = removeImports(html);

  // 3. Convert Astro components (before markdown processing)
  html = convertImageComponents(html, importMappings);
  html = convertYoutubeEmbed(html);

  // Code blocks (must be done before other processing)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="${lang || ''}">${escapeHtml(code.trim())}</code></pre>\n\n`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images - convert markdown to img tags and update paths to URLs
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<img src="${convertAssetPathToUrl(src)}" alt="${alt}" />`;
  });

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>\n');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (must be done last)
  html = html.replace(/^(?!<(?:h[1-6]|p|ul|ol|li|blockquote|pre|code|figure))(.+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Get list of posts to export
 */
function getPostsToExport() {
  // Check if specific posts are requested
  if (fs.existsSync(SLUGS_FILE)) {
    const slugs = fs.readFileSync(SLUGS_FILE, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (slugs.length > 0) {
      console.log(`📋 Found ${slugs.length} specific posts to export`);
      return slugs;
    }
  }

  // Otherwise, export all posts
  console.log('📋 Exporting all blog posts (no posts-to-export.txt found)');
  return null;
}

/**
 * Main export function
 */
async function main() {
  console.log('📤 Astro to Ghost Export Script');
  console.log('================================\n');

  // Get all blog posts
  const allFiles = await glob('**/*.{md,mdx}', { cwd: BLOG_DIR });
  console.log(`📊 Found ${allFiles.length} blog posts`);

  // Filter to specific posts if needed
  const specificSlugs = getPostsToExport();
  const filesToExport = specificSlugs
    ? allFiles.filter(f => specificSlugs.includes(path.basename(f, path.extname(f))))
    : allFiles;

  if (filesToExport.length === 0) {
    console.log('⚠️  No posts to export!');
    process.exit(0);
  }

  console.log(`📄 Processing ${filesToExport.length} posts...\n`);

  const posts = [];
  const postsMeta = [];
  const tags = [];
  const postsTags = [];
  const users = [];
  const postsAuthors = [];

  // Create default author
  const authorId = generateId();
  users.push({
    id: authorId,
    name: 'Benoît Huron',
    slug: 'benoit-huron',
    email: DEFAULT_AUTHOR_EMAIL,
    roles: ['Administrator']
  });

  // Track unique tags
  const tagMap = new Map();

  // Process each post
  for (const file of filesToExport) {
    const filePath = path.join(BLOG_DIR, file);
    const postId = generateId();

    try {
      const { post, meta, tags: postTags } = convertPostToGhost(filePath, postId);

      // Add post directly to posts array (Ghost format: posts contains post objects)
      posts.push(post);

      // Add meta to separate posts_meta array (Ghost format: posts_meta is separate)
      if (meta) {
        postsMeta.push(meta);
      }

      // Add author relationship
      postsAuthors.push({
        post_id: postId,
        author_id: authorId
      });

      // Process tags
      for (const tagName of postTags) {
        // Generate tag slug
        const tagSlug = tagName
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        // Get or create tag
        let tagId;
        if (tagMap.has(tagSlug)) {
          tagId = tagMap.get(tagSlug);
        } else {
          tagId = generateId();
          tagMap.set(tagSlug, tagId);
          tags.push({
            id: tagId,
            name: tagName,
            slug: tagSlug
          });
        }

        // Create post-tag relationship
        postsTags.push({
          post_id: postId,
          tag_id: tagId
        });
      }

      console.log(`✅ Processed "${post.title}"`);

    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error.message);
    }
  }

  // Build Ghost JSON structure
  const ghostImport = {
    meta: {
      exported_on: Date.now(),
      version: GHOST_VERSION
    },
    data: {
      posts: posts,
      posts_meta: postsMeta, // Always include, even if empty
      tags: tags,
      posts_tags: postsTags,
      users: users,
      posts_authors: postsAuthors
    }
  };

  // Wrap in db array (optional but recommended)
  const finalOutput = {
    db: [ghostImport]
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));

  console.log('\n================================');
  console.log('📊 Export Summary:');
  console.log(`   ✅ Posts: ${posts.length}`);
  console.log(`   🏷️  Tags: ${tags.length}`);
  console.log(`   👤 Users: ${users.length}`);
  console.log(`   📁 Output: ${OUTPUT_FILE}`);

  console.log('\n📝 Next Steps:');
  console.log('   1. Review the generated ghost-import.json file');
  console.log('   2. Upload images to Ghost separately if needed');
  console.log('   3. Import in Ghost Admin: Settings → Advanced → Import/Export');
  console.log('   4. Check imported content and fix formatting if needed');

  console.log('\n💡 Tip: To export specific posts, create posts-to-export.txt with one slug per line');
  console.log('   Example:');
  console.log('   lire-plus-et-lire-mieux');
  console.log('   lintelligence-artificielle-dans-leducation');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
