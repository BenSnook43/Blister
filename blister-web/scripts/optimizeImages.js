const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../src/images');
const OUTPUT_DIR = path.join(__dirname, '../src/images/optimized');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Configuration for different image sizes
const sizes = [
  { width: 400, suffix: 'sm' },
  { width: 800, suffix: 'md' },
  { width: 1200, suffix: 'lg' },
  { width: 1600, suffix: 'xl' },
  { width: 2000, suffix: '2xl' }
];

async function optimizeImage(inputPath) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  
  // Process each size
  for (const size of sizes) {
    const outputFilename = `${filename}-${size.suffix}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    try {
      await sharp(inputPath)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      console.log(`✓ Generated ${outputFilename}`);
    } catch (error) {
      console.error(`✗ Error processing ${outputFilename}:`, error);
    }
  }
  
  // Generate a tiny placeholder
  const placeholderPath = path.join(OUTPUT_DIR, `${filename}-placeholder.webp`);
  try {
    await sharp(inputPath)
      .resize(20, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .blur(10)
      .webp({ quality: 20 })
      .toFile(placeholderPath);
    
    console.log(`✓ Generated placeholder for ${filename}`);
  } catch (error) {
    console.error(`✗ Error generating placeholder for ${filename}:`, error);
  }
}

async function processDirectory() {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    
    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png)$/i)) {
        const inputPath = path.join(IMAGES_DIR, file);
        await optimizeImage(inputPath);
      }
    }
    
    console.log('\nImage optimization complete! ✨');
  } catch (error) {
    console.error('Error processing directory:', error);
  }
}

processDirectory(); 