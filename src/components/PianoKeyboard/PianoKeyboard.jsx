import { useState, useRef, useEffect } from 'react';
import { CHROMATIC, ENHARMONIC, noteIndex } from '../../theory/notes';
import { getScaleNoteSet, getScaleNotes } from '../../theory/scales';
import { getChordNotes, identifyChord } from '../../theory/chords';
import { useSampler } from '../../audio/useSampler';
import styles from './PianoKeyboard.module.css';

const START_OCTAVE = 3;
const NUM_OCTAVES = 2;
const MIN_WHITE_W = 20;
const BLACK_W_RATIO = 0.6;

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_AFTER_SHARP = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];

function buildKeys() {
  const whites = [];
  const blackPositions = [];
  let wIdx = 0;
  for (let oct = START_OCTAVE; oct < START_OCTAVE + NUM_OCTAVES; oct++) {
    for (let i = 0; i < 7; i++) {
      whites.push({ note: WHITE_NOTES[i], octave: oct, wIdx });
      if (BLACK_AFTER_SHARP[i]) {
        blackPositions.push({ sharp: BLACK_AFTER_SHARP[i], octave: oct, afterWIdx: wIdx });
      }
      wIdx++;
    }
  }
  whites.push({ note: 'C', octave: START_OCTAVE + NUM_OCTAVES, wIdx });
  return { whites, blackPositions };
}

const { whites: WHITE_KEYS, blackPositions: BLACK_POSITIONS } = buildKeys();
const TOTAL_WHITE = WHITE_KEYS.length;

const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

function blackKeyDisplayName(sharpName, scaleRoot, scaleKey, scaleNotes) {
  if (!scaleRoot) return sharpName;
  const flatName = ENHARMONIC[sharpName];
  if (!flatName) return sharpName;
  if (FLAT_ROOTS.has(scaleRoot)) return flatName;
  if (scaleNotes && scaleNotes.includes(flatName)) return flatName;
  if (scaleNotes && scaleNotes.includes(sharpName)) return sharpName;
  return sharpName;
}

/**
 * Derive the background colour class for a key based on layer priority:
 * 1. Playback (amber) — highest
 * 2. Manual toggle (purple)
 * 3. Chord (blue)
 * (Scale never sets background — dots only)
 */
function bgClass(isBlack, { playing, manual, chord }) {
  if (playing) return isBlack ? styles.bg_playing_b : styles.bg_playing;
  if (manual)  return isBlack ? styles.bg_manual_b  : styles.bg_manual;
  if (chord)   return isBlack ? styles.bg_chord_b   : styles.bg_chord;
  return '';
}

export function PianoKeyboard({ scaleRoot, scaleKey, selectedChord, instrument = 'piano', playbackNotes = null }) {
  const { playNotes, playArpeggio } = useSampler();
  const [manualHighlight, setManualHighlight] = useState(new Set());
  const wrapperRef = useRef(null);
  const [whiteW, setWhiteW] = useState(36);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => setWhiteW(Math.max(MIN_WHITE_W, Math.floor(el.clientWidth / TOTAL_WHITE)));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const blackW = Math.round(whiteW * BLACK_W_RATIO);
  const blackH = Math.round(whiteW * 2.2);
  const whiteH = Math.round(whiteW * 3.6);
  const dotSize = Math.max(4, Math.round(whiteW * 0.18));

  const scaleNoteSet  = scaleRoot && scaleKey ? getScaleNoteSet(scaleRoot, scaleKey) : new Set();
  const scaleNotes    = scaleRoot && scaleKey ? getScaleNotes(scaleRoot, scaleKey) : [];
  const chordNoteSet  = selectedChord
    ? new Set(getChordNotes(selectedChord.root, selectedChord.typeKey).map(n => noteIndex(n)))
    : new Set();
  const playbackNoteSet = playbackNotes
    ? new Set(playbackNotes.map(n => noteIndex(n)))
    : new Set();

  function handleKeyClick(e, note, octave) {
    e.stopPropagation();
    playNotes([`${note}${octave}`], '4n', instrument);
    const idx = noteIndex(note);
    setManualHighlight(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function playChord() {
    const indices = [...chordNoteSet];
    if (!indices.length) return;
    const notes = indices.sort((a, b) => a - b).map(i => `${CHROMATIC[i]}${START_OCTAVE + 1}`);
    playNotes(notes, '2n', instrument);
  }

  function playScale() {
    const indices = [...scaleNoteSet];
    if (!indices.length) return;
    const notes = indices.sort((a, b) => a - b).map(i => `${CHROMATIC[i]}${START_OCTAVE + 1}`);
    playArpeggio(notes, 'up', '8n', instrument);
  }

  function playManual() {
    const indices = [...manualHighlight];
    if (!indices.length) return;
    const notes = indices.sort((a, b) => a - b).map(i => `${CHROMATIC[i]}${START_OCTAVE + 1}`);
    playNotes(notes, '2n', instrument);
  }

  const detectedChord = manualHighlight.size >= 2 ? identifyChord([...manualHighlight]) : null;
  const labelSize = Math.max(8, Math.round(whiteW * 0.35));
  const blackLabelSize = Math.max(6, Math.round(blackW * 0.32));

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* Controls — no mode toggle, always multi-layer */}
      <div className={styles.controls}>
        <div className={styles.legend}>
          <span className={styles.legendDot} />
          <span className={styles.legendLabel}>Scale</span>
          <span className={`${styles.legendSwatch} ${styles.swatchChord}`} />
          <span className={styles.legendLabel}>Chord</span>
          <span className={`${styles.legendSwatch} ${styles.swatchManual}`} />
          <span className={styles.legendLabel}>Manual</span>
          <span className={`${styles.legendSwatch} ${styles.swatchPlaying}`} />
          <span className={styles.legendLabel}>Playing</span>
        </div>
        <div className={styles.actions}>
          {scaleNoteSet.size > 0 && (
            <button className={styles.actionBtn} onClick={playScale}>▶ Scale</button>
          )}
          {chordNoteSet.size > 0 && (
            <button className={styles.actionBtn} onClick={playChord}>▶ Chord</button>
          )}
          {manualHighlight.size > 0 && (
            <>
              <button className={styles.actionBtn} onClick={playManual}>▶ Manual</button>
              <button className={styles.clearBtn} onClick={() => setManualHighlight(new Set())}>Clear</button>
            </>
          )}
          {detectedChord && (
            <span className={styles.detectedChord}>→ {detectedChord.label}</span>
          )}
        </div>
      </div>

      <div className={styles.keyboard} style={{ width: '100%', height: whiteH }}>
        {/* White keys */}
        {WHITE_KEYS.map(({ note, octave, wIdx }) => {
          const nIdx = noteIndex(note);
          const layers = {
            playing: playbackNoteSet.has(nIdx),
            manual:  manualHighlight.has(nIdx),
            chord:   chordNoteSet.has(nIdx),
            scale:   scaleNoteSet.has(nIdx),
          };
          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${bgClass(false, layers)}`}
              style={{ left: wIdx * whiteW, width: whiteW, height: whiteH }}
              onClick={e => handleKeyClick(e, note, octave)}
            >
              {layers.scale ? (
                <span
                  className={styles.scaleLabel}
                  style={{ width: dotSize * 1.8, height: dotSize * 1.8, fontSize: Math.max(7, Math.round(dotSize * 0.9)) }}
                >{note}</span>
              ) : (
                <span className={styles.noteName} style={{ fontSize: labelSize }}>{note}</span>
              )}
            </div>
          );
        })}

        {/* Black keys */}
        {BLACK_POSITIONS.map(({ sharp, octave, afterWIdx }) => {
          const nIdx = noteIndex(sharp);
          const layers = {
            playing: playbackNoteSet.has(nIdx),
            manual:  manualHighlight.has(nIdx),
            chord:   chordNoteSet.has(nIdx),
            scale:   scaleNoteSet.has(nIdx),
          };
          const displayName = blackKeyDisplayName(sharp, scaleRoot, scaleKey, scaleNotes);
          const left = (afterWIdx + 1) * whiteW - blackW / 2;
          return (
            <div
              key={`b-${sharp}${octave}`}
              className={`${styles.black} ${bgClass(true, layers)}`}
              style={{ left, width: blackW, height: blackH }}
              onClick={e => handleKeyClick(e, sharp, octave)}
            >
              {layers.scale ? (
                <span
                  className={styles.scaleLabelBlack}
                  style={{ width: dotSize * 1.5, height: dotSize * 1.5, fontSize: Math.max(6, Math.round(dotSize * 0.75)) }}
                >{displayName}</span>
              ) : (
                <span className={styles.blackNoteName} style={{ fontSize: blackLabelSize }}>{displayName}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
