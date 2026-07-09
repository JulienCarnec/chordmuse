import { CHROMATIC } from '../../theory/notes';
import { CHORD_TYPES, chordLabel, getChordRole } from '../../theory/chords';
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

const ROLE_ORDER = ['in-scale', 'dominant-I', 'dominant-II', 'subdominant-I', 'subdominant-II', 'out'];

// Build all root+type combos sorted by role relevance
function buildOptions(scaleRoot, scaleKey) {
  const combos = [];
  for (const root of CHROMATIC) {
    for (const [typeKey] of Object.entries(CHORD_TYPES)) {
      const role = getChordRole(root, typeKey, scaleRoot, scaleKey);
      combos.push({ root, typeKey, role, label: chordLabel(root, typeKey) });
    }
  }
  // Sort: scale-relevant first, then by root order
  combos.sort((a, b) => {
    const ri = ROLE_ORDER.indexOf(a.role);
    const rj = ROLE_ORDER.indexOf(b.role);
    if (ri !== rj) return ri - rj;
    return CHROMATIC.indexOf(a.root) - CHROMATIC.indexOf(b.root);
  });
  return combos;
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
}) {
  function role(chord) {
    if (!chord) return 'out';
    return getChordRole(chord.root, chord.typeKey, scaleRoot, scaleKey);
  }

  if (cell.split) {
    return (
      <div className={`${styles.cell} ${styles.split} ${isCurrent ? styles.current : ''}`}>
        {cell.subCells.map((sc, si) => (
          <div key={si} className={`${styles.subCell} ${ROLE_STYLES[role(sc)] ?? ''}`}>
            {sc
              ? <span className={styles.label}>{chordLabel(sc.root, sc.typeKey)}</span>
              : <span className={styles.empty}>+</span>
            }
            <ChordPicker
              value={sc}
              scaleRoot={scaleRoot}
              scaleKey={scaleKey}
              onChange={chord => onSetSubChord(progressionId, cellIndex, si, chord)}
            />
            {si === 0 && (
              <button className={styles.unsplitBtn} title="Merge cells" onClick={() => onUnsplit(progressionId, cellIndex)}>⊞</button>
            )}
          </div>
        ))}
      </div>
    );
  }

  const r = role(cell.chord);
  return (
    <div className={`${styles.cell} ${ROLE_STYLES[r] ?? ''} ${isCurrent ? styles.current : ''}`}>
      {cell.chord
        ? <span className={styles.label}>{chordLabel(cell.chord.root, cell.chord.typeKey)}</span>
        : <span className={styles.empty}>+</span>
      }
      <ChordPicker
        value={cell.chord}
        scaleRoot={scaleRoot}
        scaleKey={scaleKey}
        onChange={chord => onSetChord(progressionId, cellIndex, chord)}
      />
      <button className={styles.splitBtn} title="Split cell" onClick={() => onSplit(progressionId, cellIndex)}>⊢</button>
    </div>
  );
}
