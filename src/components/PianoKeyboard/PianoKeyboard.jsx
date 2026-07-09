import { useState } from 'react';
import { CHROMATIC, noteIndex } from '../../theory/notes';
import { getScaleNoteSet } from '../../theory/scales';
import { getChordNotes, identifyChord } from '../../theory/chords';
import { useSampler } from '../../audio/useSampler';
import styles from './PianoKeyboard.module.css';

const START_OCTAVE = 3;
const NUM_OCTAVES = 2;

// For each white key position (0–6 within an octave), the black key to its right (null = none)
// C  D  E  F  G  A  B
const BLACK_AFTER = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
const WHITE_NOTES  = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Build a flat ordered list of white keys + black key positions
// Each entry: { note, octave, type: 'white' | 'black' }
// Black keys are stored alongside the white key they follow so we can position them correctly
function buildWhiteKeys() {
  const keys = [];
  for (let oct = START_OCTAVE; oct < START_OCTAVE + NUM_OCTAVES; oct++) {
    for (let i = 0; i < 7; i++) {
      keys.push({ note: WHITE_NOTES[i], octave: oct, blackAfter: BLACK_AFTER[i] });
    }
  }
  keys.push({ note: 'C', octave: START_OCTAVE + NUM_OCTAVES, blackAfter: null });
  return keys;
}

const WHITE_KEYS = buildWhiteKeys();

export function PianoKeyboard({ scaleRoot, scaleKey, selectedChord, instrument = 'piano' }) {
  const { playNotes, playArpeggio } = useSampler();
  const [manualHighlight, setManualHighlight] = useState(new Set());
  const [highlightMode, setHighlightMode] = useState('scale');

  const scaleNoteSet = scaleRoot && scaleKey ? getScaleNoteSet(scaleRoot, scaleKey) : new Set();
  const chordNoteSet = selectedChord
    ? new Set(getChordNotes(selectedChord.root, selectedChord.typeKey).map(n => noteIndex(n)))
    : new Set();

  function isHighlighted(noteIdx) {
    if (highlightMode === 'manual') return manualHighlight.has(noteIdx);
    if (highlightMode === 'chord') return chordNoteSet.has(noteIdx);
    if (highlightMode === 'scale') return scaleNoteSet.has(noteIdx);
    return false;
  }

  function handleKeyClick(e, note, octave) {
    e.stopPropagation();
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

    const notes = [...noteIndices]
      .sort((a, b) => a - b)
      .map(idx => `${CHROMATIC[idx]}${START_OCTAVE + 1}`);

    if (highlightMode === 'scale') playArpeggio(notes, 'up', '8n', instrument);
    else playNotes(notes, '2n', instrument);
  }

  const detectedChord = highlightMode === 'manual' && manualHighlight.size >= 2
    ? identifyChord([...manualHighlight])
    : null;

  const WHITE_W = 36; // px per white key

  return (
    <div className={styles.wrapper}>
      {/* Controls */}
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

      {/* Keyboard: single relative container, black keys positioned absolutely */}
      <div
        className={styles.keyboard}
        style={{ width: WHITE_KEYS.length * WHITE_W }}
      >
        {WHITE_KEYS.map(({ note, octave, blackAfter }, wIdx) => {
          const wNoteIdx = noteIndex(note);
          const wHighlit = isHighlighted(wNoteIdx);

          const bNoteIdx = blackAfter ? noteIndex(blackAfter) : -1;
          const bHighlit = blackAfter ? isHighlighted(bNoteIdx) : false;

          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${wHighlit ? styles[`hl_${highlightMode}`] : ''}`}
              style={{ left: wIdx * WHITE_W, width: WHITE_W }}
              onClick={e => handleKeyClick(e, note, octave)}
            >
              <span className={styles.noteName}>{note}</span>

              {/* Black key rendered inside its left white-key sibling, positioned to the right */}
              {blackAfter && (
                <div
                  className={`${styles.black} ${bHighlit ? styles[`hl_${highlightMode}_b`] : ''}`}
                  onClick={e => handleKeyClick(e, blackAfter, octave)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
