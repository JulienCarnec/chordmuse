import { useRef, useEffect, useCallback } from 'react';
import styles from './ReverbKnob.module.css';

/**
 * Generic rotary knob — mouse AND touch controlled.
 *
 * Mouse: click + drag up/down (120 px = full range).
 * Touch: same — touchstart → drag up/down, non-passive so the browser
 *        doesn't scroll the page while adjusting the knob.
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

  // ── Shared drag logic ────────────────────────────────────────────────────

  function startDrag(clientY) {
    isDragging.current   = true;
    dragStartY.current   = clientY;
    dragStartVal.current = value;
  }

  function moveDrag(clientY) {
    if (!isDragging.current) return;
    // 120 px vertical travel = full range
    const delta   = (dragStartY.current - clientY) / 120 * (max - min);
    const raw     = dragStartVal.current + delta;
    const snapped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, snapped)));
  }

  function endDrag() {
    isDragging.current = false;
  }

  // ── Mouse ────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    startDrag(e.clientY);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onMouseMove(e) { moveDrag(e.clientY); }
    function onMouseUp()    { endDrag(); }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onChange, min, max, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Touch (non-passive so we can call preventDefault) ───────────────────

  const onTouchStart = useCallback((e) => {
    // Only act on single-finger touches on the knob itself
    if (e.touches.length !== 1) return;
    e.preventDefault(); // prevent page scroll while dragging the knob
    startDrag(e.touches[0].clientY);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onTouchMove(e) {
      if (!isDragging.current) return;
      e.preventDefault();
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (touch) moveDrag(touch.clientY);
    }
    function onTouchEnd() { endDrag(); }
    // Must be non-passive so preventDefault() actually suppresses scrolling
    window.addEventListener('touchmove',   onTouchMove, { passive: false });
    window.addEventListener('touchend',    onTouchEnd,  { passive: true  });
    window.addEventListener('touchcancel', onTouchEnd,  { passive: true  });
    return () => {
      window.removeEventListener('touchmove',   onTouchMove);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onChange, min, max, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG arc geometry — 270° sweep from bottom-left to bottom-right ───────

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
    const p1   = polarToXY(from, radius);
    const p2   = polarToXY(to,   radius);
    const lg   = (to - from) > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${lg} 1 ${p2.x} ${p2.y}`;
  }

  const indPt = polarToXY(angle, r - strokeW / 2 - 1);

  return (
    <div className={styles.knobWrap} title={`${label}: ${fmt(value)}`}>
      <svg
        width={size} height={size}
        className={styles.knob}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{ cursor: 'ns-resize', touchAction: 'none' }}
      >
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
