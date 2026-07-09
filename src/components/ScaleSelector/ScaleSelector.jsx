import { useState } from 'react';
import { CHROMATIC } from '../../theory/notes';
import { SCALE_DEFINITIONS, getScaleNotes, scalesFittingFirstChord } from '../../theory/scales';
import styles from './ScaleSelector.module.css';

const ROOTS = CHROMATIC;

export function ScaleSelector({ scaleRoot, scaleKey, firstChord, onChange }) {
  const [root, setRoot] = useState(scaleRoot ?? 'C');
  const [key, setKey] = useState(scaleKey ?? 'ionian');

  // Which scales fit the first chord
  const fits = firstChord
    ? scalesFittingFirstChord(firstChord.root, getScaleNotes(firstChord.root, firstChord.typeKey === 'maj' ? 'ionian' : firstChord.typeKey))
    : {};

  function handleChange(newRoot, newKey) {
    setRoot(newRoot);
    setKey(newKey);
    onChange({ root: newRoot, key: newKey });
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>Scale</label>
      <select
        className={styles.select}
        value={root}
        onChange={e => handleChange(e.target.value, key)}
      >
        {ROOTS.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={key}
        onChange={e => handleChange(root, e.target.value)}
      >
        {Object.entries(SCALE_DEFINITIONS).map(([k, def]) => (
          <option
            key={k}
            value={k}
            className={fits[k] ? styles.fitScale : ''}
            style={fits[k] ? { backgroundColor: '#22c55e', color: '#fff' } : {}}
          >
            {def.name}
          </option>
        ))}
      </select>
    </div>
  );
}
