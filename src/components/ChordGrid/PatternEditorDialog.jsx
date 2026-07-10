/**
 * PatternEditorDialog
 *
 * Modal for creating and editing custom pattern strings.
 * Features:
 *  - Load a built-in preset or saved custom pattern as a starting point
 *  - Edit the pattern string with live syntax validation
 *  - Name the pattern before saving
 *  - Loop checkbox (fill bar vs play once)
 *  - noteValue selector for step grid
 *  - Play button to test without closing
 *  - Save blocked when syntax is invalid
 *  - Close blocked when syntax is invalid (warns on unsaved valid changes)
 */

import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { validatePattern } from '../../theory/pattern';
import { NOTE_VALUES } from './PatternControls';
import { getChordNotesVoiced } from '../../theory/chords';
import { useT } from '../../i18n/index';
import styles from './PatternEditorDialog.module.css';

// A dummy single-cell progression for preview playback
function makePreviewCells(chord, playStyle, noteValue, patternLoop) {
  return [{
    id: 'preview',
    chord,
    split: false,
    subCells: [null, null],
    playStyle,
    noteValue,
    patternLoop,
  }];
}

export function PatternEditorDialog({ chord, initialPattern, initialNoteValue, initialLoop, onApply, onClose }) {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { play, stop } = usePlayback();

  const { bpm, timeSig, instrument, customPatterns } = state;

  // ── Editor state ──────────────────────────────────────────────────────────
  const [patternStr, setPatternStr] = useState(initialPattern ?? '{[A1;B1;C1]}');
  const [patternName, setPatternName] = useState('');
  const [noteValue, setNoteValue] = useState(initialNoteValue ?? '8n');
  const [loop, setLoop] = useState(initialLoop ?? true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Validation
  const validation = validatePattern(patternStr);

  // Track whether there are unsaved changes from the last save/load
  const savedRef = useRef(true);
  useEffect(() => { savedRef.current = false; }, [patternStr, patternName, noteValue, loop]);

  // ── Load a saved pattern ──────────────────────────────────────────────────
  function handleLoad(e) {
    const val = e.target.value;
    if (!val) return;
    const p = customPatterns.find(cp => cp.id === val);
    if (!p) return;
    setPatternStr(p.pattern);
    setPatternName(p.name + ' (copy)');
    setNoteValue(p.noteValue ?? '8n');
    setLoop(p.loop ?? true);
    savedRef.current = false;
  }

  // ── Play preview ─────────────────────────────────────────────────────────
  async function handlePlay() {
    if (!validation.valid) return;
    if (isPlaying) { stop(); setIsPlaying(false); return; }

    // Use the provided chord, or a default C major if none
    const previewChord = chord ?? { root: 'C', typeKey: 'major', octave: 4, inversion: 0 };
    const cells = makePreviewCells(previewChord, patternStr, noteValue, loop);

    setIsPlaying(true);
    await play({
      cells,
      progressionId: 'preview',
      bpm, timeSig, instrument,
    });
    // Auto-reset play state after the bar duration
    // (rough estimate: one bar at current bpm)
    const [beats] = timeSig.split('/').map(Number);
    const barMs = (60 / bpm) * beats * 1000;
    setTimeout(() => setIsPlaying(false), barMs * 2 + 500);
  }

  // Stop preview when dialog unmounts
  useEffect(() => () => stop(), [stop]);

  // ── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!validation.valid || !patternName.trim()) return;
    // Check if a pattern with this name already exists — update it
    const existing = customPatterns.find(p => p.name === patternName.trim());
    const saved = {
      id: existing ? existing.id : `custom-${Date.now()}`,
      name: patternName.trim(),
      pattern: patternStr,
      noteValue,
      loop,
    };
    dispatch({ type: 'SAVE_PATTERN', pattern: saved });
    savedRef.current = true;
    // Apply immediately to the caller
    onApply?.(patternStr, noteValue, loop);
  }

  // ── Close guard ──────────────────────────────────────────────────────────
  function handleClose() {
    if (!validation.valid) return; // blocked — syntax error
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>

        {/* Close button — top-right corner of the dialog pane */}
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          title={!validation.valid ? t.closeBtnTitleInvalid : t.close}
          disabled={!validation.valid}
        >✕</button>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>{t.patternEditorTitle}</span>
        </div>

        {/* Load row */}
        <div className={styles.row}>
          <label className={styles.label}>{t.loadPatternLabel}</label>
          <select className={styles.select} defaultValue="" onChange={handleLoad}>
            <option value="">{t.loadPatternPlaceholder}</option>
            {customPatterns.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Pattern textarea */}
        <div className={styles.editorBlock}>
          <label className={styles.label}>{t.patternStringLabel}</label>
          <textarea
            className={`${styles.textarea} ${validation.valid ? styles.valid : styles.invalid}`}
            value={patternStr}
            onChange={e => setPatternStr(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          <div className={`${styles.validationMsg} ${validation.valid ? styles.ok : styles.err}`}>
            {validation.valid ? t.syntaxOk : t.syntaxError(validation.error)}
          </div>
        </div>

        {/* Step grid + loop */}
        <div className={styles.row}>
          <label className={styles.label}>{t.stepGridLabel}</label>
          <select className={styles.select} value={noteValue} onChange={e => setNoteValue(e.target.value)}>
            {NOTE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />
            {t.loopToFillBar}
          </label>
        </div>

        {/* Name + save */}
        <div className={styles.row}>
          <label className={styles.label}>{t.saveAsLabel}</label>
          <input
            className={styles.nameInput}
            placeholder={t.patternNamePlaceholder}
            value={patternName}
            onChange={e => setPatternName(e.target.value)}
          />
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!validation.valid || !patternName.trim()}
            title={!validation.valid ? t.saveBtnTitleInvalid : !patternName.trim() ? t.saveBtnTitleNoName : t.saveBtnTitleOk}
          >{t.saveBtn}</button>
        </div>

        {/* Play preview */}
        <div className={styles.playRow}>
          <button
            className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
            onClick={handlePlay}
            disabled={!validation.valid}
            title={!validation.valid ? t.playBtnTitleInvalid : ''}
          >
            {isPlaying ? t.stopPreview : t.playPreview}
          </button>
          {!chord && (
            <span className={styles.hint}>{t.previewingWithC}</span>
          )}
        </div>

        {/* Syntax help */}
        <details className={styles.help}>
          <summary className={styles.helpSummary}>{t.syntaxRef}</summary>
          <div className={styles.helpBody}>
            <p>{t.syntaxIntro}</p>
            <table className={styles.helpTable}>
              <thead><tr><th>{t.helpColToken}</th><th>{t.helpColMeaning}</th><th>{t.helpColExample}</th></tr></thead>
              <tbody>
                <tr><td><code>a1</code></td><td>{t.helpA1Meaning}</td><td><code>{'a1,b1,c1'}</code></td></tr>
                <tr><td><code>a0</code></td><td>{t.helpA0Meaning}</td><td><code>{'a0'}</code></td></tr>
                <tr><td><code>a2</code></td><td>{t.helpA2Meaning}</td><td><code>{'a2'}</code></td></tr>
                <tr><td><code>b c d…</code></td><td>{t.helpBCDMeaning}</td><td><code>{'a1,b1,c1,d1'}</code> {t.helpBCDExample}</td></tr>
                <tr><td><code>[a1,b1,c1]</code></td><td>{t.helpGroupMeaning}</td><td><code>{'[a1,b1,c1]'}</code></td></tr>
                <tr><td><code>.</code></td><td>{t.helpDotMeaning}</td><td><code>{'a1.'}</code> / <code>{'[a1,b1].'}</code></td></tr>
                <tr><td><em>(empty)</em></td><td>{t.helpRestMeaning}</td><td><code>{'a1,,b1'}</code> {t.helpRestExample}</td></tr>
              </tbody>
            </table>
            <p className={styles.helpNote}>{t.helpLoopNote}</p>
            <p className={styles.helpNote}>{t.helpStepNote}</p>
            <p className={styles.helpExample}><strong>{t.helpReggaeLabel}</strong> <code>{'{a0,[a1,b1,c1].,,[a1,b1,c1].}'}</code></p>
            <p className={styles.helpExample}><strong>{t.helpArpLabel}</strong> <code>{'{a1,b1,c1}'}</code></p>
            <p className={styles.helpExample}><strong>{t.helpBachLabel}</strong> <code>{'{a0,c1,a1,b1,c1}'}</code></p>
          </div>
        </details>

      </div>
    </div>
  );
}
