import { useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { usePlayback } from '../Playback/usePlayback';
import styles from './TrackEditor.module.css';

export function TrackEditor() {
  const { state, dispatch } = useAppState();
  const { track, progressions, progressionOrder, isPlaying, playbackCursor, bpm, timeSig, instrument, metronome } = state;
  const { play, stop } = usePlayback();

  function addToTrack(progressionId) {
    dispatch({ type: 'ADD_TO_TRACK', progressionId });
  }

  function playTrack() {
    // Flatten track into all cells with progression markers
    const allSegments = [];
    for (const { progressionId, repetitions } of track) {
      const prog = progressions[progressionId];
      if (!prog) continue;
      for (let r = 0; r < repetitions; r++) {
        allSegments.push({ cells: prog.cells, progressionId: prog.id });
      }
    }
    if (!allSegments.length) return;
    // Play first segment (full track playback with cursor is a future enhancement)
    play({
      cells: allSegments.flatMap(s => s.cells),
      progressionId: allSegments[0].progressionId,
      bpm, timeSig, instrument,
      playStyle: 'block', noteValue: '4n',
      metronome,
    });
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Track Editor</h2>
        <div className={styles.actions}>
          <button className={styles.playBtn} onClick={isPlaying ? stop : playTrack}>
            {isPlaying ? '■ Stop' : '▶ Play Track'}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Left: available progressions */}
        <div className={styles.available}>
          <h3 className={styles.subTitle}>Progressions</h3>
          {progressionOrder.map(id => (
            <div key={id} className={styles.progItem}>
              <span>{progressions[id].name}</span>
              <button className={styles.addBtn} onClick={() => addToTrack(id)}>+ Add</button>
            </div>
          ))}
          {!progressionOrder.length && (
            <p className={styles.hint}>Create progressions in the Editor first.</p>
          )}
        </div>

        {/* Right: track arrangement */}
        <div className={styles.arrangement}>
          <h3 className={styles.subTitle}>Arrangement</h3>
          {!track.length && (
            <p className={styles.hint}>Add progressions from the left panel.</p>
          )}
          {track.map(({ progressionId, repetitions }, idx) => {
            const prog = progressions[progressionId];
            const isCurrentProg = isPlaying && playbackCursor?.progressionId === progressionId;
            return (
              <div key={idx} className={`${styles.trackItem} ${isCurrentProg ? styles.current : ''}`}>
                <span className={styles.trackName}>{prog?.name ?? '?'}</span>
                <label className={styles.repLabel}>×</label>
                <input
                  type="number"
                  className={styles.repInput}
                  value={repetitions}
                  min={1} max={99}
                  onChange={e => dispatch({ type: 'SET_TRACK_REPETITIONS', index: idx, repetitions: Number(e.target.value) })}
                />
                <button className={styles.moveBtn} disabled={idx === 0}
                  onClick={() => dispatch({ type: 'REORDER_TRACK', from: idx, to: idx - 1 })}>↑</button>
                <button className={styles.moveBtn} disabled={idx === track.length - 1}
                  onClick={() => dispatch({ type: 'REORDER_TRACK', from: idx, to: idx + 1 })}>↓</button>
                <button className={styles.removeBtn}
                  onClick={() => dispatch({ type: 'REMOVE_FROM_TRACK', index: idx })}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
