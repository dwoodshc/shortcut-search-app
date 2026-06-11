/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * ThemeSelector.tsx — Modal that displays a 2×2 grid of mini theme previews.
 * Clicking a preview card applies the theme live. The active theme gets a
 * checkmark badge. ESC or the Done button closes the modal.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';

type Theme = 'normal' | 'dark' | 'star-trek' | 'matrix';

interface ThemePreview {
  id: Theme;
  label: string;
  bg: string;
  headerBg: string;
  headerText: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  textColor: string;
  subTextColor: string;
  fontFamily: string;
  uppercase: boolean;
}

const THEMES: ThemePreview[] = [
  {
    id: 'normal',
    label: 'Normal',
    bg: '#f0f4f8',
    headerBg: '#03045E',
    headerText: '#ffffff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    accentColor: '#494BCB',
    textColor: '#1a202c',
    subTextColor: '#718096',
    fontFamily: 'system-ui, sans-serif',
    uppercase: false,
  },
  {
    id: 'dark',
    label: 'Dark Mode',
    bg: '#1a1a2e',
    headerBg: '#0f0f23',
    headerText: '#e2e8f0',
    cardBg: '#16213e',
    cardBorder: '#2d3748',
    accentColor: '#7b83eb',
    textColor: '#e2e8f0',
    subTextColor: '#a0aec0',
    fontFamily: 'system-ui, sans-serif',
    uppercase: false,
  },
  {
    id: 'star-trek',
    label: 'Star Trek',
    bg: '#000000',
    headerBg: '#000000',
    headerText: '#FF9900',
    cardBg: '#0a0a0a',
    cardBorder: '#FF9900',
    accentColor: '#FF9900',
    textColor: '#FF9900',
    subTextColor: '#CC7700',
    fontFamily: '"Arial Narrow", Arial, sans-serif',
    uppercase: true,
  },
  {
    id: 'matrix',
    label: 'Matrix',
    bg: '#000000',
    headerBg: 'rgba(0,18,0,0.95)',
    headerText: '#00FF41',
    cardBg: 'rgba(0,18,0,0.88)',
    cardBorder: '#00FF41',
    accentColor: '#00FF41',
    textColor: '#00FF41',
    subTextColor: '#88FF88',
    fontFamily: '"Courier New", monospace',
    uppercase: false,
  },
];

function MiniPreview({ theme, isActive, onClick }: { theme: ThemePreview; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4/3',
        border: isActive ? `3px solid ${theme.accentColor}` : '3px solid transparent',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        background: theme.bg,
        boxShadow: isActive ? `0 0 0 2px ${theme.accentColor}44` : '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        outline: 'none',
        display: 'block',
      }}
      aria-label={`Select ${theme.label} theme`}
      aria-pressed={isActive}
    >
      {/* Mini header */}
      <div style={{
        background: theme.headerBg,
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: `1px solid ${theme.accentColor}44`,
      }}>
        <div style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: theme.accentColor,
          opacity: 0.9,
          flexShrink: 0,
        }} />
        <div style={{
          flex: 1,
          height: 6,
          background: theme.headerText,
          opacity: 0.7,
          borderRadius: 3,
          fontFamily: theme.fontFamily,
        }} />
      </div>

      {/* Mini body */}
      <div style={{ padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Mini action bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          {[0.6, 0.4, 0.5].map((w, i) => (
            <div key={i} style={{
              height: 5,
              flex: w,
              background: theme.accentColor,
              borderRadius: 2,
              opacity: 0.6,
            }} />
          ))}
        </div>
        {/* Mini cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 4,
            padding: '3px 5px',
            borderLeft: `3px solid ${theme.accentColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <div style={{ height: 4, width: `${60 + i * 10}%`, background: theme.textColor, opacity: 0.7, borderRadius: 2 }} />
            <div style={{ height: 3, width: '40%', background: theme.subTextColor, opacity: 0.5, borderRadius: 2 }} />
          </div>
        ))}
      </div>

      {/* Active checkmark */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: theme.accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: theme.bg === '#000000' ? '#000' : '#fff',
          fontWeight: 'bold',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          lineHeight: 1,
        }}>
          ✓
        </div>
      )}
    </button>
  );
}

export default function ThemeSelector(): React.JSX.Element | null {
  const { modals, setModal, displayTheme, selectTheme } = useDashboard();

  if (!modals.themeSelector) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setModal('themeSelector', false)}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '90vw' }}
      >
        <h2 className="m-0 mb-1">Theme</h2>
        <p className="text-sm text-[#718096] mt-1 mb-5">Choose a display theme for the dashboard.</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}>
          {THEMES.map((theme) => (
            <div key={theme.id}>
              <MiniPreview
                theme={theme}
                isActive={displayTheme === theme.id}
                onClick={() => selectTheme(theme.id)}
              />
              <div style={{ textAlign: 'center', marginTop: 6, fontSize: '0.85rem', fontWeight: 500, color: '#4a5568' }}>
                {theme.label}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-buttons">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModal('themeSelector', false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
