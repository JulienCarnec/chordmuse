import { CHROMATIC } from '../../theory/notes';
import { SCALE_DEFINITIONS, getScaleNotes, scalesFittingFirstChord } from '../../theory/scales';
import { useT } from '../../i18n/index';
import styles from './ScaleSelector.module.css';

export function ScaleSelector({ scaleRoot, scaleKey, firstChord, onChange }) {
  const t = useT();
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
      <label className={styles.label}>{t.scaleLabel}</label>
      <select
        className={styles.select}
        value={scaleRoot ?? ''}
        title={t.scaleRootTitle}
        onChange={e => handleRootChange(e.target.value)}
      >
        <option value="">{t.scaleRootPlaceholder}</option>
        {CHROMATIC.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={scaleKey ?? ''}
        title={t.scaleModeTitle}
        onChange={e => handleKeyChange(e.target.value)}
      >
        <option value="">{t.scaleModePlaceholder}</option>
        {Object.entries(SCALE_DEFINITIONS).map(([k]) => (
          <option
            key={k}
            value={k}
            style={fits[k] ? { backgroundColor: '#22c55e', color: '#fff' } : {}}
          >
            {t.scaleNames?.[k] ?? k}
          </option>
        ))}
      </select>
    </div>
  );
}
