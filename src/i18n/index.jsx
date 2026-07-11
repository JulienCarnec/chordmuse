/**
 * Minimal i18n for English / French.
 * Note names always stay in American notation (A B C D E F G).
 *
 * Usage:
 *   const t = useT();
 *   t('save')  →  "Save" (en) or "Enregistrer" (fr)
 */

import { createContext, useContext, useState } from 'react';

// ─── Dictionaries ─────────────────────────────────────────────────────────────

const en = {
  // TopBar
  appTitle:           'Chordmuse',
  track:              'Track',
  bpm:                'BPM',
  bpmTitle:           'Tempo in beats per minute',
  bpmDecTitle:        'Decrease tempo by 1 BPM',
  bpmIncTitle:        'Increase tempo by 1 BPM',
  playTitle:          'Play',
  pauseTitle:         'Pause',
  stopTitle:          'Stop',
  resumeTitle:        'Resume',
  hum:                'Human.',
  humTitle:           'Humanize: add subtle timing/velocity variation',
  velocity:           'Velocity',
  velocityTitle:      'Max velocity: controls how hard notes are struck',
  reverb:             'Reverb',
  reverbTitle:        'Reverb wet level',
  grooveStraight:     'Straight',
  grooveShuffle:      'Shuffle',
  grooveSwing:        'Swing',
  grooveTitle:        'Rhythmic groove: straight, shuffle (triplet feel) or swing',
  closeEditor:        'Close editor and return to track',
  saveTitle:          'Save project to file',
  loadTitle:          'Load project from file',
  exportMidiTitle:    'Export as MIDI file',
  exportPdfTitle:     'Export track sheet as PDF',
  timeSigTitle:       'Time signature',
  instrumentTitle:    'Select instrument',

  // TrackEditor
  trackNamePlaceholder:  'Track name…',
  trackNameTitle:     'Click to edit the track name',
  trackDescPlaceholder:  'Track description, notes, lyrics…',
  trackDescTitle:     'Add notes, lyrics or a description for this track',
  time:               'Time',
  instrument:         'Instrument',
  progressions:       'Chord Grids',
  arrangement:        'Arrangement',
  dragHint:           'drag to reorder · Ctrl+drag to copy',
  addProgressionHint: 'Create your first chord grid.',
  addArrangementHint: 'Add chord grids from the left panel.',
  newProgBtn:         'Create',
  newProgBtnTitle:    'Create a new chord grid with this name',
  newGridLabel:       'New Grid',
  newGridDialogTitle: 'New Chord Grid',
  newGridNameLabel:   'Name',
  newGridSizeLabel:   'Number of cells',
  editBtn:            '✎ Edit',
  addToTrackBtn:      '+ Add',
  numberOfCells:      'Number of cells',
  numberOfCellsTitle: 'How many cells (bars) this chord grid will have',
  presetNames:        ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Break', 'Drop', 'Outro'],
  clickToRename:      'Click to rename',
  deleteProgTitle:    'Delete chord grid',
  addToTrackTitle:    'Add to arrangement',
  editProgTitle:      'Edit this chord grid',
  deleteConfirmMsg:   (name) => <>Delete {name}?</>,
  deleteConfirmSub:   'This cannot be undone. Any track entries using it will be removed.',
  cancelBtn:          'Cancel',
  deleteBtn:          'Delete',
  dragHandleTitle:    'Drag to reorder · Ctrl+drag to copy',
  repetitionsTitle:   'Number of times this section repeats',
  removeFromTrackTitle: 'Remove from arrangement',
  clearChordTitle:    '— clear chord —',
  collapseItem:       'Collapse',
  expandItem:         'Expand',
  duplicateProgTitle: 'Duplicate this chord grid',

  // ChordGrid
  scalePanel:         'Scale',
  patternPanel:       'Pattern',
  patternGlobalHint:  'global default',
  transpose:          'Transpose',
  transposeInputTitle:'Semitones to transpose (negative = down)',
  semitones:          'st',
  applyBtn:           'Apply',
  applyTransposeTitle:'Apply transposition to all chords in this grid',
  autoPlay:           'Auto-play',
  autoPlayTitle:      'Automatically preview chords when a cell is selected',
  helpToggleTitle:    'Show or hide the getting started guide',
  cellCount:          (n) => `${n} cell${n !== 1 ? 's' : ''}`,
  addCellTitle:       'Add a cell',
  removeCellTitle:    'Remove this cell',
  noGridSelected:     'No chord grid selected.',
  pianoTitle:         'Piano',
  splitCellTitle:     'Split cell into two sub-cells',
  mergeCellTitle:     'Merge sub-cells back into one',
  customPatternTitle:    'Custom pattern active — click to edit',
  globalPatternTitle:    'Using global pattern — click to override per cell',
  chooseInversionTitle:  'Choose inversion / octave',
  inversionRoot:         'Root position',
  inversionNth:       (n, note) => `${n === 1 ? '1st' : n === 2 ? '2nd' : '3rd'} inversion (bass: ${note})`,
  notesLabel:         'Notes:',
  octaveLabel:        'Oct',
  octaveTitle:        'Base octave for this chord (1–8)',
  showHelp:           '? Help',
  hideHelp:           '✕ Hide help',
  reverbLabel:        'Reverb',
  newGridNamePlaceholder: 'Name or pick below…',
  newGridNameTitle:   'Name for the new chord grid',
  cellsLabel:         'Cells',
  cellsInputTitle:    'Number of cells (bars) in the new grid',
  newGridNameRequired:'Enter a chord grid name first',
  newGridBtn:         '+ New',
  deleteGridTitle:    'Delete this chord grid',

  // Chord-cell role tooltip
  roleTooltip: {
    'in-scale':       'This chord fits in the active scale.',
    'dominant-I':     'Dominant of I (V7): creates tension that resolves back to the tonic.',
    'dominant-II':    'Secondary dominant (V7/II): dominant of degree II, adds colour outside the scale.',
    'subdominant-I':  'Subdominant of I (IV7): a soft pre-dominant colour derived from the scale.',
    'subdominant-II': 'Subdominant of II (II7): a secondary pre-dominant, adds mild tension.',
  },

  // Piano keyboard
  pianoLegendScale:       'Scale',
  pianoLegendHighlighted: 'Highlighted',
  pianoLegendAttack:      'Attack',
  pianoLegendSustain:     'Sustain',
  pianoPlayScale:         '▶ Scale',
  pianoPlayHighlighted:   '▶ Play highlighted',
  pianoClear:             'Clear',
  pianoInvHint:           'Click the note you want as the bass note',
  undefinedChord:      'undefined chord',
  dragChordToCell:        'Drag to drop this chord into a cell',

  // Guitar fretboard
  guitarTitle:            'Guitar',
  showPiano:              '🎹 Piano',
  showGuitar:             '🎸 Guitar',

  // PatternControls
  globalOption:       '— global —',
  newPattern:         '✎ New pattern…',
  unsavedPattern:     '✎ (unsaved pattern)',
  editPattern:        '✎ Edit',
  loop:               'Loop',
  patternSelectTitle: 'Choose a rhythm pattern',
  noteValueTitle:     'Step duration (note value per beat)',
  loopTitle:          'Loop pattern to fill the whole bar',

  // Help screen (shown on empty progressions)
  helpTitle:          'Getting started',
  helpStep1Title:     '1. Choose a scale',
  helpStep1Body:      'Pick a root note and a mode in the Scale panel. This colours the chords to show how they relate to your key.',
  helpStep2Title:     '2. Click a cell to assign a chord',
  helpStep2Body:      'Click the chord name (or the + sign) inside any cell to open the chord picker. Chords are sorted by harmonic role: in-scale first, then dominant and subdominant substitutes.',
  helpStep3Title:     '3. Set an inversion (optional)',
  helpStep3Body:      'Below each chord label you\'ll see the chord\'s notes as small buttons. Click any note to set that note as the bass — creating a slash chord (e.g. C/E).',
  helpStep4Title:     '4. Choose a pattern',
  helpStep4Body:      'The Pattern panel sets how chords are played globally. You can also override the pattern per cell using the ♩ button inside a cell.',
  helpStep5Title:     '5. Split a cell',
  helpStep5Body:      'Click ⊢ to split a cell into two sub-cells — useful for fitting two chords into one bar.',
  helpStep6Title:     '6. Play back',
  helpStep6Body:      'Press Play in the toolbar. The active cell is highlighted in blue. Use the Piano keyboard at the bottom to preview individual chords.',

  // PatternEditorDialog
  patternEditorTitle:    'Pattern Editor',
  loadPatternLabel:      'Load pattern',
  loadPatternPlaceholder:'— choose to load —',
  patternStringLabel:    'Pattern string',
  syntaxOk:              '✓ Syntax OK',
  syntaxError:           (msg) => `✗ ${msg}`,
  stepGridLabel:         'Step grid',
  loopToFillBar:         'Loop to fill bar',
  saveAsLabel:           'Save as',
  patternNamePlaceholder:'Pattern name…',
  saveBtn:               'Save',
  saveBtnTitleInvalid:   'Fix syntax errors before saving',
  saveBtnTitleNoName:    'Enter a name',
  saveBtnTitleOk:        'Save pattern',
  playPreview:           '▶ Play preview',
  stopPreview:           '■ Stop preview',
  playBtnTitleInvalid:   'Fix syntax errors before playing',
  previewingWithC:       'Previewing with C major chord',
  closeBtnTitleInvalid:  'Fix syntax errors before closing',
  close:                 'Close',
  syntaxRef:             'Syntax reference',
  syntaxIntro:           "Wrap the whole pattern in { }. Steps are separated by commas.",
  helpColToken:          'Token',
  helpColMeaning:        'Meaning',
  helpColExample:        'Example',
  helpA1Meaning:         'Note a (lowest chord note) at octave 4',
  helpA0Meaning:         'Note a one octave lower (oct 3)',
  helpA2Meaning:         'Note a one octave higher (oct 5)',
  helpBCDMeaning:        '2nd, 3rd, 4th… chord note',
  helpBCDExample:        '(7th chord)',
  helpGroupMeaning:      'Play notes simultaneously',
  helpDotMeaning:        'Staccato — very short note',
  helpRestMeaning:       'Rest — one step of silence',
  helpRestExample:       '= note, rest, note',
  helpLoopNote:          'Loop: when checked, the pattern repeats to fill the whole bar. When unchecked, it plays once then goes silent.',
  helpStepNote:          'Step grid: each token lasts one step of the chosen note value (e.g. 8n = eighth note).',
  helpReggaeLabel:       'Reggae off-beat:',
  helpArpLabel:          'Ascending arp:',
  helpBachLabel:         'Bach figure:',

  // ScaleSelector
  scaleRootPlaceholder:  '— root —',
  scaleModePlaceholder:  '— mode —',
  scaleLabel:            'Scale',
  scaleRootTitle:        'Select the root note of the scale',
  scaleModeTitle:        'Select the scale mode (major, minor, dorian…)',
  scaleNames: {
    ionian:          'Ionian (Major)',
    dorian:          'Dorian',
    phrygian:        'Phrygian',
    lydian:          'Lydian',
    mixolydian:      'Mixolydian',
    aeolian:         'Aeolian (Natural Minor)',
    locrian:         'Locrian',
    minorNatural:    'Natural Minor',
    minorMelodic:    'Melodic Minor',
    minorHarmonic:   'Harmonic Minor',
    majorPentatonic: 'Major Pentatonic',
    minorPentatonic: 'Minor Pentatonic',
    blues:           'Blues',
    diminished:      'Diminished',
    oriental:        'Oriental',
    doubleHarmonic:  'Double Harmonic',
    harmonicMajor:   'Harmonic Major',
    tritone:         'Tritone',
  },

  // Cell duration
  cellDurationLabel:     'Cell length',
  cellDurationTitle:     'Duration of each cell in the grid',
  cellDurationWhole:     '𝅝 Whole (ronde)',
  cellDurationHalf:      '𝅗𝅥 Half (blanche)',
  cellDurationQuarter:   '♩ Quarter (noire)',
  cellDurationEighth:    '♪ Eighth (croche)',

  // Drum Sequencer panel
  drumEnable:            'Enable drum sequencer',
  drumDisable:           'Disable drum sequencer',
  drumOnLabel:           'ON',
  drumOffLabel:          'OFF',
  drumSeqTitle:          'Drum Sequencer',
  drumSeqCollapse:       'Collapse drum sequencer',
  drumSeqExpand:         'Expand drum sequencer',
  drumPresetLabel:       'Preset',
  drumPresetPlaceholder: '— load preset —',
  drumPresetConfirm:     'Replace the current pattern with this preset?',
  drumSaveLabel:         'Save as',
  drumSaveNamePlaceholder: 'Pattern name…',
  drumSaveBtn:           'Save',
  drumDeleteBtn:         'Delete',
  drumDeleteConfirm:     (name) => `Delete pattern "${name}"?`,
  drumAssignLabel:       'Assign to section',
  drumAssignTitle:       'Assign this drum pattern to an arrangement section',
  drumAssignPopupTitle:  (name) => `Assign "${name}" to:`,
  drumBadgeTitle:        (name) => `Drum pattern: ${name}`,
  drumBadgeRemoveTitle:  'Remove drum pattern from this section',
  drumClearBtn:          'Clear',
  drumStepTitle:         (step) => `Step ${step + 1}`,
  drumVelTitle:          'Right-click to cycle velocity',
  drumVolLabel:          'Vol',
  drumReverbLabel:       'Rev',
  drumSampleLabel:       'Sound',
  drumRowLabelHH:        'Hi-Hat',
  drumRowLabelSnare:     'Snare',
  drumRowLabelBD:        'Bass Drum',
  drumRowLabelCustom:    'Custom',
  drumPlayingStep:       'Current step',
  // Sample list: { value, label } pairs shown in the SamplePicker dropdown.
  // Values match keys in SAMPLE_CATALOGUE (useDrumSequencer.js).
  drumSamples: [
    // ── Kick ──────────────────────────────────────────────────────────────────
    { value: 'kick',           label: 'Kick — CR78'            },  // kick-cr78.mp3
    { value: 'kick-acoustic',  label: 'Kick — Kit 3'           },  // kick-kit3.mp3
    { value: 'kick-tight',     label: 'Kick — Kit 8'           },  // kick-kit8.mp3
    // ── Snare ─────────────────────────────────────────────────────────────────
    { value: 'side-stick',     label: 'Snare — CR78 (rim)'     },  // snare-cr78.mp3 (soft)
    { value: 'snare',          label: 'Snare — CR78'           },  // snare-cr78.mp3
    { value: 'clap',           label: 'Clap — Roland SC-88'    },  // clap-roland.wav
    { value: 'snare-electric', label: 'Snare — Kit 8'          },  // snare-kit8.mp3
    { value: 'snare-brush',    label: 'Snare — Kit 3'          },  // snare-kit3.mp3
    // ── Hi-Hat ────────────────────────────────────────────────────────────────
    { value: 'hh-closed',      label: 'Hi-Hat Closed — CR78'   },  // hihat-closed-cr78.mp3
    { value: 'hh-pedal',       label: 'Hi-Hat Closed — Roland' },  // hihat-closed-roland.wav
    { value: 'hh-open',        label: 'Hi-Hat Open — Korg M1'  },  // hihat-open-korg.wav
    // ── Toms (GM 41, 43, 45, 47, 48, 50) ─────────────────────────────────────
    { value: 'tom-floor-lo',   label: 'Low Floor Tom'    },  // GM 41 — F1
    { value: 'tom-floor-hi',   label: 'High Floor Tom'   },  // GM 43 — G1
    { value: 'tom-lo',         label: 'Low Tom'          },  // GM 45 — A1
    { value: 'tom-lo-mid',     label: 'Low-Mid Tom'      },  // GM 47 — B1
    { value: 'tom-hi-mid',     label: 'Hi Mid Tom'       },  // GM 48 — C2
    { value: 'tom-hi',         label: 'High Tom'         },  // GM 50 — D2
    // ── Cymbals ───────────────────────────────────────────────────────────────
    { value: 'crash',          label: 'Crash — Berklee 1'      },  // crash-berklee1.mp3
    { value: 'ride',           label: 'Ride — Berklee'         },  // ride-berklee1.mp3
    { value: 'chinese-cymbal', label: 'Crash — Berklee 2 (alt)'},  // crash-berklee2.mp3
    { value: 'ride-bell',      label: 'Ride — Roland SC-88'    },  // ride-roland.wav
    { value: 'splash',         label: 'Crash — Berklee 1 (soft)'},  // crash-berklee1.mp3
    { value: 'crash-2',        label: 'Crash — Berklee 2'      },  // crash-berklee2.mp3
    { value: 'ride-2',         label: 'Ride — Roland SC-88'    },  // ride-roland.wav
    // ── Cowbell / Latin (GM 54, 56, 58) ──────────────────────────────────────
    { value: 'tambourine',     label: 'Tambourine'       },  // GM 54 — F#2
    { value: 'cowbell',        label: 'Cowbell'          },  // GM 56 — Ab2
    { value: 'vibraslap',      label: 'Vibraslap'        },  // GM 58 — Bb2
    // ── Bongos (GM 60–61) ─────────────────────────────────────────────────────
    { value: 'bongo-hi',       label: 'Hi Bongo'         },  // GM 60 — C3
    { value: 'bongo-lo',       label: 'Low Bongo'        },  // GM 61 — C#3
    // ── Congas (GM 62–64) ─────────────────────────────────────────────────────
    { value: 'conga-mute',     label: 'Mute Hi Conga'    },  // GM 62 — D3
    { value: 'conga-hi',       label: 'Open Hi Conga'    },  // GM 63 — Eb3
    { value: 'conga-lo',       label: 'Low Conga'        },  // GM 64 — E3
    // ── Timbales (GM 65–66) ───────────────────────────────────────────────────
    { value: 'timbale-hi',     label: 'High Timbale'     },  // GM 65 — F3
    { value: 'timbale-lo',     label: 'Low Timbale'      },  // GM 66 — F#3
    // ── Agogo (GM 67–68) ──────────────────────────────────────────────────────
    { value: 'agogo-hi',       label: 'High Agogo'       },  // GM 67 — G3
    { value: 'agogo-lo',       label: 'Low Agogo'        },  // GM 68 — Ab3
    // ── Shakers (GM 69–70) ────────────────────────────────────────────────────
    { value: 'cabasa',         label: 'Cabasa'           },  // GM 69 — A3
    { value: 'maracas',        label: 'Maracas'          },  // GM 70 — Bb3
    // ── Wood / Claves (GM 75–77) ──────────────────────────────────────────────
    { value: 'claves',         label: 'Claves'           },  // GM 75 — Eb4
    { value: 'wood-block-hi',  label: 'Hi Wood Block'    },  // GM 76 — E4
    { value: 'wood-block-lo',  label: 'Low Wood Block'   },  // GM 77 — F4
    // ── Triangle (GM 80–81) ───────────────────────────────────────────────────
    { value: 'triangle-mute',  label: 'Mute Triangle'    },  // GM 80 — Ab4
    { value: 'triangle-open',  label: 'Open Triangle'    },  // GM 81 — A4
  ],

  // ── Help panel — labels, titles, descriptions ─────────────────────────────
  helpLabel:        'Help',
  helpCGEditorTitle: 'Chord Grid Editor',
  helpCGEditorDesc:  'A chord grid is a sequence of cells, each holding one chord. Use grids to build the harmonic content of a song section — verse, chorus, bridge — then arrange them in the Track Editor to form a full song.',
  helpTEEditorTitle: 'Track Editor',
  helpTEEditorDesc:  'The Track Editor is where you assemble your song. Start by creating chord grids in the left panel, then add them to the Arrangement to define the order, repetitions, and drum patterns for each section.',

  // ── Help panel — Chord Grid Editor (step-by-step) ─────────────────────────
  helpCGSteps: [
    {
      number: 1,
      title: 'Choose a scale',
      summary: 'Pick a root note and mode in the Scale panel. Chord cells colour-code automatically: green = in-scale, amber = dominant, purple = subdominant.',
      actions: [
        { title: 'Root & Mode selectors', body: 'Click the first dropdown to pick the root note (C, D♭, …), then the second to pick the mode (Major, Dorian, Minor…).' },
        { title: 'Cell length', body: 'The "Cell length" selector sets how long each cell lasts when played: Whole, Half, Quarter or Eighth note.' },
      ],
    },
    {
      number: 2,
      title: 'Assign chords to cells',
      summary: 'Click any cell (or the + inside it) to open the chord picker. Chords are sorted by harmonic role — in-scale chords appear first.',
      actions: [
        { title: 'Chord picker', body: 'Click the chord name label or the + sign in an empty cell. Scroll through chord types; click one to assign it.' },
        { title: 'Add / remove cells', body: 'Click + (green dashed button) to add a cell at the end. Click × below any cell to delete it (disabled when only one cell remains).' },
        { title: 'Split a cell', body: 'Click ⊢ to split a cell into two sub-cells — place two chords within one bar. Click ⊣ to merge them back.' },
        { title: 'Drag to reorder', body: 'Grab a cell and drag it left or right to reorder. Hold Ctrl while releasing to copy instead of move.' },
      ],
    },
    {
      number: 3,
      title: 'Refine voicings',
      summary: 'Adjust the inversion and octave of any assigned chord to control which note sounds in the bass and how high the chord sits.',
      actions: [
        { title: 'Set an inversion', body: 'After selecting a cell, click any note button shown beneath the chord name to make that note the bass — creating a slash chord (e.g. C/E).' },
        { title: 'Octave picker', body: 'Use the Oct ▾ selector inside a cell to shift the base octave up or down.' },
        { title: 'Pick inversion on Piano', body: 'With a cell selected, click the desired bass note on the Piano keyboard to set the inversion directly.' },
      ],
    },
    {
      number: 4,
      title: 'Set a playback pattern',
      summary: 'The Pattern panel defines how chords are played — strummed, arpeggiated, or a custom figure. The setting is global by default but can be overridden per cell.',
      actions: [
        { title: 'Global pattern', body: 'Use the Pattern dropdown in the panel to pick a built-in style (block chord, arpeggio up, reggae…). Changes apply to the whole grid unless a cell overrides it.' },
        { title: 'Note value & loop', body: 'The note value sets the step duration; Loop repeats the pattern to fill the bar.' },
        { title: 'Per-cell override', body: 'Click the ♩ button inside a cell to set a different pattern for that cell only.' },
        { title: 'Custom pattern editor', body: 'Choose "✎ New pattern…" to open the step editor. Write a pattern string, preview it, name it, and save for reuse.' },
      ],
    },
    {
      number: 5,
      title: 'Use Piano & Guitar',
      summary: 'Toggle the visualisers below the grid to explore scales, build chords by ear, or pick inversions visually.',
      actions: [
        { title: 'Show / hide', body: 'Click 🎹 Piano or 🎸 Guitar above the visualiser section to toggle each instrument.' },
        { title: 'Play Scale', body: 'Click "▶ Scale" to hear and see the scale notes animate in sequence on the keyboard.' },
        { title: 'Manual highlight', body: 'Click any key or fret to light it up. Build a chord manually — when recognised, the chord label appears and can be dragged into a cell.' },
      ],
    },
    {
      number: 6,
      title: 'Play back',
      summary: 'Press Play in the toolbar. The active cell highlights in blue. Use Pause to hold position, Stop to reset.',
      actions: [
        { title: 'Play / Pause / Stop', body: 'Use the ▶ / ⏸ / ■ buttons in the top bar. Playback loops the grid continuously until stopped.' },
        { title: 'Transpose the grid', body: 'Enter a semitone count (+ for up, − for down) in the Transpose field and click Apply to shift all chords at once.' },
        { title: 'Auto-play on select', body: 'When Auto-play is on, clicking a cell immediately plays the chord through the selected instrument.' },
      ],
    },
  ],

  // ── Help panel — Track Editor (step-by-step) ──────────────────────────────
  helpTESteps: [
    {
      number: 1,
      title: 'Name your track',
      summary: 'Give your song a name and optional description to keep things organised.',
      actions: [
        { title: 'Track name', body: 'Click the large text field at the top of the editor and type the track name.' },
        { title: 'Description', body: 'Use the text area below the name for lyrics, notes, chord symbols, or any other per-song context.' },
      ],
    },
    {
      number: 2,
      title: 'Create chord grids',
      summary: 'A chord grid is a named sequence of cells, each holding one chord. Create one grid per section of your song (Intro, Verse, Chorus…).',
      actions: [
        { title: 'New grid', body: 'Click "+ New Grid" at the bottom of the left panel. Enter a name (or pick a preset like Intro, Verse…), set the number of cells, and choose a default cell length.' },
        { title: 'Edit a grid', body: 'Click "✎ Edit" on a grid card to open the Chord Grid Editor. Use "Close editor →" to return.' },
        { title: 'Rename', body: 'Click the grid name on its card to edit it inline. Press Enter or click elsewhere to confirm, Esc to cancel.' },
        { title: 'Duplicate', body: 'Click ⧉ on a card to create an independent copy with all chords intact.' },
        { title: 'Delete', body: 'Click 🗑 on a card. Any arrangement entries using that grid are removed at the same time.' },
      ],
    },
    {
      number: 3,
      title: 'Build the arrangement',
      summary: 'Drag grids from the library into the Arrangement to define the play order of your song.',
      actions: [
        { title: 'Add a section', body: 'Click "+ Add" on a grid card to append it as the next section in the arrangement.' },
        { title: 'Reorder sections', body: 'Grab the ⠿ handle on a tile and drag it up or down to reorder. Hold Ctrl while dropping to copy the section.' },
        { title: 'Set repetitions', body: 'Use the × number input on a tile to set how many times that section repeats before moving on.' },
        { title: 'Collapse / expand', body: 'Click ▼ / ▶ on a tile header to hide or show the mini chord grid preview.' },
        { title: 'Remove a section', body: 'Click × in the tile controls to remove it from the arrangement. The grid in the library is unaffected.' },
      ],
    },
    {
      number: 4,
      title: 'Add drum patterns',
      summary: 'Open the Drum Sequencer (🥁 thumb on the right edge) to create beat patterns and assign them to specific arrangement sections.',
      actions: [
        { title: 'Open / collapse', body: 'Click the 🥁 thumb to expand the sequencer. Click ✕ in the header to collapse it again.' },
        { title: 'Enable / disable', body: 'Use the ON/OFF button in the sequencer header. OFF silences drums even if patterns are assigned.' },
        { title: 'Program a pattern', body: 'Click a step to toggle it (cycles: red = full velocity → orange → yellow → off). Adjust volume and reverb per row with the knobs.' },
        { title: 'Load a preset', body: 'Use the Preset dropdown to load a factory pattern (Rock, Funk, Bossa Nova…). Confirm if the current pattern has steps.' },
        { title: 'Save a pattern', body: 'Type a name in "Save as" and click Save. Existing name = update; new name = new entry.' },
        { title: 'Assign to a section', body: 'Click "📌 Assign to section" and pick a tile from the popup. A 🥁 badge appears on the tile.' },
        { title: 'Remove from section', body: 'Click × on the 🥁 badge in the arrangement tile to detach that pattern.' },
      ],
    },
    {
      number: 5,
      title: 'Play back',
      summary: 'Press Play in the toolbar to hear the full arrangement in order. Click any tile or cell to jump to that point.',
      actions: [
        { title: 'Play / Pause / Stop', body: 'Use ▶ / ⏸ / ■ in the top bar. The active section and chord highlight in real time.' },
        { title: 'Jump to a section', body: 'While playing, click a tile header or any chord cell in the mini-grid to seek to that position.' },
        { title: 'Instrument & tempo', body: 'Change instrument, BPM, time signature, groove, reverb and velocity in the TopBar. These apply to the whole track.' },
      ],
    },
    {
      number: 6,
      title: 'Save & export',
      summary: 'Your project is auto-saved to your browser. Use the toolbar buttons to export or share.',
      actions: [
        { title: 'Auto-save', body: 'The project is saved automatically in your browser\'s local storage every time you make a change. Reload the page to restore your last session.' },
        { title: 'Save to file', body: 'Click 💾 to download a .json project file. Use 📂 to load it back.' },
        { title: 'MIDI export', body: 'Click 🎼 to export the full arrangement as a MIDI file.' },
        { title: 'PDF export', body: 'Click 📄 to export a chord sheet as PDF.' },
        { title: 'Reset', body: 'Click ↺ Reset in the toolbar to clear everything and start from a blank project (confirmation required).' },
      ],
    },
  ],

  // Demo tracks
  demoBtn:               '🎵 Demo',
  demoBtnTitle:          'Load a demo track',
  demoConfirmTitle:      'Load demo track?',
  demoConfirmMsg:        'Loading a demo will replace your current project. Unsaved changes will be lost.',
  demoConfirmOk:         'Load demo',

  // Reset project
  resetBtn:              'Reset',
  resetTitle:            'Reset project — clear all grids and start fresh',
  resetConfirmTitle:     'Reset project?',
  resetConfirmMsg:       'This will clear all chord grids, arrangement, and drum patterns. This cannot be undone.',
  resetConfirmOk:        'Reset',

  // Language toggle
  languageLabel:         'FR',
};

const fr = {
  // TopBar
  appTitle:           'Chordmuse',
  track:              'Piste',
  bpm:                'BPM',
  bpmTitle:           'Tempo en battements par minute',
  bpmDecTitle:        'Diminuer le tempo d\'1 BPM',
  bpmIncTitle:        'Augmenter le tempo d\'1 BPM',
  playTitle:          'Lecture',
  pauseTitle:         'Pause',
  stopTitle:          'Arrêter',
  resumeTitle:        'Reprendre',
  hum:                'Human.',
  humTitle:           'Humaniser : ajouter de légères variations de tempo et de vélocité',
  velocity:           'Vélocité',
  velocityTitle:      'Vélocité max : contrôle la force des notes',
  reverb:             'Réverb',
  reverbTitle:        'Niveau de réverbération',
  grooveStraight:     'Régulier',
  grooveShuffle:      'Shuffle',
  grooveSwing:        'Swing',
  grooveTitle:        'Feeling rythmique : régulier, shuffle (triolets) ou swing',
  closeEditor:        'Fermer l\'éditeur et revenir à la piste',
  saveTitle:          'Enregistrer le projet dans un fichier',
  loadTitle:          'Charger un projet depuis un fichier',
  exportMidiTitle:    'Exporter en fichier MIDI',
  exportPdfTitle:     'Exporter la fiche en PDF',
  timeSigTitle:       'Signature rythmique',
  instrumentTitle:    'Choisir un instrument',

  // TrackEditor
  trackNamePlaceholder:  'Nom de la piste…',
  trackNameTitle:     'Cliquer pour modifier le nom de la piste',
  trackDescPlaceholder:  'Description, notes, paroles…',
  trackDescTitle:     'Ajouter des notes, paroles ou une description',
  time:               'Mesure',
  instrument:         'Instrument',
  progressions:       'Grilles d\'accords',
  arrangement:        'Arrangement',
  dragHint:           'glisser pour réordonner · Ctrl+glisser pour copier',
  addProgressionHint: 'Créez votre première grille d\'accords.',
  addArrangementHint: 'Ajoutez des grilles d\'accords depuis le panneau gauche.',
  newProgBtn:         'Créer',
  newProgBtnTitle:    'Créer une nouvelle grille d\'accords avec ce nom',
  newGridLabel:       'Nouvelle grille',
  newGridDialogTitle: 'Nouvelle grille d\'accords',
  newGridNameLabel:   'Nom',
  newGridSizeLabel:   'Nombre de cellules',
  editBtn:            '✎ Éditer',
  addToTrackBtn:      '+ Ajouter',
  numberOfCells:      'Nombre de cellules',
  numberOfCellsTitle: 'Nombre de cellules (mesures) dans cette grille',
  presetNames:        ['Intro', 'Couplet', 'Pré-refrain', 'Refrain', 'Pont', 'Break', 'Drop', 'Outro'],
  clickToRename:      'Cliquer pour renommer',
  deleteProgTitle:    'Supprimer la grille d\'accords',
  addToTrackTitle:    'Ajouter à l\'arrangement',
  editProgTitle:      'Éditer cette grille d\'accords',
  deleteConfirmMsg:   (name) => <>Supprimer {name} ?</>,
  deleteConfirmSub:   'Cette action est irréversible. Les entrées de la piste utilisant cette grille seront supprimées.',
  cancelBtn:          'Annuler',
  deleteBtn:          'Supprimer',
  dragHandleTitle:    'Glisser pour réordonner · Ctrl+glisser pour copier',
  repetitionsTitle:   'Nombre de répétitions de cette section',
  removeFromTrackTitle: 'Retirer de l\'arrangement',
  clearChordTitle:    '— effacer l\'accord —',
  collapseItem:       'Réduire',
  expandItem:         'Développer',
  duplicateProgTitle: 'Dupliquer cette grille d\'accords',

  // ChordGrid
  scalePanel:         'Gamme',
  patternPanel:       'Motif',
  patternGlobalHint:  'défaut global',
  transpose:          'Transposer',
  transposeInputTitle:'Demi-tons à transposer (négatif = vers le bas)',
  semitones:          'st',
  applyBtn:           'Appliquer',
  applyTransposeTitle:'Appliquer la transposition à tous les accords',
  autoPlay:           'Lecture auto',
  autoPlayTitle:      'Prévisualiser automatiquement les accords lors de la sélection',
  helpToggleTitle:    'Afficher ou masquer le guide de démarrage',
  cellCount:          (n) => `${n} cellule${n !== 1 ? 's' : ''}`,
  addCellTitle:       'Ajouter une cellule',
  removeCellTitle:    'Supprimer cette cellule',
  noGridSelected:     'Aucune grille d\'accords sélectionnée.',
  pianoTitle:         'Piano',
  splitCellTitle:     'Diviser la cellule en deux sous-cellules',
  mergeCellTitle:     'Fusionner les sous-cellules en une seule',
  customPatternTitle:    'Motif personnalisé actif — cliquer pour éditer',
  globalPatternTitle:    'Motif global actif — cliquer pour remplacer par cellule',
  chooseInversionTitle:  'Choisir le renversement / l\'octave',
  inversionRoot:         'Position fondamentale',
  inversionNth:       (n, note) => `${n === 1 ? '1er' : n === 2 ? '2e' : '3e'} renversement (basse : ${note})`,
  notesLabel:         'Notes :',
  octaveLabel:        'Oct',
  octaveTitle:        'Octave de base pour cet accord (1–8)',
  showHelp:           '? Aide',
  hideHelp:           '✕ Masquer l\'aide',
  reverbLabel:        'Réverb',
  newGridNamePlaceholder: 'Nom ou choisir ci-dessous…',
  newGridNameTitle:   'Nom de la nouvelle grille d\'accords',
  cellsLabel:         'Cellules',
  cellsInputTitle:    'Nombre de cellules (mesures) dans la nouvelle grille',
  newGridNameRequired:'Saisir un nom de grille d\'abord',
  newGridBtn:         '+ Nouvelle',
  deleteGridTitle:    'Supprimer cette grille d\'accords',

  // Chord-cell role tooltip
  roleTooltip: {
    'in-scale':       'Cet accord appartient à la gamme active.',
    'dominant-I':     'Dominante de I (V7) : crée une tension qui se résout sur la tonique.',
    'dominant-II':    'Dominante secondaire (V7/II) : dominante du degré II, colore en dehors de la gamme.',
    'subdominant-I':  'Sous-dominante de I (IV7) : couleur pré-dominante douce issue de la gamme.',
    'subdominant-II': 'Sous-dominante de II (II7) : pré-dominante secondaire, légère tension.',
  },

  // Piano keyboard
  pianoLegendScale:       'Gamme',
  pianoLegendHighlighted: 'Mis en évidence',
  pianoLegendAttack:      'Attaque',
  pianoLegendSustain:     'Tenu',
  pianoPlayScale:         '▶ Gamme',
  pianoPlayHighlighted:   '▶ Jouer la sélection',
  pianoClear:             'Effacer',
  pianoInvHint:           'Cliquez sur la note souhaitée comme basse',
  undefinedChord:      'accord indéterminé',
  dragChordToCell:        'Glisser pour déposer cet accord dans une cellule',

  // Guitar fretboard
  guitarTitle:            'Guitare',
  showPiano:              '🎹 Piano',
  showGuitar:             '🎸 Guitare',

  // PatternControls
  globalOption:       '— global —',
  newPattern:         '✎ Nouveau motif…',
  unsavedPattern:     '✎ (motif non enregistré)',
  editPattern:        '✎ Éditer',
  loop:               'Boucle',
  patternSelectTitle: 'Choisir un motif rythmique',
  noteValueTitle:     'Durée d\'un pas (valeur de note par temps)',
  loopTitle:          'Boucler le motif pour remplir la mesure',

  // Help screen (shown on empty progressions)
  helpTitle:          'Prise en main',
  helpStep1Title:     '1. Choisir une gamme',
  helpStep1Body:      'Sélectionnez une note fondamentale et un mode dans le panneau Gamme. Les cellules se colorent selon le rôle harmonique de chaque accord.',
  helpStep2Title:     '2. Cliquer sur une cellule pour assigner un accord',
  helpStep2Body:      'Cliquez sur le nom de l\'accord (ou le signe +) dans une cellule pour ouvrir le sélecteur. Les accords sont triés par rôle : dans la gamme en premier, puis les substitutions dominante et sous-dominante.',
  helpStep3Title:     '3. Choisir un renversement (optionnel)',
  helpStep3Body:      'Sous chaque accord apparaissent les notes sous forme de petits boutons. Cliquez sur une note pour la mettre à la basse — créant un accord de type C/E.',
  helpStep4Title:     '4. Choisir un motif rythmique',
  helpStep4Body:      'Le panneau Motif définit comment les accords sont joués globalement. Vous pouvez remplacer ce motif par cellule via le bouton ♩.',
  helpStep5Title:     '5. Diviser une cellule',
  helpStep5Body:      'Cliquez sur ⊢ pour diviser une cellule en deux sous-cellules — utile pour placer deux accords dans une même mesure.',
  helpStep6Title:     '6. Lecture',
  helpStep6Body:      'Appuyez sur Lecture dans la barre d\'outils. La cellule active est mise en évidence en bleu. Utilisez le piano en bas pour prévisualiser les accords.',

  // PatternControls
  globalOption:       '— global —',
  newPattern:         '✎ Nouveau motif…',
  unsavedPattern:     '✎ (motif non enregistré)',
  editPattern:        '✎ Éditer',
  loop:               'Boucle',

  // PatternEditorDialog
  patternEditorTitle:    'Éditeur de motif',
  loadPatternLabel:      'Charger un motif',
  loadPatternPlaceholder:'— choisir —',
  patternStringLabel:    'Chaîne de motif',
  syntaxOk:              '✓ Syntaxe correcte',
  syntaxError:           (msg) => `✗ ${msg}`,
  stepGridLabel:         'Grille de pas',
  loopToFillBar:         'Boucler pour remplir la mesure',
  saveAsLabel:           'Enregistrer sous',
  patternNamePlaceholder:'Nom du motif…',
  saveBtn:               'Enregistrer',
  saveBtnTitleInvalid:   'Corriger les erreurs de syntaxe avant d\'enregistrer',
  saveBtnTitleNoName:    'Saisir un nom',
  saveBtnTitleOk:        'Enregistrer le motif',
  playPreview:           '▶ Écouter',
  stopPreview:           '■ Arrêter',
  playBtnTitleInvalid:   'Corriger les erreurs de syntaxe avant d\'écouter',
  previewingWithC:       'Aperçu avec accord de Do majeur',
  closeBtnTitleInvalid:  'Corriger les erreurs de syntaxe avant de fermer',
  close:                 'Fermer',
  syntaxRef:             'Référence syntaxique',
  syntaxIntro:           'Entourer le motif entier avec { }. Les pas sont séparés par des virgules.',
  helpColToken:          'Symbole',
  helpColMeaning:        'Signification',
  helpColExample:        'Exemple',
  helpA1Meaning:         'Note a (note la plus basse) à l\'octave 4',
  helpA0Meaning:         'Note a une octave plus bas (oct 3)',
  helpA2Meaning:         'Note a une octave plus haut (oct 5)',
  helpBCDMeaning:        '2e, 3e, 4e… note de l\'accord',
  helpBCDExample:        '(accord de 7e)',
  helpGroupMeaning:      'Jouer les notes simultanément',
  helpDotMeaning:        'Staccato — note très courte',
  helpRestMeaning:       'Silence — un pas de silence',
  helpRestExample:       '= note, silence, note',
  helpLoopNote:          'Boucle : si coché, le motif se répète pour remplir la mesure. Sinon, il est joué une seule fois.',
  helpStepNote:          'Grille de pas : chaque symbole dure un pas de la valeur de note choisie (ex. 8n = croche).',
  helpReggaeLabel:       'Contretemps reggae :',
  helpArpLabel:          'Arpège ascendant :',
  helpBachLabel:         'Figure Bach :',

  // ScaleSelector
  scaleRootPlaceholder:  '— fondamentale —',
  scaleModePlaceholder:  '— mode —',
  scaleLabel:            'Gamme',
  scaleRootTitle:        'Choisir la note fondamentale de la gamme',
  scaleModeTitle:        'Choisir le mode (majeur, mineur, dorien…)',
  scaleNames: {
    ionian:          'Ionien (Majeur)',
    dorian:          'Dorien',
    phrygian:        'Phrygien',
    lydian:          'Lydien',
    mixolydian:      'Mixolydien',
    aeolian:         'Éolien (Mineur naturel)',
    locrian:         'Locrien',
    minorNatural:    'Mineur naturel',
    minorMelodic:    'Mineur mélodique',
    minorHarmonic:   'Mineur harmonique',
    majorPentatonic: 'Pentatonique majeure',
    minorPentatonic: 'Pentatonique mineure',
    blues:           'Blues',
    diminished:      'Diminuée',
    oriental:        'Orientale',
    doubleHarmonic:  'Double harmonique',
    harmonicMajor:   'Majeur harmonique',
    tritone:         'Triton',
  },

  // Cell duration
  cellDurationLabel:     'Durée de cellule',
  cellDurationTitle:     'Durée de chaque cellule dans la grille',
  cellDurationWhole:     '𝅝 Ronde',
  cellDurationHalf:      '𝅗𝅥 Blanche',
  cellDurationQuarter:   '♩ Noire',
  cellDurationEighth:    '♪ Croche',

  // Boîte à rythme
  drumEnable:            'Activer le séquenceur',
  drumDisable:           'Désactiver le séquenceur',
  drumOnLabel:           'ON',
  drumOffLabel:          'OFF',
  drumSeqTitle:          'Boîte à rythme',
  drumSeqCollapse:       'Réduire le séquenceur',
  drumSeqExpand:         'Agrandir le séquenceur',
  drumPresetLabel:       'Préréglage',
  drumPresetPlaceholder: '— charger —',
  drumPresetConfirm:     'Remplacer le motif actuel par ce préréglage ?',
  drumSaveLabel:         'Enregistrer sous',
  drumSaveNamePlaceholder: 'Nom du motif…',
  drumSaveBtn:           'Enreg.',
  drumDeleteBtn:         'Suppr.',
  drumDeleteConfirm:     (name) => `Supprimer le motif "${name}" ?`,
  drumAssignLabel:       'Associer à une section',
  drumAssignTitle:       'Associer ce motif à une section de l\'arrangement',
  drumAssignPopupTitle:  (name) => `Associer « ${name} » à :`,
  drumBadgeTitle:        (name) => `Motif batterie : ${name}`,
  drumBadgeRemoveTitle:  'Retirer le motif de batterie de cette section',
  drumClearBtn:          'Effacer',
  drumStepTitle:         (step) => `Pas ${step + 1}`,
  drumVelTitle:          'Clic droit pour changer la vélocité',
  drumVolLabel:          'Vol',
  drumReverbLabel:       'Rév',
  drumSampleLabel:       'Son',
  drumRowLabelHH:        'Hi-Hat',
  drumRowLabelSnare:     'Caisse claire',
  drumRowLabelBD:        'Grosse caisse',
  drumRowLabelCustom:    'Personnalisé',
  drumPlayingStep:       'Pas en cours',
  drumSamples: [
    // ── Grosse caisse ─────────────────────────────────────────────────────────
    { value: 'kick',           label: 'Kick — CR78'              },  // kick-cr78.mp3
    { value: 'kick-acoustic',  label: 'Kick — Kit 3'             },  // kick-kit3.mp3
    { value: 'kick-tight',     label: 'Kick — Kit 8'             },  // kick-kit8.mp3
    // ── Caisse claire ─────────────────────────────────────────────────────────
    { value: 'side-stick',     label: 'Caisse claire — CR78 (bord)'},  // snare-cr78.mp3 (atténué)
    { value: 'snare',          label: 'Caisse claire — CR78'     },  // snare-cr78.mp3
    { value: 'clap',           label: 'Clap — Roland SC-88'      },  // clap-roland.wav
    { value: 'snare-electric', label: 'Caisse claire — Kit 8'    },  // snare-kit8.mp3
    { value: 'snare-brush',    label: 'Caisse claire — Kit 3'    },  // snare-kit3.mp3
    // ── Hi-Hat ────────────────────────────────────────────────────────────────
    { value: 'hh-closed',      label: 'Hi-Hat fermé — CR78'      },  // hihat-closed-cr78.mp3
    { value: 'hh-pedal',       label: 'Hi-Hat fermé — Roland'    },  // hihat-closed-roland.wav
    { value: 'hh-open',        label: 'Hi-Hat ouvert — Korg M1'  },  // hihat-open-korg.wav
    // ── Toms (GM 41, 43, 45, 47, 48, 50) ─────────────────────────────────────
    { value: 'tom-floor-lo',   label: 'Tom basse grave'     },  // GM 41
    { value: 'tom-floor-hi',   label: 'Tom basse aigu'      },  // GM 43
    { value: 'tom-lo',         label: 'Tom grave'           },  // GM 45
    { value: 'tom-lo-mid',     label: 'Tom médium grave'    },  // GM 47
    { value: 'tom-hi-mid',     label: 'Tom médium aigu'     },  // GM 48
    { value: 'tom-hi',         label: 'Tom aigu'            },  // GM 50
    // ── Cymbales ──────────────────────────────────────────────────────────────
    { value: 'crash',          label: 'Crash — Berklee 1'        },  // crash-berklee1.mp3
    { value: 'ride',           label: 'Ride — Berklee'           },  // ride-berklee1.mp3
    { value: 'chinese-cymbal', label: 'Crash — Berklee 2 (alt)'  },  // crash-berklee2.mp3
    { value: 'ride-bell',      label: 'Ride — Roland SC-88'      },  // ride-roland.wav
    { value: 'splash',         label: 'Crash — Berklee 1 (doux)' },  // crash-berklee1.mp3
    { value: 'crash-2',        label: 'Crash — Berklee 2'        },  // crash-berklee2.mp3
    { value: 'ride-2',         label: 'Ride — Roland SC-88'      },  // ride-roland.wav
    // ── Latin / Cowbell (GM 54, 56, 58) ──────────────────────────────────────
    { value: 'tambourine',     label: 'Tambourin'           },  // GM 54
    { value: 'cowbell',        label: 'Cowbell'             },  // GM 56
    { value: 'vibraslap',      label: 'Vibraslap'           },  // GM 58
    // ── Bongos (GM 60–61) ─────────────────────────────────────────────────────
    { value: 'bongo-hi',       label: 'Bongo aigu'          },  // GM 60
    { value: 'bongo-lo',       label: 'Bongo grave'         },  // GM 61
    // ── Congas (GM 62–64) ─────────────────────────────────────────────────────
    { value: 'conga-mute',     label: 'Conga étouffée'      },  // GM 62
    { value: 'conga-hi',       label: 'Conga ouverte'       },  // GM 63
    { value: 'conga-lo',       label: 'Conga grave'         },  // GM 64
    // ── Timbales (GM 65–66) ───────────────────────────────────────────────────
    { value: 'timbale-hi',     label: 'Timbale aiguë'       },  // GM 65
    { value: 'timbale-lo',     label: 'Timbale grave'       },  // GM 66
    // ── Agogo (GM 67–68) ──────────────────────────────────────────────────────
    { value: 'agogo-hi',       label: 'Agogo aigu'          },  // GM 67
    { value: 'agogo-lo',       label: 'Agogo grave'         },  // GM 68
    // ── Shakers (GM 69–70) ────────────────────────────────────────────────────
    { value: 'cabasa',         label: 'Cabasa'              },  // GM 69
    { value: 'maracas',        label: 'Maracas'             },  // GM 70
    // ── Bois / Claves (GM 75–77) ──────────────────────────────────────────────
    { value: 'claves',         label: 'Claves'              },  // GM 75
    { value: 'wood-block-hi',  label: 'Wood-block aigu'     },  // GM 76
    { value: 'wood-block-lo',  label: 'Wood-block grave'    },  // GM 77
    // ── Triangle (GM 80–81) ───────────────────────────────────────────────────
    { value: 'triangle-mute',  label: 'Triangle étouffé'    },  // GM 80
    { value: 'triangle-open',  label: 'Triangle ouvert'     },  // GM 81
  ],

  // ── Help panel — étiquettes, titres, descriptions ─────────────────────────
  helpLabel:        'Aide',
  helpCGEditorTitle: 'Éditeur de grille d\'accords',
  helpCGEditorDesc:  'Une grille d\'accords est une suite de cellules, chacune contenant un accord. Utilisez les grilles pour construire le contenu harmonique d\'une section de morceau (couplet, refrain, pont), puis organisez-les dans l\'Éditeur de piste pour former un morceau complet.',
  helpTEEditorTitle: 'Éditeur de piste',
  helpTEEditorDesc:  'L\'Éditeur de piste vous permet d\'assembler votre morceau. Commencez par créer des grilles d\'accords dans le panneau gauche, puis ajoutez-les à l\'Arrangement pour définir l\'ordre, les répétitions et les motifs de batterie de chaque section.',

  // ── Help panel — Éditeur de grille d'accords (pas-à-pas) ─────────────────
  helpCGSteps: [
    {
      number: 1,
      title: 'Choisir une gamme',
      summary: 'Choisissez une fondamentale et un mode dans le panneau Gamme. Les cellules se colorent automatiquement : vert = dans la gamme, ambre = dominante, violet = sous-dominante.',
      actions: [
        { title: 'Fondamentale & mode', body: 'Cliquez le premier menu déroulant pour choisir la fondamentale (Do, Ré♭…), puis le second pour choisir le mode (Majeur, Dorien, Mineur…).' },
        { title: 'Durée de cellule', body: 'Le sélecteur « Durée de cellule » définit la durée de chaque cellule lors de la lecture : Ronde, Blanche, Noire ou Croche.' },
      ],
    },
    {
      number: 2,
      title: 'Assigner des accords',
      summary: 'Cliquez sur une cellule (ou le + à l\'intérieur) pour ouvrir le sélecteur d\'accords. Les accords sont triés par rôle harmonique.',
      actions: [
        { title: 'Sélecteur d\'accords', body: 'Cliquez le nom de l\'accord ou le signe + dans une cellule vide. Faites défiler les types d\'accords et cliquez pour assigner.' },
        { title: 'Ajouter / supprimer', body: 'Cliquez + (tirets verts) pour ajouter une cellule. Cliquez × sous une cellule pour la supprimer (désactivé si une seule cellule reste).' },
        { title: 'Diviser une cellule', body: 'Cliquez ⊢ pour diviser en deux sous-cellules — deux accords par mesure. Cliquez ⊣ pour fusionner.' },
        { title: 'Glisser pour réordonner', body: 'Saisissez une cellule et glissez-la à gauche ou à droite. Maintenez Ctrl en relâchant pour copier plutôt que déplacer.' },
      ],
    },
    {
      number: 3,
      title: 'Affiner les voix',
      summary: 'Ajustez le renversement et l\'octave de chaque accord pour contrôler quelle note sonne à la basse.',
      actions: [
        { title: 'Choisir un renversement', body: 'Après avoir sélectionné une cellule, cliquez un bouton de note sous le nom de l\'accord pour en faire la basse (accord barré, ex. Do/Mi).' },
        { title: 'Sélecteur d\'octave', body: 'Utilisez le sélecteur Oct ▾ dans la cellule pour décaler l\'octave de base vers le haut ou le bas.' },
        { title: 'Via le piano', body: 'Avec une cellule sélectionnée, cliquez la note souhaitée sur le clavier Piano pour régler le renversement directement.' },
      ],
    },
    {
      number: 4,
      title: 'Choisir un motif rythmique',
      summary: 'Le panneau Motif définit comment les accords sont joués — plaqués, arpégés ou en figure personnalisée. Réglage global par défaut, modifiable par cellule.',
      actions: [
        { title: 'Motif global', body: 'Utilisez le menu Motif pour choisir un style intégré (accord plaqué, arpège montant, reggae…). S\'applique à toute la grille sauf si écrasé par cellule.' },
        { title: 'Valeur de note & boucle', body: 'La valeur de note définit la durée d\'un pas ; Boucle répète le motif pour remplir la mesure.' },
        { title: 'Motif par cellule', body: 'Cliquez le bouton ♩ dans une cellule pour lui assigner un motif différent.' },
        { title: 'Éditeur de motif', body: 'Choisissez « ✎ Nouveau motif… » pour ouvrir l\'éditeur. Saisissez une chaîne, écoutez-la, nommez-la et enregistrez.' },
      ],
    },
    {
      number: 5,
      title: 'Utiliser Piano & Guitare',
      summary: 'Activez les visualiseurs en bas de la grille pour explorer les gammes, construire des accords à l\'oreille ou choisir des renversements visuellement.',
      actions: [
        { title: 'Afficher / masquer', body: 'Cliquez 🎹 Piano ou 🎸 Guitare au-dessus du visualiseur pour l\'activer.' },
        { title: 'Jouer la gamme', body: 'Cliquez « ▶ Gamme » pour entendre et voir les notes de la gamme s\'animer en séquence.' },
        { title: 'Mise en évidence manuelle', body: 'Cliquez une touche ou une frette pour l\'allumer. Construisez un accord manuellement — s\'il est reconnu, l\'étiquette apparaît et peut être glissée dans une cellule.' },
      ],
    },
    {
      number: 6,
      title: 'Lecture',
      summary: 'Appuyez sur Lecture dans la barre d\'outils. La cellule active s\'illumine en bleu. Pause pour marquer la position, Stop pour revenir au début.',
      actions: [
        { title: 'Lecture / Pause / Stop', body: 'Utilisez les boutons ▶ / ⏸ / ■ dans la barre d\'outils. La lecture boucle la grille en continu.' },
        { title: 'Transposer la grille', body: 'Saisissez un nombre de demi-tons (+ vers le haut, − vers le bas) dans le champ Transposer et cliquez Appliquer.' },
        { title: 'Lecture auto', body: 'Quand la Lecture auto est activée, cliquer sur une cellule prévisualise l\'accord via l\'instrument sélectionné.' },
      ],
    },
  ],

  // ── Help panel — Éditeur de piste (pas-à-pas) ─────────────────────────────
  helpTESteps: [
    {
      number: 1,
      title: 'Nommer la piste',
      summary: 'Donnez un nom et une description optionnelle à votre morceau pour rester organisé.',
      actions: [
        { title: 'Nom de la piste', body: 'Cliquez le grand champ de texte en haut et saisissez le nom.' },
        { title: 'Description', body: 'Utilisez la zone de texte en dessous pour les paroles, notes ou la structure du morceau.' },
      ],
    },
    {
      number: 2,
      title: 'Créer des grilles d\'accords',
      summary: 'Une grille d\'accords est une suite nommée de cellules, chacune contenant un accord. Créez une grille par section du morceau (Intro, Couplet, Refrain…).',
      actions: [
        { title: 'Nouvelle grille', body: 'Cliquez « + Nouvelle grille » en bas du panneau gauche. Saisissez un nom (ou choisissez un préréglage), définissez le nombre de cellules et la durée par défaut.' },
        { title: 'Éditer une grille', body: 'Cliquez « ✎ Éditer » sur une carte pour ouvrir l\'éditeur. Cliquez « Fermer l\'éditeur → » pour revenir.' },
        { title: 'Renommer', body: 'Cliquez le nom sur la carte pour l\'éditer en ligne. Entrée ou clic ailleurs pour confirmer, Échap pour annuler.' },
        { title: 'Dupliquer', body: 'Cliquez ⧉ pour créer une copie indépendante avec tous les accords.' },
        { title: 'Supprimer', body: 'Cliquez 🗑. Les entrées d\'arrangement utilisant cette grille sont supprimées en même temps.' },
      ],
    },
    {
      number: 3,
      title: 'Construire l\'arrangement',
      summary: 'Glissez les grilles de la bibliothèque dans l\'Arrangement pour définir l\'ordre de lecture du morceau.',
      actions: [
        { title: 'Ajouter une section', body: 'Cliquez « + Ajouter » sur une carte pour l\'annexer comme prochaine section dans l\'arrangement.' },
        { title: 'Réordonner', body: 'Saisissez le handle ⠿ d\'une tuile et glissez-la vers le haut ou le bas. Ctrl au dépôt pour copier.' },
        { title: 'Répétitions', body: 'Le champ × sur une tuile définit le nombre de répétitions avant de passer à la section suivante.' },
        { title: 'Réduire / développer', body: 'Cliquez ▼ / ▶ dans l\'en-tête d\'une tuile pour masquer ou afficher la mini-grille.' },
        { title: 'Retirer une section', body: 'Cliquez × dans les contrôles de la tuile. La grille dans la bibliothèque n\'est pas supprimée.' },
      ],
    },
    {
      number: 4,
      title: 'Ajouter des motifs de batterie',
      summary: 'Ouvrez la Boîte à rythme (pouce 🥁 à droite) pour créer des motifs et les associer à des sections.',
      actions: [
        { title: 'Ouvrir / réduire', body: 'Cliquez le pouce 🥁 pour déployer le séquenceur. Cliquez ✕ dans l\'en-tête pour le réduire.' },
        { title: 'Activer / désactiver', body: 'Utilisez le bouton ON/OFF dans l\'en-tête. OFF = batterie silencieuse même si des motifs sont assignés.' },
        { title: 'Programmer un motif', body: 'Cliquez un pas pour l\'activer (rouge = fort → orange → jaune → off). Ajustez volume et réverb par rangée.' },
        { title: 'Charger un préréglage', body: 'Utilisez le menu Préréglage pour charger un motif d\'usine (Rock, Funk, Bossa Nova…). Confirmation si le motif actuel a des pas.' },
        { title: 'Enregistrer', body: 'Saisissez un nom dans « Enregistrer sous » et cliquez Enreg. Nom existant = mise à jour ; nouveau nom = nouvelle entrée.' },
        { title: 'Associer à une section', body: 'Cliquez « 📌 Associer à une section » et choisissez une tuile. Un badge 🥁 apparaît sur la tuile.' },
        { title: 'Retirer d\'une section', body: 'Cliquez × sur le badge 🥁 dans la tuile pour détacher le motif.' },
      ],
    },
    {
      number: 5,
      title: 'Lecture',
      summary: 'Appuyez sur Lecture pour écouter l\'arrangement complet. Cliquez une tuile ou une cellule pour sauter à cet endroit.',
      actions: [
        { title: 'Lecture / Pause / Stop', body: 'Utilisez ▶ / ⏸ / ■ dans la barre d\'outils. La section et la cellule actives sont mises en évidence en temps réel.' },
        { title: 'Sauter à une section', body: 'En cours de lecture, cliquez un en-tête de tuile ou une cellule de la mini-grille pour y positionner la lecture.' },
        { title: 'Instrument & tempo', body: 'Modifiez l\'instrument, le BPM, la signature rythmique, le groove, la réverb et la vélocité dans la barre d\'outils.' },
      ],
    },
    {
      number: 6,
      title: 'Sauvegarder & exporter',
      summary: 'Le projet est sauvegardé automatiquement dans le navigateur. Utilisez les boutons de la barre d\'outils pour exporter ou partager.',
      actions: [
        { title: 'Sauvegarde automatique', body: 'Le projet est enregistré automatiquement dans le stockage local du navigateur à chaque modification. Rechargez la page pour restaurer la dernière session.' },
        { title: 'Sauvegarder dans un fichier', body: 'Cliquez 💾 pour télécharger un fichier .json. Utilisez 📂 pour le recharger.' },
        { title: 'Export MIDI', body: 'Cliquez 🎼 pour exporter l\'arrangement complet en fichier MIDI.' },
        { title: 'Export PDF', body: 'Cliquez 📄 pour exporter une fiche d\'accords en PDF.' },
        { title: 'Réinitialiser', body: 'Cliquez ↺ Réinit. dans la barre d\'outils pour tout effacer et repartir d\'un projet vierge (confirmation requise).' },
      ],
    },
  ],

  // Demo tracks
  demoBtn:               '🎵 Démo',
  demoBtnTitle:          'Charger une piste de démonstration',
  demoConfirmTitle:      'Charger la démo ?',
  demoConfirmMsg:        'Charger une démo remplacera votre projet actuel. Les modifications non enregistrées seront perdues.',
  demoConfirmOk:         'Charger la démo',

  // Réinitialiser le projet
  resetBtn:              'Réinit.',
  resetTitle:            'Réinitialiser le projet — effacer tout et repartir de zéro',
  resetConfirmTitle:     'Réinitialiser le projet ?',
  resetConfirmMsg:       'Toutes les grilles d\'accords, l\'arrangement et les motifs de batterie seront effacés. Cette action est irréversible.',
  resetConfirmOk:        'Réinitialiser',

  // Language toggle
  languageLabel:         'EN',
};

// ─── Context ──────────────────────────────────────────────────────────────────

const LocaleContext = createContext({ locale: 'en', strings: en, toggleLocale: () => {} });

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('fr');
  const strings = locale === 'fr' ? fr : en;
  function toggleLocale() { setLocale(l => l === 'en' ? 'fr' : 'en'); }
  return (
    <LocaleContext.Provider value={{ locale, strings, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT() {
  return useContext(LocaleContext).strings;
}

export function useLocale() {
  return useContext(LocaleContext);
}
