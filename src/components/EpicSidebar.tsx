/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * EpicSidebar.tsx — Slide-out navigation sidebar. Lists loaded epics as numbered
 * buttons that smooth-scroll to their card on the page, with a scroll-to-top control
 * at the top and a refresh-epics button at the bottom.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function EpicSidebar(): React.JSX.Element | null {
  const { epics, showSidebar, setShowSidebar, searchEpics, scrollToEpic } = useDashboard();

  if (!epics.length) return null;

  return (
    <>
      <button
        className={`sidebar-toggle ${showSidebar ? 'active' : ''}`}
        onClick={() => setShowSidebar(!showSidebar)}
        aria-label="Toggle epic navigation"
      >
        {showSidebar ? '◀' : '▶'}
      </button>

      <div className={`epic-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <h3>Epics</h3>
          <button
            className="sidebar-close"
            onClick={() => setShowSidebar(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          <button
            className="sidebar-nav-item sidebar-nav-top"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setShowSidebar(false);
            }}
            title="Scroll to top"
          >
            <span className="sidebar-nav-number">↑</span>
            <span className="sidebar-nav-text">Top</span>
          </button>

          {epics.map((epic, index) => (
            !epic.notFound && (
              <button
                key={epic.id as React.Key}
                className="sidebar-nav-item"
                onClick={() => scrollToEpic(epic.id)}
                title={epic.name}
              >
                <span className="sidebar-nav-number">{index + 1}</span>
                <span className="sidebar-nav-text">{epic.name}</span>
              </button>
            )
          ))}

          <button
            className="sidebar-nav-item sidebar-nav-top mt-4 pt-4 border-b-0 border-t-2 border-t-[#F0F0F7]"
            onClick={(_e: React.MouseEvent) => {
              setShowSidebar(false);
              searchEpics();
            }}
            title="Refresh epics data"
          >
            <span className="sidebar-nav-number">↻</span>
            <span className="sidebar-nav-text">Refresh Epics</span>
          </button>
        </nav>
      </div>

      {showSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </>
  );
}
