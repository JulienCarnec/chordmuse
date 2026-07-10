/**
 * Shared pattern controls: pattern picker + note value + loop.
 * Used both in ChordGrid toolbar (global) and in each ChordCell (per-cell override).
 *
 * Props:
 *   playStyle   – current pattern string or null (= use global)
 *   noteValue   – current note value (string) or null
 *   patternLoop – bool, whether the pattern loops to fill the bar
 *   onChange    – ({ playStyle, noteValue, patternLoop }) => void
 *   compact     – bool, if true use mini layout for cells
 *   allowNull   – bool, if true show a "— global —" option (for per-cell use)
 *   chord       – current chord { root, typeKey, octave, inversion } for pattern preview
 */

import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { PatternEditorDialog } from './PatternEditorDialog';
import { useT } from '../../i18n/index';
import styles from './PatternControls.module.css';

// Standard, dotted, and triplet note values — all natively understood by Tone.Time()
export const NOTE_VALUES = [
  '1n',
  '2n', '2n.', '2t',
  '4n', '4n.', '4t',
  '8n', '8n.', '8t',
  '16n', '16n.', '16t',
];

export function PatternControls({
  playStyle,
  noteValue,
  patternLoop = true,
  onChange,
  compact = false,
  allowNull = false,
  chord = null,
}) {
  const t = useT();
  const { state } = useAppState();
  const { updateLiveParams } = usePlayback();
  const [showEditor, setShowEditor] = useState(false);

  const { customPatterns = [] } = state;

  // Find whether the current playStyle matches a named pattern (for display)
  const activePattern = customPatterns.find(p => p.pattern === playStyle);

  // Value shown in the select: use the pattern id if it matches a saved entry,
  // '__custom__' for an unsaved/edited inline string, '' for null (global).
  const selectValue = playStyle === null || playStyle === undefined
    ? ''
    : activePattern
      ? activePattern.id
      : '__custom__';

  function applyPattern(p) {
    onChange({ playStyle: p.pattern, noteValue: p.noteValue, patternLoop: p.loop });
    if (!compact) updateLiveParams({ playStyle: p.pattern, noteValue: p.noteValue, patternLoop: p.loop });
  }

  function handleSelectChange(val) {
    if (val === '') {
      onChange({ playStyle: null, noteValue, patternLoop });
      return;
    }
    if (val === '__custom__') {
      setShowEditor(true);
      return;
    }
    const p = customPatterns.find(cp => cp.id === val);
    if (p) applyPattern(p);
  }

  function handleNoteValueChange(val) {
    onChange({ playStyle, noteValue: val, patternLoop });
    if (!compact) updateLiveParams({ noteValue: val });
  }

  function handleLoopChange(val) {
    onChange({ playStyle, noteValue, patternLoop: val });
    if (!compact) updateLiveParams({ patternLoop: val });
  }

  function handlePatternApplied(patternStr, nv, loop) {
    onChange({ playStyle: patternStr, noteValue: nv, patternLoop: loop });
    if (!compact) updateLiveParams({ playStyle: patternStr, noteValue: nv, patternLoop: loop });
  }

  if (compact) {
    return (
      <>
        <div className={styles.compact}>
          <select
            className={styles.miniSelect}
            value={selectValue}
            title={t.patternSelectTitle}
            onChange={e => handleSelectChange(e.target.value)}
            onClick={e => e.stopPropagation()}
          >
            {allowNull && <option value="">{t.globalOption}</option>}
            {customPatterns.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {selectValue === '__custom__' && (
              <option value="__custom__">{t.unsavedPattern}</option>
            )}
            <option value="__custom__">{t.newPattern}</option>
          </select>
          <select
            className={styles.miniSelect}
            value={noteValue ?? '4n'}
            title={t.noteValueTitle}
            onChange={e => handleNoteValueChange(e.target.value)}
            onClick={e => e.stopPropagation()}
          >
            {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label className={styles.miniLoopLabel} title={t.loopTitle} onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={patternLoop}
              onChange={e => handleLoopChange(e.target.checked)}
            />
            {t.loop}
          </label>
        </div>

        {showEditor && (
          <PatternEditorDialog
            chord={chord}
            initialPattern={selectValue === '__custom__' ? playStyle : undefined}
            initialNoteValue={noteValue}
            initialLoop={patternLoop}
            onApply={handlePatternApplied}
            onClose={() => setShowEditor(false)}
          />
        )}
      </>
    );
  }

  // ── Full layout ───────────────────────────────────────────────────────────
  return (
    <>
      <div className={styles.full}>
        <select
          className={styles.select}
          value={selectValue}
          title={t.patternSelectTitle}
          onChange={e => handleSelectChange(e.target.value)}
        >
          {customPatterns.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          {selectValue === '__custom__' && (
            <option value="__custom__">{t.unsavedPattern}</option>
          )}
          <option value="__custom__">{t.newPattern}</option>
        </select>

        {playStyle && (
          <>
            <button
              className={styles.editPatternBtn}
              onClick={() => setShowEditor(true)}
              title={t.editPattern}
            >{t.editPattern}</button>
            <label className={styles.metLabel} title={t.loopTitle}>
              <input
                type="checkbox"
                checked={patternLoop}
                onChange={e => handleLoopChange(e.target.checked)}
              />
              {t.loop}
            </label>
          </>
        )}

        <select
          className={styles.select}
          value={noteValue ?? '4n'}
          title={t.noteValueTitle}
          onChange={e => handleNoteValueChange(e.target.value)}
        >
          {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {showEditor && (
        <PatternEditorDialog
          chord={chord}
          initialPattern={selectValue === '__custom__' ? playStyle : playStyle}
          initialNoteValue={noteValue}
          initialLoop={patternLoop}
          onApply={handlePatternApplied}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
