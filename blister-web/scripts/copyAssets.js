const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../src/assets/event-images/optimized');
const TARGET_DIR = path.join(__dirname, '../public/assets/event-images/optimized');

async function copyOptimizedImages() {
  try {
    console.log('🚀 Copying optimized images to public directory...\n');

    // Ensure target directory exists
    await fs.ensureDir(TARGET_DIR);

    // Copy all optimized images
    await fs.copy(SOURCE_DIR, TARGET_DIR, {
      overwrite: true,
      filter: (src) => {
        // Only copy .webp files
        return src.endsWith('.webp');
      }
    });

    console.log('✨ Successfully copied optimized images to public directory!');
  } catch (error) {
    console.error('Error copying optimized images:', error);
    process.exit(1);
  }
}

copyOptimizedImages(); 