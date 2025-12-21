#!/usr/bin/env node

/**
 * Markdown Formatter for Imported Ghost Articles
 *
 * This script reformats markdown files to improve readability:
 * - Ensures blank lines before headings
 * - Ensures blank lines after headings (optional)
 * - Wraps long lines to 80 characters (optional)
 * - Promotes heading levels (optional)
 *
 * Usage:
 * node scripts/reformat-markdown.js [options] [file...]
 *
 * Options:
 * --wrap=80          Wrap lines to specified column (default: 0 = no wrap)
 * --promote-headings Convert h4->h2, h5->h3, h6->h4 (default: false)
 * --dry-run          Show changes without writing
 * --all              Process all files in src/content/blog/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allFiles = args.includes('--all');
const wrapArg = args.find(arg => arg.startsWith('--wrap='));
const wrapColumn = wrapArg ? parseInt(wrapArg.split('=')[1]) : 0;
const promoteHeadings = args.includes('--promote-headings');

const BLOG_DIR = path.join(projectRoot, 'src/content/blog');

// Get list of files to process
let files = [];
if (allFiles) {
  files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(BLOG_DIR, f));
} else {
  // Use specified files or default to all
  const specifiedFiles = args.filter(arg => !arg.startsWith('--') && arg.endsWith('.md'));
  if (specifiedFiles.length > 0) {
    files = specifiedFiles.map(f => path.resolve(f));
  } else {
    console.log('No files specified. Use --all or specify files.');
    process.exit(1);
  }
}

console.log(`Processing ${files.length} file(s)...`);

/**
 * Wrap text to specified column width
 */
function wrapText(text, width) {
  if (!width || width < 40) return text;

  const lines = [];
  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    // Skip wrapping for special content
    if (paragraph.startsWith('#') || paragraph.startsWith('>') ||
        paragraph.startsWith('- ') || paragraph.startsWith('* ') ||
        paragraph.match(/^\d+\. /) ||
        paragraph.includes('![') || paragraph.includes('](') ||
        paragraph.includes('http://') || paragraph.includes('https://')) {
      // Don't wrap headings, blockquotes, lists, images, links
      lines.push(paragraph);
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Ensure blank lines before headings
 */
function ensureBlankLinesBeforeHeadings(content) {
  const lines = content.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';

    // Check if this line is a heading (starts with 1-6 #)
    if (line.match(/^#{1,6}\s/)) {
      // Ensure previous line is blank (unless start of file or after frontmatter)
      if (i > 0 && prevLine.trim() !== '') {
        result.push('');
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Promote heading levels (h4->h2, h5->h3, h6->h4)
 */
function promoteHeadingsLevels(content) {
  return content
    .replace(/^####\s+/gm, '## ')
    .replace(/^#####\s+/gm, '### ')
    .replace(/^######\s+/gm, '#### ');
}

/**
 * Main formatting function
 */
function formatMarkdown(content, options = {}) {
  const { wrap = 0, promote = false } = options;

  // Split frontmatter and content
  const frontmatterEnd = content.indexOf('---\n', 4);
  if (frontmatterEnd === -1) {
    // No frontmatter, process entire content
    return processContent(content, options);
  }

  const frontmatter = content.substring(0, frontmatterEnd + 4);
  let body = content.substring(frontmatterEnd + 4);

  // Remove leading/trailing newlines
  body = body.replace(/^\n+/, '').replace(/\n+$/, '');

  // Process body
  body = processContent(body, options);

  return frontmatter + '\n' + body + '\n';
}

/**
 * Process content (without frontmatter)
 */
function processContent(content, options) {
  let result = content;

  // Ensure blank lines before headings
  result = ensureBlankLinesBeforeHeadings(result);

  // Promote heading levels if requested
  if (options.promote) {
    result = promoteHeadingsLevels(result);
  }

  // Wrap text if requested
  if (options.wrap > 0) {
    result = wrapText(result, options.wrap);
  }

  return result;
}

// Process each file
for (const filepath of files) {
  console.log(`\n📄 ${path.basename(filepath)}`);

  try {
    const original = fs.readFileSync(filepath, 'utf8');
    const formatted = formatMarkdown(original, {
      wrap: wrapColumn,
      promote: promoteHeadings
    });

    if (original === formatted) {
      console.log('   No changes needed');
      continue;
    }

    if (dryRun) {
      console.log('   Changes would be made:');
      // Show diff preview (first 5 differences)
      const originalLines = original.split('\n');
      const formattedLines = formatted.split('\n');
      const maxLines = Math.max(originalLines.length, formattedLines.length);
      let diffCount = 0;
      const maxDiffs = 5;

      for (let i = 0; i < maxLines && diffCount < maxDiffs; i++) {
        const orig = originalLines[i] || '';
        const fmt = formattedLines[i] || '';
        if (orig !== fmt) {
          console.log(`   Line ${i + 1}:`);
          console.log(`   - ${orig}`);
          console.log(`   + ${fmt}`);
          diffCount++;
        }
      }
      if (diffCount >= maxDiffs) {
        console.log(`   ... and ${Math.max(0, diffCount - maxDiffs)} more differences`);
      }
    } else {
      fs.writeFileSync(filepath, formatted, 'utf8');
      console.log('   ✓ Formatted');
    }
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
  }
}

console.log('\n✅ Done');