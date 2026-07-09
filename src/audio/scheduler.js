import * as Tone from 'tone';
import { getChordNotes } from '../theory/chords';
import { noteIndex } from '../theory/notes';

// Octave for chord playback (middle octave)
const BASE_OCTAVE = 4;

/**
 * Add octave suffix to a note name so Tone.js can play it.
 * Notes C-B are assigned to the base octave; B is kept one octave lower to avoid large jumps.
 */
function withOctave(note, baseOctave = BASE_OCTAVE) {
  const idx = noteIndex(note);
  // Keep chord voicing in a reasonable range: C=4, B=3 for smooth voicing
  const octave = idx < 3 ? baseOctave : baseOctave; // simple flat voicing for now
  return `${note}${octave}`;
}

/**
 * Build the schedule of note events for one chord cell.
 * Returns array of { time (seconds from cell start), notes, duration (seconds) }
 */
export function buildChordSchedule(chordRoot, chordType, cellDuration, style) {
  const notes = getChordNotes(chordRoot, chordType).map(n => withOctave(n));
  const { type, value } = style; // e.g. { type: 'strum-on', value: '4n' }

  const noteDur = Tone.Time(value).toSeconds();
  const events = [];

  if (type === 'strum-on') {
    // On-beat: play chord once at the start of each subdivision
    let t = 0;
    while (t < cellDuration - 0.001) {
      events.push({ time: t, notes, duration: Math.min(noteDur * 0.9, cellDuration - t) });
      t += noteDur;
    }
  } else if (type === 'strum-off') {
    // Off-beat: start at half a subdivision
    let t = noteDur / 2;
    while (t < cellDuration - 0.001) {
      events.push({ time: t, notes, duration: Math.min(noteDur * 0.9, cellDuration - t) });
      t += noteDur;
    }
  } else if (type === 'arpeggio-up') {
    const stepDur = noteDur;
    let t = 0;
    let noteIdx = 0;
    while (t < cellDuration - 0.001) {
      events.push({ time: t, notes: [notes[noteIdx % notes.length]], duration: stepDur * 0.9 });
      t += stepDur;
      noteIdx++;
    }
  } else if (type === 'arpeggio-down') {
    const reversed = [...notes].reverse();
    const stepDur = noteDur;
    let t = 0;
    let noteIdx = 0;
    while (t < cellDuration - 0.001) {
      events.push({ time: t, notes: [reversed[noteIdx % reversed.length]], duration: stepDur * 0.9 });
      t += stepDur;
      noteIdx++;
    }
  } else {
    // Default: whole cell block chord
    events.push({ time: 0, notes, duration: cellDuration * 0.9 });
  }

  return events;
}
