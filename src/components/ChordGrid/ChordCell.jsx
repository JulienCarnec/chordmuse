import { useState } from 'react';
import { CHROMATIC, noteIndex, noteName } from '../../theory/notes';
import { CHORD_TYPES, chordLabel, getChordRole } from '../../theory/chords';
import { PatternControls } from './PatternControls';
import styles from './ChordCell.module.css';

const ROLE_STYLES = {
  'in-scale':       styles.inScale,
  'dominant-I':     styles.dominantI,
  'dominant-II':    styles.dominantII,
  'subdominant-I':  styles.subdominantI,
  'subdominant-II': styles.subdominantII,
  'out': '',
};

const ROLE_OPTION_COLORS = {
  'in-scale':       '#bbf7d0',
  'dominant-I':     '#fef08a',
  'dominant-II':    '#fed7aa',
  'subdominant-I':  '#bfdbfe',
  'subdominant-II': '#e9d5ff',
};

const ROLE_PREFIX = {
  'dominant-I':     '(dom. I) ',
  'dominant-II':    '(dom. II) ',
  'subdominant-I':  '(sub. I) ',
  'subdominant-II': '(sub. II) ',
};

const ROLE_ORDER = ['in-scale', 'dominant-I', 'dominant-II', 'subdominant-I', 'subdominant-II', 'out'];

// Build all root+type combos sorted by role relevance
function buildOptions(scaleRoot, scaleKey) {
  const combos = [];
  for (const root of CHROMATIC) {
    for (const [typeKey] of Object.entries(CHORD_TYPES)) {
      const role = getChordRole(root, typeKey, scaleRoot, scaleKey);
      const base  = chordLabel(root, typeKey);
      const prefix = ROLE_PREFIX[role] ?? '';
      combos.push({ root, typeKey, role, label: `${prefix}${base}` });
    }
  }
  combos.sort((a, b) => {
    const ri = ROLE_ORDER.indexOf(a.role);
    const rj = ROLE_ORDER.indexOf(b.role);
    if (ri !== rj) return ri - rj;
    return CHROMATIC.indexOf(a.root) - CHROMATIC.indexOf(b.root);
  });
  return combos;
}

/** Derive the bass note name for a chord at a given inversion. */
function bassNoteName(chord) {
  if (!chord || !chord.inversion) return null;
  const def = CHORD_TYPES[chord.typeKey];
  if (!def) return null;
  const inv = chord.inversion % def.intervals.length;
  const bassInterval = def.intervals[inv];
  const rootIdx = noteIndex(chord.root);
  return noteName(((rootIdx + bassInterval) % 12 + 12) % 12);
}

/** Label with optional slash notation for inversions: e.g. "C/E" */
function cellLabel(chord) {
  const base = chordLabel(chord.root, chord.typeKey);
  const bass = bassNoteName(chord);
  if (bass && bass !== chord.root) return `${base}/${bass}`;
  return base;
}

function ChordPicker({ value, scaleRoot, scaleKey, onChange }) {
  const options = buildOptions(scaleRoot, scaleKey);
  const currentVal = value ? `${value.root}|${value.typeKey}` : '';

  return (
    <select
      className={styles.chordSelect}
      value={currentVal}
      onChange={e => {
        const [root, typeKey] = e.target.value.split('|');
        onChange({ root, typeKey });
      }}
      onClick={e => e.stopPropagation()}
    >
      <option value="">— pick chord —</option>
      {options.map(({ root, typeKey, role, label }) => (
        <option
          key={`${root}|${typeKey}`}
          value={`${root}|${typeKey}`}
          style={ROLE_OPTION_COLORS[role] ? { backgroundColor: ROLE_OPTION_COLORS[role] } : {}}
        >
          {label}
        </option>
      ))}
    </select>
  );
}

/**
 * Small icon button that toggles the per-cell custom pattern panel.
 * Shows a filled icon when a custom pattern is set, outline when global.
 */
function PatternToggle({ hasCustom, open, onToggle }) {
  return (
    <button
      className={`${styles.patternToggle} ${hasCustom ? styles.patternToggleActive : ''}`}
      title={hasCustom ? 'Custom pattern (click to edit)' : 'Use global pattern (click to override)'}
      onClick={e => { e.stopPropagation(); onToggle(); }}
    >
      {/* Simple music-note icon via text — ♩ when global, ♪ when custom */}
      {hasCustom ? '♪' : '♩'}
    </button>
  );
}

export function ChordCell({
  cell,
  cellIndex,
  progressionId,
  scaleRoot,
  scaleKey,
  isCurrent,
  onSetChord,
  onSplit,
  onUnsplit,
  onSetSubChord,
  onSetPlayStyle,
  onSetSubPlayStyle,
}) {
  const [showPattern, setShowPattern] = useState(false);
  // Track which sub-cell pattern panels are open (Set of sub-cell indices)
  const [openSubPatterns, setOpenSubPatterns] = useState(new Set());

  const hasCustom = cell.playStyle != null;

  function toggleSubPattern(si) {
    setOpenSubPatterns(prev => {
      const next = new Set(prev);
      next.has(si) ? next.delete(si) : next.add(si);
      return next;
    });
  }

  function role(chord) {
    if (!chord) return 'out';
    return getChordRole(chord.root, chord.typeKey, scaleRoot, scaleKey);
  }

  if (cell.split) {
    return (
      <div className={`${styles.cell} ${styles.split} ${isCurrent ? styles.current : ''}`}>
        <div className={styles.splitInner}>
        {cell.subCells.map((sc, si) => {
          const subHasCustom = sc?.playStyle != null;
          const subPatternOpen = openSubPatterns.has(si);
          return (
            <div key={si} className={`${styles.subCell} ${ROLE_STYLES[role(sc)] ?? ''}`}>
              {sc
                ? <span className={styles.label}>{cellLabel(sc)}</span>
                : <span className={styles.empty}>+</span>
              }
              <ChordPicker
                value={sc}
                scaleRoot={scaleRoot}
                scaleKey={scaleKey}
                onChange={chord => onSetSubChord(progressionId, cellIndex, si, chord)}
              />
              <div className={styles.cellFooter}>
                {si === 0 && (
                  <button
                    className={styles.unsplitBtn}
                    title="Merge cells"
                    onClick={e => { e.stopPropagation(); onUnsplit(progressionId, cellIndex); }}
                  >⊞</button>
                )}
                {onSetSubPlayStyle && (
                  <PatternToggle
                    hasCustom={subHasCustom}
                    open={subPatternOpen}
                    onToggle={() => toggleSubPattern(si)}
                  />
                )}
              </div>
              {subPatternOpen && onSetSubPlayStyle && (
                <PatternControls
                  compact
                  allowNull
                  playStyle={sc?.playStyle ?? null}
                  noteValue={sc?.noteValue ?? null}
                  onChange={({ playStyle, noteValue }) =>
                    onSetSubPlayStyle(progressionId, cellIndex, si, playStyle, noteValue)
                  }
                />
              )}
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  const r = role(cell.chord);
  return (
    <div className={`${styles.cell} ${ROLE_STYLES[r] ?? ''} ${isCurrent ? styles.current : ''}`}>
      {cell.chord
        ? <span className={styles.label}>{cellLabel(cell.chord)}</span>
        : <span className={styles.empty}>+</span>
      }
      <ChordPicker
        value={cell.chord}
        scaleRoot={scaleRoot}
        scaleKey={scaleKey}
        onChange={chord => onSetChord(progressionId, cellIndex, chord)}
      />
      <div className={styles.cellFooter}>
        <button
          className={styles.splitBtn}
          title="Split cell"
          onClick={e => { e.stopPropagation(); onSplit(progressionId, cellIndex); }}
        >⊢</button>
        {onSetPlayStyle && (
          <PatternToggle
            hasCustom={hasCustom}
            open={showPattern}
            onToggle={() => setShowPattern(p => !p)}
          />
        )}
      </div>
      {showPattern && onSetPlayStyle && (
        <PatternControls
          compact
          allowNull
          playStyle={cell.playStyle ?? null}
          noteValue={cell.noteValue ?? null}
          onChange={({ playStyle, noteValue }) => {
            onSetPlayStyle(progressionId, cellIndex, playStyle, noteValue);
          }}
        />
      )}
    </div>
  );
}
