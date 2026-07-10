import { useState, useRef, useEffect } from 'react';
import { noteIndex, preferFlat, displayNote } from '../../theory/notes';
import { getScaleNoteSet } from '../../theory/scales';
import { getChordNotes, getChordNotesVoiced, voiceChord } from '../../theory/chords';
import { useSampler } from '../../audio/useSampler';
import { useT } from '../../i18n/index';
import styles from './PianoKeyboard.module.css';

const START_OCTAVE = 3;
const NUM_OCTAVES = 3;
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

function blackKeyDisplayName(sharpName, scaleRoot, scaleKey) {
  if (!scaleRoot) return sharpName;
  return displayNote(sharpName, preferFlat(scaleRoot, scaleKey));
}

/**
 * Derive the background colour class for a key based on layer priority:
 * 1. Attack blink (bright amber)  — highest, fades after ATTACK_MS
 * 2. Sustain (soft amber)
 * 3. Inversion-candidate (green)
 * 4. Chord glow (purple, 3-second fade)
 * 5. Manual highlight (blue)
 * (Scale never sets background — dots only)
 */
function bgClass(isBlack, { attack, sustain, highlight, invCandidate, invFirst, chordGlow }) {
  if (attack)       return isBlack ? styles.bg_attack_b    : styles.bg_attack;
  if (sustain)      return isBlack ? styles.bg_sustain_b   : styles.bg_sustain;
  if (invFirst)     return isBlack ? styles.bg_invFirst_b  : styles.bg_invFirst;
  if (invCandidate) return isBlack ? styles.bg_invCand_b   : styles.bg_invCand;
  if (chordGlow)    return isBlack ? styles.bg_chordGlow_b : styles.bg_chordGlow;
  if (highlight)    return isBlack ? styles.bg_highlight_b : styles.bg_highlight;
  return '';
}

const ATTACK_MS = 200; // how long the bright-amber blink lasts (orange flash)

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
  isPaused = false,            // when true: freeze sustain highlight, skip fade-out timer
  resetKey,
  onPickInversion,             // (inversionIndex: number) => void
  manualHighlight = new Set(), // Set<string> "note+octave" keyIds — lifted to ChordGrid
  onToggleKey,                 // (keyId: string) => void
  playingScaleNotes = new Set(), // Set<"note+octave"> — animated from ChordGrid
}) {
  const t = useT();
  const { playNotes } = useSampler();
  const [pickingInversion, setPickingInversion] = useState(false);
  // chordGlow: Set of "note+octave" strings that glow purple when a cell is selected
  const [chordGlow, setChordGlow] = useState(new Set());
  const chordGlowTimerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [whiteW, setWhiteW] = useState(36);
  // attackedAt: Map<keyId, timestamp> — when the note last attacked
  const attackedAt = useRef(new Map());
  // sustainedNotes: Set<keyId> — notes currently sounding (attack + sustain phase)
  const [sustainedNotes, setSustainedNotes] = useState(new Set());
  // ticker forces re-render once ATTACK_MS passes to switch attack→sustain colour
  const [, setTick] = useState(0);
  // generation counter — incremented on stop/clear so stale timeouts become no-ops
  const genRef = useRef(0);

  // Exit inversion mode whenever the selected cell changes
  // (manual highlight clearing is handled by ChordGrid via setSharedHighlight)
  useEffect(() => {
    setPickingInversion(false);
  }, [resetKey]);

  // When a chord is selected, flash its voiced notes in purple for 3 seconds then fade
  useEffect(() => {
    clearTimeout(chordGlowTimerRef.current);
    if (!selectedChord) { setChordGlow(new Set()); return; }
    const notes = voiceChord(selectedChord, selectedChord.octave ?? 4);
    setChordGlow(new Set(notes));
    chordGlowTimerRef.current = setTimeout(() => setChordGlow(new Set()), 3000);
    return () => clearTimeout(chordGlowTimerRef.current);
  }, [selectedChord]);

  // Cancel any in-flight fade-out timer the moment pause is pressed.
  useEffect(() => {
    if (isPaused) genRef.current++;
  }, [isPaused]);

  // When playbackNotes becomes empty/null (stop), immediately clear all sustain state.
  // While paused: keep sustainedNotes frozen — skip the fade-out timer entirely.
  useEffect(() => {
    if (!playbackNotes?.length) {
      // stop() dispatches empty notes — always clear regardless of pause state
      genRef.current++;
      attackedAt.current.clear();
      setSustainedNotes(new Set());
      return;
    }
    if (isPaused) {
      // Paused: a new chord value won't arrive, but if the component re-renders
      // while paused we must not install a new fade-out timer.
      return;
    }
    // New chord arrived during active playback — bump generation to cancel all
    // stale timers, then replace sustainedNotes so previous keys clear immediately.
    genRef.current++;
    const gen = genRef.current;
    const now = Date.now();
    attackedAt.current.clear();
    for (const id of playbackNotes) {
      attackedAt.current.set(id, now);
    }
    setSustainedNotes(new Set(playbackNotes));
    // Colour flip: attack → sustain after ATTACK_MS
    const t1 = setTimeout(() => {
      if (genRef.current !== gen) return;
      setTick(v => v + 1);
    }, ATTACK_MS + 10);
    // Un-highlight exactly when the note ends
    const ids = [...playbackNotes];
    const sustainMs = Math.max(ATTACK_MS + 20, playbackNotesDuration);
    const t2 = setTimeout(() => {
      if (genRef.current !== gen) return;
      setSustainedNotes(prev => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, sustainMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playbackNotes, playbackNotesDuration, isPaused]);

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

  // ── Normal click: play + toggle manual highlight by pitch-class ──────────
  function handleKeyClick(e, note, octave) {
    e.stopPropagation();

    if (pickingInversion) {
      const nIdx = noteIndex(note);
      if (!chordNoteSet.has(nIdx)) return;
      const invIdx = chordNoteNames.findIndex(n => noteIndex(n) === nIdx);
      if (invIdx !== -1 && onPickInversion) {
        onPickInversion(invIdx, octave);
      }
      setPickingInversion(false);
      return;
    }

    playNotes([`${note}${octave}`], '4n', instrument);
    onToggleKey?.(keyId(note, octave));
  }

  const useFlat = preferFlat(scaleRoot, scaleKey);
  const hasScale = scaleNoteSet.size > 0;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {pickingInversion && (
        <div className={styles.controls}>
          <span className={styles.invHint}>{t.pianoInvHint}</span>
        </div>
      )}

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
            chordGlow:    chordGlow.has(id),
            highlight:    manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !isAttack && !isSustain && !layers.highlight && !layers.chordGlow && !layers.invCandidate;
          return (
            <div
              key={`w-${note}${octave}`}
              className={`${styles.white} ${bgClass(false, layers)} ${dimmed ? styles.dimWhite : ''}`}
              style={{ left: wIdx * whiteW, width: whiteW, height: whiteH }}
              onClick={e => handleKeyClick(e, note, octave)}
            >
              {layers.scale ? (
                <span
                  className={`${styles.scaleLabel} ${playingScaleNotes.has(keyId(note, octave)) ? styles.scaleLabelPlaying : ''}`}
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
            chordGlow:    chordGlow.has(id),
            highlight:    manualHighlight.has(id),
            invCandidate: pickingInversion && isChordNote,
            invFirst:     pickingInversion && isChordNote &&
                          chordNoteNames[0] && noteIndex(chordNoteNames[selectedChord?.inversion ?? 0]) === nIdx,
            scale:        scaleNoteSet.has(nIdx),
          };
          const dimmed = hasScale && !layers.scale && !isAttack && !isSustain && !layers.highlight && !layers.chordGlow && !layers.invCandidate;
          const displayName = blackKeyDisplayName(sharp, scaleRoot, scaleKey);
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
                  className={`${styles.scaleLabelBlack} ${playingScaleNotes.has(keyId(sharp, octave)) ? styles.scaleLabelPlaying : ''}`}
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
