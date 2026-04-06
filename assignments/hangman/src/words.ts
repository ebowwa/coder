/**
 * Word list for Hangman game
 * Words are categorized by difficulty (1-5) based on length
 */

export interface WordEntry {
  word: string;
  category: string;
  difficulty: number;
}

const wordDatabase: WordEntry[] = [
  // Difficulty 1: 3-4 letter common words
  { word: "cat", category: "Animals", difficulty: 1 },
  { word: "dog", category: "Animals", difficulty: 1 },
  { word: "run", category: "Actions", difficulty: 1 },
  { word: "jump", category: "Actions", difficulty: 1 },
  { word: "book", category: "Objects", difficulty: 1 },
  { word: "tree", category: "Nature", difficulty: 1 },
  { word: "fire", category: "Nature", difficulty: 1 },
  { word: "food", category: "Food", difficulty: 1 },
  { word: "milk", category: "Food", difficulty: 1 },
  { word: "fish", category: "Animals", difficulty: 1 },
  { word: "bird", category: "Animals", difficulty: 1 },
  { word: "red", category: "Colors", difficulty: 1 },
  { word: "blue", category: "Colors", difficulty: 1 },
  { word: "home", category: "Places", difficulty: 1 },
  { word: "door", category: "Objects", difficulty: 1 },
  { word: "hand", category: "Body", difficulty: 1 },
  { word: "foot", category: "Body", difficulty: 1 },
  { word: "love", category: "Emotions", difficulty: 1 },
  { word: "hope", category: "Emotions", difficulty: 1 },
  { word: "play", category: "Actions", difficulty: 1 },
  { word: "walk", category: "Actions", difficulty: 1 },
  { word: "moon", category: "Space", difficulty: 1 },
  { word: "star", category: "Space", difficulty: 1 },
  { word: "rain", category: "Weather", difficulty: 1 },
  { word: "snow", category: "Weather", difficulty: 1 },
  { word: "cake", category: "Food", difficulty: 1 },
  { word: "ball", category: "Sports", difficulty: 1 },
  { word: "king", category: "People", difficulty: 1 },
  { word: "ship", category: "Vehicles", difficulty: 1 },
  { word: "car", category: "Vehicles", difficulty: 1 },

  // Difficulty 2: 5-6 letters
  { word: "apple", category: "Food", difficulty: 2 },
  { word: "beach", category: "Places", difficulty: 2 },
  { word: "chair", category: "Objects", difficulty: 2 },
  { word: "dance", category: "Actions", difficulty: 2 },
  { word: "eagle", category: "Animals", difficulty: 2 },
  { word: "flame", category: "Nature", difficulty: 2 },
  { word: "grape", category: "Food", difficulty: 2 },
  { word: "happy", category: "Emotions", difficulty: 2 },
  { word: "island", category: "Places", difficulty: 2 },
  { word: "jungle", category: "Nature", difficulty: 2 },
  { word: "knight", category: "People", difficulty: 2 },
  { word: "lemon", category: "Food", difficulty: 2 },
  { word: "music", category: "Arts", difficulty: 2 },
  { word: "night", category: "Time", difficulty: 2 },
  { word: "ocean", category: "Nature", difficulty: 2 },
  { word: "paint", category: "Arts", difficulty: 2 },
  { word: "river", category: "Nature", difficulty: 2 },
  { word: "snake", category: "Animals", difficulty: 2 },
  { word: "tiger", category: "Animals", difficulty: 2 },
  { word: "yellow", category: "Colors", difficulty: 2 },
  { word: "zebra", category: "Animals", difficulty: 2 },
  { word: "bridge", category: "Structures", difficulty: 2 },
  { word: "castle", category: "Structures", difficulty: 2 },
  { word: "dream", category: "Emotions", difficulty: 2 },
  { word: "earth", category: "Space", difficulty: 2 },
  { word: "forest", category: "Nature", difficulty: 2 },
  { word: "garden", category: "Places", difficulty: 2 },
  { word: "juice", category: "Food", difficulty: 2 },
  { word: "letter", category: "Objects", difficulty: 2 },
  { word: "market", category: "Places", difficulty: 2 },

  // Difficulty 3: 7-8 letters
  { word: "airplane", category: "Vehicles", difficulty: 3 },
  { word: "balloon", category: "Objects", difficulty: 3 },
  { word: "captain", category: "People", difficulty: 3 },
  { word: "dolphin", category: "Animals", difficulty: 3 },
  { word: "eclipse", category: "Space", difficulty: 3 },
  { word: "fantasy", category: "Emotions", difficulty: 3 },
  { word: "giraffe", category: "Animals", difficulty: 3 },
  { word: "harvest", category: "Nature", difficulty: 3 },
  { word: "holiday", category: "Time", difficulty: 3 },
  { word: "igloo", category: "Structures", difficulty: 3 },
  { word: "jasmine", category: "Nature", difficulty: 3 },
  { word: "library", category: "Places", difficulty: 3 },
  { word: "mystery", category: "Emotions", difficulty: 3 },
  { word: "nebula", category: "Space", difficulty: 3 },
  { word: "octopus", category: "Animals", difficulty: 3 },
  { word: "penguin", category: "Animals", difficulty: 3 },
  { word: "rainbow", category: "Nature", difficulty: 3 },
  { word: "sunrise", category: "Nature", difficulty: 3 },
  { word: "thunder", category: "Weather", difficulty: 3 },
  { word: "volcano", category: "Nature", difficulty: 3 },
  { word: "amazing", category: "Emotions", difficulty: 3 },
  { word: "breathe", category: "Body", difficulty: 3 },
  { word: "chapter", category: "Objects", difficulty: 3 },
  { word: "diamond", category: "Objects", difficulty: 3 },
  { word: "festival", category: "Events", difficulty: 3 },
  { word: "glacier", category: "Nature", difficulty: 3 },
  { word: "horizon", category: "Nature", difficulty: 3 },
  { word: "journey", category: "Actions", difficulty: 3 },
  { word: "kingdom", category: "Places", difficulty: 3 },
  { word: "lantern", category: "Objects", difficulty: 3 },

  // Difficulty 4: 9-10 letters
  { word: "adventure", category: "Actions", difficulty: 4 },
  { word: "butterfly", category: "Animals", difficulty: 4 },
  { word: "celebrate", category: "Actions", difficulty: 4 },
  { word: "dangerous", category: "Emotions", difficulty: 4 },
  { word: "elephants", category: "Animals", difficulty: 4 },
  { word: "fireplace", category: "Objects", difficulty: 4 },
  { word: "generous", category: "Emotions", difficulty: 4 },
  { word: "happiness", category: "Emotions", difficulty: 4 },
  { word: "important", category: "Concepts", difficulty: 4 },
  { word: "jellyfish", category: "Animals", difficulty: 4 },
  { word: "knowledge", category: "Concepts", difficulty: 4 },
  { word: "lifestyle", category: "Concepts", difficulty: 4 },
  { word: "mysterious", category: "Emotions", difficulty: 4 },
  { word: "nightmare", category: "Emotions", difficulty: 4 },
  { word: "orchestra", category: "Arts", difficulty: 4 },
  { word: "photograph", category: "Objects", difficulty: 4 },
  { word: "questions", category: "Concepts", difficulty: 4 },
  { word: "restaurant", category: "Places", difficulty: 4 },
  { word: "skeleton", category: "Body", difficulty: 4 },
  { word: "telephone", category: "Objects", difficulty: 4 },
  { word: "vegetable", category: "Food", difficulty: 4 },
  { word: "waterfall", category: "Nature", difficulty: 4 },
  { word: "xylophone", category: "Objects", difficulty: 4 },
  { word: "yesterday", category: "Time", difficulty: 4 },
  { word: "beautiful", category: "Emotions", difficulty: 4 },
  { word: "chocolate", category: "Food", difficulty: 4 },
  { word: "dinosaur", category: "Animals", difficulty: 4 },
  { word: "fantastic", category: "Emotions", difficulty: 4 },
  { word: "invisible", category: "Concepts", difficulty: 4 },
  { word: "keyboard", category: "Objects", difficulty: 4 },

  // Difficulty 5: 11+ letters
  { word: "achievement", category: "Concepts", difficulty: 5 },
  { word: "breathtaking", category: "Emotions", difficulty: 5 },
  { word: "celebration", category: "Events", difficulty: 5 },
  { word: "development", category: "Concepts", difficulty: 5 },
  { word: "environment", category: "Nature", difficulty: 5 },
  { word: "fundamental", category: "Concepts", difficulty: 5 },
  { word: "grandmother", category: "People", difficulty: 5 },
  { word: "headquarters", category: "Places", difficulty: 5 },
  { word: "intelligence", category: "Concepts", difficulty: 5 },
  { word: "temperature", category: "Nature", difficulty: 5 },
  { word: "kindergarten", category: "Places", difficulty: 5 },
  { word: "constellation", category: "Space", difficulty: 5 },
  { word: "manufacturing", category: "Concepts", difficulty: 5 },
  { word: "neighborhood", category: "Places", difficulty: 5 },
  { word: "photographer", category: "People", difficulty: 5 },
  { word: "mathematics", category: "Concepts", difficulty: 5 },
  { word: "electricity", category: "Science", difficulty: 5 },
  { word: "thunderstorm", category: "Weather", difficulty: 5 },
  { word: "architecture", category: "Arts", difficulty: 5 },
  { word: "extraordinary", category: "Emotions", difficulty: 5 },
];

/**
 * Get words filtered by difficulty level
 */
export function getWordsByDifficulty(difficulty: number): WordEntry[] {
  return wordDatabase.filter(w => w.difficulty === Math.min(5, Math.max(1, Math.floor(difficulty))));
}

/**
 * Get a random word for the given difficulty
 */
export function getRandomWord(difficulty: number): WordEntry {
  const words = getWordsByDifficulty(difficulty);
  if (words.length === 0) {
    // Fallback to difficulty 1 if no words found
    return wordDatabase[0];
  }
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Get a random word within a difficulty range (inclusive)
 */
export function getRandomWordInRange(minDifficulty: number, maxDifficulty: number): WordEntry {
  const words = wordDatabase.filter(
    w => w.difficulty >= minDifficulty && w.difficulty <= maxDifficulty
  );
  if (words.length === 0) {
    return wordDatabase[0];
  }
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Get all words (for server API)
 */
export function getAllWords(): WordEntry[] {
  return [...wordDatabase];
}
