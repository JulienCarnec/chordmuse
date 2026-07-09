// All 12 chromatic notes (using sharps internally)
export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Enharmonic equivalents: sharp → flat
export const ENHARMONIC = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};
// Flat → sharp (reverse map)
const FLAT2SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export function noteIndex(note) {
  const n = FLAT2SHARP[note] ?? note;
  return CHROMATIC.indexOf(n);
}

export function transposeNote(note, semitones) {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  return CHROMATIC[(idx + semitones + 120) % 12];
}

export function noteName(index) {
  return CHROMATIC[((index % 12) + 12) % 12];
}

/**
 * Decide whether a scale uses flat spellings.
 * Rules (standard music theory):
 *   - Roots F, Bb, Eb, Ab, Db, Gb always use flats.
 *   - Any root whose normalised name is a flat uses flats.
 *   - Otherwise if any diatonic scale note is a flat, use flats.
 */
const FLAT_KEY_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export function preferFlat(scaleRoot, scaleKey) {
  if (!scaleRoot) return false;
  // Root itself is flat-spelled
  if (FLAT_KEY_ROOTS.has(scaleRoot)) return true;
  // Root stored as sharp that is enharmonically a flat key
  // e.g. A# is the same as Bb — prefer flat
  if (ENHARMONIC[scaleRoot] && FLAT_KEY_ROOTS.has(ENHARMONIC[scaleRoot])) return true;
  return false;
}

/**
 * Display a note name with the correct enharmonic spelling for the scale.
 * Always returns the sharp name for natural notes; converts sharps to flats
 * only when preferFlat() is true.
 *
 * e.g. displayNote('A#', true)  → 'Bb'
 *      displayNote('A#', false) → 'A#'
 *      displayNote('G',  true)  → 'G'
 */
export function displayNote(sharpName, useFlat) {
  if (!useFlat) return sharpName;
  return ENHARMONIC[sharpName] ?? sharpName;
}
