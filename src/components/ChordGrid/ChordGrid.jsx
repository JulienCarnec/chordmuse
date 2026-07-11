import { useState, useEffect, useRef } from 'react';
import { HelpPanel } from '../HelpPanel/HelpPanel';
import * as Tone from 'tone';
import { useAppState } from '../../state/AppContext';
import { ChordCell } from './ChordCell';
import { PatternControls } from './PatternControls';
import { ScaleSelector } from '../ScaleSelector/ScaleSelector';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { GuitarFretboard } from '../GuitarFretboard/GuitarFretboard';
import { useSampler } from '../../audio/useSampler';
import { usePlayback } from '../Playback/usePlayback';
import { getChordNotesVoiced, voiceChord, CHORD_TYPES, identifyChord } from '../../theory/chords';
import { CHROMATIC, noteIndex, preferFlat, displayNote } from '../../theory/notes';
import { getScaleNoteSet } from '../../theory/scales';
import { useT } from '../../i18n/index';
import styles from './ChordGrid.module.css';

const START_OCTAVE = 3; // must match PianoKeyboard's START_OCTAVE

const CELLS_PER_ROW = 4;

function chunkRows(arr, size) {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

export function ChordGrid() {
  const t = useT();
  const { state, dispatch } = useAppState();
  const { progressions, activeProgressionId, isPlaying, isPaused, playbackCursor, playbackActiveNotes, playbackNotesDuration, instrument, selectedCellChord, timeSig, globalPlayStyle, globalNoteValue, globalPatternLoop, bpm, autoPlay, helpOpen } = state;
  // Per-progression pattern: fall back to global if not set on this progression
  const prog = progressions[activeProgressionId];
  const [transposeAmt, setTransposeAmt] = useState(0);
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);
  const [showPiano, setShowPiano] = useState(true);
  const [showGuitar, setShowGuitar] = useState(false);
  // Shared manual highlight: Set<string> of "note+octave" keyIds (e.g. "C4")
  // Piano highlights only the exact key; guitar derives pitch-class to highlight all frets.
  const [sharedHighlight, setSharedHighlight] = useState(new Set());
  const { playNotes, playArpeggio } = useSampler();
  const { updateLiveParams, updateLiveCells } = usePlayback();
  // Scale animation: Set<"note+octave"> of notes currently lit during scale playback
  const [playingScaleNotes, setPlayingScaleNotes] = useState(new Set());
  const scaleTimersRef = useRef([]);

  // ── Drag-and-drop state ────────────────────────────────────
  // dragIndex: the global cell index currently being dragged (null = idle)
  const dragIndexRef = useRef(null);
  // dropIndex: insertion slot (0 = before first cell, n = after last cell)
  // null = not dragging / no valid drop target
  const [dropIndex, setDropIndex] = useState(null);
  // Index of the cell currently targeted by a piano-chord drag
  const [chordDropTarget, setChordDropTarget] = useState(null);
  // Whether Ctrl was held at drag-end (copy mode)
  const ctrlRef = useRef(false);

  const progPlayStyle   = prog?.playStyle   ?? globalPlayStyle;
  const progNoteValue   = prog?.noteValue   ?? globalNoteValue;
  const progPatternLoop = prog?.patternLoop ?? globalPatternLoop;

  // Keep liveParams in sync with this progression's pattern + time signature
  useEffect(() => {
    updateLiveParams({ playStyle: progPlayStyle, noteValue: progNoteValue, patternLoop: progPatternLoop });
  }, [progPlayStyle, progNoteValue, progPatternLoop, updateLiveParams]);

  useEffect(() => {
    updateLiveParams({ timeSig });
  }, [timeSig, updateLiveParams]);

  // Push updated cells into the live playback engine when chords/cells change mid-play.
  // Cells must carry _cellDuration so the engine uses the right duration on every loop pass.
  useEffect(() => {
    if ((isPlaying || isPaused) && prog?.cells) {
      updateLiveCells(prog.cells.map(cell => ({ ...cell, _cellDuration: prog.cellDuration ?? 'whole' })));
    }
  }, [prog?.cells, prog?.cellDuration, isPlaying, isPaused, updateLiveCells]);

  if (!prog) {
    return (
      <div className={styles.empty}>
        <p>{t.noGridSelected}</p>
      </div>
    );
  }

  const scaleRoot = prog.scaleRoot ?? state.scaleRoot;
  const scaleKey  = prog.scaleKey  ?? state.scaleKey;

  const firstCell  = prog.cells.find(c => c.chord);
  const firstChord = firstCell?.chord ?? null;

  function handleScaleChange({ root, key }) {
    dispatch({ type: 'SET_PROGRESSION_SCALE', progressionId: prog.id, root, key });
  }

  function handleTranspose() {
    if (transposeAmt === 0) return;
    dispatch({ type: 'TRANSPOSE_PROGRESSION', progressionId: prog.id, semitones: transposeAmt });
    setTransposeAmt(0);
  }

  function addCell() {
    dispatch({ type: 'ADD_CELL', progressionId: prog.id });
  }

  function removeCell(cellIndex) {
    dispatch({ type: 'REMOVE_CELL', progressionId: prog.id, cellIndex });
  }

  function handleCellSelect(cellIndex, chord) {
    setSelectedCellIndex(cellIndex);
    setSharedHighlight(new Set()); // clear shared highlight on cell change
    dispatch({ type: 'SET_SELECTED_CELL_CHORD', chord: chord ?? null });
    if (chord && autoPlay) {
      const notes = voiceChord(chord, chord.octave ?? 4);
      playNotes(notes, '2n', instrument);
    }
  }

  function handleToggleKey(keyId) {
    setSharedHighlight(prev => {
      const next = new Set(prev);
      next.has(keyId) ? next.delete(keyId) : next.add(keyId);
      return next;
    });
  }

  // ── Shared visualiser logic ────────────────────────────────
  const scaleNoteSet = scaleRoot && scaleKey ? getScaleNoteSet(scaleRoot, scaleKey) : new Set();
  const useFlat = preferFlat(scaleRoot, scaleKey);

  function playScale() {
    const indices = [...scaleNoteSet];
    if (!indices.length) return;
    // Sync the transport BPM so Tone.Time('8n') resolves to the correct duration
    Tone.getTransport().bpm.value = bpm;
    const rootIdx = scaleRoot ? noteIndex(scaleRoot) : [...indices].sort((a, b) => a - b)[0];
    const sorted = [...indices].sort((a, b) => a - b);
    const rootPos = sorted.indexOf(rootIdx);
    const reordered = rootPos >= 0
      ? [...sorted.slice(rootPos), ...sorted.slice(0, rootPos)]
      : sorted;
    const baseOct = START_OCTAVE + 1;
    let oct = baseOct;
    let prevIdx = -1;
    const notes = reordered.map(i => {
      if (prevIdx !== -1 && i <= prevIdx) oct++;
      prevIdx = i;
      return `${CHROMATIC[i]}${oct}`;
    });
    const rootOctaveUp = `${CHROMATIC[rootIdx]}${baseOct + 1}`;
    const allNotes = [...notes, rootOctaveUp];
    playArpeggio(allNotes, 'up', '8n', instrument);

    scaleTimersRef.current.forEach(t => clearTimeout(t));
    scaleTimersRef.current = [];
    setPlayingScaleNotes(new Set());

    const stepMs = Tone.Time('8n').toSeconds() * 1000;
    const holdMs = stepMs * 0.85;
    allNotes.forEach((noteWithOct, i) => {
      const on  = setTimeout(() => setPlayingScaleNotes(prev => { const n = new Set(prev); n.add(noteWithOct);    return n; }), i * stepMs);
      const off = setTimeout(() => setPlayingScaleNotes(prev => { const n = new Set(prev); n.delete(noteWithOct); return n; }), i * stepMs + holdMs);
      scaleTimersRef.current.push(on, off);
    });
  }

  function playHighlighted() {
    if (!sharedHighlight.size) return;
    playNotes([...sharedHighlight], '2n', instrument);
  }

  // Chord detection from shared highlight (pitch-class level)
  const manualPitchClasses = [...sharedHighlight].map(id => noteIndex(id.replace(/\d+$/, '')));
  const detectedChord = manualPitchClasses.length >= 2 ? identifyChord(manualPitchClasses, useFlat) : null;
  const undeterminedDraggable = !detectedChord && manualPitchClasses.length >= 2
    ? (() => {
        const sorted = [...manualPitchClasses].sort((a, b) => a - b);
        const root = CHROMATIC[sorted[0]];
        const noteNames = sorted.map(i => displayNote(CHROMATIC[i], useFlat));
        return { root, typeKey: null, customNotes: noteNames };
      })()
    : null;
  const detectedLabel = detectedChord
    ? `→ ${detectedChord.label}`
    : manualPitchClasses.length >= 2
      ? `→ ${[...manualPitchClasses].sort((a,b)=>a-b).map(i => displayNote(CHROMATIC[i], useFlat)).join(', ')} (${t.undefinedChord})`
      : null;

  const pianoPlaybackNotes = (isPlaying || isPaused) ? (playbackActiveNotes.length ? playbackActiveNotes : (playbackCursor?.notes ?? null)) : null;
  const pianoSelectedChord = !isPlaying ? (selectedCellChord ?? firstChord) : null;

  // ── Drag handlers ──────────────────────────────────────────

  function handleDragStart(e, globalIdx) {
    dragIndexRef.current = globalIdx;
    ctrlRef.current = false;
    // Use a transparent drag image so the ghost is minimal
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  function handleDragOver(e, globalIdx) {
    e.preventDefault();
    e.stopPropagation();
    // Piano chord drag — highlight destination cell, no insertion slot
    if (e.dataTransfer.types.includes('application/chord')) {
      if (chordDropTarget !== globalIdx) setChordDropTarget(globalIdx);
      setDropIndex(null);
      e.dataTransfer.dropEffect = 'copy';
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    const slot = e.clientX < mid ? globalIdx : globalIdx + 1;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  // The "+ add" button and the empty space after the last cell also accept drops
  function handleDragOverAfterLast(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/chord')) {
      setChordDropTarget(null);
      setDropIndex(null);
      return;
    }
    const slot = prog.cells.length;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  function handleDrop(e, slot) {
    e.preventDefault();
    e.stopPropagation();
    // Piano chord drop — set the chord on the target cell
    const chordJson = e.dataTransfer.getData('application/chord');
    if (chordJson) {
      setChordDropTarget(null);
      setDropIndex(null);
      dragIndexRef.current = null;
      try {
        const chord = JSON.parse(chordJson);
        // slot here is the cell index when called from cellWrapper's onDrop
        const cellIdx = chordDropTarget ?? slot;
        if (typeof cellIdx === 'number' && cellIdx < prog.cells.length) {
          dispatch({ type: 'SET_CELL_CHORD', progressionId: prog.id, cellIndex: cellIdx, chord });
        }
      } catch { /* ignore malformed */ }
      return;
    }
    const from = dragIndexRef.current;
    const copy  = e.ctrlKey;
    dragIndexRef.current = null;
    setDropIndex(null);
    if (from === null) return;
    if (copy) {
      dispatch({ type: 'COPY_CELL', progressionId: prog.id, fromIndex: from, toIndex: slot });
    } else {
      dispatch({ type: 'MOVE_CELL', progressionId: prog.id, fromIndex: from, toIndex: slot });
    }
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDropIndex(null);
    setChordDropTarget(null);
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className={styles.wrapper}>

      {/* ── Help panel: left collapsible sidebar ─────────────── */}
      <HelpPanel
        open={helpOpen}
        onToggle={() => dispatch({ type: 'SET_HELP_OPEN', open: !helpOpen })}
        label={t.helpLabel}
        editorTitle={t.helpCGEditorTitle}
        editorDesc={t.helpCGEditorDesc}
        steps={t.helpCGSteps}
      />

      {/* ── Main content column ─────────────────────────────── */}
      <div className={styles.mainCol}>

      {/* ── Editor header: progression name + close button ── */}
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>{prog.name}</span>
        <button
          className={styles.closeBtn}
          title={t.closeEditor}
          onClick={() => dispatch({ type: 'CLOSE_PROGRESSION_EDITOR' })}
        >{t.closeEditor} →</button>
      </div>

      {/* ── Top control panels ────────────────────────────── */}
      <div className={styles.panels}>

        {/* Scale panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>♩</span>
            <span className={styles.panelTitle}>{t.scalePanel}</span>
          </div>
          <div className={styles.panelBody}>
            <ScaleSelector
              scaleRoot={scaleRoot}
              scaleKey={scaleKey}
              firstChord={firstChord}
              onChange={handleScaleChange}
            />
            <div className={styles.divider} />
            <div className={styles.row}>
              <span className={styles.smallLabel}>{t.cellDurationLabel}</span>
              <select
                className={styles.cellDurationSelect}
                title={t.cellDurationTitle}
                value={prog.cellDuration ?? 'whole'}
                onChange={e => dispatch({ type: 'SET_CELL_DURATION', progressionId: prog.id, cellDuration: e.target.value })}
              >
                <option value="whole">{t.cellDurationWhole}</option>
                <option value="half">{t.cellDurationHalf}</option>
                <option value="quarter">{t.cellDurationQuarter}</option>
                <option value="eighth">{t.cellDurationEighth}</option>
              </select>
            </div>
            <div className={styles.divider} />
            <div className={styles.row}>
              <span className={styles.smallLabel}>{t.transpose}</span>
              <input
                type="number"
                className={styles.transposeInput}
                value={transposeAmt}
                onChange={e => setTransposeAmt(Number(e.target.value))}
                min={-12} max={12}
                title={t.transposeInputTitle}
              />
              <button className={styles.btn} title={t.applyTransposeTitle} onClick={handleTranspose}>{t.applyBtn}</button>
            </div>
          </div>
        </div>

        {/* Pattern panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>♪</span>
            <span className={styles.panelTitle}>{t.patternPanel}</span>
            <span className={styles.panelHint}>{t.patternGlobalHint}</span>
          </div>
          <div className={styles.panelBody}>
            <PatternControls
              playStyle={progPlayStyle}
              noteValue={progNoteValue}
              patternLoop={progPatternLoop}
              chord={firstChord}
              onChange={({ playStyle, noteValue, patternLoop }) => {
                dispatch({
                  type: 'SET_GLOBAL_PATTERN',
                  playStyle:   playStyle !== null ? playStyle : undefined,
                  noteValue:   noteValue   ?? undefined,
                  patternLoop: patternLoop ?? undefined,
                });
              }}
            />
          </div>
        </div>

      </div>

      {/* ── Grid rows — max 4 cells per row ─────────────────── */}
      <div
        className={styles.gridRows}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { if (dropIndex !== null) handleDrop(e, dropIndex); }}
      >
        {chunkRows(prog.cells, CELLS_PER_ROW).map((row, rowIdx) => {
          const isLastRow = rowIdx === Math.ceil(prog.cells.length / CELLS_PER_ROW) - 1;
          return (
            <div key={rowIdx} className={styles.rowGroup}>
              {row.map((cell, colIdx) => {
                const globalIdx = rowIdx * CELLS_PER_ROW + colIdx;
                const isSelected = selectedCellIndex === globalIdx;
                const isDragging = dragIndexRef.current === globalIdx;
                const showDropBefore = dropIndex === globalIdx;
                const isChordDropTarget = chordDropTarget === globalIdx;
                return (
                  <div key={cell.id} className={styles.cellOuter}>
                    {showDropBefore && <div className={styles.dropIndicator} />}
                    <div
                      className={`${styles.cellWrapper} ${isSelected ? styles.cellSelected : ''} ${isDragging ? styles.cellDragging : ''} ${isChordDropTarget ? styles.cellChordDrop : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, globalIdx)}
                      onDragOver={e => handleDragOver(e, globalIdx)}
                      onDrop={e => handleDrop(e, globalIdx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCellSelect(globalIdx, cell.chord)}
                    >
                      <ChordCell
                        cell={cell}
                        cellIndex={globalIdx}
                        progressionId={prog.id}
                        scaleRoot={scaleRoot}
                        scaleKey={scaleKey}
                        isCurrent={
                          (isPlaying || isPaused) &&
                          playbackCursor?.progressionId === prog.id &&
                          playbackCursor?.cellIndex === globalIdx
                        }
                        onSetChord={(pid, ci, chord) => {
                          dispatch({ type: 'SET_CELL_CHORD', progressionId: pid, cellIndex: ci, chord });
                          handleCellSelect(ci, chord);
                        }}
                        onSplit={(pid, ci) =>
                          dispatch({ type: 'SPLIT_CELL', progressionId: pid, cellIndex: ci })
                        }
                        onUnsplit={(pid, ci) =>
                          dispatch({ type: 'UNSPLIT_CELL', progressionId: pid, cellIndex: ci })
                        }
                        onSetSubChord={(pid, ci, si, chord) =>
                          dispatch({ type: 'SET_SUB_CELL_CHORD', progressionId: pid, cellIndex: ci, subIndex: si, chord })
                        }
                        onSetPlayStyle={(pid, ci, ps, nv, pl) =>
                          dispatch({ type: 'SET_CELL_PLAY_STYLE', progressionId: pid, cellIndex: ci, playStyle: ps, noteValue: nv, patternLoop: pl })
                        }
                        onSetSubPlayStyle={(pid, ci, si, ps, nv, pl) =>
                          dispatch({ type: 'SET_SUB_CELL_PLAY_STYLE', progressionId: pid, cellIndex: ci, subIndex: si, playStyle: ps, noteValue: nv, patternLoop: pl })
                        }
                      />
                      <button
                        className={styles.removeCell}
                        title={t.removeCellTitle}
                        disabled={prog.cells.length <= 1}
                        onClick={e => { e.stopPropagation(); removeCell(globalIdx); }}
                      >×</button>
                    </div>
                  </div>
                );
              })}

              {isLastRow && dropIndex === prog.cells.length && (
                <div className={styles.dropIndicatorAfter} />
              )}

              {isLastRow && (
                <button
                  className={styles.addCell}
                  title={t.addCellTitle}
                  onDragOver={handleDragOverAfterLast}
                  onDrop={e => handleDrop(e, prog.cells.length)}
                  onClick={addCell}
                >+</button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Instrument visualisers ────────────────────────── */}
      <div className={styles.visualiserSection}>

        {/* Toggle + shared controls row */}
        <div className={styles.visualiserHeader}>
          <div className={styles.visualiserToggles}>
            <button
              className={`${styles.visualiserToggleBtn} ${showPiano ? styles.visualiserToggleActive : ''}`}
              onClick={() => setShowPiano(p => !p)}
            >{t.showPiano}</button>
            <button
              className={`${styles.visualiserToggleBtn} ${showGuitar ? styles.visualiserToggleActive : ''}`}
              onClick={() => setShowGuitar(p => !p)}
            >{t.showGuitar}</button>
          </div>

          {/* Shared action buttons — always visible when a visualiser is shown */}
          {(showPiano || showGuitar) && (
            <div className={styles.visualiserActions}>
              {scaleNoteSet.size > 0 && (
                <button className={styles.actionBtn} onClick={playScale}>{t.pianoPlayScale}</button>
              )}
              {sharedHighlight.size > 0 && (
                <button className={styles.actionBtn} onClick={playHighlighted}>{t.pianoPlayHighlighted}</button>
              )}
              {sharedHighlight.size > 0 && (
                <button className={styles.clearBtn} onClick={() => setSharedHighlight(new Set())}>{t.pianoClear}</button>
              )}
              {detectedLabel && (detectedChord || undeterminedDraggable) && (
                <span
                  className={`${styles.detectedChord} ${styles.detectedChordDraggable}`}
                  draggable
                  title={t.dragChordToCell}
                  onDragStart={e => {
                    const payload = detectedChord ?? undeterminedDraggable;
                    e.dataTransfer.setData('application/chord', JSON.stringify(payload));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >{detectedLabel}</span>
              )}
            </div>
          )}
        </div>

        {showPiano && (
          <div className={styles.visualiserPanel}>
            <PianoKeyboard
              scaleRoot={scaleRoot}
              scaleKey={scaleKey}
              selectedChord={pianoSelectedChord}
              instrument={instrument}
              playbackNotes={pianoPlaybackNotes}
              playbackNotesDuration={playbackNotesDuration}
              isPaused={isPaused}
              resetKey={selectedCellIndex}
              manualHighlight={sharedHighlight}
              onToggleKey={handleToggleKey}
              playingScaleNotes={playingScaleNotes}
              onPickInversion={selectedCellIndex !== null ? (invIdx, clickedOctave) => {
                const cell = prog.cells[selectedCellIndex];
                if (!cell?.chord) return;
                const def = CHORD_TYPES[cell.chord.typeKey];
                const rootIdx = noteIndex(cell.chord.root);
                const bassInterval = def ? def.intervals[invIdx] ?? 0 : 0;
                const baseOctave = clickedOctave - Math.floor((rootIdx + bassInterval) / 12);
                const updated = { ...cell.chord, inversion: invIdx, octave: baseOctave };
                dispatch({ type: 'SET_CELL_CHORD', progressionId: prog.id, cellIndex: selectedCellIndex, chord: updated });
                dispatch({ type: 'SET_SELECTED_CELL_CHORD', chord: updated });
              } : undefined}
            />
          </div>
        )}

        {showGuitar && (
          <div className={styles.visualiserPanel}>
            <GuitarFretboard
              scaleRoot={scaleRoot}
              scaleKey={scaleKey}
              selectedChord={pianoSelectedChord}
              instrument={instrument}
              playbackNotes={pianoPlaybackNotes}
              playbackNotesDuration={playbackNotesDuration}
              isPaused={isPaused}
              resetKey={selectedCellIndex}
              manualHighlight={sharedHighlight}
              onToggleKey={handleToggleKey}
              playingScaleNotes={playingScaleNotes}
            />
          </div>
        )}
      </div>

      </div>{/* end .mainCol */}

    </div>
  );
}
