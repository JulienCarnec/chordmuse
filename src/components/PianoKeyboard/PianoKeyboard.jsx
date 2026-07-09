import { useState, useRef, useEffect } from 'react';
import { CHROMATIC, ENHARMONIC, noteIndex, noteName } from '../../theory/notes';
import { getScaleNoteSet, getScaleNotes } from '../../theory/scales';
import { getChordNotes, getChordNotesVoiced, identifyChord } from '../../theory/chords';
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
 * 2. Inversion-candidate (green outline) — only in pick-inversion mode
 * 3. Highlight: chord note OR manually clicked (blue)
 * (Scale never sets background — dots only)
 */
function bgClass(isBlack, { playing, highlight, invCandidate, invFirst }) {
  if (playing)      return isBlack ? styles.bg_playing_b   : styles.bg_playing;
  if (invFirst)     return isBlack ? styles.bg_invFirst_b  : styles.bg_invFirst;
  if (invCandidate) return isBlack ? styles.bg_invCand_b   : styles.bg_invCand;
  if (highlight)    return isBlack ? styles.bg_highlight_b : styles.bg_highlight;
  return '';
}

/**
 * keyId — unique string for a specific physical key, e.g. "C4", "F#3"
 */
function keyId(note, octave) { return `${note}${octave}`; }

export function PianoKeyboard({
  scaleRoot, scaleKey,
  selectedChord,         // { root, typeKey, octave, inversion }
  instrument = 'piano',
  playbackNotes = null,
  resetKey,
  onPickInversion,       // (inversionIndex: number) => void
}) {
  const { playNotes, playArpeggio } = useSampler();
  // manualHighlight: Set of "note+octave" strings (per-key, not pitch-class)
  const [manualHighlight, setManualHighlight] = useState(new Set());
  const [pickingInversion, setPickingInversion] = useState(false);
  const wrapperRef = useRef(null);
  const [whiteW, setWhiteW] = useState(36);

  // Clear manual highlights and exit inversion mode whenever the selected cell changes
  useEffect(() => {
    setManualHighlight(new Set());
    setPickingInversion(false);
  }, [resetKey]);

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
  const circleSize    = Math.max(14, Math.round(whiteW * 0.55));
  const circleFontSize = Math.max(7, Math.round(circleSize * 0.55));

  const scaleNoteSet   = scaleRoot && scaleKey ? getScaleNoteSet(scaleRoot, scaleKey) : new Set();
  const scaleNotes     = scaleRoot && scaleKey ? getScaleNotes(scaleRoot, scaleKey)   : [];
  // voiced chord notes as "note+octave" strings — exact keys to highlight
  const voicedNotes    = selectedChord
    ? getChordNotesVoiced(
        selectedChord.root, selectedChord.typeKey,
        selectedChord.octave ?? 4, selectedChord.inversion ?? 0
      )
    : [];
  // per-key highlight set for the chord (only the voiced keys, not all octaves)
  const chordHighlightSet = new Set(voicedNotes);
  // pitch-class set still needed for inversion-picker candidate detection
  const chordNoteSet   = selectedChord
    ? new Set(getChordNotes(selectedChord.root, selectedChord.typeKey).map(n => noteIndex(n)))
    : new Set();
  // The note names that form the chord (pitch-class only, in interval order)
  const chordNoteNames = selectedChord
    ? getChordNotes(selectedChord.root, selectedChord.typeKey)   // e.g. ['C','E','G']
    : [];

  const playbackNoteSet = playbackNotes
    ? new Set(playbackNotes.map(n => noteIndex(n)))
    : new Set();

  // ── Normal click: play + toggle manual highlight per specific key ─────────
  function handleKeyClick(e, note, octave) {
    e.stopPropagation();

    if (pickingInversion) {
      // Only allow clicking a key that is part of the voiced chord (exact octave)
      const id = keyId(note, octave);
      if (!chordHighlightSet.has(id)) return;
      // Map the clicked voiced note back to its inversion index:
      // voicedNotes[0] is the current bass; chordNoteNames[invIdx] gives the original interval order.
      // We want invIdx = position in chordNoteNames whose pitch class matches the clicked note.
      const nIdx = noteIndex(note);
      const invIdx = chordNoteNames.findIndex(n => noteIndex(n) === nIdx);
      if (invIdx !== -1 && onPickInversion) {
        onPickInversion(invIdx);
      }
      setPickingInversion(false);
      return;
    }

    playNotes([`${note}${octave}`], '4n', instrument);
    const id = keyId(note, octave);
    setManualHighlight(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // All currently highlighted keys = voiced chord notes + manually clicked keys
  function playHighlighted() {
    const all = new Set([...voicedNotes, ...manualHighlight]);
    if (!all.size) return;
    playNotes([...all], '2n', instrument);
  }

  function playScale() {
    const indices = [...scaleNoteSet];
    if (!indices.length) return;
    const notes = indices.sort((a, b) => a - b).map(i => `${CHROMATIC[i]}${START_OCTAVE + 1}`);
    playArpeggio(notes, 'up', '8n', instrument);
  }

  // Detect chord from manual highlights (pitch-class level, strip octave)
  const manualPitchClasses = [...manualHighlight].map(id => noteIndex(id.replace(/\d+$/, '')));
  const detectedChord = manualPitchClasses.length >= 2 ? identifyChord(manualPitchClasses) : null;
  // Label: chord name or note list + "(unknown)"
  const detectedLabel = detectedChord
    ? `→ ${detectedChord.label}`
    : manualPitchClasses.length >= 2
      ? `→ ${manualPitchClasses.sort((a,b)=>a-b).map(i => CHROMATIC[i]).join(', ')} (unknown)`
      : null;
  const hasScale = scaleNoteSet.size > 0;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.controls}>
        <div className={styles.legend}>
          <span className={styles.legendDot}>A</span>
          <span className={styles.legendLabel}>Scale</span>
          <span className={`${styles.legendSwatch} ${styles.swatchHighlight}`} />
          <span className={styles.legendLabel}>Highlighted</span>
          <span className={`${styles.legendSwatch} ${styles.swatchPlaying}`} />
          <span className={styles.legendLabel}>Playing</span>
        </div>
        <div className={styles.actions}>
          {scaleNoteSet.size > 0 && (
            <button className={styles.actionBtn} onClick={playScale}>▶ Scale</button>
          )}
          {(voicedNotes.length > 0 || manualHighlight.size > 0) && (
            <button className={styles.actionBtn} onClick={playHighlighted}>▶ Play highlighted</button>
          )}
          {manualHighlight.size > 0 && (
            <button className={styles.clearBtn} onClick={() => setManualHighlight(new Set())}>Clear</button>
          )}
          {detectedLabel && (
            <span className={styles.detectedChord}>{detectedLabel}</span>
          )}
          {/* Inversion picker — only when a chord is selected and callback provided */}
          {selectedChord && onPickInversion && (
            <button
              className={pickingInversion ? styles.invBtnActive : styles.invBtn}
              onClick={() => setPickingInversion(p => !p)}
            >
              {pickingInversion ? '✕ Cancel' : 'Choose inversion'}
            </button>
          )}
          {pickingInversion && (
            <span className={styles.invHint}>Click the note you want as the bass note</span>
          )}
        </div>
      </div>

      <div className={styles.keyboard} style={{ width: '100%', height: whiteH }}>
        {/* White keys */}
        {WHITE_KEYS.map(({ note, octave, wIdx }) => {
          const nIdx = noteIndex(note);
          const id   = keyId(note, octave);
          const isChordNote = chordNoteSet.has(nIdx);
          const layers = {
            playing:      playbackNoteSet.has(nIdx),
            highlight:    chordHighlightSet.has(id) || manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !layers.playing && !layers.highlight && !layers.invCandidate;
          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${bgClass(false, layers)} ${dimmed ? styles.dimWhite : ''}`}
              style={{ left: wIdx * whiteW, width: whiteW, height: whiteH }}
              onClick={e => handleKeyClick(e, note, octave)}
            >
              {layers.scale ? (
                <span
                  className={styles.scaleLabel}
                  style={{ width: circleSize, height: circleSize, fontSize: circleFontSize }}
                >{note}</span>
              ) : (
                <span className={styles.noteName} style={{ fontSize: circleFontSize }}>{note}</span>
              )}
            </div>
          );
        })}

        {/* Black keys */}
        {BLACK_POSITIONS.map(({ sharp, octave, afterWIdx }) => {
          const nIdx = noteIndex(sharp);
          const id   = keyId(sharp, octave);
          const isChordNote = chordNoteSet.has(nIdx);
          const layers = {
            playing:      playbackNoteSet.has(nIdx),
            highlight:    chordHighlightSet.has(id) || manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !layers.playing && !layers.highlight && !layers.invCandidate;
          const displayName = blackKeyDisplayName(sharp, scaleRoot, scaleKey, scaleNotes);
          const left = (afterWIdx + 1) * whiteW - blackW / 2;
          return (
            <div
              key={`b-${sharp}${octave}`}
              className={`${styles.black} ${bgClass(true, layers)} ${dimmed ? styles.dimBlack : ''}`}
              style={{ left, width: blackW, height: blackH }}
              onClick={e => handleKeyClick(e, sharp, octave)}
            >
              {layers.scale ? (
                <span
                  className={styles.scaleLabelBlack}
                  style={{ width: circleSize, height: circleSize, fontSize: circleFontSize }}
                >{displayName}</span>
              ) : (
                <span className={styles.blackNoteName} style={{ fontSize: circleFontSize }}>{displayName}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
