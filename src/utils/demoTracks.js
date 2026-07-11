/**
 * Demo track presets.
 * Each entry is a partial app state object compatible with the LOAD_PROJECT reducer.
 * Only the fields that differ from INITIAL_STATE need to be specified —
 * the reducer deep-merges with INITIAL_STATE on load.
 *
 * Chord cell shape:
 *   { id, chord: { root, typeKey } | null, split: bool, subCells: [chord|null, chord|null] }
 *
 * Progression shape:
 *   { id, name, cells, scaleRoot, scaleKey, cellDuration, playStyle, noteValue, patternLoop }
 *
 * Track item shape:
 *   { progressionId, repetitions, drumPatternId? }
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cell(id, root, typeKey, inversion = 0, octave = undefined) {
  const chord = root ? { root, typeKey, inversion, ...(octave !== undefined && { octave }) } : null;
  return { id, chord, split: false, subCells: [null, null] };
}

function splitCell(id, root1, type1, root2, type2, inv1 = 0, inv2 = 0, octave = undefined) {
  const extra = octave !== undefined ? { octave } : {};
  return {
    id,
    chord: root1 ? { root: root1, typeKey: type1, inversion: inv1, ...extra } : null,
    split: true,
    subCells: [
      root1 ? { root: root1, typeKey: type1, inversion: inv1, ...extra } : null,
      root2 ? { root: root2, typeKey: type2, inversion: inv2, ...extra } : null,
    ],
  };
}

function prog(id, name, cells, scaleRoot, scaleKey, cellDuration = 'whole', playStyle = null, noteValue = null, patternLoop = null) {
  return { id, name, cells, scaleRoot, scaleKey, cellDuration, playStyle, noteValue, patternLoop };
}

// ─── Track 1: Bach — Prelude No. 1 in C Major (BWV 846) ──────────────────────
// The famous arpeggio prelude from the Well-Tempered Clavier.
// Scale: C major. Pattern: builtin-bach ({a0,c0,a1,b1,c1,a1,b1,c1}).
// Bar-by-bar chords follow the original harmonic analysis:
//   Bars 1-4:   C – Dmin/C – G7/B – C
//   Bars 5-8:   Amin7 – D7/F# – G – G7
//   Bars 9-12:  Amin – E7/G# (split) – Fmaj/A – Fmin/Ab (split)
//   Bars 13-16: C/G – G7 – C – F9/C (split)
//   Bars 17-19: Faug/C – A7/C# – Dmin (resolution bars)
//   Bars 20-23: G7 – C – G7 – C (cadential end)

function makeBachTrack() {
  const p1id = 'demo-bach-p1';
  const p2id = 'demo-bach-p2';
  const p3id = 'demo-bach-p3';

  const opening = prog(p1id, 'Opening', [
    cell(`${p1id}-0`, 'C', 'maj'),
    cell(`${p1id}-1`, 'D', 'min7'),
    cell(`${p1id}-2`, 'G', 'dom7'),
    cell(`${p1id}-3`, 'C', 'maj'),
    cell(`${p1id}-4`, 'C', 'maj7'),
    cell(`${p1id}-5`, 'D', 'min9'),
    cell(`${p1id}-6`, 'G', 'dom7'),
    cell(`${p1id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', '{a0,c0,a1,b1,c1,a1,b1,[c1,d1]}', '8n', true);

  const development = prog(p2id, 'Development', [
    cell(`${p2id}-0`, 'A', 'min7'),
    cell(`${p2id}-1`, 'D', 'dom7'),
    cell(`${p2id}-2`, 'G', 'maj'),
    cell(`${p2id}-3`, 'G', 'dom7'),
    cell(`${p2id}-4`, 'A', 'min'),
    splitCell(`${p2id}-5`, 'A', 'min', 'E', 'dom7'),
    cell(`${p2id}-6`, 'F', 'maj'),
    cell(`${p2id}-7`, 'F', 'min'),
  ], 'C', 'ionian', 'whole', '{a0,c0,a1,b1,c1,a1,b1,[c1,d1]}', '8n', true);

  const cadence = prog(p3id, 'Cadence', [
    cell(`${p3id}-0`, 'C', 'maj'),
    cell(`${p3id}-1`, 'G', 'dom7'),
    cell(`${p3id}-2`, 'F', 'maj'),
    cell(`${p3id}-3`, 'G', 'dom7'),
    cell(`${p3id}-4`, 'A', 'min'),
    cell(`${p3id}-5`, 'D', 'min'),
    cell(`${p3id}-6`, 'G', 'dom7'),
    cell(`${p3id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', '{a0,c0,a1,b1,c1,a1,b1,[c1,d1]}', '8n', true);

  return {
    trackName: 'Bach — Prelude No. 1 in C Major',
    trackDescription: 'BWV 846 · Well-Tempered Clavier · C major · Bach prelude arpeggio pattern',
    bpm: 100,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'straight',
    progressions: { [p1id]: opening, [p2id]: development, [p3id]: cadence },
    progressionOrder: [p1id, p2id, p3id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 2 },
      { progressionId: p2id, repetitions: 1 },
      { progressionId: p3id, repetitions: 2 },
    ],
    scaleRoot: 'C',
    scaleKey: 'ionian',
  };
}

// ─── Track 2: Hallelujah — Leonard Cohen ──────────────────────────────────────
// Key of C major, 3/4 time. Classic oom-pah-pah waltz pattern.
// Verse:   C – C – Am – Am – F – G – C – G
// Chorus:  F – Am – F – C – G – C – Am – G  (last bar resolves to C)
// The famous chord sequence: I – I – vi – vi – IV – V – I – V

function makeHallelujahTrack() {
  const p1id = 'demo-hal-verse';
  const p2id = 'demo-hal-chorus';

  const verse = prog(p1id, 'Verse', [
    cell(`${p1id}-0`, 'C', 'maj'),
    cell(`${p1id}-1`, 'C', 'maj'),
    cell(`${p1id}-2`, 'A', 'min'),
    cell(`${p1id}-3`, 'A', 'min'),
    cell(`${p1id}-4`, 'F', 'maj'),
    cell(`${p1id}-5`, 'G', 'maj'),
    cell(`${p1id}-6`, 'C', 'maj'),
    cell(`${p1id}-7`, 'G', 'maj'),
  ], 'C', 'ionian', 'whole', '{[a0,c0],a1,b1,[c1,d1],b1,c1}', '8n', false);

  const chorus = prog(p2id, 'Chorus', [
    cell(`${p2id}-0`, 'F', 'maj'),
    cell(`${p2id}-1`, 'A', 'min'),
    cell(`${p2id}-2`, 'F', 'maj'),
    splitCell(`${p2id}-3`, 'C', 'maj', 'G', 'maj'),
    cell(`${p2id}-4`, 'E', 'min'),
    cell(`${p2id}-5`, 'A', 'min'),
    cell(`${p2id}-6`, 'G', 'maj'),
    cell(`${p2id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', '{[a0,c0],a1,b1,[c1,d1],b1,c1}', '8n', false);

  return {
    trackName: 'Hallelujah — Leonard Cohen',
    trackDescription: 'Key of C major · 3/4 waltz · Verse / Chorus',
    bpm: 140,
    timeSig: '3/4',
    instrument: 'piano',
    groove: 'straight',
    progressions: { [p1id]: verse, [p2id]: chorus },
    progressionOrder: [p1id, p2id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 2 },
      { progressionId: p2id, repetitions: 1 },
      { progressionId: p1id, repetitions: 2 },
      { progressionId: p2id, repetitions: 1 },
    ],
    scaleRoot: 'C',
    scaleKey: 'ionian',
  };
}

// ─── Track 3: 12-Bar Blues Shuffle in A ──────────────────────────────────────
// Standard 12-bar blues form. Quick-change variation (A7 in bar 2).
// Groove: shuffle. Turnaround: A7 – E7 in bars 11-12.
// Bars 1-4:  A7 – D7 – A7 – A7
// Bars 5-6:  D7 – D7
// Bars 7-8:  A7 – A7
// Bars 9-10: E7 – D7
// Bars 11-12: A7 – E7  (split turnaround in bar 12)

function makeBluesTrack() {
  const p1id = 'demo-blues-12bar';

  const blues12bar = prog(p1id, '12-Bar Blues', [
    cell(`${p1id}-0`,  'A', 'dom7'),
    cell(`${p1id}-1`,  'D', 'dom7'),
    cell(`${p1id}-2`,  'A', 'dom7'),
    cell(`${p1id}-3`,  'A', 'dom7'),
    cell(`${p1id}-4`,  'D', 'dom7'),
    cell(`${p1id}-5`,  'D', 'dom7'),
    cell(`${p1id}-6`,  'A', 'dom7'),
    cell(`${p1id}-7`,  'A', 'dom7'),
    cell(`${p1id}-8`,  'E', 'dom7'),
    cell(`${p1id}-9`,  'D', 'dom7'),
    cell(`${p1id}-10`, 'A', 'dom7'),
    splitCell(`${p1id}-11`, 'A', 'dom7', 'E', 'dom7'),
  ], 'A', 'blues', 'whole', '{[a0,c0],a1,[b1,c1,d1,e1],a1}', '8n', true);

  return {
    trackName: 'Blues Shuffle in A',
    trackDescription: '12-bar blues · A7 · Shuffle groove · Quick-change with turnaround',
    bpm: 90,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'shuffle',
    progressions: { [p1id]: blues12bar },
    progressionOrder: [p1id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 4 },
    ],
    scaleRoot: 'A',
    scaleKey: 'blues',
  };
}

// ─── Track 4: Pop Grid — Let It Be (The Beatles) ──────────────────────────────
// Key of C major, 4/4. 16-cell grid with split cells for variety.
// Classic I–V–vi–IV progression across multiple sections.
// Verse:   C – G – Am – Fmaj  (×2, bars 1-8)
// Pre-Ch:  C – C/E – Fmaj – C  (bars 9-12, split on cell 2)
// Chorus:  Fmaj – G – C – Am  |  Fmaj – G – Am (split C/G) – C  (bars 13-16)

function makeLetItBeTrack() {
  const p1id = 'demo-lib-verse';
  const p2id = 'demo-lib-prechorus';
  const p3id = 'demo-lib-chorus';

  const verse = prog(p1id, 'Verse', [
    cell(`${p1id}-0`, 'C', 'maj'),
    cell(`${p1id}-1`, 'G', 'maj'),
    cell(`${p1id}-2`, 'A', 'min'),
    cell(`${p1id}-3`, 'F', 'maj'),
  ], 'C', 'ionian', 'whole', null, null, null);

  // 8-cell pre-chorus with a split cell (C then G in bar 4)
  const preChorus = prog(p2id, 'Pre-Chorus', [
    cell(`${p2id}-0`, 'C', 'maj'),
    cell(`${p2id}-1`, 'G', 'maj'),
    splitCell(`${p2id}-2`, 'A', 'min', 'F', 'maj'),
    cell(`${p2id}-3`, 'C', 'maj'),
    cell(`${p2id}-4`, 'F', 'maj'),
    cell(`${p2id}-5`, 'G', 'maj'),
    cell(`${p2id}-6`, 'A', 'min'),
    cell(`${p2id}-7`, 'F', 'maj'),
  ], 'C', 'ionian', 'whole', null, null, null);

  // 8-cell chorus — split turnaround on cell 14
  const chorus = prog(p3id, 'Chorus', [
    cell(`${p3id}-0`, 'F', 'maj'),
    cell(`${p3id}-1`, 'C', 'maj'),
    cell(`${p3id}-2`, 'G', 'maj'),
    cell(`${p3id}-3`, 'A', 'min'),
    cell(`${p3id}-4`, 'F', 'maj'),
    cell(`${p3id}-5`, 'C', 'maj'),
    splitCell(`${p3id}-6`, 'G', 'maj', 'F', 'maj'),
    cell(`${p3id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', null, null, null);

  return {
    trackName: 'Let It Be — The Beatles',
    trackDescription: 'Key of C major · I–V–vi–IV · Verse / Pre-Chorus / Chorus · 16-cell grid',
    bpm: 75,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'straight',
    progressions: { [p1id]: verse, [p2id]: preChorus, [p3id]: chorus },
    progressionOrder: [p1id, p2id, p3id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 4 },
      { progressionId: p2id, repetitions: 1 },
      { progressionId: p3id, repetitions: 2 },
    ],
    scaleRoot: 'C',
    scaleKey: 'ionian',
  };
}

// ─── Track 5: U-Turn (Lili) — Aaron ──────────────────────────────────────────
// Key of E minor, 4/4. Repeating 4-chord loop: Em – C – G – D.
// Scale: E natural minor (Aeolian). i – VI – III – VII.
// Verse and chorus share the same progression; the bridge adds a pre-chorus
// extension: Am – B7 – Em – Em.
// Drum pattern: Rock 2 (driving 8th-note hi-hat).

function makeUTurnTrack() {
  const p1id = 'demo-uturn-verse';
  const p2id = 'demo-uturn-bridge';

  // The iconic 4-bar loop, repeated for verse and chorus
  const verse = prog(p1id, 'Verse / Chorus', [
    cell(`${p1id}-0`, 'E', 'min'),
    cell(`${p1id}-1`, 'C', 'maj'),
    cell(`${p1id}-2`, 'G', 'maj'),
    cell(`${p1id}-3`, 'D', 'maj'),
  ], 'E', 'aeolian', 'whole', null, null, null);

  // Bridge: Am – B7 – Em – Em (adds tension before returning to the loop)
  const bridge = prog(p2id, 'Bridge', [
    cell(`${p2id}-0`, 'A', 'min'),
    cell(`${p2id}-1`, 'A', 'min'),
    cell(`${p2id}-2`, 'B', 'dom7'),
    cell(`${p2id}-3`, 'B', 'dom7'),
    splitCell(`${p2id}-4`, 'E', 'min', 'D', 'maj'),
    cell(`${p2id}-5`, 'C', 'maj'),
    cell(`${p2id}-6`, 'G', 'maj'),
    cell(`${p2id}-7`, 'D', 'maj'),
  ], 'E', 'aeolian', 'whole', null, null, null);

  return {
    trackName: 'U-Turn (Lili) — Aaron',
    trackDescription: 'E minor · i–VI–III–VII loop · Verse / Bridge · Drum sequencer enabled',
    bpm: 110,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'straight',
    metronome: { drumEnabled: false },
    activeDrumPatternId: 'drum-builtin-rock3',
    progressions: { [p1id]: verse, [p2id]: bridge },
    progressionOrder: [p1id, p2id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 2 },
      { progressionId: p2id, repetitions: 1, drumPatternId: 'drum-builtin-rock3' },
      { progressionId: p1id, repetitions: 2, drumPatternId: 'drum-builtin-rock3' },
    ],
    scaleRoot: 'E',
    scaleKey: 'aeolian',
  };
}

// ─── Track 6: Misty — Erroll Garner ──────────────────────────────────────────
// Key of Eb major (app notation: D# = Eb, G# = Ab, A# = Bb, C# = Db).
// 4/4, medium swing. Classic AABA jazz standard, 32 bars.
// Inversions chosen for smooth voice leading — soprano line moves by step or
// common tone wherever possible.
//
// Chord notes (root position, ascending):
//   D#maj7  → D# F# A# D   A#dom7  → A# D  F  A
//   A#min7  → A# C# F  A   D#dom7  → D# F# A# C#
//   G#maj7  → G# C  D# G   C#dom7  → C# F  G# B
//   Fmin7   → F  G# C  D#  Gmin7   → G  A# D  F
//   Cdom7   → C  E  G  A#  Fmaj7   → F  A  C  E
//   Fdom7   → F  A  C  D#  G#min7  → G# B  D# F#
//   A#maj7  → A# D  F  A   Gdom7   → G  B  D  F
//   Cmin7   → C  D# G  A#
//
// Soprano voice-leading trace through the A section (inv = inversion used):
//   D#maj7/inv2(top=D) → A#7/inv3(top=A) → D#maj7/inv2(top=D) →
//   A#m7/inv3(top=A) + D#7/inv1(top=C#) → G#maj7/inv3(top=G) →
//   C#7/inv2(top=G#) + ... (common-tone G#) → Fm7/inv2(top=C) + A#7/inv3(top=A) →
//   D#maj7/inv1(top=A#) + C#7/inv3(top=B)
//
// Bridge soprano trace:
//   Gm7/inv3(top=F) + C7/inv2(top=G) → Fmaj7/inv3(top=E) →
//   Fm7/inv3(top=D#) + A#7/inv2(top=F) → D#maj7/inv3(top=D) →
//   G#m7/inv3(top=F#) + C#7/inv1(top=F) → G#maj7/inv2(top=D#) →
//   Cm7/inv3(top=A#) + F7/inv2(top=C) → A#maj7/inv1(top=D) + G7/inv3(top=F)

function makeMistyTrack() {
  const p1id = 'demo-misty-A';
  const p2id = 'demo-misty-B';
  const p3id = 'demo-misty-Aprime';

  const OCT = 3; // one octave lower than default (4)

  // A section — bars 1-8
  const sectionA = prog(p1id, 'A section', [
    cell(`${p1id}-0`, 'D#', 'maj7',  0, OCT),
    cell(`${p1id}-1`, 'A#', 'dom7',  0, OCT),
    cell(`${p1id}-2`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p1id}-3`, 'A#', 'min7', 'D#', 'dom7', 0, 0, OCT),
    cell(`${p1id}-4`, 'G#', 'maj7',  0, OCT),
    cell(`${p1id}-5`, 'C#', 'dom7',  0, OCT),
    splitCell(`${p1id}-6`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    splitCell(`${p1id}-7`, 'D#', 'maj7', 'C#', 'dom7', 0, 0, OCT),
  ], 'D#', 'ionian', 'whole', '{a0,[b1,c1,d1,e1],a1,c1,a1,[b1,c1,d1,e1]}', '8n', null);

  // B section (bridge) — bars 17-24
  const sectionB = prog(p2id, 'B section (Bridge)', [
    splitCell(`${p2id}-0`, 'G', 'min7', 'C', 'dom7', 0, 0, OCT),
    cell(`${p2id}-1`, 'F', 'maj7',  0, OCT),
    splitCell(`${p2id}-2`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    cell(`${p2id}-3`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p2id}-4`, 'G#', 'min7', 'C#', 'dom7', 0, 0, OCT),
    cell(`${p2id}-5`, 'G#', 'maj7',  0, OCT),
    splitCell(`${p2id}-6`, 'C', 'min7', 'F', 'dom7', 0, 0, OCT),
    splitCell(`${p2id}-7`, 'A#', 'maj7', 'G', 'dom7', 0, 0, OCT),
  ], 'D#', 'ionian', 'half', '{a0,[b1,c1,d1,e1],a1,c1,a1,[b1,c1,d1,e1]}', '8n', null);

  // A' section — bars 25-32 (final A, ending on tonic)
  const sectionAprime = prog(p3id, "A' section", [
    cell(`${p3id}-0`, 'D#', 'maj7',  0, OCT),
    cell(`${p3id}-1`, 'A#', 'dom7',  0, OCT),
    cell(`${p3id}-2`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p3id}-3`, 'A#', 'min7', 'D#', 'dom7', 0, 0, OCT),
    cell(`${p3id}-4`, 'G#', 'maj7',  0, OCT),
    cell(`${p3id}-5`, 'C#', 'dom7',  0, OCT),
    splitCell(`${p3id}-6`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    cell(`${p3id}-7`, 'D#', 'maj7',  0, OCT),
  ], 'D#', 'ionian', 'whole', '{a0,[b1,c1,d1,e1],a1,c1,a1,[b1,c1,d1,e1]}', '8n', null);

  return {
    trackName: 'Misty — Erroll Garner',
    trackDescription: 'Eb major · AABA jazz standard · 32 bars · Medium swing · ii–V–I changes',
    bpm: 88,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'swing',
    progressions: { [p1id]: sectionA, [p2id]: sectionB, [p3id]: sectionAprime },
    progressionOrder: [p1id, p2id, p3id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 2 },
      { progressionId: p2id, repetitions: 1 },
      { progressionId: p3id, repetitions: 1 },
    ],
    scaleRoot: 'D#',
    scaleKey: 'ionian',
  };
}

// ─── Track 7: Pachelbel — Canon in D ─────────────────────────────────────────
// Key of D major. The iconic 8-chord ground bass ostinato, repeated.
// D – A – Bm – F#m – G – D – G – A
// Scale: D major (Ionian). Instrument: strings. Arpeggio up pattern.

function makePachelbelTrack() {
  const p1id = 'demo-pachelbel-ground';
  const p2id = 'demo-pachelbel-build';

  // Ground bass — the classic 8-bar ostinato
  const ground = prog(p1id, 'Ground Bass', [
    cell(`${p1id}-0`, 'D',  'maj'),
    cell(`${p1id}-1`, 'A',  'maj'),
    cell(`${p1id}-2`, 'B',  'min'),
    cell(`${p1id}-3`, 'F#', 'min'),
    cell(`${p1id}-4`, 'G',  'maj'),
    cell(`${p1id}-5`, 'D',  'maj'),
    cell(`${p1id}-6`, 'G',  'maj'),
    cell(`${p1id}-7`, 'A',  'maj'),
  ], 'D', 'ionian', 'whole', '{a1,b1,c1,b1}', '8n', true);

  // Build — same chords but with 4-note arpeggios for the later variations
  const build = prog(p2id, 'Variation', [
    cell(`${p2id}-0`, 'D',  'maj'),
    cell(`${p2id}-1`, 'A',  'maj'),
    cell(`${p2id}-2`, 'B',  'min'),
    cell(`${p2id}-3`, 'F#', 'min'),
    cell(`${p2id}-4`, 'G',  'maj'),
    cell(`${p2id}-5`, 'D',  'maj'),
    cell(`${p2id}-6`, 'G',  'maj'),
    cell(`${p2id}-7`, 'A',  'maj'),
  ], 'D', 'ionian', 'whole', '{a0,a1,b1,c1,a2,c1,b1,a1}', '8n', true);

  return {
    trackName: 'Canon in D — Pachelbel',
    trackDescription: 'D major · Ground bass ostinato · D–A–Bm–F#m–G–D–G–A · Strings',
    bpm: 120,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'straight',
    progressions: { [p1id]: ground, [p2id]: build },
    progressionOrder: [p1id, p2id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 3 },
      { progressionId: p2id, repetitions: 3 },
    ],
    scaleRoot: 'D',
    scaleKey: 'ionian',
  };
}

// ─── Exported catalogue ───────────────────────────────────────────────────────

export const DEMO_TRACKS = [
  {
    id: 'demo-bach',
    label: '🎹 Bach — Prelude No. 1 in C',
    labelFr: '🎹 Bach — Prélude n°1 en Do',
    build: makeBachTrack,
  },
  {
    id: 'demo-hallelujah',
    label: '🕊 Hallelujah — Leonard Cohen',
    labelFr: '🕊 Hallelujah — Leonard Cohen',
    build: makeHallelujahTrack,
  },
  {
    id: 'demo-blues',
    label: '🎸 Blues Shuffle in A',
    labelFr: '🎸 Blues Shuffle en La',
    build: makeBluesTrack,
  },
  {
    id: 'demo-letitbe',
    label: '🎵 Let It Be — The Beatles',
    labelFr: '🎵 Let It Be — The Beatles',
    build: makeLetItBeTrack,
  },
  {
    id: 'demo-uturn',
    label: '🥁 U-Turn (Lili) — Aaron',
    labelFr: '🥁 U-Turn (Lili) — Aaron',
    build: makeUTurnTrack,
  },
  {
    id: 'demo-misty',
    label: '🎷 Misty — Erroll Garner',
    labelFr: '🎷 Misty — Erroll Garner',
    build: makeMistyTrack,
  },
  {
    id: 'demo-pachelbel',
    label: '🎻 Canon in D — Pachelbel',
    labelFr: '🎻 Canon en Ré — Pachelbel',
    build: makePachelbelTrack,
  },
];
