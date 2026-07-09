import { noteIndex, noteName, displayNote } from './notes';
import { getScaleNotes } from './scales';

/**
 * Chord type definitions: { intervals, quality }
 * intervals: semitones from root
 */
export const CHORD_TYPES = {
  maj:    { name: 'Major',       intervals: [0, 4, 7],       quality: 'major' },
  min:    { name: 'Minor',       intervals: [0, 3, 7],       quality: 'minor' },
  dim:    { name: 'Diminished',  intervals: [0, 3, 6],       quality: 'dim' },
  aug:    { name: 'Augmented',   intervals: [0, 4, 8],       quality: 'aug' },
  sus2:   { name: 'Sus2',        intervals: [0, 2, 7],       quality: 'sus' },
  sus4:   { name: 'Sus4',        intervals: [0, 5, 7],       quality: 'sus' },
  dom7:   { name: '7',           intervals: [0, 4, 7, 10],   quality: 'major' },
  maj7:   { name: 'maj7',        intervals: [0, 4, 7, 11],   quality: 'major' },
  min7:   { name: 'm7',          intervals: [0, 3, 7, 10],   quality: 'minor' },
  dim7:   { name: 'dim7',        intervals: [0, 3, 6, 9],    quality: 'dim' },
  hdim7:  { name: 'm7b5',        intervals: [0, 3, 6, 10],   quality: 'dim' },
  dom9:   { name: '9',           intervals: [0, 4, 7, 10, 14], quality: 'major' },
  maj9:   { name: 'maj9',        intervals: [0, 4, 7, 11, 14], quality: 'major' },
  min9:   { name: 'm9',          intervals: [0, 3, 7, 10, 14], quality: 'minor' },
};

export const CHORD_TYPE_KEYS = Object.keys(CHORD_TYPES);

/**
 * Get the note names that make up a chord.
 * root: e.g. 'C', typeKey: e.g. 'maj7'
 */
export function getChordNotes(root, typeKey) {
  const def = CHORD_TYPES[typeKey];
  if (!def) return [];
  const rootIdx = noteIndex(root);
  return def.intervals.map(i => noteName(rootIdx + i));
}

/**
 * Get chord notes with octave suffix applied, respecting inversion and base octave.
 * inversion: 0 = root position, 1 = 1st inversion, 2 = 2nd inversion, etc.
 * baseOctave: e.g. 4
 * Returns e.g. ['E4','G4','C5'] for C major 1st inversion at octave 4
 */
export function getChordNotesVoiced(root, typeKey, baseOctave = 4, inversion = 0) {
  const def = CHORD_TYPES[typeKey];
  if (!def) return [];
  const rootIdx = noteIndex(root);
  // Build semitone offsets from the root (mod 12 already in intervals)
  const intervals = [...def.intervals];
  const notes = [];
  // Rotate intervals by inversion count
  const inv = inversion % intervals.length;
  const rotated = [...intervals.slice(inv), ...intervals.slice(0, inv).map(i => i + 12)];
  // Normalise so first note is 0
  const offset = rotated[0];
  let octaveShift = 0;
  let prevSemi = -1;
  for (const semi of rotated) {
    const normalised = semi - offset;
    // Track octave shifts for notes that wrap around
    const noteIdx = ((rootIdx + semi) % 12 + 12) % 12;
    const noteName2 = noteName(noteIdx);
    // Compute octave: start at baseOctave, bump up whenever we wrap
    if (normalised < prevSemi) octaveShift++;
    const oct = baseOctave + octaveShift + Math.floor((rootIdx + semi) / 12);
    notes.push(`${noteName2}${oct}`);
    prevSemi = normalised;
  }
  return notes;
}

/**
 * Build a chord label using internal (sharp) root name. e.g. "Cmaj7"
 * Use chordLabelDisplay() for UI display with enharmonic awareness.
 */
export function chordLabel(root, typeKey) {
  const def = CHORD_TYPES[typeKey];
  if (!def) return '';
  if (typeKey === 'maj') return root;
  if (typeKey === 'min') return `${root}m`;
  return `${root}${def.name}`;
}

/**
 * Build a chord label for display, respecting flat/sharp preference.
 * useFlat: pass preferFlat(scaleRoot, scaleKey) from the caller.
 */
export function chordLabelDisplay(root, typeKey, useFlat) {
  const r = displayNote(root, useFlat);
  const def = CHORD_TYPES[typeKey];
  if (!def) return r;
  if (typeKey === 'maj') return r;
  if (typeKey === 'min') return `${r}m`;
  return `${r}${def.name}`;
}

/**
 * Determine the harmonic role of a chord within a scale.
 * Returns: 'in-scale' | 'dominant-I' | 'dominant-II' | 'subdominant-I' | 'subdominant-II' | 'out'
 *
 * Rules (relative to scale root):
 *   - All chord notes in scale → 'in-scale'
 *   - Dominant of I (degree V chord) → 'dominant-I'
 *   - Dominant of II (secondary dominant = V/II) → 'dominant-II'
 *   - Subdominant of I (degree IV chord) → 'subdominant-I'
 *   - Subdominant of II (degree II chord acting as subdominant) → 'subdominant-II'
 */
export function getChordRole(chordRoot, chordType, scaleRoot, scaleKey) {
  if (!scaleRoot || !scaleKey) return 'out';
  const scaleNotes = getScaleNotes(scaleRoot, scaleKey);
  if (!scaleNotes.length) return 'out';

  const chordNotes = getChordNotes(chordRoot, chordType);
  const rootIdx = noteIndex(scaleRoot);

  // Degree notes in the scale (0-based, i.e. degree I = index 0)
  const degreeI   = scaleNotes[0];
  const degreeII  = scaleNotes[1];
  const degreeIV  = scaleNotes[3];
  const degreeV   = scaleNotes[4];

  // Dominant of I: a chord whose root is the V degree
  const isDominantI = chordRoot === degreeV;
  // Dominant of II: a chord whose root is a perfect fifth above degree II
  const dominantOfII = noteName(noteIndex(degreeII) + 7);
  const isDominantII = chordRoot === dominantOfII;

  // Subdominant of I: root is degree IV
  const isSubdominantI = chordRoot === degreeIV;
  // Subdominant of II: root is degree II
  const isSubdominantII = chordRoot === degreeII;

  // In-scale: all chord notes belong to the scale
  const scaleSet = new Set(scaleNotes.map(n => noteIndex(n)));
  const allInScale = chordNotes.every(n => scaleSet.has(noteIndex(n)));

  // Dominant / subdominant roles are reserved for dom7 chords only (e.g. G7, A7).
  // Other chord types on those roots fall through to in-scale / out.
  if (isDominantI    && chordType === 'dom7') return 'dominant-I';
  if (isDominantII   && chordType === 'dom7') return 'dominant-II';
  if (isSubdominantI && chordType === 'dom7') return 'subdominant-I';
  if (isSubdominantII && chordType === 'dom7') return 'subdominant-II';
  if (allInScale)     return 'in-scale';
  return 'out';
}

/**
 * Given a set of note indices (0-11), identify the best matching chord name.
 * useFlat: when true, display root with flat spelling (e.g. Bb instead of A#).
 * Returns { root, typeKey, label } or null.
 */
export function identifyChord(noteIndices, useFlat = false) {
  const notes = [...new Set(noteIndices.map(n => ((n % 12) + 12) % 12))];
  if (notes.length < 2) return null;

  for (const root of notes) {
    for (const [typeKey, def] of Object.entries(CHORD_TYPES)) {
      const rootIdx = root;
      const expected = def.intervals.map(i => (rootIdx + i) % 12);
      if (expected.length === notes.length && expected.every(e => notes.includes(e))) {
        const rootName = noteName(root);
        return { root: rootName, typeKey, label: chordLabelDisplay(rootName, typeKey, useFlat) };
      }
    }
  }
  return null;
}
