/**
 * Custom word lists for Hangman game
 * Each category contains an array of words as strings
 */

export const wordLists = {
  animals: [
    'cat', 'dog', 'fish', 'bird', 'snake', 'tiger', 'zebra', 'eagle',
    'dolphin', 'giraffe', 'octopus', 'penguin', 'butterfly', 'elephant',
    'jellyfish', 'dinosaur', 'lion', 'bear', 'wolf', 'fox', 'deer',
    'rabbit', 'turtle', 'whale', 'shark', 'monkey', 'gorilla', 'panda',
    'koala', 'kangaroo', 'cheetah', 'leopard', 'crocodile', 'alligator',
    'flamingo', 'parrot', 'owl', 'eagle', 'falcon', 'hawk', 'raven',
    'salmon', 'trout', 'lobster', 'crab', 'shrimp', 'octopus', 'squid',
  ],
  
  countries: [
    'usa', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'peru',
    'france', 'germany', 'italy', 'spain', 'portugal', 'greece', 'poland',
    'japan', 'china', 'korea', 'india', 'thailand', 'vietnam', 'malaysia',
    'australia', 'newzealand', 'fiji', 'samoa', 'tonga',
    'egypt', 'morocco', 'kenya', 'nigeria', 'ethiopia', 'somalia',
    'russia', 'ukraine', 'sweden', 'norway', 'denmark', 'finland', 'iceland',
    'switzerland', 'austria', 'belgium', 'netherlands', 'luxembourg',
    'ireland', 'scotland', 'wales', 'england', 'britain',
  ],
  
  foods: [
    'apple', 'banana', 'grape', 'lemon', 'orange', 'mango', 'peach',
    'pizza', 'pasta', 'burger', 'taco', 'sushi', 'ramen', 'curry',
    'bread', 'cheese', 'butter', 'milk', 'cream', 'yogurt',
    'chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage',
    'carrot', 'potato', 'tomato', 'onion', 'garlic', 'pepper',
    'cake', 'cookie', 'brownie', 'donut', 'muffin', 'pancake',
    'chocolate', 'vanilla', 'strawberry', 'blueberry', 'raspberry',
    'coffee', 'tea', 'juice', 'soda', 'water', 'smoothie',
    'salad', 'sandwich', 'soup', 'stew', 'casserole', 'lasagna',
    'rice', 'noodle', 'dumpling', 'springroll', 'wonton', 'tempura',
  ],
  
  sports: [
    'soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis',
    'golf', 'cricket', 'rugby', 'volleyball', 'badminton', 'tabletennis',
    'swimming', 'diving', 'surfing', 'skiing', 'snowboarding', 'skating',
    'boxing', 'wrestling', 'judo', 'karate', 'taekwondo', 'fencing',
    'archery', 'shooting', 'bowling', 'pool', 'darts', 'billiards',
    'cycling', 'running', 'marathon', 'jogging', 'hiking', 'climbing',
    'gymnastics', 'cheerleading', 'dancing', 'ballet', 'yoga', 'pilates',
    'rowing', 'kayaking', 'canoeing', 'sailing', 'fishing', 'hunting',
    'horse', 'polo', 'rodeo', 'bullriding', 'skateboarding', 'bmx',
  ],
  
  technology: [
    'computer', 'laptop', 'tablet', 'phone', 'keyboard', 'mouse',
    'monitor', 'printer', 'scanner', 'camera', 'speaker', 'headphone',
    'software', 'hardware', 'program', 'code', 'algorithm', 'database',
    'internet', 'website', 'browser', 'server', 'cloud', 'network',
    'wifi', 'bluetooth', 'usb', 'hdmi', 'charger', 'battery',
    'robot', 'drone', 'sensor', 'microchip', 'processor', 'memory',
    'python', 'java', 'rust', 'swift', 'ruby', 'golang', 'typescript',
    'linux', 'windows', 'macos', 'android', 'ios', 'unix',
  ],
  
  nature: [
    'tree', 'flower', 'grass', 'leaf', 'branch', 'root', 'seed',
    'mountain', 'valley', 'river', 'lake', 'ocean', 'sea', 'pond',
    'forest', 'jungle', 'desert', 'tundra', 'savanna', 'wetland',
    'rain', 'snow', 'wind', 'storm', 'thunder', 'lightning', 'fog',
    'sun', 'moon', 'star', 'cloud', 'sky', 'rainbow', 'sunset',
    'rock', 'stone', 'boulder', 'cliff', 'cave', 'canyon', 'volcano',
    'island', 'peninsula', 'continent', 'coast', 'beach', 'dune',
    'waterfall', 'glacier', 'geyser', 'spring', 'stream', 'creek',
  ],
  
  music: [
    'piano', 'guitar', 'drum', 'violin', 'cello', 'flute', 'trumpet',
    'saxophone', 'clarinet', 'oboe', 'bassoon', 'tuba', 'trombone',
    'harp', 'accordion', 'banjo', 'mandolin', 'ukulele', 'sitar',
    'rock', 'jazz', 'blues', 'pop', 'classical', 'country', 'folk',
    'hiphop', 'rap', 'electronic', 'techno', 'house', 'dubstep',
    'symphony', 'concert', 'recital', 'festival', 'gig', 'tour',
    'melody', 'rhythm', 'harmony', 'chord', 'note', 'scale', 'tempo',
    'singer', 'band', 'orchestra', 'choir', 'composer', 'conductor',
  ],
  
  movies: [
    'action', 'comedy', 'drama', 'horror', 'thriller', 'romance',
    'scifi', 'fantasy', 'animation', 'documentary', 'western', 'musical',
    'actor', 'actress', 'director', 'producer', 'writer', 'editor',
    'oscar', 'emmy', 'golden', 'bafta', 'cannes', 'sundance',
    'hollywood', 'bollywood', 'blockbuster', 'premiere', 'sequel',
    'script', 'screenplay', 'scene', 'dialogue', 'monologue', 'soundtrack',
    'camera', 'lighting', 'costume', 'makeup', 'stunt', 'special',
    'theater', 'cinema', 'screen', 'projector', 'popcorn', 'ticket',
  ],
  
  science: [
    'atom', 'molecule', 'electron', 'proton', 'neutron', 'nucleus',
    'cell', 'dna', 'gene', 'chromosome', 'protein', 'enzyme',
    'gravity', 'energy', 'force', 'motion', 'velocity', 'acceleration',
    'light', 'sound', 'heat', 'electricity', 'magnetism', 'radiation',
    'element', 'compound', 'mixture', 'solution', 'reaction', 'catalyst',
    'planet', 'galaxy', 'universe', 'nebula', 'blackhole', 'quasar',
    'evolution', 'mutation', 'adaptation', 'species', 'ecosystem', 'habitat',
    'experiment', 'hypothesis', 'theory', 'law', 'research', 'discovery',
  ],
  
  default: [
    'cat', 'dog', 'tree', 'book', 'house', 'water', 'fire', 'earth',
    'music', 'dance', 'happy', 'smile', 'dream', 'hope', 'love',
    'star', 'moon', 'sun', 'cloud', 'rain', 'snow', 'wind',
    'apple', 'bread', 'cheese', 'milk', 'coffee', 'tea',
    'chair', 'table', 'door', 'window', 'floor', 'ceiling',
    'phone', 'computer', 'screen', 'keyboard', 'mouse', 'cable',
    'car', 'bus', 'train', 'plane', 'boat', 'bicycle',
    'shirt', 'pants', 'shoes', 'hat', 'jacket', 'dress',
  ],
} as const;

export type WordCategory = keyof typeof wordLists;

/**
 * Get all available categories
 */
export function getCategories(): WordCategory[] {
  return Object.keys(wordLists) as WordCategory[];
}

/**
 * Get words for a specific category
 * Falls back to default category if category not found
 */
export function getWordsForCategory(category: string | null): readonly string[] {
  if (!category || category === 'Random') {
    return wordLists.default;
  }
  
  const normalizedCategory = category.toLowerCase() as WordCategory;
  return wordLists[normalizedCategory] || wordLists.default;
}

/**
 * Get a random word from a specific category
 * Falls back to default category if category not found or empty
 */
export function getRandomWordFromCategory(category: string | null): string {
  const words = getWordsForCategory(category);
  
  if (words.length === 0) {
    return wordLists.default[Math.floor(Math.random() * wordLists.default.length)];
  }
  
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Check if a category exists
 */
export function isValidCategory(category: string): boolean {
  return category.toLowerCase() in wordLists;
}

/**
 * Get the default word list
 */
export function getDefaultWordList(): readonly string[] {
  return wordLists.default;
}
