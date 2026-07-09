import { createContext, useContext, useReducer } from 'react';
import { CHROMATIC } from '../theory/notes';

// ─── Initial State ────────────────────────────────────────────────────────────

export const INITIAL_STATE = {
  // Global track settings
  bpm: 120,
  timeSig: '4/4',
  instrument: 'piano',
  metronome: { enabled: false, mode: 'click' }, // mode: 'click' | 'drum'

  // Playback
  isPlaying: false,
  isPaused: false,
  playbackCursor: null,        // { progressionId, cellIndex, notes }
  playbackActiveNotes: [],     // exact note+octave strings currently sounding

  // Currently selected cell chord (for piano roll highlight)
  selectedCellChord: null, // { root, typeKey }

  // Scale
  scaleRoot: null,
  scaleKey: null,

  // Chord progressions map: id -> progression
  progressions: {},
  progressionOrder: [],

  // Track arrangement: array of { progressionId, repetitions }
  track: [],
  trackName: '',
  trackDescription: '',

  // Active view: 'chords' | 'track'
  activeView: 'track',
  activeProgressionId: null,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BPM':
      return { ...state, bpm: action.bpm };
    case 'SET_TIME_SIG':
      return { ...state, timeSig: action.timeSig };
    case 'SET_INSTRUMENT':
      return { ...state, instrument: action.instrument };
    case 'SET_METRONOME':
      return { ...state, metronome: { ...state.metronome, ...action.payload } };

    case 'SET_SCALE':
      return { ...state, scaleRoot: action.root, scaleKey: action.key };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing, isPaused: false, playbackActiveNotes: [] };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.paused };
    case 'SET_PLAYBACK_CURSOR':
      return { ...state, playbackCursor: action.cursor };
    case 'SET_PLAYBACK_NOTES':
      return {
        ...state,
        playbackActiveNotes: action.notes ?? [],
        playbackNotesDuration: action.durationMs ?? 900,
      };
    case 'SET_SELECTED_CELL_CHORD':
      return { ...state, selectedCellChord: action.chord };

    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'SET_ACTIVE_PROGRESSION':
      return { ...state, activeProgressionId: action.id };

    case 'CREATE_PROGRESSION': {
      const { id, name, size } = action;
      const cells = Array.from({ length: size }, (_, i) => ({
        id: `${id}-cell-${i}`,
        chord: null,   // { root, typeKey }
        split: false,
        subCells: [null, null],
      }));
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [id]: { id, name, cells, scaleRoot: null, scaleKey: null },
        },
        progressionOrder: [...state.progressionOrder, id],
        activeProgressionId: id,
      };
    }

    case 'DELETE_PROGRESSION': {
      const { [action.id]: _, ...rest } = state.progressions;
      return {
        ...state,
        progressions: rest,
        progressionOrder: state.progressionOrder.filter(id => id !== action.id),
        activeProgressionId:
          state.activeProgressionId === action.id
            ? state.progressionOrder.find(id => id !== action.id) ?? null
            : state.activeProgressionId,
      };
    }

    case 'SET_CELL_PLAY_STYLE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex
          ? { ...cell, playStyle: action.playStyle, noteValue: action.noteValue }
          : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_SUB_CELL_PLAY_STYLE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) => {
        if (i !== action.cellIndex || !cell.split) return cell;
        const subCells = cell.subCells.map((sc, si) =>
          si === action.subIndex && sc
            ? { ...sc, playStyle: action.playStyle, noteValue: action.noteValue }
            : sc
        );
        return { ...cell, subCells };
      });
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'ADD_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const newCell = {
        id: `${action.progressionId}-cell-${Date.now()}`,
        chord: null,
        split: false,
        subCells: [null, null],
      };
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, cells: [...prog.cells, newCell] },
        },
      };
    }

    case 'REMOVE_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog || prog.cells.length <= 1) return state;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: {
            ...prog,
            cells: prog.cells.filter((_, i) => i !== action.cellIndex),
          },
        },
      };
    }

    // Move cell from fromIndex to toIndex (insert before toIndex after removal).
    case 'MOVE_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex || fromIndex === toIndex - 1) return state;
      const cells = [...prog.cells];
      const [moved] = cells.splice(fromIndex, 1);
      // After removal toIndex may shift by -1 if we removed before it
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      cells.splice(insertAt, 0, moved);
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    // Copy cell: insert a deep clone at toIndex without removing the source.
    case 'COPY_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const { fromIndex, toIndex } = action;
      const cells = [...prog.cells];
      const src = cells[fromIndex];
      const clone = JSON.parse(JSON.stringify(src));
      clone.id = `${action.progressionId}-cell-${Date.now()}`;
      // Give each sub-cell a fresh identity too
      if (clone.subCells) {
        clone.subCells = clone.subCells.map((sc, i) =>
          sc ? { ...sc } : sc
        );
      }
      cells.splice(toIndex, 0, clone);
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'RENAME_PROGRESSION':
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.id]: { ...state.progressions[action.id], name: action.name },
        },
      };

    case 'SET_CELL_CHORD': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, chord: action.chord } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SPLIT_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, split: true, subCells: [cell.chord, null] } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'UNSPLIT_CELL': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) =>
        i === action.cellIndex ? { ...cell, split: false, subCells: [null, null] } : cell
      );
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_SUB_CELL_CHORD': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const cells = prog.cells.map((cell, i) => {
        if (i !== action.cellIndex) return cell;
        const subCells = [...cell.subCells];
        subCells[action.subIndex] = action.chord;
        return { ...cell, subCells };
      });
      return {
        ...state,
        progressions: { ...state.progressions, [action.progressionId]: { ...prog, cells } },
      };
    }

    case 'SET_PROGRESSION_SCALE': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, scaleRoot: action.root, scaleKey: action.key },
        },
      };
    }

    case 'TRANSPOSE_PROGRESSION': {
      const prog = state.progressions[action.progressionId];
      if (!prog) return state;
      const semitones = action.semitones;
      const transposedCells = prog.cells.map(cell => ({
        ...cell,
        chord: cell.chord
          ? { ...cell.chord, root: transposeNoteLocal(cell.chord.root, semitones) }
          : null,
        subCells: cell.subCells.map(sc =>
          sc ? { ...sc, root: transposeNoteLocal(sc.root, semitones) } : null
        ),
      }));
      const newRoot = prog.scaleRoot ? transposeNoteLocal(prog.scaleRoot, semitones) : null;
      return {
        ...state,
        progressions: {
          ...state.progressions,
          [action.progressionId]: { ...prog, cells: transposedCells, scaleRoot: newRoot },
        },
      };
    }

    case 'ADD_TO_TRACK':
      return { ...state, track: [...state.track, { progressionId: action.progressionId, repetitions: 1 }] };
    case 'REMOVE_FROM_TRACK':
      return { ...state, track: state.track.filter((_, i) => i !== action.index) };
    case 'SET_TRACK_REPETITIONS': {
      const track = state.track.map((item, i) =>
        i === action.index ? { ...item, repetitions: action.repetitions } : item
      );
      return { ...state, track };
    }
    case 'REORDER_TRACK': {
      const track = [...state.track];
      const [moved] = track.splice(action.from, 1);
      // Adjust destination after removal
      const insertAt = action.from < action.to ? action.to - 1 : action.to;
      track.splice(insertAt, 0, moved);
      return { ...state, track };
    }

    case 'COPY_TRACK_ITEM': {
      const track = [...state.track];
      const clone = { ...track[action.from] };
      track.splice(action.to, 0, clone);
      return { ...state, track };
    }

    case 'SET_TRACK_NAME':
      return { ...state, trackName: action.name };
    case 'SET_TRACK_DESCRIPTION':
      return { ...state, trackDescription: action.description };

    case 'LOAD_PROJECT':
      return { ...INITIAL_STATE, ...action.project };

    default:
      return state;
  }
}

// Local helper to avoid circular import
function transposeNoteLocal(note, semitones) {
  const flat2sharp = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const n = flat2sharp[note] ?? note;
  const idx = CHROMATIC.indexOf(n);
  if (idx === -1) return note;
  return CHROMATIC[(idx + semitones + 120) % 12];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  return useContext(AppContext);
}
