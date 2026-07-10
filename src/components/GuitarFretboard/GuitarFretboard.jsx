import { useState, useEffect, useRef } from 'react';
import { noteIndex, preferFlat, displayNote, CHROMATIC } from '../../theory/notes';
import { getScaleNoteSet } from '../../theory/scales';
import { useSampler } from '../../audio/useSampler';
import styles from './GuitarFretboard.module.css';

// Available tunings — strings ordered high → low (top row = thinnest)
const TUNINGS = {
  standard: {
    label: 'Standard (EADGBE)',
    strings: [
      { note: 'E', octave: 4, label: '1st' },
      { note: 'B', octave: 3, label: '2nd' },
      { note: 'G', octave: 3, label: '3rd' },
      { note: 'D', octave: 3, label: '4th' },
      { note: 'A', octave: 2, label: '5th' },
      { note: 'E', octave: 2, label: '6th' },
    ],
  },
  dropD: {
    label: 'Drop D (DADGBE)',
    strings: [
      { note: 'E', octave: 4, label: '1st' },
      { note: 'B', octave: 3, label: '2nd' },
      { note: 'G', octave: 3, label: '3rd' },
      { note: 'D', octave: 3, label: '4th' },
      { note: 'A', octave: 2, label: '5th' },
      { note: 'D', octave: 2, label: '6th' }, // low E → D
    ],
  },
  dadgad: {
    label: 'DADGAD',
    strings: [
      { note: 'D', octave: 4, label: '1st' }, // high E → D
      { note: 'A', octave: 3, label: '2nd' }, // B → A
      { note: 'G', octave: 3, label: '3rd' },
      { note: 'D', octave: 3, label: '4th' },
      { note: 'A', octave: 2, label: '5th' },
      { note: 'D', octave: 2, label: '6th' }, // low E → D
    ],
  },
};

const NUM_FRETS = 15; // frets 1–15 (plus open = 0)

// ── Natural (unscaled) dimensions ────────────────────────────────────────────
const NATURAL_OPEN_COL = 36;
const NATURAL_ROW_H    = 36;   // multiplied by 0.9 for −10% height
const FRET_RATIO       = Math.pow(2, -1 / 12);
const NATURAL_FRET_WIDTHS = Array.from({ length: NUM_FRETS }, (_, i) =>
  Math.round(88 * Math.pow(FRET_RATIO, i))
);
const NATURAL_NECK_W  = NATURAL_FRET_WIDTHS.reduce((s, w) => s + w, 0);
const NATURAL_TOTAL_W = NATURAL_OPEN_COL + NATURAL_NECK_W;

// Frets that have position marker dots
const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15]);
const DOUBLE_DOT_FRET = 12;

const ATTACK_MS = 200;

/**
 * For a given string + fret, return the { note (sharp), octave } sounding.
 */
function fretNote(openNote, openOctave, fret) {
  const openIdx = noteIndex(openNote);
  const total = openIdx + fret;
  const noteIdx = total % 12;
  const octaveShift = Math.floor(total / 12);
  return { note: CHROMATIC[noteIdx], octave: openOctave + octaveShift };
}

/**
 * keyId string consistent with PianoKeyboard: "note+octave" e.g. "C#4"
 */
function keyId(note, octave) { return `${note}${octave}`; }

/**
 * Pitch-class index from a keyId string (strips octave digit(s)).
 */
function pitchClass(kid) {
  // keyId is like "C4", "C#4", "A#3" — strip trailing digit(s)
  const note = kid.replace(/\d+$/, '');
  return noteIndex(note);
}

export function GuitarFretboard({
  scaleRoot, scaleKey,
  selectedChord,
  instrument = 'piano',
  playbackNotes = null,       // Set or array of "note+octave" strings currently sounding
  playbackNotesDuration = 900,
  isPaused = false,
  manualHighlight = new Set(), // Set<"note+octave"> — from shared state
  onToggleKey,                 // (keyId) => void
  playingScaleNotes = new Set(), // Set<"note+octave"> animated from ChordGrid
}) {
  const { playNotes } = useSampler();
  const wrapperRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [tuningKey, setTuningKey] = useState('standard');
  const OPEN_STRINGS = TUNINGS[tuningKey].strings;

  // Responsive: measure wrapper width, scale entire fretboard to fill it
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => setContainerW(el.clientWidth);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // sustainedNotes: Set<"stringIndex-fret"> — fret positions currently sounding
  const [sustainedNotes, setSustainedNotes] = useState(new Set());
  const attackedAt = useRef(new Map());
  const [, setTick] = useState(0);
  const genRef = useRef(0);

  // Cancel in-flight fade-out timers on pause
  useEffect(() => {
    if (isPaused) genRef.current++;
  }, [isPaused]);

  // Derive which fret positions are hit by the current playbackNotes (pitch-class match)
  const playbackPitchClasses = new Set(
    (playbackNotes ?? []).map(kid => pitchClass(kid))
  );

  // Build fret-position keys for all sounding pitch classes
  function fretKeysForPitchClasses(pcs) {
    const keys = new Set();
    OPEN_STRINGS.forEach((str, si) => {
      for (let fret = 0; fret <= NUM_FRETS; fret++) {
        const { note } = fretNote(str.note, str.octave, fret);
        if (pcs.has(noteIndex(note))) {
          keys.add(`${si}-${fret}`);
        }
      }
    });
    return keys;
  }

  useEffect(() => {
    if (!playbackNotes?.length) {
      genRef.current++;
      attackedAt.current.clear();
      setSustainedNotes(new Set());
      return;
    }
    if (isPaused) return;

    genRef.current++;
    const gen = genRef.current;
    const now = Date.now();
    attackedAt.current.clear();

    const pcs = new Set((playbackNotes ?? []).map(kid => pitchClass(kid)));
    const hitKeys = fretKeysForPitchClasses(pcs);

    for (const k of hitKeys) attackedAt.current.set(k, now);
    setSustainedNotes(hitKeys);

    const t1 = setTimeout(() => {
      if (genRef.current !== gen) return;
      setTick(v => v + 1);
    }, ATTACK_MS + 10);

    const sustainMs = Math.max(ATTACK_MS + 20, playbackNotesDuration);
    const t2 = setTimeout(() => {
      if (genRef.current !== gen) return;
      setSustainedNotes(prev => {
        const next = new Set(prev);
        for (const k of hitKeys) next.delete(k);
        return next;
      });
    }, sustainMs);

    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackNotes, playbackNotesDuration, isPaused]);

  const scaleNoteSet = scaleRoot && scaleKey ? getScaleNoteSet(scaleRoot, scaleKey) : new Set();
  const hasScale = scaleNoteSet.size > 0;
  const useFlat = preferFlat(scaleRoot, scaleKey);

  // Manual highlight derives pitch-class set so all fret positions of a note light up
  const manualPitchClasses = new Set([...manualHighlight].map(pitchClass));

  // Chord pitch-class set (from selectedChord voiced notes)
  const chordPitchClasses = new Set();
  if (selectedChord && playbackNotes?.length) {
    for (const kid of playbackNotes) chordPitchClasses.add(pitchClass(kid));
  }

  // playingScale pitch-class set
  const scalePitchClasses = new Set([...playingScaleNotes].map(pitchClass));

  const now = Date.now();
  function isAttacking(fretKey) {
    const t = attackedAt.current.get(fretKey);
    return t !== undefined && (now - t) < ATTACK_MS;
  }

  function handleDotClick(e, note, octave, fretKey) {
    e.stopPropagation();
    const kid = keyId(note, octave);
    playNotes([kid], '4n', instrument);
    onToggleKey?.(kid);
  }

  // Scale factor: fit full neck to container width; fall back to natural size until measured
  const scale    = containerW > 0 ? containerW / NATURAL_TOTAL_W : 1;
  const scaleH   = scale * 0.9; // −10% height

  const OPEN_COL        = NATURAL_OPEN_COL * scale;
  const ROW_H           = NATURAL_ROW_H * scaleH;
  const STRING_Y_OFFSET = NATURAL_ROW_H * scaleH * 0.5;
  const DOT_R           = Math.max(7, Math.round(11 * scaleH));
  const FRET_WIDTHS     = NATURAL_FRET_WIDTHS.map(w => w * scale);
  const TOTAL_NECK_W    = FRET_WIDTHS.reduce((s, w) => s + w, 0);

  // x position of the left edge of fret `f` (1-based), relative to OPEN_COL
  function fretLeft(f) {
    let x = 0;
    for (let i = 0; i < f - 1; i++) x += FRET_WIDTHS[i];
    return x;
  }
  function fretCx(f) { return fretLeft(f) + FRET_WIDTHS[f - 1] / 2; }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* ── Tuning selector ──────────────────────────────────── */}
      <div className={styles.tuningRow}>
        <label className={styles.tuningLabel}>Tuning</label>
        <select
          className={styles.tuningSelect}
          value={tuningKey}
          onChange={e => setTuningKey(e.target.value)}
        >
          {Object.entries(TUNINGS).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* String label column + fretboard */}
      <div className={styles.fretboard}>

        {/* ── Fret number row (bottom) ───────────────────────── */}
        {/* Rendered first for correct z-index, but placed at bottom via CSS */}

        {/* ── SVG layer: neck wood, frets, strings, dots ─────── */}
        <svg
          className={styles.neckSvg}
          width={OPEN_COL + TOTAL_NECK_W}
          height={OPEN_STRINGS.length * ROW_H + 28}
          style={{ display: 'block' }}
        >
          {/* Neck background */}
          <rect
            x={OPEN_COL}
            y={0}
            width={TOTAL_NECK_W}
            height={OPEN_STRINGS.length * ROW_H}
            fill="#1a1a1f"
            rx={0}
          />

          {/* Nut (thick vertical line at fret 0 boundary) */}
          <rect x={OPEN_COL} y={0} width={5} height={OPEN_STRINGS.length * ROW_H} fill="#b0b0b8" />

          {/* Fret lines */}
          {Array.from({ length: NUM_FRETS }, (_, i) => {
            const x = OPEN_COL + fretLeft(i + 2); // right edge of fret i+1
            return (
              <rect key={`fret-${i}`} x={x - 2} y={0} width={3} height={OPEN_STRINGS.length * ROW_H} fill="#6b6b72" />
            );
          })}

          {/* String lines */}
          {OPEN_STRINGS.map((_, si) => {
            const y = si * ROW_H + STRING_Y_OFFSET;
            const thickness = 1 + si * 0.45; // si=0 (high E) thinnest, si=5 (low E) thickest
            return (
              <line
                key={`str-${si}`}
                x1={OPEN_COL} y1={y}
                x2={OPEN_COL + TOTAL_NECK_W} y2={y}
                stroke="#9ca3af"
                strokeWidth={thickness}
              />
            );
          })}

          {/* Position dot inlays */}
          {Array.from({ length: NUM_FRETS }, (_, i) => {
            const fret = i + 1;
            const cx = OPEN_COL + fretCx(fret);
            if (fret === DOUBLE_DOT_FRET) {
              const midY = (OPEN_STRINGS.length * ROW_H) / 2;
              return (
                <g key={`inlay-${fret}`}>
                  <circle cx={cx} cy={midY - ROW_H * 0.8} r={5} fill="#e8d5b7" opacity="0.35" />
                  <circle cx={cx} cy={midY + ROW_H * 0.8} r={5} fill="#e8d5b7" opacity="0.35" />
                </g>
              );
            }
            if (SINGLE_DOT_FRETS.has(fret)) {
              const midY = (OPEN_STRINGS.length * ROW_H) / 2;
              return <circle key={`inlay-${fret}`} cx={cx} cy={midY} r={5} fill="#e8d5b7" opacity="0.35" />;
            }
            return null;
          })}

          {/* Fret numbers */}
          {Array.from({ length: NUM_FRETS }, (_, i) => {
            const fret = i + 1;
            const cx = OPEN_COL + fretCx(fret);
            const y = OPEN_STRINGS.length * ROW_H + 18;
            return (
              <text key={`fn-${fret}`} x={cx} y={y} textAnchor="middle" fontSize="11" fill="#9ca3af" fontFamily="inherit">{fret}</text>
            );
          })}

          {/* String ordinal labels (1st–6th) */}
          {OPEN_STRINGS.map((str, si) => {
            const y = si * ROW_H + STRING_Y_OFFSET;
            return (
              <text key={`sl-${si}`} x={OPEN_COL / 2} y={y + 4} textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="inherit" fontWeight="600">{str.label}</text>
            );
          })}
        </svg>

        {/* ── Interactive dot layer (HTML — positioned over SVG) ── */}
        <div
          className={styles.dotLayer}
          style={{ width: OPEN_COL + TOTAL_NECK_W, height: OPEN_STRINGS.length * ROW_H }}
        >
          {OPEN_STRINGS.map((str, si) => {
            const rowY = si * ROW_H;
            // Frets 0–15 (0 = open string)
            return Array.from({ length: NUM_FRETS + 1 }, (_, fret) => {
              const { note, octave } = fretNote(str.note, str.octave, fret);
              const nIdx = noteIndex(note);
              const fretKey = `${si}-${fret}`;
              const kid = keyId(note, octave);
              const displayName = displayNote(note, useFlat);

              const inScale = scaleNoteSet.has(nIdx);
              const isManual = manualPitchClasses.has(nIdx);
              const isScalePlaying = scalePitchClasses.has(nIdx);
              const attacking = sustainedNotes.has(fretKey) && isAttacking(fretKey);
              const sustaining = sustainedNotes.has(fretKey) && !attacking;
              const dimmed = hasScale && !inScale && !attacking && !sustaining && !isManual;

              // Determine dot class (priority: attack > sustain > manual > scale-playing > scale > dimmed)
              let dotClass = styles.dot;
              if (attacking)       dotClass = `${styles.dot} ${styles.dotAttack}`;
              else if (sustaining) dotClass = `${styles.dot} ${styles.dotSustain}`;
              else if (isManual)   dotClass = `${styles.dot} ${styles.dotManual}`;
              else if (isScalePlaying) dotClass = `${styles.dot} ${styles.dotScalePlaying}`;
              else if (inScale)    dotClass = `${styles.dot} ${styles.dotScale}`;
              else if (dimmed)     dotClass = `${styles.dot} ${styles.dotDimmed}`;

              // Only render a visible dot when something to show; always render a hit area
              const cx = fret === 0
                ? OPEN_COL / 2
                : OPEN_COL + fretCx(fret);

              return (
                <div
                  key={fretKey}
                  className={styles.dotHitArea}
                  style={{
                    left: cx - DOT_R - 4,
                    top:  rowY + STRING_Y_OFFSET - DOT_R - 4,
                    width: (DOT_R + 4) * 2,
                    height: (DOT_R + 4) * 2,
                  }}
                  onClick={e => handleDotClick(e, note, octave, fretKey)}
                >
                  {(inScale || attacking || sustaining || isManual || isScalePlaying) && (
                    <div className={dotClass} style={{ width: DOT_R * 2, height: DOT_R * 2 }}>
                      <span className={styles.dotLabel}>{displayName}</span>
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
