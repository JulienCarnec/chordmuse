import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { ChordCell } from './ChordCell';
import { ScaleSelector } from '../ScaleSelector/ScaleSelector';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import styles from './ChordGrid.module.css';

const CELLS_PER_ROW = 8;

// Chunk an array into rows of at most `size`
function chunkRows(arr, size) {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

export function ChordGrid() {
  const { state, dispatch } = useAppState();
  const { progressions, activeProgressionId, isPlaying, playbackCursor, instrument } = state;
  const prog = progressions[activeProgressionId];
  const [transposeAmt, setTransposeAmt] = useState(0);

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
      </div>

      {/* Grid rows */}
      <div className={styles.gridRows}>
        {rows.map((row, rowIdx) => {
          const isLastRow = rowIdx === rows.length - 1;
          return (
            <div key={rowIdx} className={styles.row}>
              {row.map((cell, colIdx) => {
                const globalIdx = rowIdx * CELLS_PER_ROW + colIdx;
                return (
                  <div key={cell.id} className={styles.cellWrapper}>
                    <ChordCell
                      cell={cell}
                      cellIndex={globalIdx}
                      progressionId={prog.id}
                      scaleRoot={scaleRoot}
                      scaleKey={scaleKey}
                      isCurrent={
                        isPlaying &&
                        playbackCursor?.progressionId === prog.id &&
                        playbackCursor?.cellIndex === globalIdx
                      }
                      onSetChord={(pid, ci, chord) =>
                        dispatch({ type: 'SET_CELL_CHORD', progressionId: pid, cellIndex: ci, chord })
                      }
                      onSplit={(pid, ci) =>
                        dispatch({ type: 'SPLIT_CELL', progressionId: pid, cellIndex: ci })
                      }
                      onUnsplit={(pid, ci) =>
                        dispatch({ type: 'UNSPLIT_CELL', progressionId: pid, cellIndex: ci })
                      }
                      onSetSubChord={(pid, ci, si, chord) =>
                        dispatch({ type: 'SET_SUB_CELL_CHORD', progressionId: pid, cellIndex: ci, subIndex: si, chord })
                      }
                    />
                    {/* Remove button on each cell */}
                    <button
                      className={styles.removeCell}
                      title="Remove this cell"
                      disabled={prog.cells.length <= 1}
                      onClick={() => removeCell(globalIdx)}
                    >×</button>
                  </div>
                );
              })}

              {/* Add button at the end of the last row only */}
              {isLastRow && (
                <button
                  className={styles.addCell}
                  title="Add a cell"
                  onClick={addCell}
                >+</button>
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
          selectedChord={firstChord}
          instrument={instrument}
        />
      </div>
    </div>
  );
}
