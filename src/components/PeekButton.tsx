/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * PeekButton.tsx — Reusable button used for "peek" toggles in the Epic Status
 * header and Epic Card meta area. Renders an icon plus optional label, with a
 * CSS data-tooltip on hover. Supports two visual indicators independently:
 *   - hidden  → strikethrough on the label (controlled UI element is hidden)
 *   - activeColor → coloured text (filter is actively filtering something)
 */
import React from 'react';

interface Props {
  icon: React.ReactNode;
  label?: string;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
  hidden?: boolean;
  activeColor?: string;
  board?: boolean;
}

export default function PeekButton({ icon, label, tooltip, onClick, hidden, activeColor, board }: Props): React.JSX.Element {
  const style: React.CSSProperties = {};
  if (hidden) style.textDecoration = 'line-through';
  if (activeColor) style.color = activeColor;
  return (
    <button
      className={board ? 'view-peek-board-btn' : 'view-peek-btn'}
      onClick={onClick}
      data-tooltip={tooltip}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {icon}{label ? ` ${label}` : ''}
    </button>
  );
}
