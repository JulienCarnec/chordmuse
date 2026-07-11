/**
 * useTouchDrag — touch-friendly drag-and-drop reordering hook.
 *
 * How it works:
 *   1. User long-presses an item for LONG_PRESS_MS (380ms) → drag activates.
 *   2. A semi-transparent "ghost" div tracks the finger.
 *   3. As the finger moves, we hit-test the item list to find the drop slot.
 *   4. When the pointer enters the SCROLL_ZONE_PX band at the top or bottom
 *      of the scroll container, an rAF loop auto-scrolls the container.
 *   5. On touchend, onReorder(fromIndex, toIndex) is called.
 *
 * Why addEventListener instead of React onTouchMove:
 *   React 17+ registers all touch handlers as passive, which means
 *   e.preventDefault() inside onTouchMove is silently ignored and the browser
 *   scrolls the page during a drag. We attach touchmove / touchend directly
 *   with { passive: false } so preventDefault() actually works.
 *
 * Returns { getTouchHandlers, dragIndex, dropIndex, Ghost }
 *
 *   getTouchHandlers(index)  — spread onto each draggable element (touchstart only)
 *   dragIndex  (number|null) — index of the item currently being dragged
 *   dropIndex  (number|null) — current insertion slot
 *   Ghost      (ReactNode)   — transparent floating ghost element (mount once)
 *
 * Props:
 *   scrollRef  React ref pointing to the scrollable container element.
 *              When supplied, edge-scrolling is enabled during a drag.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const LONG_PRESS_MS  = 380;
const MOVE_CANCEL_PX = 8;   // px — finger movement that cancels the long-press
const SCROLL_ZONE_PX = 80;  // px — band at top/bottom of container that triggers scroll
const MAX_SCROLL_SPD = 18;  // px/frame — maximum scroll speed at the very edge

export function useTouchDrag({ itemCount, getItemEl, onReorder, scrollRef }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  // Ghost position / size
  const [ghostPos,   setGhostPos]   = useState({ x: 0, y: 0 });
  const [ghostSize,  setGhostSize]  = useState({ w: 0, h: 0 });
  const [ghostLabel, setGhostLabel] = useState('');

  // All mutable drag state kept in refs so callbacks never go stale
  const longPressTimer  = useRef(null);
  const activeTouchId   = useRef(null);
  const dragIdxRef      = useRef(null);
  const isActiveDrag    = useRef(false);
  const startPos        = useRef({ x: 0, y: 0 });
  const ghostSizeRef    = useRef({ w: 0, h: 0 });
  const dropIndexRef    = useRef(null);
  const onReorderRef    = useRef(onReorder);
  const itemCountRef    = useRef(itemCount);
  const getItemElRef    = useRef(getItemEl);
  const itemRectsRef    = useRef([]);

  // Auto-scroll state
  const rafRef          = useRef(null);       // rAF handle
  const fingerYRef      = useRef(0);          // latest clientY during drag

  // Keep refs current without rebuilding callbacks
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);
  useEffect(() => { itemCountRef.current = itemCount; }, [itemCount]);
  useEffect(() => { getItemElRef.current = getItemEl; }, [getItemEl]);

  // ── Helpers ───────────────────────────────────────────────────

  function collectRects() {
    const rects = [];
    for (let i = 0; i < itemCountRef.current; i++) {
      const el = getItemElRef.current(i);
      rects.push(el ? el.getBoundingClientRect() : null);
    }
    itemRectsRef.current = rects;
  }

  // Recompute rects after the container scrolls so drop-slot detection stays accurate
  function refreshRects() {
    const rects = itemRectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      if (!rects[i]) continue;
      const el = getItemElRef.current(i);
      if (el) rects[i] = el.getBoundingClientRect();
    }
  }

  function getDropSlot(clientY) {
    const rects = itemRectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      if (i === dragIdxRef.current) continue;
      const r = rects[i];
      if (!r) continue;
      if (clientY < r.top + r.height / 2) return i;
    }
    return itemCountRef.current;
  }

  function resetDrag() {
    isActiveDrag.current  = false;
    dragIdxRef.current    = null;
    activeTouchId.current = null;
    dropIndexRef.current  = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  // ── Auto-scroll rAF loop ──────────────────────────────────────
  //
  // Runs continuously during an active drag. Calculates how close the
  // finger is to the top/bottom edge of the scroll container and scrolls
  // proportionally. Stops when drag ends.

  function startScrollLoop() {
    if (rafRef.current) return; // already running
    function tick() {
      const container = scrollRef?.current;
      if (!container || !isActiveDrag.current) {
        rafRef.current = null;
        return;
      }

      const rect  = container.getBoundingClientRect();
      const y     = fingerYRef.current;
      const distFromTop    = y - rect.top;
      const distFromBottom = rect.bottom - y;

      let scrollDelta = 0;

      if (distFromTop < SCROLL_ZONE_PX && distFromTop >= 0) {
        // Near top — scroll up. Speed proportional to proximity (max at edge=0).
        const ratio = 1 - distFromTop / SCROLL_ZONE_PX;
        scrollDelta = -Math.round(ratio * MAX_SCROLL_SPD);
      } else if (distFromBottom < SCROLL_ZONE_PX && distFromBottom >= 0) {
        // Near bottom — scroll down.
        const ratio = 1 - distFromBottom / SCROLL_ZONE_PX;
        scrollDelta = Math.round(ratio * MAX_SCROLL_SPD);
      }

      if (scrollDelta !== 0) {
        container.scrollTop += scrollDelta;
        // After scrolling, item positions have changed — refresh rects so
        // drop-slot detection stays accurate, then re-evaluate the slot.
        refreshRects();
        const slot = getDropSlot(fingerYRef.current);
        if (slot !== dropIndexRef.current) {
          dropIndexRef.current = slot;
          setDropIndex(slot);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopScrollLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  // ── Native touchmove / touchend listeners (non-passive) ──────

  const handleWindowTouchMove = useCallback((e) => {
    const touch = [...e.touches].find(t => t.identifier === activeTouchId.current);
    if (!touch) return;

    if (!isActiveDrag.current) {
      // Cancel long-press if finger moved too far
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) {
        clearTimeout(longPressTimer.current);
        removeWindowListeners();
        activeTouchId.current = null;
      }
      return;
    }

    // Drag is active — block scroll
    e.preventDefault();

    // Track finger position for the scroll loop
    fingerYRef.current = touch.clientY;

    const { w, h } = ghostSizeRef.current;
    setGhostPos({ x: touch.clientX - w / 2, y: touch.clientY - h / 2 });

    const slot = getDropSlot(touch.clientY);
    if (slot !== dropIndexRef.current) {
      dropIndexRef.current = slot;
      setDropIndex(slot);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWindowTouchEnd = useCallback((e) => {
    clearTimeout(longPressTimer.current);
    const touch = [...e.changedTouches].find(t => t.identifier === activeTouchId.current);
    if (!touch) return;

    stopScrollLoop();
    removeWindowListeners();

    if (isActiveDrag.current) {
      const from = dragIdxRef.current;
      const to   = dropIndexRef.current;
      resetDrag();
      if (from !== null && to !== null && to !== from) {
        onReorderRef.current(from, to);
      }
    } else {
      activeTouchId.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function addWindowListeners() {
    window.addEventListener('touchmove',    handleWindowTouchMove,   { passive: false });
    window.addEventListener('touchend',     handleWindowTouchEnd,    { passive: false });
    window.addEventListener('touchcancel',  handleWindowTouchCancel, { passive: true  });
  }

  function removeWindowListeners() {
    window.removeEventListener('touchmove',   handleWindowTouchMove);
    window.removeEventListener('touchend',    handleWindowTouchEnd);
    window.removeEventListener('touchcancel', handleWindowTouchCancel);
  }

  function handleWindowTouchCancel() {
    clearTimeout(longPressTimer.current);
    stopScrollLoop();
    removeWindowListeners();
    resetDrag();
  }

  // Clean up on unmount
  useEffect(() => () => {
    clearTimeout(longPressTimer.current);
    stopScrollLoop();
    removeWindowListeners();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React touchstart handler ──────────────────────────────────

  const handleTouchStart = useCallback((index, e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    activeTouchId.current = touch.identifier;
    startPos.current      = { x: touch.clientX, y: touch.clientY };
    fingerYRef.current    = touch.clientY;

    addWindowListeners();

    longPressTimer.current = setTimeout(() => {
      isActiveDrag.current = true;
      dragIdxRef.current   = index;
      setDragIndex(index);
      dropIndexRef.current = index;
      setDropIndex(index);

      const el = getItemElRef.current(index);
      if (el) {
        const r = el.getBoundingClientRect();
        ghostSizeRef.current = { w: r.width, h: r.height };
        setGhostSize({ w: r.width, h: r.height });
        setGhostPos({ x: r.left, y: r.top });
        setGhostLabel(el.dataset.dragLabel ?? '');
      }
      collectRects();
      startScrollLoop();

      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── getTouchHandlers ──────────────────────────────────────────

  const getTouchHandlers = useCallback((index) => ({
    onTouchStart: (e) => handleTouchStart(index, e),
  }), [handleTouchStart]);

  // ── Ghost element ─────────────────────────────────────────────

  const Ghost = dragIndex !== null ? createPortal(
    <div style={{
      position:       'fixed',
      left:           ghostPos.x,
      top:            ghostPos.y,
      width:          ghostSize.w,
      height:         ghostSize.h,
      background:     'rgba(59,130,246,0.18)',
      border:         '2px solid #3b82f6',
      borderRadius:   8,
      zIndex:         9999,
      pointerEvents:  'none',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       14,
      fontWeight:     700,
      color:          '#1d4ed8',
      backdropFilter: 'blur(2px)',
    }}>
      {ghostLabel}
    </div>,
    document.body
  ) : null;

  return { getTouchHandlers, dragIndex, dropIndex, Ghost };
}
