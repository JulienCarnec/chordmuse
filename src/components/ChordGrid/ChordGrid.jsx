import { useState, useEffect } from 'react';
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
  const { progressions, activeProgressionId, isPlaying, isPaused, playbackCursor, playbackActiveNotes, instrument, selectedCellChord } = state;
  const prog = progressions[activeProgressionId];
  const [transposeAmt, setTransposeAmt] = useState(0);
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [globalPlayStyle, setGlobalPlayStyle] = useState('block');
  const [globalNoteValue, setGlobalNoteValue] = useState('4n');
  const { playNotes } = useSampler();
  const { updateLiveParams } = usePlayback();

  // Keep liveParams in sync with global toolbar settings
  useEffect(() => {
    updateLiveParams({ playStyle: globalPlayStyle, noteValue: globalNoteValue });
  }, [globalPlayStyle, globalNoteValue, updateLiveParams]);

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

  // Determine which chord to highlight on the piano:
  // 1. During/after playback: use playbackCursor notes
  // 2. Cell selected: use selectedCellChord
  // 3. Fallback: first chord in grid
  const pianoPlaybackNotes = (isPlaying || isPaused) ? (playbackActiveNotes.length ? playbackActiveNotes : (playbackCursor?.notes ?? null)) : null;
  const pianoSelectedChord = !isPlaying ? (selectedCellChord ?? firstChord) : null;

  return (
    <div className={styles.wrapper}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <ScaleSelector
          scaleRoot={scaleRoot}
          scaleKey={scaleKey}
          firstChord={firstChord}
          onChange={handleScaleChange}
        />
        <PatternControls
          playStyle={globalPlayStyle}
          noteValue={globalNoteValue}
          onChange={({ playStyle, noteValue }) => {
            if (playStyle !== null) setGlobalPlayStyle(playStyle);
            setGlobalNoteValue(noteValue ?? globalNoteValue);
          }}
        />
        <div className={styles.transpose}>
          <label className={styles.smallLabel}>Transpose</label>
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
        <div className={styles.cellCount}>
          <span className={styles.smallLabel}>{prog.cells.length} cell{prog.cells.length !== 1 ? 's' : ''}</span>
        </div>
        {/* Auto-play toggle */}
        <label className={styles.autoPlayLabel}>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={e => setAutoPlay(e.target.checked)}
          />
          Auto-play on select
        </label>
      </div>

      {/* Grid rows */}
      <div className={styles.gridRows}>
        {rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1;
          return (
            <div key={rowIdx} className={styles.row}>
              {row.map((cell, colIdx) => {
                const globalIdx = rowIdx * CELLS_PER_ROW + colIdx;
                const isSelected = selectedCellIndex === globalIdx;
                return (
                  <div
                    key={cell.id}
                    className={`${styles.cellWrapper} ${isSelected ? styles.cellSelected : ''}`}
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
                    />
                    {/* Remove button */}
                    <button
                      className={styles.removeCell}
                      title="Remove this cell"
                      disabled={prog.cells.length <= 1}
                      onClick={e => { e.stopPropagation(); removeCell(globalIdx); }}
                    >×</button>
                  </div>
                );
              })}
              {isLastRow && (
                <button className={styles.addCell} title="Add a cell" onClick={addCell}>+</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Piano keyboard */}
      <div className={styles.pianoSection}>
        <h3 className={styles.sectionTitle}>Piano</h3>
        <PianoKeyboard
          scaleRoot={scaleRoot}
          scaleKey={scaleKey}
          selectedChord={pianoSelectedChord}
          instrument={instrument}
          playbackNotes={pianoPlaybackNotes}
          resetKey={selectedCellIndex}
          onPickInversion={selectedCellIndex !== null ? (invIdx, clickedOctave) => {
            const cell = prog.cells[selectedCellIndex];
            if (!cell?.chord) return;
            // Back-calculate the root's baseOctave from the clicked bass note's octave.
            // The bass note (intervals[invIdx]) sits at:
            //   bassOctave = baseOctave + floor((rootIdx + intervals[invIdx]) / 12)
            // So: baseOctave = clickedOctave - floor((rootIdx + intervals[invIdx]) / 12)
            const def = CHORD_TYPES[cell.chord.typeKey];
            const rootIdx = noteIndex(cell.chord.root);
            const bassInterval = def ? def.intervals[invIdx] ?? 0 : 0;
            const baseOctave = clickedOctave - Math.floor((rootIdx + bassInterval) / 12);
            const updated = { ...cell.chord, inversion: invIdx, octave: baseOctave };
            dispatch({
              type: 'SET_CELL_CHORD',
              progressionId: prog.id,
              cellIndex: selectedCellIndex,
              chord: updated,
            });
            dispatch({ type: 'SET_SELECTED_CELL_CHORD', chord: updated });
          } : undefined}
        />
      </div>
    </div>
  );
}
