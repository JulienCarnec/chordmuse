import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { CHROMATIC, ENHARMONIC, noteIndex, noteName, preferFlat } from '../../theory/notes';
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
 * 1. Attack blink (bright amber)  — highest, fades after ATTACK_MS
 * 2. Sustain (soft amber)
 * 3. Inversion-candidate (green)
 * 4. Highlight: chord note OR manually clicked (blue)
 * (Scale never sets background — dots only)
 */
function bgClass(isBlack, { attack, sustain, highlight, invCandidate, invFirst }) {
  if (attack)       return isBlack ? styles.bg_attack_b    : styles.bg_attack;
  if (sustain)      return isBlack ? styles.bg_sustain_b   : styles.bg_sustain;
  if (invFirst)     return isBlack ? styles.bg_invFirst_b  : styles.bg_invFirst;
  if (invCandidate) return isBlack ? styles.bg_invCand_b   : styles.bg_invCand;
  if (highlight)    return isBlack ? styles.bg_highlight_b : styles.bg_highlight;
  return '';
}

const ATTACK_MS = 150; // how long the bright-amber blink lasts

/**
 * keyId — unique string for a specific physical key, e.g. "C4", "F#3"
 */
function keyId(note, octave) { return `${note}${octave}`; }

export function PianoKeyboard({
  scaleRoot, scaleKey,
  selectedChord,               // { root, typeKey, octave, inversion }
  instrument = 'piano',
  playbackNotes = null,        // array of exact "note+octave" strings currently sounding
  playbackNotesDuration = 900, // real note duration in ms — used to time key un-highlight
  resetKey,
  onPickInversion,             // (inversionIndex: number) => void
}) {
  const { playNotes, playArpeggio } = useSampler();
  // manualHighlight: Set of "note+octave" strings (per-key, not pitch-class)
  const [manualHighlight, setManualHighlight] = useState(new Set());
  const [pickingInversion, setPickingInversion] = useState(false);
  // Set of pitch-class note names currently sounding during scale playback
  const [playingScaleNotes, setPlayingScaleNotes] = useState(new Set());
  const scaleTimersRef = useRef([]);
  const wrapperRef = useRef(null);
  const [whiteW, setWhiteW] = useState(36);
  // attackedAt: Map<keyId, timestamp> — when the note last attacked
  const attackedAt = useRef(new Map());
  // sustainedNotes: Set<keyId> — notes currently sounding (attack + sustain phase)
  const [sustainedNotes, setSustainedNotes] = useState(new Set());
  // ticker forces re-render once ATTACK_MS passes to switch attack→sustain colour
  const [, setTick] = useState(0);

  // Clear manual highlights and exit inversion mode whenever the selected cell changes
  useEffect(() => {
    setManualHighlight(new Set());
    setPickingInversion(false);
  }, [resetKey]);

  // When playbackNotes changes (a new note fires), add it to sustainedNotes.
  // Each note is removed after the real note duration so keys un-highlight exactly when the sound stops.
  useEffect(() => {
    if (!playbackNotes?.length) return;
    const now = Date.now();
    for (const id of playbackNotes) {
      attackedAt.current.set(id, now);
    }
    setSustainedNotes(prev => {
      const next = new Set(prev);
      for (const id of playbackNotes) next.add(id);
      return next;
    });
    // Colour flip: attack → sustain after ATTACK_MS
    const t1 = setTimeout(() => setTick(v => v + 1), ATTACK_MS + 10);
    // Un-highlight exactly when the note ends
    const ids = [...playbackNotes];
    const sustainMs = Math.max(ATTACK_MS + 20, playbackNotesDuration);
    const t2 = setTimeout(() => {
      setSustainedNotes(prev => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, sustainMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playbackNotes, playbackNotesDuration]);

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

  // playbackSet: the notes fired in this exact dispatch (for attack detection)
  const playbackSet = new Set(playbackNotes ?? []);
  // Helper: is a keyId in attack phase?
  const now = Date.now();
  function isAttacking(id) {
    const t = attackedAt.current.get(id);
    return t !== undefined && (now - t) < ATTACK_MS;
  }

  // ── Normal click: play + toggle manual highlight per specific key ─────────
  function handleKeyClick(e, note, octave) {
    e.stopPropagation();

    if (pickingInversion) {
      // Any key whose pitch class belongs to the chord is a valid inversion pick
      const nIdx = noteIndex(note);
      if (!chordNoteSet.has(nIdx)) return;
      const invIdx = chordNoteNames.findIndex(n => noteIndex(n) === nIdx);
      if (invIdx !== -1 && onPickInversion) {
        // Pass both the inversion index and the clicked octave so the caller
        // can re-voice the chord with this key as the actual bass note.
        onPickInversion(invIdx, octave);
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
    // Start from the root note — rotate indices so root comes first, wrap higher notes up an octave
    const rootIdx = scaleRoot ? noteIndex(scaleRoot) : indices.sort((a, b) => a - b)[0];
    const sorted = [...indices].sort((a, b) => a - b);
    const rootPos = sorted.indexOf(rootIdx);
    const reordered = rootPos >= 0
      ? [...sorted.slice(rootPos), ...sorted.slice(0, rootPos)]
      : sorted;
    const baseOct = START_OCTAVE + 1;
    let oct = baseOct;
    let prevIdx = -1;
    const notes = reordered.map(i => {
      if (prevIdx !== -1 && i <= prevIdx) oct++;
      prevIdx = i;
      return `${CHROMATIC[i]}${oct}`;
    });
    // Append root one octave up to close the scale.
    // The last note in `notes` has octave `oct`; root sits at oct+1 (always one step above the last note).
    const rootOctaveUp = `${CHROMATIC[rootIdx]}${oct + 1}`;
    const allNotes = [...notes, rootOctaveUp];
    playArpeggio(allNotes, 'up', '8n', instrument);

    // Cancel any previous scale timers
    scaleTimersRef.current.forEach(t => clearTimeout(t));
    scaleTimersRef.current = [];
    setPlayingScaleNotes(new Set());

    // Schedule light-green highlight for each note in the arpeggio (including root octave up)
    const stepMs = Tone.Time('8n').toSeconds() * 1000;
    const holdMs = stepMs * 0.85;
    allNotes.forEach((noteWithOct, i) => {
      const pitchClass = noteWithOct.replace(/\d+$/, '');
      const onTimer = setTimeout(() => {
        setPlayingScaleNotes(prev => { const n = new Set(prev); n.add(pitchClass); return n; });
      }, i * stepMs);
      const offTimer = setTimeout(() => {
        setPlayingScaleNotes(prev => { const n = new Set(prev); n.delete(pitchClass); return n; });
      }, i * stepMs + holdMs);
      scaleTimersRef.current.push(onTimer, offTimer);
    });
  }

  // Detect chord from manual highlights (pitch-class level, strip octave)
  const useFlat = preferFlat(scaleRoot, scaleKey);
  const manualPitchClasses = [...manualHighlight].map(id => noteIndex(id.replace(/\d+$/, '')));
  const detectedChord = manualPitchClasses.length >= 2 ? identifyChord(manualPitchClasses, useFlat) : null;
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
          <span className={`${styles.legendSwatch} ${styles.swatchAttack}`} />
          <span className={styles.legendLabel}>Attack</span>
          <span className={`${styles.legendSwatch} ${styles.swatchSustain}`} />
          <span className={styles.legendLabel}>Sustain</span>
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
          const isAttack    = playbackSet.has(id) && isAttacking(id);
          const isSustain   = sustainedNotes.has(id) && !isAttack;
          const layers = {
            attack:       isAttack,
            sustain:      isSustain,
            highlight:    chordHighlightSet.has(id) || manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !isAttack && !isSustain && !layers.highlight && !layers.invCandidate;
          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${bgClass(false, layers)} ${dimmed ? styles.dimWhite : ''}`}
              style={{ left: wIdx * whiteW, width: whiteW, height: whiteH }}
              onClick={e => handleKeyClick(e, note, octave)}
            >
              {layers.scale ? (
                <span
                  className={`${styles.scaleLabel} ${playingScaleNotes.has(note) ? styles.scaleLabelPlaying : ''}`}
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
          const isAttack    = playbackSet.has(id) && isAttacking(id);
          const isSustain   = sustainedNotes.has(id) && !isAttack;
          const layers = {
            attack:       isAttack,
            sustain:      isSustain,
            highlight:    chordHighlightSet.has(id) || manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !isAttack && !isSustain && !layers.highlight && !layers.invCandidate;
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
                  className={`${styles.scaleLabelBlack} ${playingScaleNotes.has(sharp) ? styles.scaleLabelPlaying : ''}`}
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
