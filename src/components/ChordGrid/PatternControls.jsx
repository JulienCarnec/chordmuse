/**
 * Shared pattern controls: pattern picker + loop toggle.
 * Used both in ChordGrid toolbar (global) and in each ChordCell (per-cell override).
 *
 * Props:
 *   playStyle   – current pattern id or null (= use global)
 *   patternLoop – bool (legacy, still stored per-cell but overridden by pattern.loop)
 *   onChange    – ({ playStyle, noteValue, patternLoop }) => void
 *   compact     – bool, if true use mini layout for cells
 *   allowNull   – bool, if true show a "— global —" option (for per-cell use)
 *   chord       – current chord { root, typeKey, octave, inversion } for pattern preview
 *
 * Built-in patterns (id starts with "builtin-") are shown in read-only view mode.
 * Custom patterns (id starts with "custom-") can be edited normally.
 */

import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { PatternEditorDialog } from './PatternEditorDialog';
import { useT } from '../../i18n/index';
import styles from './PatternControls.module.css';

// Standard note values exported for legacy use
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
  const { state, dispatch } = useAppState();
  const { updateLiveParams } = usePlayback();
  const [showEditor, setShowEditor] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  const [editorReadOnly, setEditorReadOnly] = useState(false);

  const { customPatterns = [] } = state;

  // Value shown in the select: the pattern id, or '' for null (global)
  const selectValue = (playStyle === null || playStyle === undefined) ? '' : playStyle;

  // Is the currently selected pattern a built-in (read-only)?
  const isBuiltin = typeof playStyle === 'string' && playStyle.startsWith('builtin-');
  const isCustom  = typeof playStyle === 'string' && playStyle.startsWith('custom-');

  function applyPattern(patternId) {
    const p = customPatterns.find(cp => cp.id === patternId);
    const nv = p?.columns?.[0] ?? noteValue ?? '4n';
    const lp = p?.loop ?? patternLoop;
    onChange({ playStyle: patternId, noteValue: nv, patternLoop: lp });
    if (!compact) updateLiveParams({ playStyle: patternId, noteValue: nv, patternLoop: lp });
  }

  function handleSelectChange(val) {
    if (val === '') {
      onChange({ playStyle: null, noteValue, patternLoop });
      return;
    }
    if (val === '__new__') {
      setEditingPattern(null);
      setEditorReadOnly(false);
      setShowEditor(true);
      return;
    }
    applyPattern(val);
  }

  function handleOpenEditor(asReadOnly) {
    const p = customPatterns.find(cp => cp.id === playStyle);
    setEditingPattern(p ?? null);
    setEditorReadOnly(asReadOnly);
    setShowEditor(true);
  }

  function handlePatternApplied(patternId) {
    applyPattern(patternId);
    setShowEditor(false);
  }

  function handleDelete() {
    if (!isCustom) return;
    dispatch({ type: 'DELETE_PATTERN', id: playStyle });
    // If this was the selected pattern, clear it back to null (use global)
    onChange({ playStyle: null, noteValue, patternLoop });
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
            <option value="__new__">{t.newPattern}</option>
          </select>
        </div>

        {showEditor && (
          <PatternEditorDialog
            chord={chord}
            initialPattern={editingPattern}
            readOnly={editorReadOnly}
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
          <option value="__new__">{t.newPattern}</option>
        </select>

        {playStyle && isBuiltin && (
          <button
            className={styles.viewPatternBtn}
            onClick={() => handleOpenEditor(true)}
            title={t.viewPattern}
          >{t.viewPattern}</button>
        )}

        {playStyle && !isBuiltin && (
          <button
            className={styles.editPatternBtn}
            onClick={() => handleOpenEditor(false)}
            title={t.editPattern}
          >{t.editPattern}</button>
        )}

        {isCustom && (
          <button
            className={styles.deletePatternBtn}
            onClick={handleDelete}
            title={t.deletePattern}
          >{t.deletePattern}</button>
        )}
      </div>

      {showEditor && (
        <PatternEditorDialog
          chord={chord}
          initialPattern={editingPattern}
          readOnly={editorReadOnly}
          onApply={handlePatternApplied}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
