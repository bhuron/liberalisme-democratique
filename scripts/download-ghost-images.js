#!/usr/bin/env node

/**
 * Ghost Image Downloader
 *
 * This script downloads remote Ghost images and updates markdown frontmatter.
 * Run after importing Ghost content with IMAGE_HANDLING='remote'.
 *
 * Usage:
 * node scripts/download-ghost-images.js
 *
 * Options:
 * --dry-run: Show what would be downloaded without making changes
 * --output-dir=src/assets/custom-images: Custom output directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { parse, stringify } from 'yaml';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Configuration
const BLOG_CONTENT_DIR = path.join(projectRoot, 'src/content/blog');
const DEFAULT_OUTPUT_DIR = path.join(projectRoot, 'src/assets/ghost-images');
const CONCURRENT_DOWNLOADS = 3;

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outputDirArg = args.find(arg => arg.startsWith('--output-dir='));
const outputDir = outputDirArg ?
  path.resolve(projectRoot, outputDirArg.split('=')[1]) :
  DEFAULT_OUTPUT_DIR;

// Ensure output directory exists
if (!dryRun && !fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Download a file from URL
 */
async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(filepath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partially downloaded file
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return null;
  }

  try {
    return parse(frontmatterMatch[1]);
  } catch (error) {
    console.warn(`Failed to parse frontmatter in ${filepath}:`, error.message);
    return null;
  }
}

/**
 * Update frontmatter in markdown file
 */
function updateFrontmatter(filepath, newFrontmatter) {
  const content = fs.readFileSync(filepath, 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    console.warn(`No frontmatter found in ${filepath}`);
    return false;
  }

  // Convert new frontmatter to YAML
  const newYaml = stringify(newFrontmatter).trim();
  const newContent = content.replace(
    /^---\n[\s\S]*?\n---/,
    `---\n${newYaml}\n---`
  );

  fs.writeFileSync(filepath, newContent);
  return true;
}

/**
 * Process a single markdown file
 */
async function processMarkdownFile(filepath, stats) {
  const filename = path.basename(filepath);
  const frontmatter = extractFrontmatter(filepath);

  if (!frontmatter || !frontmatter.image || !frontmatter.image.src) {
    stats.skipped++;
    console.log(`⏭️  Skipping ${filename}: No image in frontmatter`);
    return;
  }

  const imageUrl = frontmatter.image.src;

  // Skip if already a local path
  if (!imageUrl.startsWith('http')) {
    stats.skipped++;
    console.log(`⏭️  Skipping ${filename}: Already local path: ${imageUrl}`);
    return;
  }

  // Extract filename from URL
  const urlObj = new URL(imageUrl);
  const remoteFilename = path.basename(urlObj.pathname);

  // Clean filename (remove query parameters, etc.)
  const cleanFilename = remoteFilename.split('?')[0];

  // Generate safe filename
  const safeFilename = cleanFilename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');

  const localPath = path.join(outputDir, safeFilename);
  const publicPath = `../../assets/ghost-images/${safeFilename}`;

  stats.total++;
  console.log(`📥 Processing ${filename}`);
  console.log(`   URL: ${imageUrl}`);
  console.log(`   Local: ${localPath}`);

  if (dryRun) {
    console.log(`   🚫 Dry run: Would download to ${localPath}`);
    stats.dryRun++;
    return;
  }

  try {
    // Download image
    await downloadFile(imageUrl, localPath);

    // Update frontmatter
    const updatedFrontmatter = {
      ...frontmatter,
      image: {
        ...frontmatter.image,
        src: publicPath
      }
    };

    updateFrontmatter(filepath, updatedFrontmatter);

    console.log(`   ✅ Downloaded and updated`);
    stats.downloaded++;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    stats.failed++;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📸 Ghost Image Downloader');
  console.log('=========================\n');

  if (dryRun) {
    console.log('🚫 DRY RUN MODE - No files will be modified\n');
  }

  console.log(`📁 Blog content: ${BLOG_CONTENT_DIR}`);
  console.log(`📁 Image output: ${outputDir}\n`);

  // Find all markdown files
  const pattern = path.join(BLOG_CONTENT_DIR, '**/*.md');
  const files = await glob(pattern);

  console.log(`📄 Found ${files.length} markdown files\n`);

  const stats = {
    total: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    dryRun: 0
  };

  // Process files with limited concurrency
  const batchSize = CONCURRENT_DOWNLOADS;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(file => processMarkdownFile(file, stats))
    );
  }

  // Summary
  console.log('\n📊 Download Summary:');
  console.log('=========================');
  console.log(`   📄 Total files processed: ${files.length}`);
  console.log(`   🖼️  Images found: ${stats.total}`);

  if (dryRun) {
    console.log(`   🚫 Would download: ${stats.dryRun}`);
  } else {
    console.log(`   ✅ Successfully downloaded: ${stats.downloaded}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
  }

  console.log(`   ⏭️  Skipped: ${stats.skipped}`);

  if (!dryRun && stats.downloaded > 0) {
    console.log('\n🔧 Next Steps:');
    console.log('   1. Run `npm run build` to test optimized images');
    console.log('   2. Check image dimensions in frontmatter if needed');
    console.log('   3. Consider running image optimization tools');
  }
}

// Run script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});