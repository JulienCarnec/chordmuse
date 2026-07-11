/**
 * PatternEditorDialog
 *
 * Visual grid editor for multi-sub-pattern chord patterns.
 * Shows a table with note rows (top=high, bottom=low) and step columns.
 * Each cell cycles: off → sustain (blue) → staccato (purple) → off.
 *
 * The editor always edits all three sub-patterns (3, 4, 5 notes) simultaneously,
 * switching between them via a tab row. Columns (steps) are shared across sub-patterns.
 *
 * Props:
 *   chord           – { root, typeKey, octave, inversion } for preview playback
 *   initialPattern  – existing pattern object to edit (or null for new)
 *   readOnly        – bool; when true: all cells/controls are non-interactive,
 *                     a "Duplicate as custom" flow is shown instead of Save
 *   onApply         – (patternId) => void — called after save / duplicate
 *   onClose         – () => void
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import { noteRows, makeEmptyGrid, gridToPatternString } from '../../theory/pattern';
import { useT, useLocale } from '../../i18n/index';
import styles from './PatternEditorDialog.module.css';

// Note value options (durations per step)
export const NOTE_VALUE_OPTIONS = [
  { value: '1n',  en: 'Whole',        fr: 'Ronde',        symbol: '𝅝' },
  { value: '2n',  en: 'Half',         fr: 'Blanche',      symbol: '𝅗𝅥' },
  { value: '4n',  en: 'Quarter',      fr: 'Noire',        symbol: '♩' },
  { value: '8n',  en: '8th',          fr: 'Croche',       symbol: '♪' },
  { value: '16n', en: '16th',         fr: 'Double croche',symbol: '♬' },
];

function noteValueSymbol(nv) {
  return NOTE_VALUE_OPTIONS.find(o => o.value === nv)?.symbol ?? nv;
}

const NOTE_COUNTS = [3, 4, 5];

function cellStyle(state) {
  if (state === 'sustain')  return styles.cellSustain;
  if (state === 'staccato') return styles.cellStaccato;
  return styles.cellOff;
}

function cycleState(current) {
  if (current === 'off')      return 'sustain';
  if (current === 'sustain')  return 'staccato';
  return 'off';
}

function makeInitialSubPatterns(pattern, cols) {
  if (pattern?.subPatterns) {
    // Clone to avoid mutating state
    const sp = {};
    for (const nc of NOTE_COUNTS) {
      const src = pattern.subPatterns[nc];
      sp[nc] = src
        ? src.map(col => [...col])
        : makeEmptyGrid(cols, nc);
    }
    return sp;
  }
  // New pattern
  const sp = {};
  for (const nc of NOTE_COUNTS) {
    sp[nc] = makeEmptyGrid(cols, nc);
  }
  return sp;
}

function makeColumns(pattern) {
  if (pattern?.columns?.length) return [...pattern.columns];
  return ['4n'];
}

// ─── Column header with inline duration picker ────────────────────────────────

function ColHeader({ nv, canDelete, onChangeNv, onDelete }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <th className={styles.colHeader} ref={ref}>
      <div className={styles.colHeaderInner}>
        {/* Duration button — click to open picker */}
        <button
          className={styles.colDurBtn}
          onClick={() => setOpen(o => !o)}
          title={(() => { const o = NOTE_VALUE_OPTIONS.find(o => o.value === nv); return o ? `${o.symbol} ${o[locale] ?? o.en}` : nv; })()}
        >
          {noteValueSymbol(nv)}
        </button>

        {/* Delete column — only show when deletable */}
        {canDelete && (
          <button
            className={styles.colDelBtn}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Remove this step"
          >×</button>
        )}

        {/* Inline dropdown */}
        {open && (
          <div className={styles.colPickerDropdown}>
            {NOTE_VALUE_OPTIONS.map(({ value, en, fr, symbol }) => (
              <button
                key={value}
                className={`${styles.colPickerItem} ${value === nv ? styles.colPickerItemActive : ''}`}
                onClick={() => { onChangeNv(value); setOpen(false); }}
              >
                <span className={styles.colPickerSymbol}>{symbol}</span>
                <span className={styles.colPickerLabel}>{locale === 'fr' ? fr : en}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </th>
  );
}

// ─── Sub-pattern grid ─────────────────────────────────────────────────────────

function SubPatternGrid({ noteCount, grid, columns, readOnly, onCellToggle, onChangeColNv, onDeleteCol, onAddCol }) {
  const rows = noteRows(noteCount);
  return (
    <div className={styles.gridWrapper}>
      <table className={styles.grid}>
        <thead>
          <tr>
            {/* Empty corner above row labels */}
            <th className={styles.rowHeader} />

            {/* One ColHeader per step */}
            {columns.map((nv, ci) => (
              <ColHeader
                key={ci}
                ci={ci}
                nv={nv}
                canDelete={!readOnly && columns.length > 1}
                readOnly={readOnly}
                onChangeNv={v => !readOnly && onChangeColNv(ci, v)}
                onDelete={() => !readOnly && onDeleteCol(ci)}
              />
            ))}

            {/* "+" add-column button — only in edit mode */}
            {!readOnly && (
              <th className={styles.colHeaderAdd}>
                <button
                  className={styles.addColBtn}
                  onClick={() => onAddCol(columns[columns.length - 1] ?? '4n')}
                  title="Add a step (same duration as last)"
                >+</button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const DEGREE_NAMES = { a: 'Root', b: '3rd', c: '5th', d: '7th', e: '9th' };
            const degName = DEGREE_NAMES[row.letter] ?? row.letter;
            const octLabel = row.octave === 2 ? ' ↑' : row.octave === 0 ? ' ↓' : '';
            const label = `${degName}${octLabel}`;
            const isOctaveBoundary = ri > 0 && ri % noteCount === 0;
            return (
              <tr key={ri} className={isOctaveBoundary ? styles.octaveBoundary : ''}>
                <td className={styles.rowLabel}>{label}</td>
                {columns.map((_, ci) => {
                  const state = grid[ci]?.[ri] ?? 'off';
                  return (
                    <td
                      key={ci}
                      className={`${styles.cell} ${cellStyle(state)} ${readOnly ? styles.cellReadOnly : ''}`}
                      onClick={() => !readOnly && onCellToggle(ci, ri)}
                      title={readOnly ? '' : (state === 'off' ? 'Click: sustain' : state === 'sustain' ? 'Click: staccato' : 'Click: off')}
                    />
                  );
                })}
                {/* Empty cell under the "+" header — only needed in edit mode */}
                {!readOnly && <td className={styles.cellAddPad} />}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function PatternEditorDialog({ chord, initialPattern, readOnly = false, onApply, onClose }) {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { play, stop } = usePlayback();

  const { bpm, timeSig, instrument } = state;

  // ── Editor state ──────────────────────────────────────────────────────────
  const [patternName, setPatternName] = useState(initialPattern?.name ?? '');
  const [loop, setLoop] = useState(initialPattern?.loop ?? true);
  const [columns, setColumns] = useState(() => makeColumns(initialPattern));
  const [subPatterns, setSubPatterns] = useState(() => makeInitialSubPatterns(initialPattern, makeColumns(initialPattern).length));
  const [activeNoteCount, setActiveNoteCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Duplicate state (read-only mode only) ─────────────────────────────────
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateName, setDuplicateName] = useState(
    initialPattern?.name ? `${initialPattern.name} (copy)` : ''
  );

  // Sync sub-patterns when columns change (add/remove)
  function resizeSubPatterns(newCols) {
    setSubPatterns(prev => {
      const result = {};
      for (const nc of NOTE_COUNTS) {
        const oldGrid = prev[nc] ?? [];
        const numRows = nc * 3;
        result[nc] = Array.from({ length: newCols.length }, (_, ci) => {
          if (ci < oldGrid.length) return [...oldGrid[ci]];
          return Array(numRows).fill('off');
        });
      }
      return result;
    });
  }

  function handleAddColumn(noteValue) {
    const newCols = [...columns, noteValue];
    setColumns(newCols);
    resizeSubPatterns(newCols);
  }

  function handleRemoveColumn(ci) {
    if (columns.length <= 1) return;
    const newCols = columns.filter((_, i) => i !== ci);
    setColumns(newCols);
    setSubPatterns(prev => {
      const result = {};
      for (const nc of NOTE_COUNTS) {
        result[nc] = (prev[nc] ?? []).filter((_, i) => i !== ci);
      }
      return result;
    });
  }

  function handleCellToggle(colIdx, rowIdx) {
    setSubPatterns(prev => {
      const grid = prev[activeNoteCount].map(col => [...col]);
      grid[colIdx][rowIdx] = cycleState(grid[colIdx][rowIdx]);
      return { ...prev, [activeNoteCount]: grid };
    });
  }

  function handleLoopChange(e) {
    setLoop(e.target.checked);
  }

  // ── Play preview ─────────────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (isPlaying) { stop(); setIsPlaying(false); return; }

    const previewChord = chord ?? { root: 'C', typeKey: 'maj', octave: 4, inversion: 0 };
    // Build the pattern string directly without polluting state.
    // Preview with the 3-note sub-pattern (most common chord type)
    const noteCount = 3;
    const grid = subPatterns[noteCount] ?? [];
    const patternStr = gridToPatternString(grid, columns, noteCount);
    const noteValue = columns[0] ?? '4n';

    const cells = [{
      id: 'preview',
      chord: previewChord,
      split: false,
      subCells: [null, null],
      playStyle: patternStr,
      noteValue,
      patternLoop: loop,
    }];

    setIsPlaying(true);
    await play({
      cells,
      progressionId: 'preview',
      bpm, timeSig, instrument,
      playStyle: patternStr,
      noteValue,
    });

    const [beats] = timeSig.split('/').map(Number);
    const barMs = (60 / bpm) * beats * 1000;
    setTimeout(() => { setIsPlaying(false); }, barMs * 2 + 500);
  }, [isPlaying, chord, loop, columns, subPatterns, bpm, timeSig, instrument, play, stop]);

  useEffect(() => () => stop(), [stop]);

  /** Deep-clone subPatterns so the saved object shares no array references with state. */
  function cloneSubPatterns(sp) {
    const out = {};
    for (const nc of NOTE_COUNTS) {
      out[nc] = (sp[nc] ?? []).map(col => [...col]);
    }
    return out;
  }

  /**
   * For any note-count sub-pattern that is entirely empty (all 'off'), copy
   * the content from the actively-edited sub-pattern by mapping shared rows
   * (same letter + octave). This ensures a pattern edited only on the "3 notes"
   * tab still plays correctly on 4- and 5-note chords.
   */
  function fillEmptySubPatterns(sp) {
    const srcNc = activeNoteCount;
    const srcGrid = sp[srcNc];
    if (!srcGrid) return sp;

    const srcRows = noteRows(srcNc);
    const out = { ...sp };

    for (const nc of NOTE_COUNTS) {
      if (nc === srcNc) continue;
      const grid = sp[nc];
      // Check if this sub-pattern is entirely empty (all 'off')
      const isEmpty = !grid || grid.every(col => col.every(cell => cell === 'off'));
      if (!isEmpty) continue;

      // Build a lookup: "letter-octave" → rowIndex for the target noteCount
      const tgtRows = noteRows(nc);
      const tgtIdx = {};
      tgtRows.forEach((row, i) => { tgtIdx[`${row.letter}-${row.octave}`] = i; });

      // Copy from source grid, remapping row indices
      const numCols = srcGrid.length;
      const newGrid = Array.from({ length: numCols }, () => Array(nc * 3).fill('off'));
      for (let ci = 0; ci < numCols; ci++) {
        for (let ri = 0; ri < srcRows.length; ri++) {
          const cell = srcGrid[ci]?.[ri];
          if (!cell || cell === 'off') continue;
          const { letter, octave } = srcRows[ri];
          const tgtRi = tgtIdx[`${letter}-${octave}`];
          if (tgtRi !== undefined) newGrid[ci][tgtRi] = cell;
        }
      }
      out[nc] = newGrid;
    }
    return out;
  }

  // ── Save (edit mode) ──────────────────────────────────────────────────────
  function handleSave() {
    if (!patternName.trim()) return;
    const existing = state.customPatterns.find(p => p.name === patternName.trim() || p.id === initialPattern?.id);
    const saved = {
      id: existing ? existing.id : `custom-${Date.now()}`,
      name: patternName.trim(),
      loop,
      columns: [...columns],
      subPatterns: cloneSubPatterns(fillEmptySubPatterns(subPatterns)),
    };
    dispatch({ type: 'SAVE_PATTERN', pattern: saved });
    onApply?.(saved.id);
    onClose();
  }

  // ── Duplicate (read-only mode) ────────────────────────────────────────────
  function handleDuplicate() {
    if (!duplicateName.trim()) return;
    const copy = {
      id: `custom-${Date.now()}`,
      name: duplicateName.trim(),
      loop,
      columns: [...columns],
      subPatterns: cloneSubPatterns(fillEmptySubPatterns(subPatterns)),
    };
    dispatch({ type: 'SAVE_PATTERN', pattern: copy });
    onApply?.(copy.id);
    onClose();
  }

  const currentGrid = subPatterns[activeNoteCount] ?? makeEmptyGrid(columns.length, activeNoteCount);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.dialog}>

        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose} title={t.close}>✕</button>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>
            {readOnly ? (initialPattern?.name ?? t.patternEditorTitle) : t.patternEditorTitle}
          </span>
          {readOnly && (
            <span className={styles.builtinBadge}>{t.builtinBadge}</span>
          )}
        </div>

        {/* Name + loop — hidden in read-only mode (pattern is immutable) */}
        {!readOnly && (
          <div className={styles.row}>
            <label className={styles.label}>{t.saveAsLabel}</label>
            <input
              className={styles.nameInput}
              placeholder={t.patternNamePlaceholder}
              value={patternName}
              onChange={e => setPatternName(e.target.value)}
            />
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={loop} onChange={handleLoopChange} />
              {t.loopToFillBar}
            </label>
          </div>
        )}

        {/* Loop indicator shown in read-only mode */}
        {readOnly && (
          <div className={styles.row}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={loop} disabled readOnly />
              {t.loopToFillBar}
            </label>
          </div>
        )}

        {/* Sub-pattern tabs */}
        <div className={styles.tabs}>
          {NOTE_COUNTS.map(nc => (
            <button
              key={nc}
              className={`${styles.tab} ${activeNoteCount === nc ? styles.tabActive : ''}`}
              onClick={() => setActiveNoteCount(nc)}
            >
              {t.subPatternTab ? t.subPatternTab(nc) : `${nc} notes`}
            </button>
          ))}
          <span className={styles.tabHint}>{t.subPatternHint ?? 'Select sub-pattern to edit'}</span>
        </div>

        {/* Grid */}
        <SubPatternGrid
          noteCount={activeNoteCount}
          grid={currentGrid}
          columns={columns}
          readOnly={readOnly}
          onCellToggle={handleCellToggle}
          onChangeColNv={(ci, v) => {
            if (readOnly) return;
            const newCols = columns.map((c, i) => i === ci ? v : c);
            setColumns(newCols);
          }}
          onDeleteCol={handleRemoveColumn}
          onAddCol={handleAddColumn}
        />

        {/* Legend */}
        <div className={styles.legend}>
          <span className={`${styles.legendDot} ${styles.cellSustain}`} /> {t.legendSustain ?? 'Sustain (click once)'}
          <span className={`${styles.legendDot} ${styles.cellStaccato}`} /> {t.legendStaccato ?? 'Staccato (click twice)'}
          <span className={`${styles.legendDot} ${styles.cellOff}`} style={{ border: '1px solid #d1d5db' }} /> {t.legendOff ?? 'Off (click thrice)'}
        </div>

        {/* Duplicate name prompt (read-only mode) */}
        {readOnly && showDuplicate && (
          <div className={styles.duplicateRow}>
            <span className={styles.duplicateLabel}>{t.duplicateNamePrompt}</span>
            <input
              className={styles.duplicateInput}
              value={duplicateName}
              onChange={e => setDuplicateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDuplicate(); if (e.key === 'Escape') setShowDuplicate(false); }}
              autoFocus
            />
            <button
              className={styles.duplicateSaveBtn}
              onClick={handleDuplicate}
              disabled={!duplicateName.trim()}
            >{t.saveBtn}</button>
            <button
              className={styles.duplicateCancelBtn}
              onClick={() => setShowDuplicate(false)}
            >{t.close}</button>
          </div>
        )}

        {/* Play + Save / Duplicate row */}
        <div className={styles.actionRow}>
          <button
            className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
            onClick={handlePlay}
          >
            {isPlaying ? t.stopPreview : t.playPreview}
          </button>
          {!chord && (
            <span className={styles.hint}>{t.previewingWithC}</span>
          )}
          {readOnly ? (
            !showDuplicate && (
              <button
                className={styles.duplicateBtn}
                onClick={() => setShowDuplicate(true)}
              >{t.duplicatePattern}</button>
            )
          ) : (
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!patternName.trim()}
              title={!patternName.trim() ? t.saveBtnTitleNoName : t.saveBtnTitleOk}
            >{t.saveBtn}</button>
          )}
        </div>

      </div>
    </div>
  );
}
