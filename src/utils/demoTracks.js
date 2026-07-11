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

/**
 * splitCell with optional per-subcell pattern overrides.
 * sub1 / sub2: optional { playStyle, noteValue, patternLoop } objects that override
 *              the progression-level pattern for each half of the split cell.
 */
function splitCell(id, root1, type1, root2, type2, inv1 = 0, inv2 = 0, octave = undefined, sub1 = null, sub2 = null) {
  const extra = octave !== undefined ? { octave } : {};
  function makeSubCell(root, typeKey, inversion, override) {
    if (!root) return null;
    return {
      root, typeKey, inversion, ...extra,
      ...(override?.playStyle   !== undefined && { playStyle:   override.playStyle }),
      ...(override?.noteValue   !== undefined && { noteValue:   override.noteValue }),
      ...(override?.patternLoop !== undefined && { patternLoop: override.patternLoop }),
    };
  }
  return {
    id,
    chord: root1 ? { root: root1, typeKey: type1, inversion: inv1, ...extra } : null,
    split: true,
    subCells: [
      makeSubCell(root1, type1, inv1, sub1),
      makeSubCell(root2, type2, inv2, sub2),
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
  ], 'C', 'ionian', 'whole', 'builtin-prelude-arp', '8n', true);

  const development = prog(p2id, 'Development', [
    cell(`${p2id}-0`, 'A', 'min7'),
    cell(`${p2id}-1`, 'D', 'dom7'),
    cell(`${p2id}-2`, 'G', 'maj'),
    cell(`${p2id}-3`, 'G', 'dom7'),
    cell(`${p2id}-4`, 'A', 'min'),
    splitCell(`${p2id}-5`, 'A', 'min', 'E', 'dom7'),
    cell(`${p2id}-6`, 'F', 'maj'),
    cell(`${p2id}-7`, 'F', 'min'),
  ], 'C', 'ionian', 'whole', 'builtin-prelude-arp', '8n', true);

  const cadence = prog(p3id, 'Cadence', [
    cell(`${p3id}-0`, 'C', 'maj'),
    cell(`${p3id}-1`, 'G', 'dom7'),
    cell(`${p3id}-2`, 'F', 'maj'),
    cell(`${p3id}-3`, 'G', 'dom7'),
    cell(`${p3id}-4`, 'A', 'min'),
    cell(`${p3id}-5`, 'D', 'min'),
    cell(`${p3id}-6`, 'G', 'dom7'),
    cell(`${p3id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', 'builtin-prelude-arp', '8n', true);

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

  // Hallelujah arpeggio: 6×8n fingerpicking figure (root↓·5th↓·root·5th·3rd·5th).
  // At 3/4 / 140 BPM: 6 eighth-notes = exactly 1 bar. loop=true so split half-cells
  // play the first 3 steps (root↓·5th↓·root) — a natural bass+arp gesture.
  const verse = prog(p1id, 'Verse', [
    cell(`${p1id}-0`, 'C', 'maj'),
    cell(`${p1id}-1`, 'C', 'maj'),
    cell(`${p1id}-2`, 'A', 'min'),
    cell(`${p1id}-3`, 'A', 'min'),
    cell(`${p1id}-4`, 'F', 'maj'),
    cell(`${p1id}-5`, 'G', 'maj'),
    cell(`${p1id}-6`, 'C', 'maj'),
    cell(`${p1id}-7`, 'G', 'maj'),
  ], 'C', 'ionian', 'whole', 'builtin-hallelujah-arp', '8n', true);

  const chorus = prog(p2id, 'Chorus', [
    cell(`${p2id}-0`, 'F', 'maj'),
    cell(`${p2id}-1`, 'A', 'min'),
    cell(`${p2id}-2`, 'F', 'maj'),
    // C/G split: each half = 3 eighth-notes → arp truncates at root↓·5th↓·root
    splitCell(`${p2id}-3`, 'C', 'maj', 'G', 'maj'),
    cell(`${p2id}-4`, 'E', 'min'),
    cell(`${p2id}-5`, 'A', 'min'),
    cell(`${p2id}-6`, 'G', 'maj'),
    cell(`${p2id}-7`, 'C', 'maj'),
  ], 'C', 'ionian', 'whole', 'builtin-hallelujah-arp', '8n', true);

  return {
    trackName: 'Hallelujah — Leonard Cohen',
    trackDescription: 'Key of C major · 3/4 · Fingerpicked arpeggio (Buckley style) · Verse / Chorus',
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

  // Walking bass (low oct) + chord stabs (mid oct) on beats 2 & 4.
  // 8 steps × 8n = one 4/4 bar. Pairs with shuffle groove for authentic boogie feel.
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
  ], 'A', 'blues', 'whole', 'builtin-blues-comp', '8n', false);

  return {
    trackName: 'Blues Shuffle in A',
    trackDescription: '12-bar blues · A7 · Shuffle groove · Walking bass (low oct) + chord stabs · Turnaround',
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

// ─── Track 5: Pressure Drop — Toots and the Maytals ─────────────────────────
// Key of A major, 4/4, 97 BPM, straight groove. Rockers style.
//
// Rockers reggae is defined by its driving forward momentum:
//   - Kick on every beat (four-on-the-floor feel) unlike the hollow one-drop
//   - Snare on beats 2 & 4 (not just beat 3) for a punchier backbeat
//   - Faster tempo than roots reggae
//
// Chord pattern: builtin-reggae (4×4n) — same skank shape:
//   beat 1: bass root staccato  — anchor
//   beat 2: chord stab staccato — skank
//   beat 3: rest
//   beat 4: chord stab staccato — skank
//
// Song structure:
//   Verse:  A · A · D · A  (4 bars — "It was a pressure drop…")
//   Chorus: A · D · E · A  (4 bars — "pressure drop, oh pressure…")
//
// Drum pattern — rockers style:
//   16-step grid (16th notes). Indexing: 0=beat1, 4=beat2, 8=beat3, 12=beat4.
//
//   HH (closed): every 8th note (steps 0,2,4,6,8,10,12,14).
//                Downbeats slightly accented, offbeats lighter.
//   Snare:       beats 2 & 4 (steps 4, 12) — the backbeat drive.
//                Ghost hit on and-of-3 (step 10) adds rockers propulsion.
//   Kick:        all four beats (steps 0, 4, 8, 12) — the defining rockers
//                four-on-the-floor, plus and-of-4 (step 14) pickup anticipation.
//   Rim (skank): offbeats of beats 2 & 4 (steps 6, 14) — locks the upstroke
//                accent with the chord skank for the characteristic scratch feel.

function makeReggaeTrack() {
  const p1id = 'demo-reggae-verse';
  const p2id = 'demo-reggae-chorus';
  const drumId = 'drum-demo-reggae';

  // Verse — A · A · D · A  ("It was a pressure drop, oh pressure")
  const verse = prog(p1id, 'Verse', [
    cell(`${p1id}-0`, 'A', 'maj'),
    cell(`${p1id}-1`, 'A', 'maj'),
    cell(`${p1id}-2`, 'D', 'maj'),
    cell(`${p1id}-3`, 'A', 'maj'),
  ], 'A', 'ionian', 'whole', 'builtin-reggae', '4n', false);

  // Chorus — A · D · E · A  (I–IV–V–I turnaround)
  const chorus = prog(p2id, 'Chorus', [
    cell(`${p2id}-0`, 'A', 'maj'),
    cell(`${p2id}-1`, 'D', 'maj'),
    cell(`${p2id}-2`, 'E', 'maj'),
    cell(`${p2id}-3`, 'A', 'maj'),
  ], 'A', 'ionian', 'whole', 'builtin-reggae', '4n', false);

  // ── Rockers drum pattern ──────────────────────────────────────────────────
  // 16-step grid (16th notes). Indexing: 0=beat1, 4=beat2, 8=beat3, 12=beat4.
  //
  //   HH:    every 8th note — downbeats orange/medium (0.7), upbeats red/high (1.0)
  //   Snare: beats 2 & 4 only (steps 4, 12) — high vel (1.0)
  //   Kick:  all 4 beats, beat 3 hardest — 0=0.7, 4=0.7, 8=1.0, 12=0.7
  //   Rim:   all off

  const rockersDrum = {
    id: drumId,
    name: 'Rockers',
    rows: [
      {
        rowId: 'hh',
        label: 'HH',
        sample: 'hh-closed',
        volume: 75,
        reverb: 12,
        // downbeats medium (0.7 = orange), upbeats high (1.0 = red)
        steps: Array.from({ length: 16 }, (_, i) => ({
          on:  i % 2 === 0,
          vel: i % 4 === 0 ? 0.7 : 1.0,
        })),
      },
      {
        rowId: 'snare',
        label: 'Snare',
        sample: 'snare-kit8',
        volume: 88,
        reverb: 20,
        // backbeat: beats 2 & 4 only, full velocity
        steps: Array.from({ length: 16 }, (_, i) => ({ on: i === 4 || i === 12, vel: 1.0 })),
      },
      {
        rowId: 'bd',
        label: 'BD',
        sample: 'kick',
        volume: 93,
        reverb: 8,
        // quarter notes: beat 3 hardest (1.0 = red), others medium (0.7 = orange)
        steps: Array.from({ length: 16 }, (_, i) => ({
          on:  i % 4 === 0,
          vel: i === 8 ? 1.0 : 0.7,
        })),
      },
      {
        rowId: 'custom',
        label: 'Rim',
        sample: 'snare-rim',
        volume: 65,
        reverb: 12,
        // all off
        steps: Array.from({ length: 16 }, () => ({ on: false, vel: 1.0 })),
      },
    ],
  };

  return {
    trackName: 'Pressure Drop — Toots & the Maytals',
    trackDescription: 'A major · A–D–E · Rockers reggae · Quarter-note kick · Upbeat hi-hat · Skank chords',
    bpm: 180,
    timeSig: '4/4',
    instrument: 'piano',
    groove: 'straight',
    metronome: { drumEnabled: true },
    drumPatterns: { [drumId]: rockersDrum },
    drumPatternOrder: [drumId],
    activeDrumPatternId: drumId,
    progressions: { [p1id]: verse, [p2id]: chorus },
    progressionOrder: [p1id, p2id],
    activeProgressionId: p1id,
    activeView: 'track',
    track: [
      { progressionId: p1id, repetitions: 2, drumPatternId: drumId },
      { progressionId: p2id, repetitions: 2, drumPatternId: drumId },
      { progressionId: p1id, repetitions: 2, drumPatternId: drumId },
      { progressionId: p2id, repetitions: 2, drumPatternId: drumId },
    ],
    scaleRoot: 'A',
    scaleKey: 'ionian',
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
  // A section: jazz comp (bass on 1, chord on 2 & 4) — Garner's stride-lite feel.
  const sectionA = prog(p1id, 'A section', [
    cell(`${p1id}-0`, 'D#', 'maj7',  0, OCT),
    cell(`${p1id}-1`, 'A#', 'dom7',  0, OCT),
    cell(`${p1id}-2`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p1id}-3`, 'A#', 'min7', 'D#', 'dom7', 0, 0, OCT),
    cell(`${p1id}-4`, 'G#', 'maj7',  0, OCT),
    cell(`${p1id}-5`, 'C#', 'dom7',  0, OCT),
    splitCell(`${p1id}-6`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    splitCell(`${p1id}-7`, 'D#', 'maj7', 'C#', 'dom7', 0, 0, OCT),
  ], 'D#', 'ionian', 'whole', 'builtin-jazz-arp-comp', '8n', false);

  // B section (bridge) — bars 17-24. Half-bar cells: Buckley arp fits the walking feel.
  const sectionB = prog(p2id, 'B section (Bridge)', [
    splitCell(`${p2id}-0`, 'G', 'min7', 'C', 'dom7', 0, 0, OCT),
    cell(`${p2id}-1`, 'F', 'maj7',  0, OCT),
    splitCell(`${p2id}-2`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    cell(`${p2id}-3`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p2id}-4`, 'G#', 'min7', 'C#', 'dom7', 0, 0, OCT),
    cell(`${p2id}-5`, 'G#', 'maj7',  0, OCT),
    splitCell(`${p2id}-6`, 'C', 'min7', 'F', 'dom7', 0, 0, OCT),
    splitCell(`${p2id}-7`, 'A#', 'maj7', 'G', 'dom7', 0, 0, OCT),
  ], 'D#', 'ionian', 'half', 'builtin-buckley', '8n', false);

  // A' section — jazz comp again, resolves to tonic.
  const sectionAprime = prog(p3id, "A' section", [
    cell(`${p3id}-0`, 'D#', 'maj7',  0, OCT),
    cell(`${p3id}-1`, 'A#', 'dom7',  0, OCT),
    cell(`${p3id}-2`, 'D#', 'maj7',  0, OCT),
    splitCell(`${p3id}-3`, 'A#', 'min7', 'D#', 'dom7', 0, 0, OCT),
    cell(`${p3id}-4`, 'G#', 'maj7',  0, OCT),
    cell(`${p3id}-5`, 'C#', 'dom7',  0, OCT),
    splitCell(`${p3id}-6`, 'F', 'min7', 'A#', 'dom7', 0, 0, OCT),
    cell(`${p3id}-7`, 'D#', 'maj7',  0, OCT),
  ], 'D#', 'ionian', 'whole', 'builtin-jazz-arp-comp', '8n', false);

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
  ], 'D', 'ionian', 'whole', 'builtin-arp-3notes', '8n', true);

  // Build — same chords but with 2-octave arpeggios for the later variations
  const build = prog(p2id, 'Variation', [
    cell(`${p2id}-0`, 'D',  'maj'),
    cell(`${p2id}-1`, 'A',  'maj'),
    cell(`${p2id}-2`, 'B',  'min'),
    cell(`${p2id}-3`, 'F#', 'min'),
    cell(`${p2id}-4`, 'G',  'maj'),
    cell(`${p2id}-5`, 'D',  'maj'),
    cell(`${p2id}-6`, 'G',  'maj'),
    cell(`${p2id}-7`, 'A',  'maj'),
  ], 'D', 'ionian', 'whole', 'builtin-arp-up-2oct', '8n', true);

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
    id: 'demo-pachelbel',
    label: '🎻 Canon in D — Pachelbel',
    labelFr: '🎻 Canon en Ré — Pachelbel',
    build: makePachelbelTrack,
  },
  {
    id: 'demo-misty',
    label: '🎷 Misty — Erroll Garner',
    labelFr: '🎷 Misty — Erroll Garner',
    build: makeMistyTrack,
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
    id: 'demo-reggae',
    label: '🎵 Pressure Drop — Toots & the Maytals',
    labelFr: '🎵 Pressure Drop — Toots & the Maytals',
    build: makeReggaeTrack,
  },
];
