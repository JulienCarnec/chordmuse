// All 12 chromatic notes (using sharps)
export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Enharmonic display map (prefer flat names in some contexts)
export const ENHARMONIC = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

export function noteIndex(note) {
  // normalise flats to sharps
  const flat2sharp = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const n = flat2sharp[note] ?? note;
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
