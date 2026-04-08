/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * DashboardContext.tsx — Shared dashboard state context. Exports DashboardContext
 * (populated by App.tsx) and the useDashboard() hook used by every component to
 * access state. Throws clearly if called outside the Provider.
 */
import { createContext, useContext } from 'react';
import { DashboardContextValue } from '../types';

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within a DashboardContext.Provider');
  return ctx;
}
