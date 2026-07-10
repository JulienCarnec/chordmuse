/**
 * DrumSequencer — 16-step, 4-row drum grid panel.
 *
 * Features:
 * - 4 rows: HH, Snare, BD, Custom
 * - 16 buttons per row; click to toggle on/off
 * - Right-click cycles velocity: ghost (0.3) → soft (0.6) → normal (1.0)
 * - Each row has a MIDI note selector (affects custom row sound + label)
 * - Preset loader with dirty-pattern confirmation
 * - Save-as / delete user patterns
 * - Assign pattern to a track section (shown when trackIndex is provided)
 * - Collapsible panel via external open/close prop
 * - Real-time step highlight via useDrumSequencer.onStep
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppState } from '../../state/AppContext';
import { useDrumSequencer } from '../../audio/useDrumSequencer';
import { Knob } from '../Playback/Knob';
import { useT } from '../../i18n/index';
import styles from './DrumSequencer.module.css';

// ─── SamplePicker — custom dropdown with hover-preview ───────────────────────
// Replaces <select> so we can fire a sound preview on mouseenter of each option.
function SamplePicker({ value, samples, onChange, onPreview, title }) {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentLabel = samples.find(s => s.value === value)?.label ?? value;

  return (
    <div className={styles.samplePicker} ref={ref} title={title}>
      {/* Trigger button — shows current selection */}
      <button
        type="button"
        className={styles.samplePickerBtn}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.samplePickerLabel}>{currentLabel}</span>
        <span className={styles.samplePickerArrow}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown list */}
      {open && (
        <ul className={styles.samplePickerList}>
          {samples.map(s => (
            <li
              key={s.value}
              className={`${styles.samplePickerItem} ${s.value === value ? styles.samplePickerItemActive : ''}`}
              onMouseEnter={() => onPreview(s.value)}
              onMouseDown={e => {
                e.preventDefault(); // keep focus on the button
                onChange(s.value);
                setOpen(false);
              }}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STEPS = 16;

// Step states cycled on click:
//   off → red (1.0) → orange (0.7) → yellow (0.45) → off
const VEL_HIGH = 1.0;
const VEL_MED  = 0.7;
const VEL_LOW  = 0.45;

// Default sample key per row role
const DEFAULT_SAMPLE = {
  hh:     'hh-closed',
  snare:  'snare-kit8',
  bd:     'kick',
  custom: 'clap',
};

// Blank pattern rows (all steps off)
function blankRows() {
  return [
    { rowId: 'hh',     label: 'HH',    sample: 'hh-closed',  volume: 80, reverb: 20, steps: Array.from({length: STEPS}, () => ({ on: false, vel: 1.0 })) },
    { rowId: 'snare',  label: 'Snare', sample: 'snare-kit8',  volume: 80, reverb: 20, steps: Array.from({length: STEPS}, () => ({ on: false, vel: 1.0 })) },
    { rowId: 'bd',     label: 'BD',    sample: 'kick',        volume: 90, reverb: 10, steps: Array.from({length: STEPS}, () => ({ on: false, vel: 1.0 })) },
    { rowId: 'custom', label: 'Perc',  sample: 'clap',        volume: 75, reverb: 15, steps: Array.from({length: STEPS}, () => ({ on: false, vel: 1.0 })) },
  ];
}

function deepCopyRows(rows) {
  return rows.map(row => ({
    ...row,
    steps: row.steps.map(s => ({ ...s })),
  }));
}

function isPatternDirty(rows) {
  return rows.some(row => row.steps.some(s => s.on));
}

// Returns the CSS modifier name for a live step (3 levels)
function stepStyleClass(step) {
  if (!step.on) return null;
  if (step.vel >= 0.9) return 'velHigh';  // red   — 1.0
  if (step.vel >= 0.6) return 'velMed';   // orange — 0.7
  return 'velLow';                         // yellow — 0.45
}

export function DrumSequencer({ open, onToggle, trackIndex }) {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { onStep, updateDrumRows, startDrumSeq, stopDrumSeq, previewSample } = useDrumSequencer();
  const { drumPatterns, drumPatternOrder, activeDrumPatternId, isPlaying, isPaused, track, metronome, timeSig, autoPlay, progressions, playbackCursor } = state;
  const drumEnabled = metronome.drumEnabled ?? false;

  // ── Local editing state ──────────────────────────────────────────────────────
  // localRows is the "working copy" — unsaved edits live here.
  const [localRows, setLocalRows] = useState(() => blankRows());
  const [saveName, setSaveName] = useState('');
  const [activeStep, setActiveStep] = useState(null); // step currently playing
  // Assign popup
  const [assignOpen, setAssignOpen] = useState(false);

  // Track whether the local rows differ from the last loaded pattern
  const loadedPatternIdRef = useRef(null);

  // ── Load pattern from state into local rows ──────────────────────────────────
  useEffect(() => {
    if (!activeDrumPatternId) return;
    const pat = drumPatterns[activeDrumPatternId];
    if (!pat) return;
    setLocalRows(deepCopyRows(pat.rows));
    setSaveName(pat.name);
    loadedPatternIdRef.current = activeDrumPatternId;
  }, [activeDrumPatternId, drumPatterns]);

  // ── Live update sequencer rows when local rows change during playback ────────
  // Only push when the drum sequencer is actually enabled — otherwise we would
  // overwrite the live rows that the per-section schedule already set correctly.
  useEffect(() => {
    if ((isPlaying || isPaused) && drumEnabled) updateDrumRows(localRows);
  }, [localRows, isPlaying, isPaused, drumEnabled, updateDrumRows]);

  // ── Step highlight from sequencer ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onStep(step => setActiveStep(step));
    return unsub;
  }, [onStep]);

  // ── Step click: 3-state cycle  off → red (high) → orange (med) → off ────────
  const clickStep = useCallback((rowId, stepIdx) => {
    setLocalRows(prev => {
      let previewNeeded = false;
      let previewSampleKey = null;
      const next = prev.map(row => {
        if (row.rowId !== rowId) return row;
        const steps = row.steps.map((s, i) => {
          if (i !== stepIdx) return s;
          if (!s.on) {
            previewNeeded = true;
            previewSampleKey = row.sample;
            return { on: true,  vel: VEL_HIGH }; // off    → red
          }
          if (s.vel >= 0.9) return { on: true,  vel: VEL_MED  }; // red    → orange
          if (s.vel >= 0.6) return { on: true,  vel: VEL_LOW  }; // orange → yellow
          return             { on: false, vel: VEL_HIGH };        // yellow → off
        });
        return { ...row, steps };
      });
      if (autoPlay && previewNeeded && previewSampleKey) {
        previewSample(previewSampleKey);
      }
      return next;
    });
  }, [autoPlay, previewSample]);

  // ── Row property change helpers ──────────────────────────────────────────────
  const changeRowSample = useCallback((rowId, sample) => {
    setLocalRows(prev => prev.map(row =>
      row.rowId === rowId ? { ...row, sample } : row
    ));
  }, []);

  const changeRowVolume = useCallback((rowId, volume) => {
    setLocalRows(prev => prev.map(row =>
      row.rowId === rowId ? { ...row, volume } : row
    ));
  }, []);

  const changeRowReverb = useCallback((rowId, reverb) => {
    setLocalRows(prev => prev.map(row =>
      row.rowId === rowId ? { ...row, reverb } : row
    ));
  }, []);

  // ── Preset load ─────────────────────────────────────────────────────────────
  function handleLoadPreset(id) {
    if (!id) return;
    const dirty = isPatternDirty(localRows) && loadedPatternIdRef.current !== id;
    if (dirty && !window.confirm(t.drumPresetConfirm)) return;
    dispatch({ type: 'SET_ACTIVE_DRUM_PATTERN', id });
  }

  // ── Save pattern ─────────────────────────────────────────────────────────────
  function handleSave() {
    if (!saveName.trim()) return;
    const existingId = drumPatternOrder.find(id => drumPatterns[id]?.name === saveName.trim());
    const id = existingId ?? `drum-${Date.now()}`;
    const pattern = {
      id,
      name: saveName.trim(),
      rows: deepCopyRows(localRows),
    };
    dispatch({ type: 'SAVE_DRUM_PATTERN', pattern });
    loadedPatternIdRef.current = id;
  }

  // ── Delete pattern ───────────────────────────────────────────────────────────
  function handleDelete() {
    if (!activeDrumPatternId) return;
    const name = drumPatterns[activeDrumPatternId]?.name ?? '';
    if (!window.confirm(t.drumDeleteConfirm(name))) return;
    dispatch({ type: 'DELETE_DRUM_PATTERN', id: activeDrumPatternId });
    setLocalRows(blankRows());
    setSaveName('');
    loadedPatternIdRef.current = null;
  }

  // ── Clear ────────────────────────────────────────────────────────────────────
  function handleClear() {
    setLocalRows(blankRows());
    loadedPatternIdRef.current = null;
  }

  // ── Assign to track section ──────────────────────────────────────────────────
  function handleAssignToSection(idx) {
    dispatch({ type: 'SET_TRACK_DRUM_PATTERN', index: idx, drumPatternId: activeDrumPatternId ?? null });
    setAssignOpen(false);
  }

  // When collapsed: render a narrow clickable thumb instead of nothing
  if (!open) {
    return (
      <div className={styles.thumb} onClick={onToggle} title={t.drumSeqExpand}>
        <span>🥁</span>
        <span className={styles.thumbLabel}>{t.drumSeqTitle}</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>🥁 {t.drumSeqTitle}</span>
        <div className={styles.panelHeaderRight}>
          <button
            className={`${styles.onOffBtn} ${drumEnabled ? styles.onOffBtnOn : ''}`}
            title={drumEnabled ? t.drumDisable : t.drumEnable}
            onClick={() => {
              const next = !drumEnabled;
              dispatch({ type: 'SET_METRONOME', payload: { drumEnabled: next } });
              // Live start/stop while playback is running — respect the per-section schedule.
              if (isPlaying) {
                // Find which track section is currently playing.
                const cursor = playbackCursor;
                const currentTrackIdx = cursor?.trackIndex ?? null;
                const currentItem = currentTrackIdx !== null ? track[currentTrackIdx] : null;
                const sectionDrumId = currentItem?.drumPatternId ?? null;

                if (next) {
                  // Turning ON: use the section-assigned pattern if present, else global rows.
                  const rowsToUse = sectionDrumId && drumPatterns[sectionDrumId]
                    ? drumPatterns[sectionDrumId].rows
                    : localRows;
                  startDrumSeq(rowsToUse, timeSig);
                } else {
                  // Turning OFF: only stop if this section has no section-assigned pattern.
                  // If it has one, keep the sequencer running with those rows.
                  if (!sectionDrumId) {
                    stopDrumSeq();
                  }
                }
              }
            }}
          >
            <span className={styles.onOffDot} />
            {drumEnabled ? t.drumOnLabel : t.drumOffLabel}
          </button>
          <button className={styles.collapseBtn} title={t.drumSeqCollapse} onClick={onToggle}>✕</button>
        </div>
      </div>

      {/* Preset + Save toolbar */}
      <div className={styles.toolbar}>
        <label className={styles.toolbarLabel}>{t.drumPresetLabel}</label>
        <select
          className={styles.toolbarSelect}
          value={activeDrumPatternId ?? ''}
          onChange={e => handleLoadPreset(e.target.value)}
        >
          <option value="">{t.drumPresetPlaceholder}</option>
          {drumPatternOrder.map(id => (
            <option key={id} value={id}>{drumPatterns[id]?.name}</option>
          ))}
        </select>

        <label className={styles.toolbarLabel}>{t.drumSaveLabel}</label>
        <input
          className={styles.toolbarInput}
          placeholder={t.drumSaveNamePlaceholder}
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button className={styles.saveBtn} onClick={handleSave} disabled={!saveName.trim()}>{t.drumSaveBtn}</button>
        {activeDrumPatternId && !activeDrumPatternId.startsWith('drum-builtin-') && (
          <button className={styles.deleteBtn} onClick={handleDelete}>{t.drumDeleteBtn}</button>
        )}
        <button className={styles.clearBtn} onClick={handleClear}>{t.drumClearBtn}</button>
      </div>

      {/* Assign to track section — button + inline popup */}
      {track.length > 0 && activeDrumPatternId && (
        <div className={styles.assignRow}>
          <button
            className={styles.assignBtn}
            onClick={() => setAssignOpen(o => !o)}
            title={t.drumAssignTitle}
          >
            📌 {t.drumAssignLabel}
          </button>
          {assignOpen && (
            <div className={styles.assignPopup}>
              <div className={styles.assignPopupTitle}>{t.drumAssignPopupTitle(drumPatterns[activeDrumPatternId]?.name ?? '')}</div>
              {track.map(({ progressionId, drumPatternId }, idx) => {
                const prog = progressions[progressionId];
                const isAssigned = drumPatternId === activeDrumPatternId;
                return (
                  <button
                    key={idx}
                    className={`${styles.assignSectionBtn} ${isAssigned ? styles.assignSectionBtnActive : ''}`}
                    onClick={() => handleAssignToSection(idx)}
                  >
                    <span className={styles.assignSectionName}>{idx + 1}. {prog?.name ?? '?'}</span>
                    {isAssigned && <span className={styles.assignSectionCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step grid */}
      <div className={styles.grid}>

        {/* Header row: sound label | beat numbers | Vol | Rev */}
        <div className={styles.gridRow}>
          <div className={styles.rowLabelSpacer} />
          <div className={styles.stepNums}>
            {Array.from({ length: STEPS }, (_, i) => (
              <div
                key={i}
                className={`${styles.stepNum} ${i % 4 === 0 ? styles.stepNumBeat : ''}`}
              >
                {i % 4 === 0 ? i / 4 + 1 : '·'}
              </div>
            ))}
          </div>
          <div className={styles.knobColHeader}>{t.drumVolLabel}</div>
          <div className={styles.knobColHeader}>{t.drumReverbLabel}</div>
        </div>

        {/* Data rows: sample select | steps | vol knob | rev knob */}
        {localRows.map(row => (
          <div key={row.rowId} className={styles.gridRow}>
            {/* Sample picker — plays preview on hover and on select */}
            <SamplePicker
              value={row.sample ?? DEFAULT_SAMPLE[row.rowId] ?? 'kick'}
              samples={t.drumSamples}
              title={t.drumSampleLabel}
              onPreview={previewSample}
              onChange={sample => {
                changeRowSample(row.rowId, sample);
                previewSample(sample);
              }}
            />
            <div className={styles.steps}>
              {row.steps.map((step, si) => {
                const isActive = activeStep === si;
                const cls = stepStyleClass(step);
                return (
                  <button
                    key={si}
                    className={[
                      styles.step,
                      cls ? styles.stepOn : '',
                      cls ? styles[cls] : '',
                      isActive ? styles.stepActive : '',
                      si % 4 === 0 ? styles.stepBeat : '',
                    ].filter(Boolean).join(' ')}
                    title={t.drumStepTitle(si)}
                    onClick={() => clickStep(row.rowId, si)}
                  >
                  </button>
                );
              })}
            </div>
            {/* Volume knob */}
            <div className={styles.knobCell}>
              <Knob
                value={row.volume ?? 80}
                onChange={v => changeRowVolume(row.rowId, v)}
                label=""
                min={0} max={100}
                size={28}
                color="#60a5fa"
                fmt={v => `${v}%`}
              />
            </div>
            {/* Reverb knob */}
            <div className={styles.knobCell}>
              <Knob
                value={row.reverb ?? 20}
                onChange={v => changeRowReverb(row.rowId, v)}
                label=""
                min={0} max={100}
                size={28}
                color="#a78bfa"
                fmt={v => `${v}%`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
