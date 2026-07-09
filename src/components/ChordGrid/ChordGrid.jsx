import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { ChordCell } from './ChordCell';
import { ScaleSelector } from '../ScaleSelector/ScaleSelector';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import styles from './ChordGrid.module.css';

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
  const scaleKey = prog.scaleKey ?? state.scaleKey;

  // Determine first chord for scale highlighting hints
  const firstCell = prog.cells.find(c => c.chord);
  const firstChord = firstCell?.chord ?? null;

  function handleScaleChange({ root, key }) {
    dispatch({ type: 'SET_PROGRESSION_SCALE', progressionId: prog.id, root, key });
  }

  function handleTranspose() {
    if (transposeAmt === 0) return;
    dispatch({ type: 'TRANSPOSE_PROGRESSION', progressionId: prog.id, semitones: transposeAmt });
    setTransposeAmt(0);
  }

  return (
    <div className={styles.wrapper}>
      {/* Scale + controls bar */}
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
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {prog.cells.map((cell, i) => (
          <ChordCell
            key={cell.id}
            cell={cell}
            cellIndex={i}
            progressionId={prog.id}
            scaleRoot={scaleRoot}
            scaleKey={scaleKey}
            isCurrent={
              isPlaying &&
              playbackCursor?.progressionId === prog.id &&
              playbackCursor?.cellIndex === i
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
        ))}
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
