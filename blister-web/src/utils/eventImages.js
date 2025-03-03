import { triathlonFallbackImages } from '../assets/event-images/triathlon/fallback';

// Create a new file for event image mappings
const eventImages = {
  road: [
    new URL('../assets/event-images/optimized/road/greg-rosenke-GAGed6WJoOY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/brian-erickson-XFneC_rHR48-unsplash (2)-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/lucas-van-oort-47O2NAyNrvs-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/hendrik-morkel-PEuBo_tBHDw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/refargotohp-9wUwdMc1R1Q-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/kevin-grandison-ZZ9qfUynxHw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/miguel-a-amutio-TqOFeBqnqrI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/lucas-favre-JnoNcfFwrNA-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/sporlab-XiZ7pRvCzro-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/emma-simpson-mNGaaLeWEp0-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/jenny-hill-mQVWb7kUoOE-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/isaac-wendland-7DCZgKyp8vw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/candra-winata-CYOFvtpOIpU-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/andrew-tanglao-3I2vzcmEpLU-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/florian-kurrasch-HyivyCRdz14-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/jozsef-hocza-BTur1pF9FR0-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/chander-r-z4WH11FMfIQ-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/miguel-a-amutio-QDv-uBc-poY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/huckster-V62UrdknDCA-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/jenny-hill-Io2Zgb3_kdk-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/florian-kurrasch-zkctapwhzxc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/franzi-meyer-E6qbjeN4maY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2526883-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2530137-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2168292-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2461982-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2402734-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-3638093-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-mateusz-dach-99805-1072705-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-federicoabisphoto-28907539-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-ketchumcommunity-1564470-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2402777-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-1571939-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pexels-runffwpu-2654902-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/ev-C7h_31Lz16Y-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/josh-gordon-fzHmP6z8OQ4-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/fitsum-admasu-oGv9xIl7DkY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/sage-friedman-TT2J5t1QaMw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/pietro-rampazzo-x5GcXFvJJhI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/capstone-events-bPJcBBM4RT8-unsplash-md.webp', import.meta.url).href
  ],
  trail: [
    new URL('../assets/event-images/optimized/trail/danka-peter-xv4L_bb0Z_8-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/sopan-shewale-tFvMzcr4pII-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/zan-lazarevic-tT-SvVAbK_w-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/jeremy-lapak-CVvFVQ_-oUg-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/brian-metzler-nmWQ2SKvj5M-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/quino-al-yT6o4UehMtI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/bill-fairs-p4TbSsdusb4-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/pexels-ozanyavuz-29888769-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/alessio-soggetti-GYr9A2CPMhY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/brian-erickson-XFneC_rHR48-unsplash (1)-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/brian-erickson-ukqBUIYk6zM-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/james-chou-2RXFLCGuTzg-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/nathalie-desiree-mottet-lRKM2STBj14-unsplash-md.webp', import.meta.url).href
  ],
  ultra: [
    new URL('../assets/event-images/optimized/ultra/kristin-snippe-6NwrVDNsTx4-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/cole-freeman-NrSNAdapVHc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/harry-gillen-C2waufpOUwA-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/rohit-d-silva-WhAI_vc0r7Y-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/jacalyn-beales-eI4hIj4qMjI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/pexels-runffwpu-13158584-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/pexels-runffwpu-9790263-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/pexels-runffwpu-18408904-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/venti-views-I1EWTM5mFEM-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/urban-vintage-8TJbrQGKFyU-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/jacob-guse--qowxhCdFgg-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/markus-spiske-aXpvGGu1fNs-unsplash-md.webp', import.meta.url).href
  ],
  track: [
    new URL('../assets/event-images/optimized/track/nicolas-hoizey-poa-Ycw1W8U-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/track/tirza-van-dijk-TEYrLTKKMSg-unsplash-md.webp', import.meta.url).href
  ],
  // Triathlon events (flat structure)
  triathlon: [
    new URL('../assets/event-images/optimized/triathlon/tony-pham-K2xGNNcQn_w-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-x9NswyAWh2E-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/ashley-de-lotz-Vr3Xi8_2NgY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/victoire-joncheray-H30w37gpkro-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/beau-runsten-mR-N67XjTHg-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/christopher-eden-ov0caEZKBsY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/jon-del-rivero-AjF5fv4-a2U-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/orca-T4boPYGF-vA-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/jorge-romero-mfCFuPfTtdU-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/victoire-joncheray-Yk9HUFhrCQY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/mario-la-pergola-7qFZr1-zk98-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pablo-ulloa-RCNhqDoeayc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-MApmUpGIkWc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tom-dils-2lDtnHgiQzc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-uLDCjIBexZI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-9s5-focFrSE-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-HISp8YltNxw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-bOdzi6eS4go-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/tony-pham-pzKVmt9ziT8-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/ashley-de-lotz-GXn0WVLHi0Y-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-oJsdFqasXRQ-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-XcvocqxlQ-A-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-k10kyQ-R3nk-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-p33USAasLp0-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-j3uBkQf2rjc-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-spiske-sjsKbYmPaeM-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/nodir-khalilov-w80rVuHr0pY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/janik-presser-B9Ul6jU8ln4-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/nodir-khalilov--Jrz-eimyl0-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/markus-kammermann-kGCShq1Tujw-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/diana-rafira-jth6_VDCOIo-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/janik-presser-6BKq8poFusE-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/diana-rafira-s3jkVK0BT-8-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/diana-rafira-XIA5-qBMJvY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-runffwpu-5687544-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/nodir-khalilov-uTTU2FLf-I0-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-runffwpu-5687405-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-runffwpu-5687479-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-ander-garcia-1317358711-25016481-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-runffwpu-5840726-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/triathlon/pexels-merchedlive-4604846-md.webp', import.meta.url).href
  ],
  // Default run images (for generic 'run' type)
  run: [
    new URL('../assets/event-images/optimized/road/greg-rosenke-GAGed6WJoOY-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/zan-lazarevic-tT-SvVAbK_w-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/pexels-runffwpu-13158584-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/james-chou-2RXFLCGuTzg-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/lucas-van-oort-47O2NAyNrvs-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/kristin-snippe-6NwrVDNsTx4-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/quino-al-yT6o4UehMtI-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/road/sporlab-XiZ7pRvCzro-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/ultra/harry-gillen-C2waufpOUwA-unsplash-md.webp', import.meta.url).href,
    new URL('../assets/event-images/optimized/trail/alessio-soggetti-GYr9A2CPMhY-unsplash-md.webp', import.meta.url).href
  ]
};

// Default fallback image
export const fallbackImage = new URL('../assets/event-images/optimized/road/greg-rosenke-GAGed6WJoOY-unsplash-md.webp', import.meta.url).href;

// Keep track of recently used images for each type
const recentlyUsedImages = new Map();
const MAX_HISTORY = 10;

// Fisher-Yates shuffle algorithm for better randomization
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Get a random image for an event type, avoiding recent duplicates
export function getEventImage(type = 'road') {
  try {
    // Normalize the type and get images
    const normalizedType = type.toLowerCase();
    const images = eventImages[normalizedType] || eventImages.road;
    
    return getRandomImageFromArray(images, normalizedType);
  } catch (error) {
    console.error('Error getting event image:', error);
    return fallbackImage;
  }
}

// Helper function to get a random image from an array
function getRandomImageFromArray(images, type) {
  if (!images || images.length === 0) {
    return fallbackImage;
  }

  // Get history for this type
  let history = recentlyUsedImages.get(type) || [];
  const availableImages = images.filter(img => !history.includes(img));

  if (availableImages.length === 0) {
    // If all images have been used, shuffle the full array and reset history
    const shuffledImages = shuffleArray([...images]);
    recentlyUsedImages.set(type, [shuffledImages[0]]);
    return shuffledImages[0];
  }

  // Shuffle available images for better randomization
  const shuffledAvailable = shuffleArray([...availableImages]);
  const selectedImage = shuffledAvailable[0];
  
  // Update history
  history = [selectedImage, ...history].slice(0, MAX_HISTORY);
  recentlyUsedImages.set(type, history);
  
  return selectedImage;
}

// Get srcSet for an event image
export function getEventImageSrcSet(type, imagePath) {
  if (!imagePath) return null;

  // If it's not an optimized image path, return null
  if (!imagePath.includes('/optimized/')) return null;

  return [
    imagePath.replace(/-md\.webp$/, '-sm.webp 400w'),
    imagePath.replace(/-md\.webp$/, '-md.webp 800w'),
    imagePath.replace(/-md\.webp$/, '-lg.webp 1200w'),
    imagePath.replace(/-md\.webp$/, '-xl.webp 1600w'),
    imagePath.replace(/-md\.webp$/, '-2xl.webp 2000w')
  ].join(', ');
}

// Get placeholder for an event image
export function getEventImagePlaceholder(type, imagePath) {
  if (!imagePath) return null;

  // If it's not an optimized image path, return null
  if (!imagePath.includes('/optimized/')) return null;

  return imagePath.replace(/-md\.webp$/, '-placeholder.webp');
} 