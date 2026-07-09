import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../state/AppContext';
import { ChordCell } from './ChordCell';
import { PatternControls } from './PatternControls';
import { ScaleSelector } from '../ScaleSelector/ScaleSelector';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { useSampler } from '../../audio/useSampler';
import { usePlayback } from '../Playback/usePlayback';
import { getChordNotesVoiced, CHORD_TYPES } from '../../theory/chords';
import { noteIndex } from '../../theory/notes';
import styles from './ChordGrid.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// ChordGrid is the full progression editor view.
// It is rendered when activeView === 'progression'.
// The close button to return to the track view is in the TopBar.
// ─────────────────────────────────────────────────────────────────────────────

const CELLS_PER_ROW = 8;

function chunkRows(arr, size) {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

export function ChordGrid() {
  const { state, dispatch } = useAppState();
  const { progressions, activeProgressionId, isPlaying, isPaused, playbackCursor, playbackActiveNotes, playbackNotesDuration, instrument, selectedCellChord } = state;
  const prog = progressions[activeProgressionId];
  const [transposeAmt, setTransposeAmt] = useState(0);
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [globalPlayStyle, setGlobalPlayStyle] = useState('block');
  const [globalNoteValue, setGlobalNoteValue] = useState('4n');
  const { playNotes } = useSampler();
  const { updateLiveParams, updateLiveCells } = usePlayback();

  // ── Drag-and-drop state ────────────────────────────────────
  // dragIndex: the global cell index currently being dragged (null = idle)
  const dragIndexRef = useRef(null);
  // dropIndex: insertion slot (0 = before first cell, n = after last cell)
  // null = not dragging / no valid drop target
  const [dropIndex, setDropIndex] = useState(null);
  // Whether Ctrl was held at drag-end (copy mode)
  const ctrlRef = useRef(false);

  // Keep liveParams in sync with global toolbar settings
  useEffect(() => {
    updateLiveParams({ playStyle: globalPlayStyle, noteValue: globalNoteValue });
  }, [globalPlayStyle, globalNoteValue, updateLiveParams]);

  // Push updated cells into the live playback engine when chords/cells change mid-play
  useEffect(() => {
    if ((isPlaying || isPaused) && prog?.cells) {
      updateLiveCells(prog.cells);
    }
  }, [prog?.cells, isPlaying, isPaused, updateLiveCells]);

  if (!prog) {
    return (
      <div className={styles.empty}>
        <p>No progression selected. Create one to get started.</p>
      </div>
    );
  }

  const scaleRoot = prog.scaleRoot ?? state.scaleRoot;
  const scaleKey  = prog.scaleKey  ?? state.scaleKey;

  const firstCell  = prog.cells.find(c => c.chord);
  const firstChord = firstCell?.chord ?? null;

  const rows = chunkRows(prog.cells, CELLS_PER_ROW);

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
    dispatch({ type: 'SET_SELECTED_CELL_CHORD', chord: chord ?? null });
    if (chord && autoPlay) {
      const notes = getChordNotesVoiced(chord.root, chord.typeKey, chord.octave ?? 4, chord.inversion ?? 0);
      playNotes(notes, '2n', instrument);
    }
  }

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
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    // Insert before this cell if pointer is on left half, after if right half
    const slot = e.clientX < mid ? globalIdx : globalIdx + 1;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  // The "+ add" button and the empty space after the last cell also accept drops
  function handleDragOverAfterLast(e) {
    e.preventDefault();
    e.stopPropagation();
    const slot = prog.cells.length;
    if (slot !== dropIndex) setDropIndex(slot);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  }

  function handleDrop(e, slot) {
    e.preventDefault();
    e.stopPropagation();
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
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className={styles.wrapper}>

      {/* ── Top control panels ────────────────────────────── */}
      <div className={styles.panels}>

        {/* Scale panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>♩</span>
            <span className={styles.panelTitle}>Scale</span>
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
              <span className={styles.smallLabel}>Transpose</span>
              <input
                type="number"
                className={styles.transposeInput}
                value={transposeAmt}
                onChange={e => setTransposeAmt(Number(e.target.value))}
                min={-12} max={12}
              />
              <span className={styles.smallLabel}>st</span>
              <button className={styles.btn} onClick={handleTranspose}>Apply</button>
            </div>
          </div>
        </div>

        {/* Pattern panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>♪</span>
            <span className={styles.panelTitle}>Pattern</span>
            <span className={styles.panelHint}>global default</span>
          </div>
          <div className={styles.panelBody}>
            <PatternControls
              playStyle={globalPlayStyle}
              noteValue={globalNoteValue}
              onChange={({ playStyle, noteValue }) => {
                if (playStyle !== null) setGlobalPlayStyle(playStyle);
                setGlobalNoteValue(noteValue ?? globalNoteValue);
              }}
            />
          </div>
        </div>

        {/* Grid meta */}
        <div className={styles.metaPanel}>
          <span className={styles.cellCount}>
            {prog.cells.length} cell{prog.cells.length !== 1 ? 's' : ''}
          </span>
          <label className={styles.autoPlayLabel}>
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={e => setAutoPlay(e.target.checked)}
            />
            Auto-play
          </label>
        </div>
      </div>

      {/* ── Grid rows ─────────────────────────────────────── */}
      <div
        className={styles.gridRows}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { if (dropIndex !== null) handleDrop(e, dropIndex); }}
      >
        {rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1;
          return (
            <div key={rowIdx} className={styles.rowGroup}>
              {row.map((cell, colIdx) => {
                const globalIdx = rowIdx * CELLS_PER_ROW + colIdx;
                const isSelected = selectedCellIndex === globalIdx;
                const isDragging = dragIndexRef.current === globalIdx;
                const showDropBefore = dropIndex === globalIdx;

                return (
                  <div key={cell.id} className={styles.cellOuter}>
                    {/* Drop indicator line before this cell */}
                    {showDropBefore && (
                      <div className={styles.dropIndicator} />
                    )}

                    <div
                      className={`${styles.cellWrapper} ${isSelected ? styles.cellSelected : ''} ${isDragging ? styles.cellDragging : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, globalIdx)}
                      onDragOver={e => handleDragOver(e, globalIdx)}
                      onDrop={e => handleDrop(e, dropIndex ?? globalIdx)}
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
                        onSetPlayStyle={(pid, ci, ps, nv) =>
                          dispatch({ type: 'SET_CELL_PLAY_STYLE', progressionId: pid, cellIndex: ci, playStyle: ps, noteValue: nv })
                        }
                        onSetSubPlayStyle={(pid, ci, si, ps, nv) =>
                          dispatch({ type: 'SET_SUB_CELL_PLAY_STYLE', progressionId: pid, cellIndex: ci, subIndex: si, playStyle: ps, noteValue: nv })
                        }
                      />
                      <button
                        className={styles.removeCell}
                        title="Remove this cell"
                        disabled={prog.cells.length <= 1}
                        onClick={e => { e.stopPropagation(); removeCell(globalIdx); }}
                      >×</button>
                    </div>
                  </div>
                );
              })}

              {/* Drop indicator after last cell in row */}
              {isLastRow && dropIndex === prog.cells.length && (
                <div className={styles.dropIndicatorAfter} />
              )}

              {isLastRow && (
                <button
                  className={styles.addCell}
                  title="Add a cell"
                  onDragOver={handleDragOverAfterLast}
                  onDrop={e => handleDrop(e, prog.cells.length)}
                  onClick={addCell}
                >+</button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Piano keyboard ────────────────────────────────── */}
      <div className={styles.pianoSection}>
        <h3 className={styles.sectionTitle}>Piano</h3>
        <PianoKeyboard
          scaleRoot={scaleRoot}
          scaleKey={scaleKey}
          selectedChord={pianoSelectedChord}
          instrument={instrument}
          playbackNotes={pianoPlaybackNotes}
          playbackNotesDuration={playbackNotesDuration}
          resetKey={selectedCellIndex}
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
    </div>
  );
}
