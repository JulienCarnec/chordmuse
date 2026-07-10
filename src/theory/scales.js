import { noteIndex, noteName, preferFlat, displayNote } from './notes';

// Scale interval patterns (semitones from root)
export const SCALE_DEFINITIONS = {
  // Major modes
  ionian:           { intervals: [0, 2, 4, 5, 7, 9, 11], family: 'major' },
  dorian:           { intervals: [0, 2, 3, 5, 7, 9, 10], family: 'major' },
  phrygian:         { intervals: [0, 1, 3, 5, 7, 8, 10], family: 'major' },
  lydian:           { intervals: [0, 2, 4, 6, 7, 9, 11], family: 'major' },
  mixolydian:       { intervals: [0, 2, 4, 5, 7, 9, 10], family: 'major' },
  aeolian:          { intervals: [0, 2, 3, 5, 7, 8, 10], family: 'minor' },
  locrian:          { intervals: [0, 1, 3, 5, 6, 8, 10], family: 'major' },
  // Minor variants
  minorNatural:     { intervals: [0, 2, 3, 5, 7, 8, 10], family: 'minor' },
  minorMelodic:     { intervals: [0, 2, 3, 5, 7, 9, 11], family: 'minor' },
  minorHarmonic:    { intervals: [0, 2, 3, 5, 7, 8, 11], family: 'minor' },
  // Pentatonic
  majorPentatonic:  { intervals: [0, 2, 4, 7, 9],        family: 'major' },
  minorPentatonic:  { intervals: [0, 3, 5, 7, 10],       family: 'minor' },
  // Blues
  blues:            { intervals: [0, 3, 5, 6, 7, 10],    family: 'minor' },
  // Symmetric / exotic
  diminished:       { intervals: [0, 2, 3, 5, 6, 8, 9, 11], family: 'diminished' },
  oriental:         { intervals: [0, 1, 4, 5, 6, 9, 10], family: 'exotic' },
  doubleHarmonic:   { intervals: [0, 1, 4, 5, 7, 8, 11], family: 'exotic' },
  harmonicMajor:    { intervals: [0, 2, 4, 5, 7, 8, 11], family: 'major' },
  tritone:          { intervals: [0, 1, 4, 6, 7, 10],    family: 'exotic' },
};

/**
 * Returns array of note names in the scale, e.g. ['C','D','E','F','G','A','B']
 * Notes are spelled correctly (flats or sharps) based on the scale's key signature.
 */
export function getScaleNotes(root, scaleKey) {
  const def = SCALE_DEFINITIONS[scaleKey];
  if (!def) return [];
  const rootIdx = noteIndex(root);
  const useFlat = preferFlat(root, scaleKey);
  return def.intervals.map(i => displayNote(noteName(rootIdx + i), useFlat));
}

/**
 * Returns the set of note indices (0-11) belonging to the scale.
 */
export function getScaleNoteSet(root, scaleKey) {
  return new Set(getScaleNotes(root, scaleKey).map(n => noteIndex(n)));
}

/**
 * For a given root note, return all scale keys where that note is degree I
 * and the scale fits with the provided first chord notes.
 * If firstChordNotes is null, returns all scales with that root.
 */
export function getCompatibleScales(root, firstChordNotes = null) {
  return Object.entries(SCALE_DEFINITIONS)
    .filter(([scaleKey]) => {
      if (!firstChordNotes) return true;
      const scaleNotes = getScaleNotes(root, scaleKey);
      // Compare by pitch-class index to be enharmonic-safe
      const scaleIndices = new Set(scaleNotes.map(n => noteIndex(n)));
      return firstChordNotes.every(n => scaleIndices.has(noteIndex(n)));
    })
    .map(([key]) => key);
}

/**
 * For each scale key + root, check if firstChordRoot is degree I.
 * Returns map of scaleKey -> boolean.
 */
export function scalesFittingFirstChord(firstChordRoot, firstChordNotes) {
  const rootIdx = noteIndex(firstChordRoot);
  const result = {};
  for (const [scaleKey] of Object.entries(SCALE_DEFINITIONS)) {
    const scaleNotes = getScaleNotes(firstChordRoot, scaleKey);
    // Compare degree I by pitch-class index, and chord notes by index set
    const scaleIndices = new Set(scaleNotes.map(n => noteIndex(n)));
    const fits = noteIndex(scaleNotes[0]) === rootIdx &&
      firstChordNotes.every(n => scaleIndices.has(noteIndex(n)));
    result[scaleKey] = fits;
  }
  return result;
}
