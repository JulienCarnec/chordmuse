import * as Tone from 'tone';

/**
 * Convert BPM + time signature to seconds per beat and per bar.
 */
export function timingInfo(bpm, timeSig) {
  const [beats] = timeSig.split('/').map(Number);
  const secPerBeat = 60 / bpm;
  const secPerBar = secPerBeat * beats;
  return { secPerBeat, secPerBar, beats };
}

/**
 * Schedule a metronome click track.
 * Returns the Transport.
 */
export function startMetronome(bpm, timeSig, mode = 'click') {
  Tone.getTransport().bpm.value = bpm;
  const [beats, division] = timeSig.split('/').map(Number);

  const clickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.008,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination();

  const snareSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
  }).toDestination();

  const bassSynth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).toDestination();

  let count = 0;

  const loop = new Tone.Loop((time) => {
    if (mode === 'click') {
      const freq = count % beats === 0 ? 880 : 440;
      clickSynth.triggerAttackRelease(freq, '32n', time);
    } else {
      // Drum pattern based on time signature
      const beat = count % beats;
      // Bass drum: beat 1 (and 3 in 4/4)
      if (beat === 0 || (beats === 4 && beat === 2)) {
        bassSynth.triggerAttackRelease('C1', '8n', time);
      }
      // Snare: beat 2 & 4 (or 2 in 3/4, beat 3 in 6/8 per pair)
      if ((beats === 4 && (beat === 1 || beat === 3)) ||
          (beats === 3 && beat === 1) ||
          (beats === 6 && (beat === 2 || beat === 5))) {
        snareSynth.triggerAttackRelease('8n', time);
      }
      // Hi-hat: every beat
      clickSynth.triggerAttackRelease(800, '32n', time);
    }
    count++;
  }, `${division}n`);

  loop.start(0);
  Tone.getTransport().start();

  return { loop, clickSynth, snareSynth, bassSynth };
}

export function stopMetronome({ loop, clickSynth, snareSynth, bassSynth }) {
  loop?.stop();
  loop?.dispose();
  clickSynth?.dispose();
  snareSynth?.dispose();
  bassSynth?.dispose();
  Tone.getTransport().stop();
}
