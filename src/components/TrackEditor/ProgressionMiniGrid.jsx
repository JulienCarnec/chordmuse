import { useRef, useEffect } from 'react';
import { preferFlat, displayNote, noteIndex, noteName } from '../../theory/notes';
import { CHORD_TYPES } from '../../theory/chords'; // still needed for bassNote()
import { SCALE_DEFINITIONS } from '../../theory/scales';
import { useT } from '../../i18n/index';
import styles from './ProgressionMiniGrid.module.css';

const CELLS_PER_ROW = 8;

const DURATION_LABEL = {
  whole:   '𝅝',
  half:    '𝅗𝅥',
  quarter: '♩',
  eighth:  '♪',
};

/**
 * Short suffix per chord type key, used in the mini-grid cells.
 * Keeps labels to ≤5 chars so they fit in fixed-size squares.
 */
const SHORT_SUFFIX = {
  maj:    '',
  min:    'm',
  dim:    '°',
  aug:    '+',
  sus2:   'sus2',
  sus4:   'sus4',
  dom7:   '7',
  maj7:   'M7',
  min7:   'm7',
  dim7:   '°7',
  hdim7:  'ø7',
  dom9:   '9',
  maj9:   'M9',
  min9:   'm9',
};

/** Short label for a chord object, respecting enharmonic spelling. */
function cellLabel(chord, useFlat) {
  if (!chord) return '';
  if (!chord.typeKey && chord.customNotes?.length) return chord.customNotes.slice(0, 2).join(',');
  const r = displayNote(chord.root, useFlat);
  const suffix = SHORT_SUFFIX[chord.typeKey] ?? '';
  return `${r}${suffix}`;
}

/** Bass note for slash notation when inverted. */
function bassNote(chord, useFlat) {
  if (!chord?.inversion || !chord.typeKey) return null;
  const def = CHORD_TYPES[chord.typeKey];
  if (!def) return null;
  const inv = chord.inversion % def.intervals.length;
  if (inv === 0) return null;
  const rootIdx = noteIndex(chord.root);
  const bassIdx = ((rootIdx + def.intervals[inv]) % 12 + 12) % 12;
  return displayNote(noteName(bassIdx), useFlat);
}

/**
 * ProgressionMiniGrid
 *
 * Props:
 *   prog         – progression object { id, name, cells, scaleRoot, scaleKey }
 *   globalScaleRoot / globalScaleKey – fallback scale from global state
 *   playbackCursor – { progressionId, cellIndex, trackIndex? } | null
 *   trackIndex   – the index of this item in the track[] array (used to
 *                  disambiguate multiple occurrences of the same progression)
 */
export function ProgressionMiniGrid({
  prog,
  globalScaleRoot,
  globalScaleKey,
  playbackCursor,
  trackIndex,
  onCellClick,
  controls,
}) {
  const t = useT();
  const activeCellRef = useRef(null);

  // Scroll the active cell into view whenever the cursor moves to a new cell
  useEffect(() => {
    if (activeCellRef.current) {
      activeCellRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [playbackCursor?.cellIndex, playbackCursor?.trackIndex]);

  if (!prog) return null;

  const scaleRoot = prog.scaleRoot ?? globalScaleRoot;
  const scaleKey  = prog.scaleKey  ?? globalScaleKey;
  const useFlat   = preferFlat(scaleRoot, scaleKey);

  const scaleName = scaleRoot && scaleKey
    ? `${displayNote(scaleRoot, useFlat)} ${t.scaleNames?.[scaleKey] ?? scaleKey}`
    : null;

  // Flatten cells into visual rows of CELLS_PER_ROW
  const rows = [];
  for (let i = 0; i < prog.cells.length; i += CELLS_PER_ROW) {
    rows.push(prog.cells.slice(i, i + CELLS_PER_ROW));
  }

  // When playing the track, the cursor carries a trackIndex that pinpoints the
  // exact track-item slot being played.  When absent (progression-editor play),
  // fall back to matching by progressionId only.
  const isCurrentProg = playbackCursor?.progressionId === prog.id &&
    (playbackCursor.trackIndex === undefined || playbackCursor.trackIndex === trackIndex);

  const durationLabel = DURATION_LABEL[prog.cellDuration] ?? DURATION_LABEL.whole;

  return (
    <div className={styles.miniGrid}>
      {/* Scale + duration badges */}
      <div className={styles.metaRow}>
        {scaleName
          ? <span className={styles.scaleBadge}>{scaleName}</span>
          : <span className={styles.scaleBadgeEmpty}>—</span>
        }
        <span className={styles.durationBadge} title={prog.cellDuration ?? 'whole'}>
          {durationLabel}
        </span>
      </div>

      {/* Cell table */}
      <div className={styles.gridFrame}>
        <div className={styles.table}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className={styles.row}>
            {row.map((cell, colIdx) => {
              const cellIndex = rowIdx * CELLS_PER_ROW + colIdx;
              const isActive  = isCurrentProg && playbackCursor?.cellIndex === cellIndex;

              if (cell.split) {
                const [sc0, sc1] = cell.subCells;
                const label0 = cellLabel(sc0, useFlat);
                const label1 = cellLabel(sc1, useFlat);
                const bass0  = bassNote(sc0, useFlat);
                const bass1  = bassNote(sc1, useFlat);
                const maxLen = Math.max(label0.length, label1.length);
                return (
                  <div key={cellIndex} ref={isActive ? activeCellRef : null} data-len={maxLen} className={`${styles.cell} ${styles.splitCell} ${isActive ? styles.active : ''}`}>
                    <span
                        className={styles.splitTop}
                        onClick={() => sc0 && onCellClick?.(sc0, cellIndex)}
                      >
                        {label0}{bass0 ? <span className={styles.bass}>/{bass0}</span> : null}
                      </span>
                      <span
                        className={styles.splitBottom}
                        onClick={() => sc1 && onCellClick?.(sc1, cellIndex)}
                      >
                      {label1}{bass1 ? <span className={styles.bass}>/{bass1}</span> : null}
                    </span>
                    <svg className={styles.diagonal} viewBox="0 0 1 1" preserveAspectRatio="none">
                      <line x1="0" y1="1" x2="1" y2="0" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                );
              }

              const label = cellLabel(cell.chord, useFlat);
              const bass  = bassNote(cell.chord, useFlat);
              return (
                <div
                  key={cellIndex}
                  ref={isActive ? activeCellRef : null}
                  data-len={label.length}
                  className={`${styles.cell} ${isActive ? styles.active : ''} ${!cell.chord ? styles.empty : ''} ${cell.chord && onCellClick ? styles.clickable : ''}`}
                  onClick={() => cell.chord && onCellClick?.(cell.chord, cellIndex)}
                >
                  {label}{bass ? <span className={styles.bass}>/{bass}</span> : null}
                </div>
              );
            })}
            </div>
          ))}
        </div>
        {controls}
      </div>
    </div>
  );
}
