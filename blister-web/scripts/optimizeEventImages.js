const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Define event types and their directories
const EVENT_TYPES = ['run', 'triathlon', 'trail', 'road', 'ultra', 'track'];
const SOURCE_DIR = path.join(__dirname, '../src/assets/event-images');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/event-images/optimized');

// Configuration for different image sizes
const sizes = [
  { width: 400, suffix: 'sm' },
  { width: 800, suffix: 'md' },
  { width: 1200, suffix: 'lg' },
  { width: 1600, suffix: 'xl' },
  { width: 2000, suffix: '2xl' }
];

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create directories for each event type
EVENT_TYPES.forEach(type => {
  const typeDir = path.join(OUTPUT_DIR, type);
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }
});

async function optimizeImage(inputPath, eventType) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const typeDir = path.join(OUTPUT_DIR, eventType);
  
  // Process each size
  for (const size of sizes) {
    const outputFilename = `${filename}-${size.suffix}.webp`;
    const outputPath = path.join(typeDir, outputFilename);
    
    try {
      await sharp(inputPath)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'cover'
        })
        .webp({ 
          quality: 80,
          effort: 6 // Higher compression effort
        })
        .toFile(outputPath);
      
      console.log(`✓ Generated ${eventType}/${outputFilename}`);
    } catch (error) {
      console.error(`✗ Error processing ${outputFilename}:`, error);
    }
  }
  
  // Generate a tiny placeholder
  const placeholderPath = path.join(typeDir, `${filename}-placeholder.webp`);
  try {
    await sharp(inputPath)
      .resize(20, null, {
        withoutEnlargement: true,
        fit: 'cover'
      })
      .blur(10)
      .webp({ quality: 20 })
      .toFile(placeholderPath);
    
    console.log(`✓ Generated placeholder for ${eventType}/${filename}`);
  } catch (error) {
    console.error(`✗ Error generating placeholder for ${filename}:`, error);
  }
}

async function processEventType(eventType) {
  const typeDir = path.join(SOURCE_DIR, eventType);
  
  if (!fs.existsSync(typeDir)) {
    console.warn(`⚠️ Directory not found for event type: ${eventType}`);
    return;
  }
  
  const files = fs.readdirSync(typeDir);
  
  for (const file of files) {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const inputPath = path.join(typeDir, file);
      await optimizeImage(inputPath, eventType);
    }
  }
}

async function processAllEventTypes() {
  console.log('🚀 Starting event image optimization...\n');
  
  for (const eventType of EVENT_TYPES) {
    console.log(`\n📁 Processing ${eventType} events...`);
    await processEventType(eventType);
  }
  
  console.log('\n✨ Event image optimization complete!');
}

processAllEventTypes(); 