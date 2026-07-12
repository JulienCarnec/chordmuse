import { useState, useRef, useEffect } from 'react';
import { CHROMATIC, noteIndex, noteName, preferFlat, displayNote } from '../../theory/notes';
import { CHORD_TYPES, chordLabel, chordLabelDisplay, getChordRole } from '../../theory/chords';
import { PatternControls } from './PatternControls';
import { useT } from '../../i18n/index';
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

const ROLE_SUFFIX = {
  'dominant-I':     ' (dom. I)',
  'dominant-II':    ' (dom. II)',
  'subdominant-I':  ' (sub. I)',
  'subdominant-II': ' (sub. II)',
};

const ROLE_ORDER = ['in-scale', 'dominant-I', 'dominant-II', 'subdominant-I', 'subdominant-II', 'out'];

// Roles that get a highlight (and therefore need the info bubble)
const HIGHLIGHTED_ROLES = new Set(['in-scale', 'dominant-I', 'dominant-II', 'subdominant-I', 'subdominant-II']);

/**
 * Small lightbulb icon that appears in the top-right of highlighted cells.
 * On hover it shows a tooltip explaining the harmonic role.
 */
function RoleInfoBubble({ role }) {
  const t = useT();
  const tooltip = t.roleTooltip?.[role];
  if (!tooltip) return null;
  return (
    <span className={styles.roleInfoBubble} title={tooltip} aria-label={tooltip}>
      <svg className={styles.roleInfoIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="6" r="4.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
        <line x1="8" y1="11" x2="8" y2="13.5" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
        <line x1="6.2" y1="10.5" x2="9.8" y2="10.5" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
      </svg>
      <span className={styles.roleInfoTooltip}>{tooltip}</span>
    </span>
  );
}

// Build all root+type combos sorted by role relevance
function buildOptions(scaleRoot, scaleKey) {
  const useFlat = preferFlat(scaleRoot, scaleKey);
  const combos = [];
  for (const root of CHROMATIC) {
    for (const [typeKey] of Object.entries(CHORD_TYPES)) {
      const role = getChordRole(root, typeKey, scaleRoot, scaleKey);
      const base  = chordLabelDisplay(root, typeKey, useFlat);
      const suffix = ROLE_SUFFIX[role] ?? '';
      combos.push({ root, typeKey, role, label: `${base}${suffix}` });
    }
  }
  combos.sort((a, b) => {
    const ri = ROLE_ORDER.indexOf(a.role);
    const rj = ROLE_ORDER.indexOf(b.role);
    if (ri !== rj) return ri - rj;
    return CHROMATIC.indexOf(a.root) - CHROMATIC.indexOf(b.root);
  });
  return combos;
}

/** Derive the bass note name for a chord at a given inversion. */
function bassNoteName(chord, useFlat) {
  if (!chord || !chord.inversion) return null;
  const def = CHORD_TYPES[chord.typeKey];
  if (!def) return null;
  const inv = chord.inversion % def.intervals.length;
  const bassInterval = def.intervals[inv];
  const rootIdx = noteIndex(chord.root);
  const sharp = noteName(((rootIdx + bassInterval) % 12 + 12) % 12);
  return displayNote(sharp, useFlat);
}

/** Label with optional slash notation for inversions: e.g. "Cmaj7/E" */
function cellLabelParts(chord, useFlat) {
  // Custom (undetermined) chord — show the note list directly
  if (!chord.typeKey && chord.customNotes?.length) {
    return { base: chord.customNotes.join(', '), bass: null };
  }
  const base = chordLabelDisplay(chord.root, chord.typeKey, useFlat);
  const bass = bassNoteName(chord, useFlat);
  const displayRoot = displayNote(chord.root, useFlat);
  return { base, bass: bass && bass !== displayRoot ? bass : null };
}

/**
 * Custom chord picker dropdown that opens when the label is clicked.
 * Renders a portal-style absolute dropdown anchored to the trigger.
 */
function ChordPickerDropdown({ value, scaleRoot, scaleKey, useFlat, onChange, onClose }) {
  const t = useT();
  const options = buildOptions(scaleRoot, scaleKey);
  const dropRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleMouseDown(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  return (
    <div ref={dropRef} className={styles.chordDropdown}>
      <div
        className={styles.chordDropdownOption}
        style={{ color: '#9ca3af', fontStyle: 'italic' }}
        onMouseDown={e => { e.stopPropagation(); onChange(null); onClose(); }}
      >
        {t.clearChordTitle}
      </div>
      {options.map(({ root, typeKey, role, label }) => {
        const isSelected = value && value.root === root && value.typeKey === typeKey;
        return (
          <div
            key={`${root}|${typeKey}`}
            className={`${styles.chordDropdownOption} ${isSelected ? styles.chordDropdownSelected : ''}`}
            style={ROLE_OPTION_COLORS[role] ? { backgroundColor: ROLE_OPTION_COLORS[role] } : {}}
            onMouseDown={e => {
              e.stopPropagation();
              onChange({ root, typeKey });
              onClose();
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Notes row: "Notes:" label + inversion buttons + octave spinner.
 * onChange(updatedChord) — always passes the full updated chord object.
 */
function NotesRow({ chord, useFlat, onChange }) {
  const t = useT();
  if (!chord) return null;
  const octave = chord.octave ?? 4;

  // Custom (undetermined) chord — show note names as plain labels, no inversion
  if (!chord.typeKey && chord.customNotes?.length) {
    return (
      <div className={styles.notesRow}>
        <span className={styles.notesLabel}>{t.notesLabel}</span>
        <div className={styles.inversionRow}>
          {chord.customNotes.map((note, i) => (
            <span key={i} className={styles.inversionBtn}>{note}</span>
          ))}
        </div>
        <label className={styles.octaveLabel} title={t.octaveTitle}>
          {t.octaveLabel}
          <input
            type="number"
            className={styles.octaveInput}
            value={octave}
            min={1} max={8}
            onClick={e => e.stopPropagation()}
            onChange={e => onChange({ ...chord, octave: Math.min(8, Math.max(1, Number(e.target.value))) })}
          />
        </label>
      </div>
    );
  }

  const def = CHORD_TYPES[chord.typeKey];
  if (!def) return null;
  const current = chord.inversion ?? 0;

  const labels = def.intervals.map((interval) => {
    const rootIdx = noteIndex(chord.root);
    const sharp = noteName(((rootIdx + interval) % 12 + 12) % 12);
    return displayNote(sharp, useFlat);
  });

  return (
    <div className={styles.notesRow}>
      <span className={styles.notesLabel}>{t.notesLabel}</span>
      <div className={styles.inversionRow}>
        {labels.map((note, i) => (
          <button
            key={i}
            className={`${styles.inversionBtn} ${current === i ? styles.inversionBtnActive : ''}`}
            title={i === 0 ? t.inversionRoot : t.inversionNth(i, note)}
            onClick={e => { e.stopPropagation(); onChange({ ...chord, inversion: i }); }}
          >
            {note}
          </button>
        ))}
      </div>
      <label className={styles.octaveLabel} title={t.octaveTitle}>
        {t.octaveLabel}
        <input
          type="number"
          className={styles.octaveInput}
          value={octave}
          min={1} max={8}
          onClick={e => e.stopPropagation()}
          onChange={e => onChange({ ...chord, octave: Math.min(8, Math.max(1, Number(e.target.value))) })}
        />
      </label>
    </div>
  );
}

/**
 * Small icon button that toggles the per-cell custom pattern panel.
 * Shows a filled icon when a custom pattern is set, outline when global.
 */
function PatternToggle({ hasCustom, open, onToggle }) {
  const t = useT();
  return (
    <button
      className={`${styles.patternToggle} ${hasCustom ? styles.patternToggleActive : ''}`}
      title={hasCustom ? t.customPatternTitle : t.globalPatternTitle}
      onClick={e => { e.stopPropagation(); onToggle(); }}
    >
      {hasCustom ? '♪' : '♩'}
    </button>
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
  onSetPlayStyle,
  onSetSubPlayStyle,
}) {
  const t = useT();
  const [showPattern, setShowPattern] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subPickerOpen, setSubPickerOpen] = useState(null); // index of open sub-cell picker
  // Track which sub-cell pattern panels are open (Set of sub-cell indices)
  const [openSubPatterns, setOpenSubPatterns] = useState(new Set());

  const hasCustom = cell.playStyle != null;

  function toggleSubPattern(si) {
    setOpenSubPatterns(prev => {
      const next = new Set(prev);
      next.has(si) ? next.delete(si) : next.add(si);
      return next;
    });
  }

  function role(chord) {
    if (!chord) return 'out';
    return getChordRole(chord.root, chord.typeKey, scaleRoot, scaleKey);
  }

  const useFlat = preferFlat(scaleRoot, scaleKey);

  if (cell.split) {
    return (
      <div className={`${styles.cell} ${styles.split} ${isCurrent ? styles.current : ''}`}>
        <div className={styles.splitInner}>
        {cell.subCells.map((sc, si) => {
          const subHasCustom = sc?.playStyle != null;
          const subPatternOpen = openSubPatterns.has(si);
          const isSubPickerOpen = subPickerOpen === si;
          const subRole = role(sc);
          return (
            <div key={si} className={`${styles.subCell} ${ROLE_STYLES[subRole] ?? ''}`}>
              {HIGHLIGHTED_ROLES.has(subRole) && <RoleInfoBubble role={subRole} />}
              <div className={styles.labelWrapper}>
                {sc
                  ? (() => { const { base, bass } = cellLabelParts(sc, useFlat); return (
                      <span
                        className={`${styles.label} ${styles.labelClickable} ${bass ? styles.labelInverted : ''}`}
                        onClick={e => { e.stopPropagation(); setSubPickerOpen(isSubPickerOpen ? null : si); }}
                      >{base}{bass && `/${bass}`}</span>
                    ); })()
                  : <span
                      className={styles.empty}
                      onClick={e => { e.stopPropagation(); setSubPickerOpen(isSubPickerOpen ? null : si); }}
                    >+</span>
                }
                {isSubPickerOpen && (
                  <ChordPickerDropdown
                    value={sc}
                    scaleRoot={scaleRoot}
                    scaleKey={scaleKey}
                    useFlat={useFlat}
                    onChange={chord => onSetSubChord(progressionId, cellIndex, si, chord)}
                    onClose={() => setSubPickerOpen(null)}
                  />
                )}
              </div>
              {sc && (
                <NotesRow
                  chord={sc}
                  useFlat={useFlat}
                  onChange={updatedChord => onSetSubChord(progressionId, cellIndex, si, updatedChord)}
                />
              )}
              <div className={styles.cellFooter}>
                {si === 0 && (
                  <button
                    className={styles.unsplitBtn}
                    title={t.mergeCellTitle}
                    onClick={e => { e.stopPropagation(); onUnsplit(progressionId, cellIndex); }}
                  >⊞</button>
                )}
                {onSetSubPlayStyle && (
                  <PatternToggle
                    hasCustom={subHasCustom}
                    open={subPatternOpen}
                    onToggle={() => toggleSubPattern(si)}
                  />
                )}
              </div>
              {subPatternOpen && onSetSubPlayStyle && (
                 <PatternControls
                   compact
                   allowNull
                   playStyle={sc?.playStyle ?? null}
                   noteValue={sc?.noteValue ?? null}
                   patternLoop={sc?.patternLoop ?? true}
                   chord={sc}
                   onChange={({ playStyle, noteValue, patternLoop }) =>
                     onSetSubPlayStyle(progressionId, cellIndex, si, playStyle, noteValue, patternLoop)
                   }
                 />
               )}
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  const r = role(cell.chord);
  return (
    <div className={`${styles.cell} ${ROLE_STYLES[r] ?? ''} ${isCurrent ? styles.current : ''}`}>
      {HIGHLIGHTED_ROLES.has(r) && <RoleInfoBubble role={r} />}
      <div className={styles.labelWrapper}>
        {cell.chord
          ? (() => { const { base, bass } = cellLabelParts(cell.chord, useFlat); return (
              <span
                className={`${styles.label} ${styles.labelClickable}`}
                onClick={e => { e.stopPropagation(); setPickerOpen(p => !p); }}
              >{base}{bass && `/${bass}`}</span>
            ); })()
          : <span
              className={styles.empty}
              onClick={e => { e.stopPropagation(); setPickerOpen(p => !p); }}
            >+</span>
        }
        {pickerOpen && (
          <ChordPickerDropdown
            value={cell.chord}
            scaleRoot={scaleRoot}
            scaleKey={scaleKey}
            useFlat={useFlat}
            onChange={chord => onSetChord(progressionId, cellIndex, chord)}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      {cell.chord && (
        <NotesRow
          chord={cell.chord}
          useFlat={useFlat}
          onChange={updatedChord => onSetChord(progressionId, cellIndex, updatedChord)}
        />
      )}
      <div className={styles.cellFooter}>
        <button
          className={styles.splitBtn}
          title={t.splitCellTitle}
          onClick={e => { e.stopPropagation(); onSplit(progressionId, cellIndex); }}
        >⊢</button>
        {onSetPlayStyle && (
          <PatternToggle
            hasCustom={hasCustom}
            open={showPattern}
            onToggle={() => setShowPattern(p => !p)}
          />
        )}
      </div>
      {showPattern && onSetPlayStyle && (
        <PatternControls
          compact
          allowNull
          playStyle={cell.playStyle ?? null}
          noteValue={cell.noteValue ?? null}
          patternLoop={cell.patternLoop ?? true}
          chord={cell.chord}
          onChange={({ playStyle, noteValue, patternLoop }) => {
            onSetPlayStyle(progressionId, cellIndex, playStyle, noteValue, patternLoop);
          }}
        />
      )}
    </div>
  );
}
