# Project Overview

## What This Project Is

A personal React web app for composing, visualising, and playing back chord progressions. It helps musicians build chord grids with scale-aware harmony highlighting, interact with a piano keyboard, and arrange progressions into full tracks — with audio playback and MIDI export.

**GitHub:** `git@github.com:JulienCarnec/chords-progressions-editor.git`

---

## Main Goals

- Provide an intuitive grid-based chord progression editor
- Highlight harmonic relationships (scale fit, dominant, subdominant) with colour coding
- Let users interact with and play notes on a visual piano keyboard
- Support multi-style audio playback (strumming, arpeggio, etc.) with BPM and time signature control
- Allow arranging progressions into a full track with a sequencer
- Save/load projects as JSON and export tracks as MIDI

---

## Key Users

- The author (personal project), with potential future public hosting on GitHub

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React (Vite) |
| Audio engine | Tone.js |
| MIDI export | To be determined (e.g. `@tonejs/midi` or `jsmidgen`) |
| Styling | To be decided (CSS Modules or Tailwind) |
| Persistence | JSON file save/load (browser download/upload) |

---

## Architecture Overview

The app is split into two main views:

### 1. Chord Progression Editor
- Named progressions (e.g. "Intro", "Verse", "Chorus")
- Grid of cells, each holding a chord; cells can be split into 2 sub-cells
- Scale selector (major modes: Ionian→Locrian; minor: natural, melodic, harmonic)
  - If no scale is chosen, defaults to the key implied by the first chord entered
  - Highlights in green any scales whose degree I matches the first chord
- Chord dropdown (3- and 4-note types: major, minor, 7, maj7, 9, sus2, sus4, 7♭5, diminished)
- Transposition: shift entire grid + scale up/down by N semitones

### 2. Track Editor
- Sequences saved progressions in order
- Configurable repeat count per section
- Playback cursor showing current progression and chord

---

## Colour Coding (Chord Harmony)

Applied in both the chord dropdown and the grid cells:

| Colour | Meaning |
|--------|---------|
| 🟢 Green | Fits in the active scale |
| 🟡 Yellow | Dominant of degree I (V) |
| 🟠 Orange | Dominant of degree II (secondary dominant) |
| 🔵 Blue | Subdominant of degree I (IV) |
| 🟣 Purple | Subdominant of degree II |

Colours refresh automatically when the scale changes.

---

## Piano Keyboard Component (2 Octaves)

- Highlights notes of the active scale
- Click a key → plays that note immediately
- **Play Scale button** → plays the scale ascending
- Chord selector → highlights chord notes on keyboard + **Play button** sounds them
- Manual key toggle → freely highlight keys; app dynamically identifies and displays the matching chord name
- **Play button** works in all highlight modes (scale, chord selection, or manual)

---

## Playback Engine

- BPM: configurable, easily adjustable
- Time signatures: 4/4, 3/4, 6/8, and other common ones
- Playing styles:
  - On-beat strumming (whole, 1/2, 1/4, 1/8, 1/16)
  - Off-beat strumming (whole, 1/2, 1/4, 1/8, 1/16)
  - Arpeggio (multiple patterns)
  - Salsa, and other patterns
- Instrument sounds: piano (default), synth, strings, pad, guitar
- Active chord highlights in the grid during playback
- **Metronome** (toggleable):
  - Simple click mode
  - Drum pattern mode: hi-hat, snare, bass drum — dynamically computed for the active time signature

---

## Persistence & Export

- **Save project**: downloads a JSON file capturing the full state
- **Load project**: uploads a previously saved JSON file
- **MIDI export**: exports the full track as a `.mid` file
