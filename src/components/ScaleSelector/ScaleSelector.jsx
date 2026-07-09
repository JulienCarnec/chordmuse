import { CHROMATIC } from '../../theory/notes';
import { SCALE_DEFINITIONS, getScaleNotes, scalesFittingFirstChord } from '../../theory/scales';
import styles from './ScaleSelector.module.css';

export function ScaleSelector({ scaleRoot, scaleKey, firstChord, onChange }) {
  // Fully controlled — no internal state. Empty string means "no scale selected".

  const fits = firstChord
    ? scalesFittingFirstChord(firstChord.root, getScaleNotes(firstChord.root, firstChord.typeKey === 'maj' ? 'ionian' : firstChord.typeKey))
    : {};

  function handleRootChange(newRoot) {
    // Keep existing key, or default to ionian when first picking a root
    onChange({ root: newRoot, key: scaleKey ?? 'ionian' });
  }

  function handleKeyChange(newKey) {
    onChange({ root: scaleRoot ?? 'C', key: newKey });
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>Scale</label>
      <select
        className={styles.select}
        value={scaleRoot ?? ''}
        onChange={e => handleRootChange(e.target.value)}
      >
        <option value="">— root —</option>
        {CHROMATIC.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={scaleKey ?? ''}
        onChange={e => handleKeyChange(e.target.value)}
      >
        <option value="">— mode —</option>
        {Object.entries(SCALE_DEFINITIONS).map(([k, def]) => (
          <option
            key={k}
            value={k}
            style={fits[k] ? { backgroundColor: '#22c55e', color: '#fff' } : {}}
          >
            {def.name}
          </option>
        ))}
      </select>
    </div>
  );
}
