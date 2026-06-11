/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SortIcon.tsx — Shared sort indicator (↕ / ↑ / ↓) used in summary, assignment,
 * and story detail tables. Renders a small span with a tooltip describing the
 * current sort state for the given column.
 */
import React from 'react';

interface Props {
  sort: { col: string | null; dir: string };
  col: string;
  isNumeric?: boolean;
}

export default function SortIcon({ sort, col, isNumeric = false }: Props): React.JSX.Element {
  const ascLabel = isNumeric ? 'Sorted low→high, click to reverse' : 'Sorted A→Z, click to reverse';
  const descLabel = isNumeric ? 'Sorted high→low, click to reverse' : 'Sorted Z→A, click to reverse';
  const label = sort.col !== col ? 'Click to sort' : sort.dir === 'asc' ? ascLabel : descLabel;
  const icon = sort.col !== col ? ' ↕' : sort.dir === 'asc' ? ' ↑' : ' ↓';
  return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
}
