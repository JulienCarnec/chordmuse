import { useState } from 'react';
import { CHROMATIC } from '../../theory/notes';
import { CHORD_TYPES, chordLabel, getChordRole } from '../../theory/chords';
import styles from './ChordCell.module.css';

const ROLE_STYLES = {
  'in-scale':     styles.inScale,
  'dominant-I':   styles.dominantI,
  'dominant-II':  styles.dominantII,
  'subdominant-I':  styles.subdominantI,
  'subdominant-II': styles.subdominantII,
  'out': '',
};

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
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState(null); // 0 | 1

  function role(chord) {
    if (!chord) return 'out';
    return getChordRole(chord.root, chord.typeKey, scaleRoot, scaleKey);
  }

  function ChordPicker({ value, onChange, label }) {
    return (
      <div className={styles.picker}>
        <select
          className={styles.rootSelect}
          value={value?.root ?? ''}
          onChange={e => onChange({ root: e.target.value, typeKey: value?.typeKey ?? 'maj' })}
        >
          <option value="">—</option>
          {CHROMATIC.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          className={styles.typeSelect}
          value={value?.typeKey ?? 'maj'}
          onChange={e => onChange({ root: value?.root ?? 'C', typeKey: e.target.value })}
        >
          {Object.entries(CHORD_TYPES).map(([k, def]) => {
            const tempChord = { root: value?.root ?? 'C', typeKey: k };
            const r = role(tempChord);
            return (
              <option
                key={k}
                value={k}
                style={roleToOptionStyle(r)}
              >
                {def.name}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (cell.split) {
    return (
      <div className={`${styles.cell} ${styles.split} ${isCurrent ? styles.current : ''}`}>
        {cell.subCells.map((sc, si) => (
          <div key={si} className={`${styles.subCell} ${sc ? styles[role(sc).replace(/-/g, '_')] : ''}`}>
            {sc ? (
              <span className={styles.label}>{chordLabel(sc.root, sc.typeKey)}</span>
            ) : (
              <span className={styles.empty}>+</span>
            )}
            <ChordPicker
              value={sc}
              onChange={chord => onSetSubChord(progressionId, cellIndex, si, chord)}
              label={`Sub ${si + 1}`}
            />
            {si === 0 && (
              <button className={styles.unsplitBtn} onClick={() => onUnsplit(progressionId, cellIndex)}>⊞</button>
            )}
          </div>
        ))}
      </div>
    );
  }

  const r = role(cell.chord);
  return (
    <div className={`${styles.cell} ${ROLE_STYLES[r] ?? ''} ${isCurrent ? styles.current : ''}`}>
      {cell.chord ? (
        <span className={styles.label}>{chordLabel(cell.chord.root, cell.chord.typeKey)}</span>
      ) : (
        <span className={styles.empty}>+</span>
      )}
      <ChordPicker
        value={cell.chord}
        onChange={chord => onSetChord(progressionId, cellIndex, chord)}
        label="Chord"
      />
      <button className={styles.splitBtn} title="Split cell" onClick={() => onSplit(progressionId, cellIndex)}>⊢</button>
    </div>
  );
}

function roleToOptionStyle(role) {
  const map = {
    'in-scale':       { backgroundColor: '#bbf7d0' },
    'dominant-I':     { backgroundColor: '#fef08a' },
    'dominant-II':    { backgroundColor: '#fed7aa' },
    'subdominant-I':  { backgroundColor: '#bfdbfe' },
    'subdominant-II': { backgroundColor: '#e9d5ff' },
  };
  return map[role] ?? {};
}
