import { useState, useCallback } from 'react';
import { CHROMATIC, noteIndex } from '../../theory/notes';
import { getScaleNoteSet } from '../../theory/scales';
import { getChordNotes, identifyChord } from '../../theory/chords';
import { useSampler } from '../../audio/useSampler';
import styles from './PianoKeyboard.module.css';

// Two octaves starting at C3
const START_OCTAVE = 3;
const NUM_OCTAVES = 2;

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];

function buildKeys() {
  const keys = [];
  for (let oct = START_OCTAVE; oct < START_OCTAVE + NUM_OCTAVES; oct++) {
    for (let i = 0; i < 7; i++) {
      const white = WHITE_NOTES[i];
      const black = BLACK_NOTES[i];
      keys.push({ note: white, octave: oct, type: 'white' });
      if (black) keys.push({ note: black, octave: oct, type: 'black' });
    }
  }
  // Add closing C
  keys.push({ note: 'C', octave: START_OCTAVE + NUM_OCTAVES, type: 'white' });
  return keys;
}

const ALL_KEYS = buildKeys();

export function PianoKeyboard({ scaleRoot, scaleKey, selectedChord, instrument = 'piano' }) {
  const { playNotes, playArpeggio } = useSampler();
  const [manualHighlight, setManualHighlight] = useState(new Set());
  const [highlightMode, setHighlightMode] = useState('scale'); // 'scale' | 'chord' | 'manual'

  const scaleNoteSet = scaleRoot && scaleKey
    ? getScaleNoteSet(scaleRoot, scaleKey)
    : new Set();

  const chordNoteSet = selectedChord
    ? new Set(getChordNotes(selectedChord.root, selectedChord.typeKey).map(n => noteIndex(n)))
    : new Set();

  function getHighlightClass(noteIdx) {
    if (highlightMode === 'manual' && manualHighlight.has(noteIdx)) return styles.manual;
    if (highlightMode === 'chord' && chordNoteSet.has(noteIdx)) return styles.chord;
    if (highlightMode === 'scale' && scaleNoteSet.has(noteIdx)) return styles.scale;
    return '';
  }

  function handleKeyClick(note, octave) {
    playNotes([`${note}${octave}`], '4n', instrument);
    if (highlightMode === 'manual') {
      const idx = noteIndex(note);
      setManualHighlight(prev => {
        const next = new Set(prev);
        next.has(idx) ? next.delete(idx) : next.add(idx);
        return next;
      });
    }
  }

  function playHighlighted() {
    let noteIndices;
    if (highlightMode === 'scale') noteIndices = [...scaleNoteSet];
    else if (highlightMode === 'chord') noteIndices = [...chordNoteSet];
    else noteIndices = [...manualHighlight];

    const notes = noteIndices.map(idx => {
      const noteName = CHROMATIC[idx];
      return `${noteName}${START_OCTAVE + 1}`;
    }).sort((a, b) => noteIndex(a.slice(0, -1)) - noteIndex(b.slice(0, -1)));

    if (highlightMode === 'scale') {
      playArpeggio(notes, 'up', '8n', instrument);
    } else {
      playNotes(notes, '2n', instrument);
    }
  }

  const detectedChord = highlightMode === 'manual' && manualHighlight.size >= 2
    ? identifyChord([...manualHighlight])
    : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <span className={styles.modeLabel}>Highlight:</span>
        {['scale', 'chord', 'manual'].map(mode => (
          <button
            key={mode}
            className={`${styles.modeBtn} ${highlightMode === mode ? styles.active : ''}`}
            onClick={() => setHighlightMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
        <button className={styles.playBtn} onClick={playHighlighted}>▶ Play</button>
        {detectedChord && (
          <span className={styles.detectedChord}>→ {detectedChord.label}</span>
        )}
      </div>

      <div className={styles.keyboard}>
        {ALL_KEYS.filter(k => k.type === 'white').map(({ note, octave }, i) => {
          const idx = noteIndex(note);
          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${getHighlightClass(idx)}`}
              onClick={() => handleKeyClick(note, octave)}
            >
              <span className={styles.noteName}>{note}{octave === START_OCTAVE + 1 ? '' : ''}</span>
            </div>
          );
        })}
      </div>

      {/* Black keys are positioned absolutely over the white keys */}
      <div className={styles.keyboardBlack}>
        {ALL_KEYS.filter(k => k.type === 'black').map(({ note, octave }, i) => {
          const idx = noteIndex(note);
          return (
            <div
              key={`b-${note}${octave}`}
              data-note={note}
              className={`${styles.black} ${getHighlightClass(idx)}`}
              onClick={() => handleKeyClick(note, octave)}
            />
          );
        })}
      </div>
    </div>
  );
}
