import { useState, useRef, useEffect, useCallback } from 'react';
import { useT } from '../../i18n/index';
import styles from './ReverbKnob.module.css';

/**
 * Rotary knob for reverb wet level.
 *
 * Props:
 *   value       – current value 0–100
 *   onChange    – (newValue: number) => void  (called live while dragging)
 *   size        – diameter in px (default 40)
 */
export function ReverbKnob({ value, onChange, size = 40 }) {
  const t = useT();
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  // ── Drag handling ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current   = true;
    dragStartY.current   = e.clientY;
    dragStartVal.current = value;
  }, [value]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      // Drag up = increase, drag down = decrease. 120px travel = full range.
      const delta = (dragStartY.current - e.clientY) / 120 * 100;
      const next  = Math.round(Math.min(100, Math.max(0, dragStartVal.current + delta)));
      onChange(next);
    }
    function onMouseUp() { isDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onChange]);

  // ── SVG arc geometry ───────────────────────────────────────────────────────
  // Knob sweeps from -225° to +45° (270° total), starting bottom-left
  const MIN_ANGLE = -225; // degrees from 12-o'clock (CSS transform convention)
  const MAX_ANGLE =   45;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 4;          // track radius
  const strokeW = size * 0.10;

  // Angle for current value
  const fraction = value / 100;
  const angle    = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE); // degrees

  // Convert start and current angles to SVG arc path (angles from top, clockwise)
  function polarToXY(deg, radius) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  const startDeg = MIN_ANGLE; // always start from bottom-left
  const endDeg   = angle;

  const startPt  = polarToXY(startDeg, r);
  const endPt    = polarToXY(endDeg,   r);
  // Track always: full sweep from MIN to MAX
  const trackEnd = polarToXY(MAX_ANGLE, r);

  function arcPath(from, to, radius, large) {
    const p1 = polarToXY(from, radius);
    const p2 = polarToXY(to,   radius);
    const lg = large ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${lg} 1 ${p2.x} ${p2.y}`;
  }

  const totalSweep = MAX_ANGLE - MIN_ANGLE; // 270
  const fillSweep  = angle - MIN_ANGLE;
  const trackLarge = totalSweep  > 180 ? 1 : 0;
  const fillLarge  = fillSweep   > 180 ? 1 : 0;

  // Indicator line from centre to rim
  const indPt = polarToXY(angle, r - strokeW / 2 - 1);

  return (
    <div className={styles.knobWrap} title={`${t.reverbLabel}: ${value}%`}>
      <svg
        width={size} height={size}
        className={styles.knob}
        onMouseDown={onMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        {/* Track (full sweep, grey) */}
        <path
          d={arcPath(MIN_ANGLE, MAX_ANGLE, r, trackLarge)}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Fill (value sweep, purple) */}
        {value > 0 && (
          <path
            d={arcPath(MIN_ANGLE, angle, r, fillLarge)}
            fill="none"
            stroke="#a78bfa"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* Indicator dot */}
        <circle cx={indPt.x} cy={indPt.y} r={strokeW * 0.45} fill="#e9d5ff" />
      </svg>
      <span className={styles.knobLabel}>Reverb</span>
      <span className={styles.knobVal}>{value}%</span>
    </div>
  );
}
