# Project Overview

## What This Project Is — Chordmuse

A personal React web app for composing, visualising, and playing back chord progressions. It helps musicians build chord grids with scale-aware harmony highlighting, interact with a piano keyboard and guitar fretboard, arrange progressions into full tracks — with audio playback, MIDI export, and PDF export.

**GitHub:** `git@github.com:JulienCarnec/chords-progressions-editor.git`

---

## Main Goals

- Provide an intuitive grid-based chord progression editor
- Highlight harmonic relationships (scale fit, dominant, subdominant) with colour coding
- Let users interact with and play notes on a visual piano keyboard and guitar fretboard
- Support multi-style audio playback (strumming, arpeggio, drum sequencer, etc.) with BPM and time signature control
- Allow arranging progressions into a full track with a sequencer
- Save/load projects as JSON, export tracks as MIDI, and print track sheets as PDF
- Ship built-in demo tracks so users can explore features immediately

---

## Key Users

- The author (personal project), with potential future public hosting on GitHub

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Audio engine | Tone.js 15 |
| MIDI export | `@tonejs/midi` |
| Styling | CSS Modules |
| Linting | Oxlint |
| Persistence | JSON file save/load (browser download/upload) |
| i18n | Custom EN/FR string tables (`src/i18n/index.jsx`) |

---

## Architecture Overview

The app is split into two main views toggled from the header:

### 1. Chord Progression Editor (`activeView: 'progression'`)
- Named progressions (e.g. "Intro", "Verse", "Chorus")
- Grid of cells, each holding a chord; cells can be split into 2 sub-cells for half-bar changes
- Scale selector (major modes: Ionian → Locrian; minor: natural, melodic, harmonic)
  - Highlights in green any scales whose degree I matches the first chord
- Chord dropdown with 3- and 4-note types: major, minor, dom7, maj7, min7, dim, aug, sus2, sus4, dom9, maj9, min9, hdim7, dim7
- Transposition: shift entire grid + scale up/down by N semitones
- Drag-and-drop cells to reorder (Ctrl-drag to copy)
- Per-progression playing pattern (overrides global default)

### 2. Track Editor (`activeView: 'track'`)
- Sequences saved progressions in order; configurable repeat count per section
- Inline track name and description fields
- Each section can have a drum pattern assigned independently
- Playback cursor highlighting current progression and chord in the mini-grid
- Seek: click any cell/section during playback to jump to it

---

## Colour Coding (Chord Harmony)

Applied in both the chord dropdown and the grid cells:

| Colour | Meaning |
|--------|---------|
| 🟢 Green  | Fits in the active scale |
| 🟡 Yellow | Dominant of degree I (V) |
| 🟠 Orange | Dominant of degree II (secondary dominant) |
| 🔵 Blue   | Subdominant of degree I (IV) |
| 🟣 Purple | Subdominant of degree II |

Colours refresh automatically when the scale changes.

---

## Piano Keyboard & Guitar Fretboard

Both are available in both views (toggled via show/hide buttons).

**Piano (2 octaves)**
- Highlights notes of the active scale
- Click a key → plays that note immediately
- **Play Scale** button → plays the scale ascending
- Chord selector → highlights chord notes; **Play** button sounds them
- Manual key toggle → freely highlight keys; app dynamically identifies and displays the matching chord name

**Guitar Fretboard**
- Highlights the same notes as the piano (scale or chord) across all strings and frets

---

## Playback Engine

- **BPM**: configurable via number input, range 20–300
- **Time signatures**: 4/4, 3/4, 6/8, 2/4, 5/4, 7/8, 12/8
- **Groove modes**: straight, shuffle (triplet feel), swing
- **Playing styles** (global default + per-progression override):
  - Block chord, on-beat strum, off-beat strum, folk strum (D-DU-DU), staccato chops, reggae off-beat
  - Bass + chord, oom-pah-pah (3/4), bass walk
  - Arpeggio up/down, up-down, down-up, broken chord, jazz comp, salsa, bossa nova, and more
  - Fully custom patterns via a pattern editor (Tone.js pattern syntax)
- **Instruments** (23 total): piano, e-piano, harpsichord, organ, synth lead, synth pad, synth bass, pad, strings, violin, cello, choir, guitar (clean/distorted/nylon), bass, trumpet, trombone, saxophone, flute, vibraphone, marimba, harp
- **Knobs**: humanize (timing/velocity variation), max velocity, reverb wet level
- **Auto-play**: optionally previews a chord immediately on cell selection

---

## Drum Sequencer

- 16-step, 4-track step sequencer (hi-hat, snare, kick, custom perc)
- Each step has an on/off toggle and a velocity level
- Built-in patterns: Rock, Rock 2, Rock 3, Funk, Bossa Nova, Hip-Hop
- Each track item in the arrangement can be assigned its own drum pattern (overrides the global active pattern)
- The sequencer fires in sync with chord playback via Tone.js Transport

---

## Demo Tracks

A **Demos ▾** dropdown in the header loads built-in example projects:
- Loads the full project state (progressions, track, settings) in one click
- Shows a confirmation dialog if unsaved work would be overwritten
- Examples include classical (Bach Prelude), jazz, pop, and other styles

---

## Persistence & Export

- **Save project**: downloads a `.json` file capturing the full app state
- **Load project**: uploads a previously saved `.json` file
- **MIDI export** (🎼): exports the full arranged track as a `.mid` file
- **PDF export** (📄): opens a print-ready track sheet containing the track name, description, BPM, time signature, and each section's chord grid with cell size and repetition count

---

## i18n

The app ships with English and French translations. The active locale is toggled via a button in the header. All UI strings live in `src/i18n/index.jsx` as `en` and `fr` objects, consumed via the `useT()` hook.
