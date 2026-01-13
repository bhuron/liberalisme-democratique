import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSvg = path.join(__dirname, '../public/favicon.svg');
const outputDir = path.join(__dirname, '../public');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateFavicons() {
  try {
    for (const { name, size } of sizes) {
      const outputPath = path.join(outputDir, name);
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${name}`);
    }

    console.log('\n✓ Favicon PNG files generated!');
    console.log('\nNote: For favicon.ico, use an online generator:');
    console.log('  https://favicon.io or https://realfavicongenerator.net');
    console.log(`  Upload: ${inputSvg}`);
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();
