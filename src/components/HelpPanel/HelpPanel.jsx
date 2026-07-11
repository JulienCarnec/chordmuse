/**
 * HelpPanel — collapsible left sidebar with context-sensitive step-by-step help.
 *
 * On mobile (≤640 px) it renders as a fullscreen modal dialog instead of a side
 * panel. A floating "?" button appears in the bottom-right corner to open it.
 *
 * Props:
 *   open        boolean    — whether the panel is expanded
 *   onToggle    () => void — toggle callback
 *   label       string     — thumb label and panel title (e.g. "Help" / "Aide")
 *   editorTitle string     — bold heading shown at the top of the panel body
 *   editorDesc  string     — short description paragraph below the heading
 *   steps       Array<{
 *     number: number,
 *     title:  string,
 *     summary: string,
 *     actions?: Array<{ title: string, body: string }>
 *   }>
 */

import { useState, useEffect } from 'react';
import styles from './HelpPanel.module.css';

function Step({ step }) {
  const [expanded, setExpanded] = useState(false);
  const hasActions = step.actions?.length > 0;

  return (
    <div className={styles.step}>
      <button
        className={`${styles.stepHeader} ${expanded ? styles.stepHeaderOpen : ''}`}
        onClick={() => hasActions && setExpanded(o => !o)}
        aria-expanded={expanded}
        style={hasActions ? undefined : { cursor: 'default' }}
      >
        <span className={styles.stepNumber}>{step.number}</span>
        <span className={styles.stepTitle}>{step.title}</span>
        {hasActions && (
          <span className={styles.stepChevron}>{expanded ? '▾' : '▸'}</span>
        )}
      </button>
      <p className={styles.stepSummary}>{step.summary}</p>
      {expanded && hasActions && (
        <div className={styles.stepActions}>
          {step.actions.map((action) => (
            <div key={action.title} className={styles.action}>
              <span className={styles.actionTitle}>{action.title}</span>
              <span className={styles.actionBody}>{action.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Shared panel body (used by both side-panel and modal) */
function HelpBody({ editorTitle, editorDesc, steps }) {
  return (
    <div className={styles.body}>
      {(editorTitle || editorDesc) && (
        <div className={styles.intro}>
          {editorTitle && <p className={styles.introTitle}>{editorTitle}</p>}
          {editorDesc  && <p className={styles.introDesc}>{editorDesc}</p>}
        </div>
      )}
      {steps.map((step) => (
        <Step key={step.number} step={step} />
      ))}
    </div>
  );
}

export function HelpPanel({ open, onToggle, label = 'Help', editorTitle, editorDesc, steps = [] }) {
  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse) and (max-width: 1024px)');
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Mobile: floating button + fullscreen modal ──────────────
  if (isMobile) {
    return (
      <>
        {/* Floating help button always visible */}
        <button
          className={styles.mobileFab}
          onClick={onToggle}
          aria-label={label}
          title={label}
        >?</button>

        {/* Full-screen modal */}
        {open && (
          <div className={styles.mobileOverlay} role="dialog" aria-modal="true" aria-label={label}>
            <div className={styles.mobileDialog}>
              <div className={styles.mobileHeader}>
                <span className={styles.panelTitle}>? {label}</span>
                <button className={styles.closeBtn} onClick={onToggle} title="Close">✕</button>
              </div>
              <HelpBody editorTitle={editorTitle} editorDesc={editorDesc} steps={steps} />
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Desktop: side panel / thumb ─────────────────────────────
  if (!open) {
    return (
      <div className={styles.thumb} onClick={onToggle} title={label}>
        <span className={styles.thumbIcon}>?</span>
        <span className={styles.thumbLabel}>{label}</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>? {label}</span>
        <button className={styles.closeBtn} onClick={onToggle} title={label}>✕</button>
      </div>
      <HelpBody editorTitle={editorTitle} editorDesc={editorDesc} steps={steps} />
    </div>
  );
}
