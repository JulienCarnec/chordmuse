import { noteIndex, noteName } from './notes';

// Scale interval patterns (semitones from root)
export const SCALE_DEFINITIONS = {
  // Major modes
  ionian:      { name: 'Ionian (Major)',     intervals: [0, 2, 4, 5, 7, 9, 11], family: 'major' },
  dorian:      { name: 'Dorian',             intervals: [0, 2, 3, 5, 7, 9, 10], family: 'major' },
  phrygian:    { name: 'Phrygian',           intervals: [0, 1, 3, 5, 7, 8, 10], family: 'major' },
  lydian:      { name: 'Lydian',             intervals: [0, 2, 4, 6, 7, 9, 11], family: 'major' },
  mixolydian:  { name: 'Mixolydian',         intervals: [0, 2, 4, 5, 7, 9, 10], family: 'major' },
  aeolian:     { name: 'Aeolian (Natural Minor)', intervals: [0, 2, 3, 5, 7, 8, 10], family: 'minor' },
  locrian:     { name: 'Locrian',            intervals: [0, 1, 3, 5, 6, 8, 10], family: 'major' },
  // Minor variants
  minorNatural:  { name: 'Minor Natural',    intervals: [0, 2, 3, 5, 7, 8, 10], family: 'minor' },
  minorMelodic:  { name: 'Minor Melodic',    intervals: [0, 2, 3, 5, 7, 9, 11], family: 'minor' },
  minorHarmonic: { name: 'Minor Harmonic',   intervals: [0, 2, 3, 5, 7, 8, 11], family: 'minor' },
};

/**
 * Returns array of note names in the scale, e.g. ['C','D','E','F','G','A','B']
 */
export function getScaleNotes(root, scaleKey) {
  const def = SCALE_DEFINITIONS[scaleKey];
  if (!def) return [];
  const rootIdx = noteIndex(root);
  return def.intervals.map(i => noteName(rootIdx + i));
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
    .filter(([, def]) => {
      if (!firstChordNotes) return true;
      const scaleNotes = getScaleNotes(root, Object.keys(SCALE_DEFINITIONS).find(k => SCALE_DEFINITIONS[k] === def));
      // Check all chord notes are in the scale
      return firstChordNotes.every(n => scaleNotes.includes(n));
    })
    .map(([key]) => key);
}

/**
 * For each scale key + root, check if firstChordRoot is degree I.
 * Returns map of scaleKey -> boolean.
 */
export function scalesFittingFirstChord(firstChordRoot, firstChordNotes) {
  const result = {};
  for (const [scaleKey] of Object.entries(SCALE_DEFINITIONS)) {
    const scaleNotes = getScaleNotes(firstChordRoot, scaleKey);
    // Root must be degree I (first note of scale) and all chord notes in scale
    const fits = scaleNotes[0] === firstChordRoot &&
      firstChordNotes.every(n => scaleNotes.includes(n));
    result[scaleKey] = fits;
  }
  return result;
}
