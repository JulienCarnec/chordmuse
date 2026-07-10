import { useRef, useEffect, useCallback } from 'react';
import styles from './ReverbKnob.module.css';

/**
 * Generic rotary knob.
 *
 * Props:
 *   value    – current value (within min–max)
 *   onChange – (newValue: number) => void
 *   label    – string shown below the knob
 *   min      – minimum value (default 0)
 *   max      – maximum value (default 100)
 *   step     – snap increment (default 1)
 *   color    – fill arc colour (default '#a78bfa')
 *   valColor – value text colour (default matches color)
 *   size     – diameter in px (default 40)
 *   fmt      – (value) => string for display (default v => `${v}`)
 */
export function Knob({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  color = '#a78bfa',
  valColor,
  size = 40,
  fmt = v => `${v}`,
}) {
  const isDragging   = useRef(false);
  const dragStartY   = useRef(0);
  const dragStartVal = useRef(0);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current   = true;
    dragStartY.current   = e.clientY;
    dragStartVal.current = value;
  }, [value]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      // 120px vertical travel = full range
      const delta = (dragStartY.current - e.clientY) / 120 * (max - min);
      const raw   = dragStartVal.current + delta;
      const snapped = Math.round(raw / step) * step;
      const next  = Math.min(max, Math.max(min, snapped));
      onChange(next);
    }
    function onMouseUp() { isDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onChange, min, max, step]);

  // SVG arc geometry — 270° sweep from bottom-left to bottom-right
  const MIN_ANGLE = -225;
  const MAX_ANGLE =   45;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 4;
  const strokeW = size * 0.10;

  const fraction = (value - min) / (max - min);
  const angle    = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE);

  function polarToXY(deg, radius) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(from, to, radius) {
    const p1 = polarToXY(from, radius);
    const p2 = polarToXY(to,   radius);
    const sweep = to - from;
    const lg = sweep > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${lg} 1 ${p2.x} ${p2.y}`;
  }

  const indPt = polarToXY(angle, r - strokeW / 2 - 1);
  const totalSweep = MAX_ANGLE - MIN_ANGLE; // 270

  return (
    <div className={styles.knobWrap} title={`${label}: ${fmt(value)}`}>
      <svg width={size} height={size} className={styles.knob}
        onMouseDown={onMouseDown} style={{ cursor: 'ns-resize' }}>
        <path d={arcPath(MIN_ANGLE, MAX_ANGLE, r)} fill="none"
          stroke="#374151" strokeWidth={strokeW} strokeLinecap="round" />
        {value > min && (
          <path d={arcPath(MIN_ANGLE, angle, r)} fill="none"
            stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        <circle cx={indPt.x} cy={indPt.y} r={strokeW * 0.45} fill="#f3f4f6" />
      </svg>
      <span className={styles.knobLabel}>{label}</span>
      <span className={styles.knobVal} style={{ color: valColor ?? color }}>{fmt(value)}</span>
    </div>
  );
}
