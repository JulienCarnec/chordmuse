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
  appTitle:           'Chord Grids',
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

  // Language toggle
  languageLabel:         'FR',
};

const fr = {
  // TopBar
  appTitle:           'Grilles d\'accords',
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

  // Drum Séquenceur
  drumEnable:            'Activer le séquenceur',
  drumDisable:           'Désactiver le séquenceur',
  drumOnLabel:           'ON',
  drumOffLabel:          'OFF',
  drumSeqTitle:          'Drum Séquenceur',
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
