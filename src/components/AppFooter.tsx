/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AppFooter.tsx — Static page footer. Displays the project name, copyright year, and
 * app version sourced directly from package.json.
 */
import React from 'react';
import pkg from '../../package.json';

export default function AppFooter(): React.JSX.Element {
  return (
    <footer className="bg-[#494BCB] text-[#FFDE87] text-center px-8 py-6 shadow-[0_-4px_6px_rgba(0,0,0,0.1)]">
      <p className="m-0 text-[0.95rem] font-medium">© 2026 | Project D.A.V.E. (Dashboards Are Very Effective) | Ver {pkg.version}</p>
    </footer>
  );
}
