import { Midi } from '@tonejs/midi';
import { getChordNotes } from '../theory/chords';
import { noteIndex } from '../theory/notes';

const BASE_OCTAVE = 4;

function noteToMidi(noteName, octave = BASE_OCTAVE) {
  const idx = noteIndex(noteName);
  // MIDI note: C4 = 60
  return (octave + 1) * 12 + idx;
}

/**
 * Export state track to a MIDI file and trigger download.
 */
export function exportMidi(state) {
  const { bpm, timeSig, track, progressions } = state;
  const [beatsPerBar, beatValue] = timeSig.split('/').map(Number);
  const secPerBeat = 60 / bpm;
  const secPerCell = secPerBeat * beatsPerBar;

  const midi = new Midi();
  midi.header.setTempo(bpm);
  const midiTrack = midi.addTrack();

  let time = 0;

  for (const { progressionId, repetitions } of track) {
    const prog = progressions[progressionId];
    if (!prog) continue;
    for (let rep = 0; rep < repetitions; rep++) {
      for (const cell of prog.cells) {
        const chords = cell.split
          ? cell.subCells.filter(Boolean)
          : cell.chord ? [cell.chord] : [];
        const cellSec = cell.split ? secPerCell / 2 : secPerCell;
        for (const chord of chords) {
          const notes = getChordNotes(chord.root, chord.typeKey);
          for (const note of notes) {
            midiTrack.addNote({
              midi: noteToMidi(note),
              time,
              duration: cellSec * 0.9,
              velocity: 0.8,
            });
          }
          time += cellSec;
        }
        if (!cell.split) time += secPerCell;
      }
    }
  }

  const bytes = midi.toArray();
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'track.mid';
  a.click();
  URL.revokeObjectURL(url);
}
