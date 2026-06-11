/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * PercentBar.tsx — Shared single-segment percentage bar. Used by the loading
 * modal (data-driven branch) and the Cycle Progress table. A separate 3-segment
 * chevron bar lives in SummaryTable (`ProgressBar`) and is intentionally
 * different in shape.
 */
import React from 'react';

interface Props {
  /** 0-100. Values outside that range are clamped. */
  pct: number;
  /** Fill colour for the completed portion. */
  fillColor?: string;
  /** Background colour for the unfilled portion. */
  trackColor?: string;
  /** Bar height in pixels. */
  heightPx?: number;
  /** When true, renders the rounded percent text inside the fill (or on the
   *  track when the fill is too small to fit it). */
  showLabel?: boolean;
  /** Optional hover tooltip on the bar wrapper. */
  title?: string;
}

export default function PercentBar({
  pct,
  fillColor = '#494BCB',
  trackColor = '#f1f5f9',
  heightPx = 22,
  showLabel = false,
  title,
}: Props): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, pct));
  const rounded = Math.round(clamped);
  return (
    <div
      className="flex rounded-full overflow-hidden border border-slate-200"
      style={{ height: `${heightPx}px` }}
      title={title}
    >
      <div
        style={{
          width: `${rounded}%`,
          background: fillColor,
          height: '100%',
          minWidth: rounded > 0 ? '2px' : '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'width 0.2s ease-out',
        }}
      >
        {showLabel && rounded >= 8 && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
            {rounded}%
          </span>
        )}
      </div>
      {rounded < 100 && (
        <div style={{ flex: 1, background: trackColor, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showLabel && rounded < 8 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              {rounded}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
