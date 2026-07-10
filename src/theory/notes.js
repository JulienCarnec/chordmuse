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
 * Decide whether a scale uses flat spellings, based on both root and mode.
 *
 * Standard music theory key-signature rules:
 *   Major scale flat keys  : F  Bb  Eb  Ab  Db  Gb  (1–6 flats)
 *   Major scale sharp keys : G  D   A   E   B   F#  (1–6 sharps)
 *   C major = 0 accidentals (neither)
 *
 *   Natural-minor / Aeolian / minorNatural / minorHarmonic / minorMelodic / Dorian share
 *   the relative-major key signature.  Relative major = minor root + 3 semitones.
 *   So we derive the relative major and check that.
 *
 *   Other modes (Phrygian, Lydian, Mixolydian, Locrian) are treated similarly by
 *   shifting the root to the parallel major: each mode has a fixed offset to its
 *   parent Ionian root.
 *
 * Mode → semitones to add to mode-root to get its parent Ionian root:
 *   Ionian       0   (C ionian → C major)
 *   Dorian      +10  (D dorian → C major, i.e. +10 = -2 mod 12)
 *   Phrygian    +8
 *   Lydian      +7  (wait — Lydian root is 4th degree of major: subtract 5)
 *   Mixolydian  +5
 *   Aeolian     +3  (natural minor)
 *   Locrian     +1
 *
 * Major flat-key roots (in semitone index, sharp-normalised):
 *   F=5, Bb=10, Eb=3, Ab=8, Db=1, Gb=6
 */

// Semitones to add to the mode root to reach the parent Ionian (major) root.
const MODE_TO_IONIAN_OFFSET = {
  ionian:          0,
  dorian:          10,
  phrygian:        8,
  lydian:          7,
  mixolydian:      5,
  aeolian:         3,
  locrian:         1,
  minorNatural:    3,
  minorMelodic:    3,
  minorHarmonic:   3,
  // Pentatonic (share key-signature with their parent major/minor)
  majorPentatonic: 0,
  minorPentatonic: 3,
  // Blues (treated like natural minor)
  blues:           3,
  // Exotic — no standard key signature; use 0 (no flats forced)
  diminished:      0,
  oriental:        0,
  doubleHarmonic:  0,
  harmonicMajor:   0,
  tritone:         0,
};

// Chromatic indices of all major-scale roots that use flat key signatures.
// (F, Bb, Eb, Ab, Db, Gb)
const FLAT_IONIAN_INDICES = new Set([5, 10, 3, 8, 1, 6]);

export function preferFlat(scaleRoot, scaleKey) {
  if (!scaleRoot) return false;

  const rootIdx = noteIndex(scaleRoot);
  if (rootIdx === -1) return false;

  // Determine the parent Ionian (major) root index for this mode.
  const offset = MODE_TO_IONIAN_OFFSET[scaleKey] ?? 0;
  const ionianIdx = (rootIdx + offset) % 12;

  return FLAT_IONIAN_INDICES.has(ionianIdx);
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
