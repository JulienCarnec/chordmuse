/**
 * HelpPanel — collapsible left sidebar with context-sensitive step-by-step help.
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

import { useState } from 'react';
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

export function HelpPanel({ open, onToggle, label = 'Help', editorTitle, editorDesc, steps = [] }) {
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
    </div>
  );
}
